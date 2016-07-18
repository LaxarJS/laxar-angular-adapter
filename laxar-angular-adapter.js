/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import ng from 'angular';
import ngSanitizeModule from 'angular-sanitize';
import { name as idModuleName } from './lib/directives/id';
import { name as widgetAreaModuleName } from './lib/directives/widget_area';
import { name as profilingModuleName } from './lib/profiling/profiling';
import { name as axVisibilityServiceModuleName } from './lib/services/visibility_service';

// exported for unit tests
export const ANGULAR_SERVICES_MODULE_NAME = 'axAngularGlobalServices';
export const ANGULAR_MODULE_NAME = 'axAngularWidgetAdapter';

export const technology = 'angular';

// Due to the nature of AngularJS v1.x, we can only create the AngularJS modules once,
// so we keep certain injections global.
let injectorCreated = false;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Provides an AngularJS v1.x adapter factory for a laxarjs bootstrapping context.
 * https://github.com/LaxarJS/laxar/blob/master/docs/manuals/adapters.md
 *
 * Because in AngularJS v1.x module registry and injector are global, there are certain restrictions when
 * bootstrapping multiple LaxarJS applications in the same Browser window:
 *  - Currently, all AngularJS modules must be available when bootstrapping the first instance, and the
 *    widget modules for all bootstrapping instances must be passed to the first invocation.
 *  - Multiple bootstrapping instances share each other's AngularJS modules (e.g. controls).
 *
 * @param {Array} modules
 *   The widget and control modules matching this adapter's technology.
 *
 * @param {Object} laxarServices
 *   adapter-visible laxarjs services
 *
 * @return {{
 *   technology: String,
 *   create: Function,
 *   applyViewChanges: Function
 * }}
 *   The instantiated adapter factory.
 */
export function bootstrap( modules, laxarServices ) {

   const api = {
      create,
      technology,
      applyViewChanges
   };

   // register controllers under normalized module names that can also be derived from the widget.json name:
   const controllerNames = {};
   modules.forEach( module => {
      const moduleKey = normalize( module.name );
      controllerNames[ moduleKey ] = `${capitalize( module.name )}Controller`;
   } );

   let $controller;
   let $compile;
   let $rootScope;
   let bootstrappingScope;
   // Instantiate the AngularJS modules and bootstrap angular, but only the first time!
   if( !injectorCreated ) {
      injectorCreated = true;
      createAngularServicesModule();
      createAngularAdapterModule();
      ng.bootstrap( document, [ ANGULAR_MODULE_NAME ] );
   }

   return api;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   // eslint-disable-next-line valid-jsdoc
   /**
    * Creates an AngularJS adapter for a specific widget instance.
    * https://github.com/LaxarJS/laxar/blob/master/docs/manuals/adapters.md
    *
    * @param {Object}      environment
    * @param {HTMLElement} environment.anchorElement
    * @param {Object}      environment.context
    * @param {EventBus}    environment.context.eventBus
    * @param {Object}      environment.context.features
    * @param {Function}    environment.context.id
    * @param {Object}      environment.context.widget
    * @param {String}      environment.context.widget.area
    * @param {String}      environment.context.widget.id
    * @param {String}      environment.context.widget.path
    * @param {Object}      environment.services
    * @param {Object}      environment.specification
    *
    * @return {Object}
    */
   function create( environment ) {

      let widgetScope;

      return {
         createController,
         domAttachTo,
         domDetach,
         destroy
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function createController( config ) {
         if( !bootstrappingScope ) {
            bootstrappingScope = $rootScope.$new();
            bootstrappingScope.i18n = {
               locale: 'default',
               tags: laxarServices.configuration.get( 'i18n.locales', { 'default': 'en' } )
            };
         }
         widgetScope = ng.extend( bootstrappingScope.$new(), environment.context );

         const moduleKey = normalize( environment.specification.name );
         const controllerName = controllerNames[ moduleKey ];
         const availableInjections = Object.freeze( {
            ...environment.services,
            $scope: widgetScope
         } );

         config.onBeforeControllerCreation( environment, availableInjections );
         $controller( controllerName, availableInjections );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Synchronously attach the widget DOM to the given area.
       *
       * @param {HTMLElement} areaElement
       *    The widget area to attach this widget to.
       * @param {String} templateHtml
       *    The AngularJS HTML template to compile and link to this widget
       */
      function domAttachTo( areaElement, templateHtml ) {
         if( templateHtml === null ) {
            return;
         }

         const element = ng.element( environment.anchorElement );
         element.html( templateHtml );
         areaElement.appendChild( environment.anchorElement );
         $compile( environment.anchorElement )( widgetScope );
         widgetScope.$digest();
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function domDetach() {
         const parent = environment.anchorElement.parentNode;
         if( parent ) {
            parent.removeChild( environment.anchorElement );
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function destroy() {
         widgetScope.$destroy();
      }

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function applyViewChanges() {
      $rootScope.$apply();
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createAngularServicesModule() {
      // Here we ensure availability of globally public laxar services for directives and other services
      ng.module( ANGULAR_SERVICES_MODULE_NAME, [] )
         .factory( 'axConfiguration', () => laxarServices.configuration )
         .factory( 'axGlobalEventBus', () => laxarServices.globalEventBus )
         .factory( 'axGlobalLog', () => laxarServices.log )
         .factory( 'axGlobalStorage', () => laxarServices.storage )
         .factory( 'axHeartbeat', () => laxarServices.heartbeat )
         .factory( 'axI18n', () => laxarServices.i18n )
         .factory( 'axTooling', () => laxarServices.toolingProviders );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createAngularAdapterModule() {

      const internalDependencies = [
         ngSanitizeModule.name || 'ngSanitize',
         ANGULAR_SERVICES_MODULE_NAME,
         idModuleName,
         widgetAreaModuleName,
         profilingModuleName,
         axVisibilityServiceModuleName
      ];

      const externalDependencies = ( modules || [] ).map( _ => _.name );

      ng.module( ANGULAR_MODULE_NAME, [ ...internalDependencies, ...externalDependencies ] )
         .run( [ '$compile', '$controller', '$rootScope', ( _$compile_, _$controller_, _$rootScope_ ) => {
            $controller = _$controller_;
            $compile = _$compile_;
            $rootScope = _$rootScope_;
         } ] )
         .factory( '$exceptionHandler', () => {
            return ( exception, cause ) => {
               const msg = exception.message || exception;
               laxarServices.log.error(
                  `There was an exception: ${msg}, \nstack: ${exception.stack}, \n, Cause: ${cause}`
               );
            };
         } );

   }

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

// For testing, to reset the global AngularJS module state:
export function reset() {
   injectorCreated = false;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function capitalize( _ ) {
   return _.replace( /^./, _ => _.toUpperCase() );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function normalize( moduleName ) {
   return moduleName
      .replace( /([a-zA-Z0-9])[-_]([a-zA-Z0-9])/g, ( $_, $1, $2 ) => $1 + $2.toUpperCase() )
      .replace( /^[A-Z]/, $_ => $_.toLowerCase() );
}
