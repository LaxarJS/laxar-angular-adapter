/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import ng from 'angular';
import { create as createOutput } from './output';

const module = ng.module( 'axProfiling', [ 'axAngularGlobalServices' ] );

///////////////////////////////////////////////////////////////////////////////////////////////////////////

let axProfiling;
let origWatch;
let win;
let out;

module.run( [ '$rootScope', '$window', 'axConfiguration', ( $rootScope, $window, configuration ) => {
   if( !configuration.get( 'profiling.enabled', false ) ) {
      return;
   }

   win = $window;
   out = createOutput( $window );

   if( !win.performance || !win.performance.now ) {
      out.log( 'Performance API is not available. Profiling is disabled.' );
      return;
   }

   out.log( '%c!!! Profiling enabled. Application performance will suffer !!!',
               'font-weight: bold; font-size: 1.2em' );
   out.log( 'Type "axProfiling.help()" to get a list of available methods' );

   const scopePrototype = $rootScope.constructor.prototype;

   axProfiling = $window.axProfiling = {
      items: {},
      widgetIdToScopeId: {},
      logWatchers( id ) {
         if( id && typeof id === 'string' ) {
            out.logForId( axProfiling, 'watchFn', id );
         }
         else {
            out.logAll( axProfiling, 'watchFn' );
         }
      },
      logListeners( id ) {
         if( id && typeof id === 'string' ) {
            out.logForId( axProfiling, 'listener', id );
         }
         else {
            out.logAll( axProfiling, 'listener' );
         }
      },
      log( id ) {
         if( id && typeof id === 'string' ) {
            out.logForId( axProfiling, null, id );
         }
         else {
            out.log( 'All listeners:' );
            out.logAll( axProfiling, 'listener' );
            out.log( 'All watchers:' );
            out.logAll( axProfiling, 'watchFn' );
         }
      },
      reset() {
         Object.keys( axProfiling.items )
            .forEach( key => {
               axProfiling.items[ key ].watchers
                  .forEach( watcher => {
                     watcher.watchFn.time = 0;
                     watcher.watchFn.count = 0;
                     watcher.listener.time = 0;
                     watcher.listener.count = 0;
                  } );
            } );
      },
      help: printHelp
   };

   origWatch = scopePrototype.$watch;
   scopePrototype.$watch = function( watchExp, listener, objectEquality ) {
      // Don't change to arrow notation, since we need access to `this` for the correct scope instance.
      return attachProfiling( this, watchExp, listener, objectEquality || false );
   };
} ] );

///////////////////////////////////////////////////////////////////////////////////////////////////////////

function attachProfiling( scope, watchExp, listener, objectEquality ) {
   const watcherIsFunction = typeof watchExp === 'function';
   const listenerIsFunction = typeof listener === 'function';

   const items = axProfiling.items;
   const context = determineContext( scope );
   if( !( scope.$id in items ) ) {
      items[ scope.$id ] = {
         context,
         watchers: []
      };

      scope.$on( '$destroy', () => {
         detachProfiling( scope );
         delete items[ scope.$id ];
      } );
   }


   if( context.widgetScopeId ) {
      if( !( context.widgetId in axProfiling.widgetIdToScopeId ) ) {
         axProfiling.widgetIdToScopeId[ context.widgetId ] = context.widgetScopeId;
      }
   }

   const profilingEntry = {
      watchFn: {
         type: watcherIsFunction ? 'f' : 's',
         name: watcherIsFunction ? `${functionName( watchExp )}()` : watchExp,
         time: 0,
         count: 0
      },
      listener: {
         type: listenerIsFunction ? 'f' : 's',
         name: listenerIsFunction ? `${functionName( listener )}()` : listener,
         time: 0,
         count: 0
      }
   };
   items[ scope.$id ].watchers.push( profilingEntry );

   const stopWatching = origWatch.call( scope, watchExp, listener, objectEquality );

   const watchEntry = scope.$$watchers[ 0 ];
   watchEntry.get = instrumentFunction( watchEntry.get, profilingEntry.watchFn );
   watchEntry.fn = instrumentFunction( watchEntry.fn, profilingEntry.listener );

   return () => {
      stopWatching();
      detachProfiling( scope );
   };
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////

function detachProfiling( scope ) {
   delete axProfiling.items[ scope.$id ];
   Object.keys( axProfiling.widgetIdToScopeId ).forEach( widgetId => {
      if( axProfiling.widgetIdToScopeId[ widgetId ] === scope.$id ) {
         delete axProfiling.widgetIdToScopeId[ widgetId ];
      }
   } );
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////

function instrumentFunction( func, entry ) {
   return ( ...args ) => {
      const start = win.performance.now();
      const result = func( ...args );
      const time = win.performance.now() - start;

      ++entry.count;
      entry.time += time;

      return result;
   };
}

 ///////////////////////////////////////////////////////////////////////////////////////////////////////////

function determineContext( scope ) {
   let current = scope;
   while( !current.hasOwnProperty( 'widget' ) && current !== current.$root ) {
      current = current.$parent;
   }

   const isInWidget = !!current.widget;

   return {
      widgetName: isInWidget ? current.widget.path : '',
      widgetId: isInWidget ? current.widget.id : '',
      widgetScopeId: isInWidget ? current.$id : null,
      scopeId: scope.$id
   };
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////

const FUNCTION_NAME_REGEXP = /^[ ]*function([^\(]*?)\(/;
function functionName( func ) {
   if( func.name && typeof func.name === 'string' ) {
      return func.name;
   }

   const [ , functionName ] = FUNCTION_NAME_REGEXP.exec( func.toString() ) || [];
   return functionName ? functionName.trim() : '[anonymous]';
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////

function printHelp() {
   out.log(
      'Available commands:\n\n' +
      ' - help():\n' +
      '     prints this help\n\n' +
      ' - log( [scopeOrWidgetId] ):\n' +
      '     If the argument is omitted this is the same as calling\n' +
      '     logWatchers() first and logListeners() afterwards.\n' +
      '     Otherwise all listeners and watchers of the widget or scope\n' +
      '     with the given id are logged in one table\n\n' +
      ' - logWatchers( [scopeOrWidgetId] ):\n' +
      '     If the argument is omitted the watchers of all scopes belonging to\n' +
      '     a specific widget or of global scopes are logged.\n' +
      '     Otherwise more detailed data for the watchers of the given scope\n' +
      '     or widget are logged.\n\n' +
      ' - logListeners( [scopeOrWidgetId] ):\n' +
      '     If the argument is omitted the listeners of all scopes belonging to\n' +
      '     a specific widget or of global scopes are logged.\n' +
      '     Otherwise more detailed data for the listeners of the given scope\n' +
      '     or widget are logged.\n\n' +
      ' - reset():\n' +
      '     Resets all "# of executions" and millisecond data to zero.'
   );
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////

export const name = module.name;
export default module;
