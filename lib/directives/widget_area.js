/**
 * Copyright 2016-2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * A module for the `axWidgetArea` directive.
 *
 * @module axWidgetArea
 */
import ng from 'angular';

const module = ng.module( 'axWidgetArea', [] );

const DIRECTIVE_NAME = 'axWidgetArea';

///////////////////////////////////////////////////////////////////////////////////////////////////////////

// eslint-disable-next-line valid-jsdoc
/**
 * The *axWidgetArea* directive is used to mark DOM elements as possible containers for widgets. They're
 * most commonly used in layouts using static names. These areas can then be referenced from within page
 * definitions in order to add widgets to them. Additionally it is possible that widgets expose widget
 * areas themselves. In that case the name given within the widget template is prefixed with the id of the
 * widget instance, separated by a dot. If, within a widget, a name is dynamic (i.e. can be configured via
 * feature configuration), the corresponding `ax-widget-area-binding` attribute can be set to bind a name.
 *
 * Example:
 * ```html
 * <div ax-widget-area="myArea"><!-- Here will be widgets --></div>
 * ```
 *
 * Example with binding:
 * ```html
 * <div ax-widget-area
 *      ax-widget-area-binding="features.content.areaName">
 *    <!-- Here will be widgets -->
 * </div>
 * ```
 *
 * @name axWidgetArea
 * @directive
 */
module.directive( DIRECTIVE_NAME, [ 'axWidgetServices', widgetServices => {
   return {
      restrict: 'A',
      link( scope, element, attrs ) {
         let areaName = attrs[ DIRECTIVE_NAME ];
         if( !areaName ) {
            const bindingAttribute = `${DIRECTIVE_NAME}Binding`;
            if( attrs[ bindingAttribute ] ) {
               areaName = scope.$eval( attrs[ bindingAttribute ] );
            }
            else {
               const widgetId = scope.widget && scope.widget.id;
               const message =
                  `axWidgetArea: area at ${widgetId || scope.layoutClass} has neither a name ` +
                  'nor a binding assigned.';
               throw new Error( message );
            }
         }

         widgetServices( scope ).axAreaHelper.register( areaName, element[ 0 ] );
      }
   };
} ] );

///////////////////////////////////////////////////////////////////////////////////////////////////////////

export const name = module.name;
