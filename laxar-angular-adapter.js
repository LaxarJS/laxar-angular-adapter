/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */

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
 * @module laxar-angular-adapter
 */

import ng from 'angular';
import ngSanitizeModule from 'angular-sanitize';
import { assert } from 'laxar';
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

export function bootstrap( { widgets, controls }, laxarServices, anchorElement ) {

   const api = {
      create,
      serviceDecorators
   };

   // register controllers under normalized module names that can also be derived from the widget.json name:
   const controllerNames = {};
   widgets.forEach( ({ descriptor, module }) => {
      controllerNames[ descriptor.name ] = `${capitalize( module.name )}Controller`;
   } );

   const activeWidgetServices = {};

   let $controller;
   let $compile;
   let $rootScope;
   // Instantiate the AngularJS modules and bootstrap angular, but only the first time!
   if( !injectorCreated ) {
      injectorCreated = true;
      createAngularServicesModule();
      createAngularAdapterModule();
   }
   ng.bootstrap( anchorElement, [ ANGULAR_MODULE_NAME ] );

   return api;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function serviceDecorators() {
      return {
         axContext( context ) {
            $rootScope.i18n = {
               locale: 'default',
               tags: laxarServices.configuration.get( 'i18n.locales', { 'default': 'en' } )
            };
            return ng.extend( $rootScope.$new(), context );
         }
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   // eslint-disable-next-line valid-jsdoc
   function create( { widgetName, anchorElement, services, onBeforeControllerCreation } ) {

      const widgetScope = services.axContext;
      const { id } = widgetScope.widget;
      activeWidgetServices[ id ] = services;
      createController();

      return {
         domAttachTo,
         domDetach,
         destroy
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function createController() {
         const controllerName = controllerNames[ widgetName ];
         services.$scope = widgetScope;
         onBeforeControllerCreation( services );
         $controller( controllerName, services );
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
         if( templateHtml === null ) { return; }

         const element = ng.element( anchorElement );
         element.html( templateHtml );
         areaElement.appendChild( anchorElement );
         $compile( anchorElement )( widgetScope );
         if( !$rootScope.$$phase ) {
            widgetScope.$digest();
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function domDetach() {
         const parent = anchorElement.parentNode;
         if( parent ) {
            parent.removeChild( anchorElement );
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function destroy() {
         widgetScope.$destroy();
         delete activeWidgetServices[ id ];
      }

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
         .factory( 'axTooling', () => laxarServices.tooling )
         .factory( 'axWidgetServices', () => createWidgetServiceProvider() );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createWidgetServiceProvider() {
      return scope => {
         let currentScope = scope;
         let widgetId = null;
         while( !widgetId && currentScope ) {
            if( currentScope.widget && typeof currentScope.widget.id === 'string' ) {
               widgetId = currentScope.widget.id;
               break;
            }
            currentScope = currentScope.$parent;
         }

         assert.state( widgetId, 'No widget context found in given scope or one of its parents.' );

         const services = activeWidgetServices[ widgetId ];
         assert.state( services, `No services found for widget with id ${widgetId}.` );

         return services;
      };
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

      const externalDependencies = ( widgets ).concat( controls ).map( _ => _.module.name );

      ng.module( ANGULAR_MODULE_NAME, [ ...internalDependencies, ...externalDependencies ] ).run(
         [ '$compile', '$controller', '$q', '$rootScope', ( _$compile_, _$controller_, $q, _$rootScope_ ) => {
            $controller = _$controller_;
            $compile = _$compile_;
            $rootScope = _$rootScope_;

            installAngularPromise( $q );
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

function installAngularPromise( $q ) {
   AngularPromise.Promise = Promise;
   function AngularPromise( callback ) {
      const _ = $q.defer();
      callback(
         value => { _.resolve( value ); },
         error => { _.reject( error ); }
      );
      return _.promise;
   }
   AngularPromise.race = $q.race || ( promises =>
      AngularPromise( ( resolve, reject ) => {
         return AngularPromise.Promise.race( promises ).then( resolve, reject );
      } ) );
   AngularPromise.all = $q.all;
   AngularPromise.resolve = $q.when;
   AngularPromise.reject = $q.reject;
   window.Promise = AngularPromise;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

// For testing, to reset the global AngularJS module state:
export function reset() {
   injectorCreated = false;
   window.Promise = window.Promise.Promise || window.Promise;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function capitalize( _ ) {
   return _.replace( /^./, _ => _.toUpperCase() );
}
