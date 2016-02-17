/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import ng from 'angular';
import { assert, log } from 'laxar';

let $compile;
let $controller;
let $rootScope;

let controllerNames = {};

export const technology = 'angular';

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function bootstrap( widgetModules ) {
   const dependencies = ( widgetModules || [] ).map( module => {
      // for lookup, use a normalized module name that can also be derived from the widget.json name:
      const moduleKey = normalize( module.name );
      controllerNames[ moduleKey ] = capitalize( module.name ) + 'Controller';

      // add an additional lookup entry for deprecated "my.category.MyWidget" style module names:
      supportPreviousNaming( module.name );

      return module.name;
   } );

   // TODO: Here we probably need to boostrap an angular app

   return ng.module( 'axAngularWidgetAdapter', dependencies )
      .run( [ '$compile', '$controller', '$rootScope', function( _$compile_, _$controller_, _$rootScope_ ) {
         $controller = _$controller_;
         $compile = _$compile_;
         $rootScope = _$rootScope_;
      } ] );
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
 * @param {Object}      services
 *
 * @return {Object}
 */
export function create( environment, services ) {

   // services are not relevant for now, since all LaxarJS services are already available via AngularJS DI.

   const exports = {
      createController: createController,
      domAttachTo: domAttachTo,
      domDetach: domDetach,
      destroy: destroy
   };

   const context = environment.context;
   let scope_;
   let injections_;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createController( config ) {
      const moduleKey = normalize( environment.specification.name );
      const controllerName = controllerNames[ moduleKey ];

      injections_ = {
         axContext: context,
         axEventBus: context.eventBus,
         axFeatures: context.features || {}
      };
      Object.defineProperty( injections_, '$scope', {
         enumerable: true,
         get() {
            if( !scope_ ) {
               scope_ = $rootScope.$new();
               ng.extend( scope_, context );
            }
            return scope_;
         }
      } );

      config.onBeforeControllerCreation( environment, injections_ );
      $controller( controllerName, injections_ );
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
      $compile( environment.anchorElement )( injections_.$scope );
      templateHtml = null;
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
      if( scope_ ) {
         scope_.$destroy();
      }
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
