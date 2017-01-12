/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import ng from 'angular';

const module = ng.module( 'axVisibilityService', [] );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

// eslint-disable-next-line valid-jsdoc
/**
 * Directives should use this service to stay informed about visibility changes to their widget.
 * They should not attempt to determine their visibility from the event bus (no DOM information),
 * nor poll it from the browser (too expensive).
 *
 * In contrast to the visibility events received over the event bus, these handlers will fire _after_ the
 * visibility change has been implemented in the DOM, at which point in time the actual browser rendering
 * state should correspond to the information conveyed in the event.
 *
 * The visibility service allows to register for onShow/onHide/onChange. When cleared, all handlers for
 * the given scope will be cleared. Handlers are automatically cleared as soon as the given scope is
 * destroyed. Handlers will be called whenever the given scope's visibility changes due to the widget
 * becoming visible/invisible. Handlers will _not_ be called on state changes originating _from within_ the
 * widget such as those caused by `ngShow`.
 *
 * If a widget becomes visible at all, the corresponding handlers for onChange and onShow are guaranteed
 * to be called at least once.
 *
 * @name axVisibilityService
 * @injection
 */
module.factory( 'axVisibilityService', [
   'axWidgetServices', 'axHeartbeat',
   ( widgetServices, heartbeat ) => {

      return {
         handlerFor
      };

      /**
       * Create a DOM visibility handler for the given scope.
       *
       * @param {Object} scope
       *    the scope from which to infer visibility. Must be a widget scope or nested in a widget scope
       *
       * @return {axVisibilityServiceHandler}
       *    a visibility handler for the given scope
       *
       * @memberOf axVisibilityService
       */
      function handlerFor( scope ) {
         const { axVisibility } = widgetServices( scope );
         axVisibility.onChange( updateState );
         scope.$on( '$destroy', () => { axVisibility.unsubscribe( updateState ); } );
         let lastState = axVisibility.isVisible();

         /**
          * A scope bound visibility handler.
          *
          * @name axVisibilityServiceHandler
          */
         const api = {

            /**
             * Determine if the governing widget scope's DOM is visible right now.
             *
             * @return {Boolean}
             *    `true` if the widget associated with this handler is visible right now, else `false`
             *
             * @memberOf axVisibilityServiceHandler
             */
            isVisible() {
               return axVisibility.isVisible();
            },

            //////////////////////////////////////////////////////////////////////////////////////////////////

            /**
             * Schedule a handler to be called with the new DOM visibility on any DOM visibility change.
             *
             * @param {Function<Boolean>} handler
             *    the callback to process visibility changes
             *
             * @return {axVisibilityServiceHandler}
             *    this visibility handler (for chaining)
             *
             * @memberOf axVisibilityServiceHandler
             */
            onChange( handler ) {
               addHandler( handler, true );
               addHandler( handler, false );
               return api;
            },

            //////////////////////////////////////////////////////////////////////////////////////////////////

            /**
             * Schedule a handler to be called with the new DOM visibility when it has changed to `true`.
             *
             * @param {Function<Boolean>} handler
             *    the callback to process visibility changes
             *
             * @return {axVisibilityServiceHandler}
             *    this visibility handler (for chaining)
             *
             * @memberOf axVisibilityServiceHandler
             */
            onShow( handler ) {
               addHandler( handler, true );
               return api;
            },

            //////////////////////////////////////////////////////////////////////////////////////////////////

            /**
             * Schedule a handler to be called with the new DOM visibility when it has changed to `false`.
             *
             * @param {Function<Boolean>} handler
             *    the callback to process visibility changes
             *
             * @return {axVisibilityServiceHandler}
             *    this visibility handler (for chaining)
             *
             * @memberOf axVisibilityServiceHandler
             */
            onHide( handler ) {
               addHandler( handler, false );
               return api;
            },

            //////////////////////////////////////////////////////////////////////////////////////////////////

            /**
             * Removes all visibility handlers.
             *
             * @return {axVisibilityServiceHandler}
             *    this visibility handler (for chaining)
             *
             * @memberOf axVisibilityServiceHandler
             */
            clear

         };

         const showHandlers = [];
         const hideHandlers = [];

         return api;

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function clear() {
            showHandlers.splice( 0, showHandlers.length );
            hideHandlers.splice( 0, hideHandlers.length );
            return api;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         // eslint-disable-next-line valid-jsdoc
         /**
          * Run all handlers registered for the given area and target state after the next heartbeat.
          * Also remove any handlers that have been cleared since the last run.
          * @private
          */
         function updateState( targetState ) {
            const state = axVisibility.isVisible();
            if( state === lastState ) {
               return;
            }
            lastState = state;
            heartbeat.onAfterNext( () => {
               const handlers = targetState ? showHandlers : hideHandlers;
               handlers.forEach( f => f( targetState ) );
            } );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         // eslint-disable-next-line valid-jsdoc
         /**
          * Add a show/hide-handler for a given area and visibility state. Execute the handler right away if
          * the state is already known, and `true` (since all widgets start as invisible).
          * @private
          */
         function addHandler( handler, targetState ) {
            ( targetState ? showHandlers : hideHandlers ).push( handler );

            // State already known to be true? In that case, initialize:
            if( targetState && axVisibility.isVisible() === targetState ) {
               handler( targetState );
            }
         }

      }

   } ] );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const name = module.name;
