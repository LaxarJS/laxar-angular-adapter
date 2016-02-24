/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import ng from 'angular';

const module = ng.module( 'axVisibilityService', [] );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
module.factory( 'axVisibilityService', [ 'axHeartbeat', '$rootScope', ( heartbeat, $rootScope ) => {

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
      const handlerId = scope.$id;
      scope.$on( '$destroy', clear );

      // Find the widget scope among the ancestors:
      let widgetScope = scope;
      while( widgetScope !== $rootScope && !(widgetScope.widget && widgetScope.widget.area) ) {
         widgetScope = widgetScope.$parent;
      }

      const areaName = widgetScope.widget && widgetScope.widget.area;
      if( !areaName ) {
         throw new Error( 'axVisibilityService: could not determine widget area for scope: ' + handlerId );
      }

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
            return isVisible( areaName );
         },

         /////////////////////////////////////////////////////////////////////////////////////////////////////

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
            addHandler( handlerId, areaName, handler, true );
            addHandler( handlerId, areaName, handler, false );
            return api;
         },

         /////////////////////////////////////////////////////////////////////////////////////////////////////

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
            addHandler( handlerId, areaName, handler, true );
            return api;
         },

         /////////////////////////////////////////////////////////////////////////////////////////////////////

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
            addHandler( handlerId, areaName, handler, false );
            return api;
         },

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         /**
          * Removes all visibility handlers.
          *
          * @return {axVisibilityServiceHandler}
          *    this visibility handler (for chaining)
          *
          * @memberOf axVisibilityServiceHandler
          */
         clear: clear

      };

      return api;

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function clear() {
         clearHandlers( handlerId );
         return api;
      }

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   // track state to inform handlers that register after visibility for a given area was initialized
   let knownState;

   // store the registered show/hide-handlers by governing widget area
   let showHandlers;
   let hideHandlers;

   // secondary lookup-table to track removal, avoiding O(n^2) cost for deleting n handlers in a row
   let handlersById;

   return {
      isVisible: isVisible,
      handlerFor: handlerFor,
      // runtime-internal api for use by the page controller
      _updateState: updateState,
      _reset: reset
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function reset() {
      knownState = {};
      showHandlers = {};
      hideHandlers = {};
      handlersById = {};
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Determine if the given area's content DOM is visible right now.
    * @param {String} area
    *    the full name of the widget area to query
    *
    * @return {Boolean}
    *    `true` if the area is visible right now, else `false`.
    *
    * @memberOf axVisibilityService
    */
   function isVisible( area ) {
      return knownState[ area ] || false;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Run all handlers registered for the given area and target state after the next heartbeat.
    * Also remove any handlers that have been cleared since the last run.
    * @private
    */
   function updateState( area, targetState ) {
      if( knownState[ area ] === targetState ) {
         return;
      }
      knownState[ area ] = targetState;
      heartbeat.onAfterNext( () => {
         const areaHandlers = ( targetState ? showHandlers : hideHandlers )[ area ];
         if( !areaHandlers ) { return; }
         for( let i = areaHandlers.length - 1; i >= 0; --i ) {
            const handlerRef = areaHandlers[ i ];
            if( handlerRef.handler === null ) {
               areaHandlers.splice( i, 1 );
            }
            else {
               handlerRef.handler( targetState );
            }
         }
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Add a show/hide-handler for a given area and visibility state. Execute the handler right away if the
    * state is already known.
    * @private
    */
   function addHandler( id, area, handler, targetState ) {
      const handlerRef = { handler: handler };
      handlersById[ id ] = handlersById[ id ] || [];
      handlersById[ id ].push( handlerRef );

      const areaHandlers = targetState ? showHandlers : hideHandlers;
      areaHandlers[ area ] = areaHandlers[ area ] || [];
      areaHandlers[ area ].push( handlerRef );

      // State already known? In that case, initialize:
      if( area in knownState && knownState[ area ] === targetState ) {
         handler( targetState );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function clearHandlers( id ) {
      if( handlersById[ id ] ) {
         handlersById[ id ].forEach( matchingHandlerRef => {
            matchingHandlerRef.handler = null;
         } );
      }
   }

} ] );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const name = module.name;
