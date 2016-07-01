/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import profilingModule from '../profiling';
import ng from 'angular';
import 'angular-mocks';
import { create as createConfigurationMock } from 'laxar/lib/testing/configuration_mock';

const { module, inject } = window;

describe( 'A Profiling module', () => {

   let runBlock;
   let windowMock;
   let $injector;
   let $rootScope;
   let configuration;
   let configurationValues;

   let scope1;
   let scope11;
   let scope2;

   function setupExampleWatchers() {
      scope1 = $rootScope.$new();
      scope1.widget = { id: 'myWidget0', path: 'myWidget' };
      scope1.$watch( 'thing1', function listener1() {} );

      scope11 = scope1.$new();
      scope11.$watch( 'thing11', function listener11() {} );

      scope2 = $rootScope.$new();
      scope2.$watch( 'thing2', function listener2() {} );

      $rootScope.$apply( () => {} );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   beforeEach( () => {
      // This prevents the module from calling its run method before spies and such are ready.
      [ runBlock ] = profilingModule._runBlocks;
      profilingModule._runBlocks = [];

      windowMock = {
         _nowIndex: 0,
         _nowCycle: [ 0, 0.12345, 0, 0.0051 ],
         performance: {
            now: jasmine.createSpy( 'performance.now' ).and.callFake( () => {
               const now = windowMock._nowCycle[ windowMock._nowIndex ];
               if( ++windowMock._nowIndex >= windowMock._nowCycle.length ) {
                  windowMock._nowIndex = 0;
               }
               return now;
            } )
         },
         console: {
            log: jasmine.createSpy( 'console.log' )
         }
      };

      configurationValues = {};
      configuration = createConfigurationMock( configurationValues );
      ng.module( 'axAngularGlobalServices', [] )
         .service( 'axConfiguration', () => configuration );
      module( { $window: windowMock } );
      module( 'axAngularGlobalServices' );
      module( profilingModule.name );

      inject( ( _$injector_, _$rootScope_ ) => {
         $injector = _$injector_;
         $rootScope = _$rootScope_;
      } );
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   afterEach( () => {
      profilingModule._runBlocks = [ runBlock ];
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'by default', () => {

      beforeEach( () => {
         $injector.invoke( runBlock, null );
      } );

      it( 'is not enabled', () => {
         expect( windowMock.axProfiling ).toBeUndefined();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'when disabled', () => {

      beforeEach(() => {
         configurationValues[ 'profiling.enabled' ] = false;
         $injector.invoke( runBlock, null );
      } );

      it( 'does not pollute the global namespace', () => {
         expect( windowMock.axProfiling ).toBeUndefined();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'when enabled without performance API', function() {

      beforeEach( function() {
         configurationValues[ 'profiling.enabled' ] = true;
         delete windowMock.performance;
         $injector.invoke( runBlock, null );
      } );

      it( 'returns with warning', () => {
         expect( windowMock.axProfiling ).toBeUndefined();
         expect( windowMock.console.log ).toHaveBeenCalledWith(
            'Performance API is not available. Profiling is disabled.'
         );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'when enabled with performance API', () => {

      let origWatch;

      beforeEach( () => {
         configurationValues[ 'profiling.enabled' ] = true;
         origWatch = $rootScope.constructor.prototype.$watch;
         $injector.invoke( runBlock, null );

         setupExampleWatchers();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'logs a performance penalty warning and an introduction', () => {
         expect( windowMock.console.log ).toHaveBeenCalledWith(
            '%c!!! Profiling enabled. Application performance will suffer !!!',
            'font-weight: bold; font-size: 1.2em'
         );
         expect( windowMock.console.log ).toHaveBeenCalledWith(
            'Type "axProfiling.help()" to get a list of available methods'
         );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'creates a global public API', () => {
         const axProfiling = windowMock.axProfiling;
         expect( typeof axProfiling ).toEqual( 'object' );
         expect( typeof axProfiling.help ).toEqual( 'function' );
         expect( typeof axProfiling.log ).toEqual( 'function' );
         expect( typeof axProfiling.logListeners ).toEqual( 'function' );
         expect( typeof axProfiling.logWatchers ).toEqual( 'function' );
         expect( typeof axProfiling.reset ).toEqual( 'function' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'monkey-patches Scope.$watch', () => {
         expect( $rootScope.constructor.prototype.$watch ).not.toBe( origWatch );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'collects context information for all watchers without widget in scope hierarchy', () => {
         const items = windowMock.axProfiling.items;

         expect( items[ scope2.$id ].context ).toEqual( {
            'widgetName': '',
            'widgetId': '',
            'widgetScopeId': null,
            'scopeId': scope2.$id
         } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'collects context information for all watchers with widget in scope hierarchy', () => {
         const items = windowMock.axProfiling.items;

         expect( items[ scope1.$id ].context ).toEqual( {
            'widgetName': 'myWidget',
            'widgetId': 'myWidget0',
            'widgetScopeId': scope1.$id,
            'scopeId': scope1.$id
         } );
         expect( items[ scope11.$id ].context ).toEqual( {
            'widgetName': 'myWidget',
            'widgetId': 'myWidget0',
            'widgetScopeId': scope1.$id,
            'scopeId': scope11.$id
         } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'initializes profiling tables for every call to $watch', () => {
         const items = windowMock.axProfiling.items;

         expect( items[ scope2.$id ].watchers ).toEqual( [
            {
               'watchFn': {
                  'type': 's',
                  'name': 'thing2',
                  'time': jasmine.any( Number ),
                  'count': jasmine.any( Number )
               },
               'listener': {
                  'type': 'f',
                  'name': 'listener2()',
                  'time': jasmine.any( Number ),
                  'count': jasmine.any( Number )
               }
            }
         ] );

         expect( items[ scope1.$id ].watchers ).toEqual( [
            {
               'watchFn': {
                  'type': 's',
                  'name': 'thing1',
                  'time': jasmine.any( Number ),
                  'count': jasmine.any( Number )
               },
               'listener': {
                  'type': 'f',
                  'name': 'listener1()',
                  'time': jasmine.any( Number ),
                  'count': jasmine.any( Number )
               }
            }
         ] );

         expect( items[ scope11.$id ].watchers ).toEqual( [
            {
               'watchFn': {
                  'type': 's',
                  'name': 'thing11',
                  'time': jasmine.any( Number ),
                  'count': jasmine.any( Number )
               },
               'listener': {
                  'type': 'f',
                  'name': 'listener11()',
                  'time': jasmine.any( Number ),
                  'count': jasmine.any( Number )
               }
            }
         ] );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'when enabled, and a $watcher is fired', () => {

      beforeEach( () => {
         configurationValues[ 'profiling.enabled' ] = true;
         $injector.invoke( runBlock, null );

         setupExampleWatchers();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'execution count for all watchers is incremented', () => {
         const beforeThing1 = watchersForScope( scope1 )[0].watchFn.count;
         const beforeThing11 = watchersForScope( scope11 )[0].watchFn.count;
         const beforeThing2 = watchersForScope( scope2 )[0].watchFn.count;

         scope1.$apply( () => {
            scope1.thing1 = 12;
         } );

         expect( watchersForScope( scope1 )[0].watchFn.count ).toBeGreaterThan( beforeThing1 );
         expect( watchersForScope( scope11 )[0].watchFn.count ).toBeGreaterThan( beforeThing11 );
         expect( watchersForScope( scope2 )[0].watchFn.count ).toBeGreaterThan( beforeThing2 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'execution count only for the affected listener is incremented', () => {
         const beforeThing1 = watchersForScope( scope1 )[0].listener.count;
         const beforeThing11 = watchersForScope( scope11 )[0].listener.count;
         const beforeThing2 = watchersForScope( scope2 )[0].listener.count;

         scope1.$apply( () => {
            scope1.thing1 = 12;
         } );

         expect( watchersForScope( scope1 )[0].listener.count ).toBeGreaterThan( beforeThing1 );
         expect( watchersForScope( scope11 )[0].listener.count ).toBe( beforeThing11 );
         expect( watchersForScope( scope2 )[0].listener.count ).toBe( beforeThing2 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'sums up the milliseconds needed by the watcher and listener', () => {
         const watcher = watchersForScope( scope1 )[0];

         watcher.watchFn.time = 0;
         watcher.watchFn.count = 0;
         watcher.listener.time = 0;
         watcher.listener.count = 0;

         windowMock._nowIndex = 0;
         scope1.$apply( () => {
            scope1.thing1 = 12;
         } );

         expect( watcher.watchFn.time ).toEqual( watcher.watchFn.count * 0.12345 );
         expect( watcher.listener.time ).toEqual( watcher.listener.count * 0.0051 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function watchersForScope( scope ) {
         return windowMock.axProfiling.items[ scope.$id ].watchers;
      }

   } );

} );
