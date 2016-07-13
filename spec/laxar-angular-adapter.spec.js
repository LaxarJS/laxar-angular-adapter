/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import ng from 'angular';
import 'angular-mocks';
import { create as createEventBusMock } from 'laxar/lib/testing/event_bus_mock';
import { create as createConfigurationMock } from 'laxar/lib/testing/configuration_mock';
import { create as createLogMock } from 'laxar/lib/testing/log_mock';
import * as features from 'laxar/lib/loaders/features_provider';
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

let widgetSpec;
let widgetConfiguration;
let widgetFeatures;
let anchor;

let widgetServices;

let angularBootstrap;

beforeEach( () => {

   angularBootstrap = ng.bootstrap.bind( ng );

   spyOn( ng, 'bootstrap' );

   widgetSpec = widgetData.specification;
   widgetConfiguration = widgetData.configuration;

   function throwError( msg ) { throw new Error( msg ); }
   widgetFeatures = features.featuresForWidget( widgetSpec, widgetConfiguration, throwError );

   anchor = document.createElement( 'div' );

   widgetServices = {
      idGenerator: () => 'fake-id',
      eventBus: createEventBusMock(),
      release: jasmine.createSpy( 'widgetServices.release' )
   };
} );

afterEach( reset );

///////////////////////////////////////////////////////////////////////////////////////////////////////////

describe( 'An angular widget adapter module', () => {

   it( 'provides a laxarjs compatible adapter module', () => {
      expect( bootstrap ).toEqual( jasmine.any( Function ) );
      expect( technology ).toEqual( 'angular' );
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'defines an $exceptionHandler provider', () => {

      let logMock;
      let $timeout;

      beforeEach( () => {
         logMock = createLogMock();
         bootstrap( [], {
            configuration: createConfigurationMock(),
            log: logMock
         } );
         module( ANGULAR_MODULE_NAME );
         inject( _$timeout_ => {
            $timeout = _$timeout_;
         } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'that overwrites the internal one with an implementation delegating to log.error', () => {
         // simple way to trigger the $exceptionHandler
         $timeout( () => {
            throw new Error( 'my error' );
         } );
         $timeout.flush();
         expect( logMock.error ).toHaveBeenCalled();
      } );

   } );

} );

///////////////////////////////////////////////////////////////////////////////////////////////////////////

describe( 'An angular widget adapter', () => {

   let environment;
   let adapterFactory;
   let adapter;
   let controllerScope;
   let injectedEventBus;
   let injectedContext;

   beforeEach( () => {
      const widgetModule = ng.module( 'testWidget', [] );
      widgetModule.controller( 'TestWidgetController', ( $scope, axEventBus, axContext ) => {
         controllerScope = $scope;
         injectedEventBus = axEventBus;
         injectedContext = axContext;
      } );

      adapterFactory = bootstrap( [ widgetModule ], {
         configuration: createConfigurationMock(),
         log: createLogMock()
      } );

      module( ANGULAR_MODULE_NAME );
      module( $provide => {
         $provide.value( '$rootScope', {
            $apply: jasmine.createSpy( '$rootScope.$apply' ),
            $destroy: () => {}
         } );
      } );

      // fake start of the application
      angularBootstrap( {}, [ ANGULAR_MODULE_NAME ] );

      environment = {
         anchorElement: anchor,
         context: {
            eventBus: widgetServices.eventBus,
            features: widgetFeatures,
            id: widgetServices.idGenerator,
            widget: {
               area: widgetConfiguration.area,
               id: widgetConfiguration.id,
               path: widgetConfiguration.widget
            }
         },
         specification: widgetSpec
      };

      adapter = adapterFactory.create( environment );
   } );


   ////////////////////////////////////////////////////////////////////////////////////////////////////////

   it( 'for applyViewChanges() calls $apply on the $rootScope', () => {
      inject( $rootScope => {
         adapterFactory.applyViewChanges();

         expect( $rootScope.$apply ).toHaveBeenCalled();
      } );
   } );

   ////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'asked to instantiate a widget controller', () => {

      let onBeforeControllerCreationSpy;

      beforeEach( () => {
         onBeforeControllerCreationSpy = jasmine.createSpy( 'onBeforeControllerCreationSpy' );
         adapter.createController( {
            onBeforeControllerCreation: onBeforeControllerCreationSpy
         } );
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'instantiates the widget controller with a scope', () => {
         expect( controllerScope.$new ).toBeDefined();
         expect( controllerScope.features ).toEqual( widgetFeatures );
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'injects the event bus instance for the widget as service (#107)', () => {
         expect( injectedEventBus ).toEqual( controllerScope.eventBus );
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'injects a context for the widget as service (#167)', () => {
         expect( injectedContext ).toEqual( environment.context );
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'calls onBeforeControllerCreation with environment and injections', () => {
         expect( onBeforeControllerCreationSpy ).toHaveBeenCalled();

         const args = onBeforeControllerCreationSpy.calls.argsFor( 0 );
         expect( args[ 0 ] ).toEqual( environment );
         expect( Object.keys( args[ 1 ] ) ).toContain( 'axContext' );
         expect( Object.keys( args[ 1 ] ) ).toContain( 'axEventBus' );
         expect( Object.keys( args[ 1 ] ) ).toContain( '$scope' );
      } );

   } );

   ////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'asked to attach its DOM representation', () => {

      let mockAreaNode;

      beforeEach( () => {
         mockAreaNode = document.createElement( 'DIV' );
         adapter.createController( { onBeforeControllerCreation: () => {} } );
         adapter.domAttachTo( mockAreaNode, assets[ htmlAssetPath ] );
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'links the widget template', () => {
         expect( document.querySelector( 'i', anchor ) ).toBe( null );
         expect( anchor.innerHTML ).not.toEqual( '' );
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'attaches its representation to the given widget area', () => {
         expect( mockAreaNode.children.length ).toBe( 1 );
         expect( mockAreaNode.children[ 0 ] ).toBe( anchor );
         // anchor class is (mostly) managed externally
         expect( anchor.className ).toEqual( 'ng-scope' );
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'and then to detach it again', () => {

         beforeEach( () => {
            spyOn( controllerScope, '$destroy' );
            adapter.domDetach();
         } );

         //////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'detaches its dom node from the widget area', () => {
            expect( mockAreaNode.children.length ).toBe( 0 );
         } );

         //////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'retains its widget services and scope', () => {
            expect( widgetServices.release ).not.toHaveBeenCalled();
            expect( controllerScope.$destroy ).not.toHaveBeenCalled();
         } );

      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'and then to destroy itself', () => {

         beforeEach( () => {
            spyOn( controllerScope, '$destroy' );
            adapter.destroy();
         } );

         //////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'destroys the corresponding angular scope', () => {
            expect( controllerScope.$destroy ).toHaveBeenCalled();
         } );

      } );

   } );

} );
