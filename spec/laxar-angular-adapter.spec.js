/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import ng from 'angular';
import 'angular-mocks';
import {
   createAxEventBusMock,
   createAxConfigurationMock,
   createAxLogMock
} from 'laxar/laxar-widget-service-mocks';
import { technology, bootstrap, reset, ANGULAR_MODULE_NAME } from '../laxar-angular-adapter';
import widgetData from './widget_data';


const { module, inject } = window;

const defaultCssAssetPath = 'the_themes/default.theme/test/test_widget/css/test_widget.css';
const themeCssAssetPath = 'the_themes/blue.theme/test/test_widget/css/test_widget.css';
const htmlAssetPath = 'the_widgets/test/test_widget/default.theme/test_widget.html';
const assets = {
   [ themeCssAssetPath ]: 'h1 { color: blue }',
   [ defaultCssAssetPath ]: 'h1 { color: #ccc }',
   [ htmlAssetPath ]: '<h1>hello there<i ng-if="false"></i></h1>'
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

let widgetModule;
let artifacts;
let services;
let registerHeartbeatListener;

beforeEach( () => {
   widgetModule = ng.module( 'testWidget', [] );
   artifacts = {
      widgets: [
         { ...widgetData, module: widgetModule }
      ],
      controls: []
   };

   registerHeartbeatListener = jasmine.createSpy( 'registerHeartbeatListener' );
   services = {
      heartbeat: {
         registerHeartbeatListener
      },
      configuration: createAxConfigurationMock(),
      log: createAxLogMock()
   };
} );

afterEach( reset );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe( 'An angular widget adapter module', () => {

   it( 'provides a laxarjs compatible adapter module', () => {
      expect( bootstrap ).toEqual( jasmine.any( Function ) );
      expect( technology ).toEqual( 'angular' );
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'when booststrapped', () => {

      let $rootScope;
      let $timeout;
      let heartbeatListener;

      beforeEach( () => {
         bootstrap( artifacts, services );
         module( ANGULAR_MODULE_NAME );
         inject( (_$rootScope_, _$timeout_) => {
            $rootScope = _$rootScope_;
            spyOn( $rootScope, '$digest' );
            $timeout = _$timeout_;
         } );
         heartbeatListener = registerHeartbeatListener.calls.mostRecent().args[ 0 ];
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'registers a heartbeat listener', () => {
         expect( registerHeartbeatListener ).toHaveBeenCalledWith( jasmine.any( Function ) );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'when the heartbeat listener is triggered', () => {

         beforeEach( () => {
            heartbeatListener();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'triggers a $rootScope $digest cycle', () => {
            expect( $rootScope.$digest ).toHaveBeenCalled();
         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'overwrites the AngularJS exception handler, delegating to log.error', () => {
         // simple way to trigger the $exceptionHandler
         $timeout( () => { throw new Error( 'my error' ); } );
         $timeout.flush();
         expect( services.log.error ).toHaveBeenCalled();
      } );

   } );

} );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe( 'An angular widget adapter', () => {

   let anchorElement;
   let provideServices;
   let widgetServices;

   beforeEach( () => {
      anchorElement = document.createElement( 'div' );

      provideServices = jasmine.createSpy( 'provideServices' );

      widgetServices = {
         axContext: null,
         axEventBus: createAxEventBusMock(),
         axGlobalEventBus: createAxEventBusMock(),
         axFeatures: { myProp: 'x' },
         axId: () => 'fake-id',
         release: jasmine.createSpy( 'widgetServices.release' )
      };

      spyOn( ng, 'bootstrap' ).and.callThrough();
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   let adapter;
   let injectedScope;
   let injectedEventBus;
   let injectedGlobalEventBus;
   let injectedContext;

   beforeEach( () => {
      const controller = ( $scope, axEventBus, axGlobalEventBus, axContext ) => {
         injectedScope = $scope;
         injectedEventBus = axEventBus;
         injectedGlobalEventBus = axGlobalEventBus;
         injectedContext = axContext;
      };
      widgetModule.controller( 'TestWidgetController', controller );
      module( ANGULAR_MODULE_NAME );
      const adapterFactory = bootstrap( artifacts, services );

      const environment = {
         anchorElement,
         provideServices,
         services: widgetServices,
         widgetName: widgetData.descriptor.name
      };

      // emulate the way laxar widget services are created:
      const decorators = adapterFactory.serviceDecorators();
      Object.keys( decorators )
         .filter( name => name !== 'axContext' )
         .forEach( name => {
            environment.services[ name ] = decorators[ name ]( environment.services[ name ] );
         } );
      const widgetConfiguration = widgetData.configuration;
      widgetServices.axContext = decorators.axContext( {
         eventBus: environment.services.axEventBus,
         features: environment.services.axFeatures,
         id: environment.services.axId,
         widget: {
            area: widgetConfiguration.area,
            id: widgetConfiguration.id,
            path: widgetConfiguration.widget
         }
      } );
      adapter = adapterFactory.create( environment );
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   it( 'bootstraps AngularJS', () => {
      expect( ng.bootstrap ).toHaveBeenCalled();
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'on completion of an event bus promise', () => {

      let resolveSpy;
      let rootScope;

      beforeEach( done => {
         inject( $rootScope => { rootScope = $rootScope; } );
         resolveSpy = jasmine.createSpy( 'resolveSpy' );
         rootScope.$evalAsync = jasmine.createSpy( '$evalAsync' );
         injectedEventBus.publish( 'doSomething' ).then( resolveSpy );
         expect( rootScope.$evalAsync ).not.toHaveBeenCalled();
         expect( resolveSpy ).not.toHaveBeenCalled();

         injectedEventBus.flush();
         setTimeout( done, 0 );
      } );

      afterEach( () => {
         delete rootScope.$evalAsync;
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'schedules a $digest cycle', () => {
         expect( rootScope.$evalAsync ).toHaveBeenCalled();
         expect( resolveSpy ).toHaveBeenCalled();
      } );

      describe( 'then on completion of a global event bus promise', () => {

         beforeEach( done => {
            rootScope.$evalAsync.calls.reset();
            resolveSpy.calls.reset();
            injectedGlobalEventBus.publish( 'doSomething' ).then( resolveSpy );
            injectedGlobalEventBus.flush();
            setTimeout( done, 0 );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'schedules another $digest cycle', () => {
            expect( rootScope.$evalAsync ).toHaveBeenCalled();
            expect( resolveSpy ).toHaveBeenCalled();
         } );

      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'asked to instantiate a widget controller', () => {

      it( 'instantiates the widget controller with a scope', () => {
         expect( injectedScope.$new ).toBeDefined();
         expect( injectedScope.features ).toEqual( widgetServices.axFeatures );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'injects the event bus instance for the widget as service (laxar#107)', () => {
         expect( injectedEventBus ).toBe( injectedScope.eventBus );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'uses the same injection for $scope and axContext (#18)', () => {
         expect( injectedScope ).toBe( injectedContext );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'injects a context for the widget as service (laxar#167)', () => {
         expect( injectedContext ).toEqual( widgetServices.axContext );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'calls provideServices with the widget injections', () => {
         expect( provideServices ).toHaveBeenCalled();

         const [ services ] = provideServices.calls.argsFor( 0 );
         expect( Object.keys( services ) ).toContain( 'axContext' );
         expect( Object.keys( services ) ).toContain( 'axEventBus' );
         expect( Object.keys( services ) ).toContain( '$scope' );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'asked to attach its DOM representation', () => {

      let mockAreaNode;

      beforeEach( () => {
         mockAreaNode = document.createElement( 'DIV' );
         adapter.domAttachTo( mockAreaNode, assets[ htmlAssetPath ] );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'links the widget template', () => {
         expect( document.querySelector( 'i', anchorElement ) ).toBe( null );
         expect( anchorElement.innerHTML ).not.toEqual( '' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'attaches its representation to the given widget area', () => {
         expect( mockAreaNode.children.length ).toBe( 1 );
         expect( mockAreaNode.children[ 0 ] ).toBe( anchorElement );
         expect( anchorElement.className ).toEqual( 'ng-scope' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'and then to detach it again', () => {

         beforeEach( () => {
            spyOn( injectedScope, '$destroy' );
            adapter.domDetach();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'detaches its dom node from the widget area', () => {
            expect( mockAreaNode.children.length ).toBe( 0 );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'retains its widget services and scope', () => {
            expect( widgetServices.release ).not.toHaveBeenCalled();
            expect( injectedScope.$destroy ).not.toHaveBeenCalled();
         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'and then to destroy itself', () => {

         beforeEach( () => {
            spyOn( injectedScope, '$destroy' );
            adapter.destroy();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'destroys the corresponding angular scope', () => {
            expect( injectedScope.$destroy ).toHaveBeenCalled();
         } );

      } );

   } );

} );
