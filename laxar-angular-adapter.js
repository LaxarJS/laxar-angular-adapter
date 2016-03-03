/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import ng from 'angular';
import ngSanitizeModule from 'angular-sanitize';
import { log } from 'laxar';
import { name as idModuleName } from './lib/directives/id';
import { name as layoutModuleName } from './lib/directives/layout';
import { name as widgetAreaModuleName } from './lib/directives/widget_area';
import { name as profilingModuleName } from './lib/profiling/profiling';
import { name as axVisibilityServiceModuleName } from './lib/services/visibility_service';

let laxarServices;
let $compile;
let $controller;
let $rootScope;

const controllerNames = {};

// exported for unit tests
export const ANGULAR_MODULE_NAME = 'axAngularWidgetAdapter';

export const technology = 'angular';

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function bootstrap( widgetModules, services ) {
   laxarServices = services;

   const externalDependencies = ( widgetModules || [] ).map( module => {
      // for lookup, use a normalized module name that can also be derived from the widget.json name:
      const moduleKey = normalize( module.name );
      controllerNames[ moduleKey ] = `${capitalize( module.name )}Controller`;

      // add an additional lookup entry for deprecated "my.category.MyWidget" style module names:
      supportPreviousNaming( module.name );

      return module.name;
   } );

   const internalDependencies = [
      ngSanitizeModule.name || 'ngSanitize',
      idModuleName,
      layoutModuleName,
      widgetAreaModuleName,
      profilingModuleName,
      axVisibilityServiceModuleName,
   ];

   ng.module( ANGULAR_MODULE_NAME, [ ...internalDependencies, ...externalDependencies ] )
      .run( [ '$compile', '$controller', '$rootScope', ( _$compile_, _$controller_, _$rootScope_ ) => {
         $controller = _$controller_;
         $compile = _$compile_;
         $rootScope = _$rootScope_;

         $rootScope.i18n = {
            locale: 'default',
            tags: laxarServices.configuration.get( 'i18n.locales', { 'default': 'en' } )
         };
      } ] )
      .factory( '$exceptionHandler', () => {
         return ( exception, cause ) => {
            const msg = exception.message || exception;
            log.error( `There was an exception: ${msg}, \nstack: ${exception.stack}, \n, Cause: ${cause}` );
         };
      } );

   ng.bootstrap( document, [ ANGULAR_MODULE_NAME ] );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
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
 * @param {Object}      environment.specification
 *
 * @return {Object}
 */
export function create( environment ) {

   // services are not relevant for now, since all LaxarJS services are already available via AngularJS DI.

   const exports = {
      createController: createController,
      domAttachTo: domAttachTo,
      domDetach: domDetach,
      destroy: destroy
   };

   let injections;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createController( config ) {
      const moduleKey = normalize( environment.specification.name );
      const controllerName = controllerNames[ moduleKey ];

      injections = {
         axConfiguration: laxarServices.configuration,
         axContext: environment.context,
         axEventBus: environment.context.eventBus,
         axFeatures: environment.context.features || {},
         axFlowService: laxarServices.flowService,
         axGlobalEventBus: laxarServices.globalEventBus,
         $scope: ng.extend( $rootScope.$new(), environment.context )
      };

      config.onBeforeControllerCreation( environment, injections );
      $controller( controllerName, injections );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Synchronously attach the widget DOM to the given area.
    *
    * @param {HTMLElement} areaElement
    *    The widget area to attach this widget to.
    * @param {String} templateHtml
    *
    */
   function domAttachTo( areaElement, templateHtml ) {
      if( templateHtml === null ) {
         return;
      }

      const element = ng.element( environment.anchorElement );
      element.html( templateHtml );
      areaElement.appendChild( environment.anchorElement );
      $compile( environment.anchorElement )( injections.$scope );
      injections.$scope.$digest();
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function domDetach() {
      const parent = environment.anchorElement.parentNode;
      if( parent ) {
         parent.removeChild( environment.anchorElement );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function destroy() {
      injections.$scope.$destroy();
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return exports;

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function applyViewChanges() {
   $rootScope.$apply();
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

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function supportPreviousNaming( moduleName ) {
   if( moduleName.indexOf( '.' ) === -1 ) {
      return;
   }

   const lookupName = moduleName.replace( /^.*\.([^.]+)$/, ( $_, $1 ) => {
      return $1.replace( /_(.)/g, ( $_, $1 ) => $1.toUpperCase() );
   } );
   controllerNames[ lookupName ] = controllerNames[ moduleName ] = moduleName + '.Controller';

   log.warn( 'Deprecation: AngularJS widget module name "' + moduleName + '" violates naming rules! ' +
             'Module should be named "' + lookupName + '". ' +
             'Controller should be named "' + capitalize( lookupName ) + 'Controller".' );
}
