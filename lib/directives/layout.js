/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * A module for the `axLayout` directive.
 *
 * @module axLayout
 */
import ng from 'angular';

const module = ng.module( 'axLayout', [ 'axAngularGlobalServices' ] );

const DIRECTIVE_NAME = 'axLayout';

///////////////////////////////////////////////////////////////////////////////////////////////////////////

// eslint-disable-next-line valid-jsdoc
/**
 * This directive uses the *axLayoutLoader* service to load a given layout and compile it as child to the
 * element the directive is set on. In contrast to *ngInclude* it doesn't watch the provided expression for
 * performance reasons and takes LaxarJS theming into account when loading the assets.
 *
 * @name axLayout
 * @directive
 */
module.directive( DIRECTIVE_NAME, [
   'axLayoutLoader', 'axGlobalLog', '$compile',
   ( layoutLoader, log, $compile ) => (
      {
         restrict: 'A',
         link( scope, element, attrs ) {
            const layoutName = scope.$eval( attrs[ DIRECTIVE_NAME ] );
            layoutLoader.load( layoutName )
               .then( layoutInfo => {
                  element.html( layoutInfo.htmlContent );
                  element.addClass( layoutInfo.className );
                  $compile( element.contents() )( scope );
                  scope.$emit( 'axLayoutLoaded', layoutName );
               }, err => {
                  log.error( 'axLayout: could not load layout [0], error: [1]', layoutName, err );
               } );
         }
      }
) ] );

///////////////////////////////////////////////////////////////////////////////////////////////////////////

export const name = module.name;
