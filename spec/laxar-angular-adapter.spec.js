/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import { technology, bootstrap, reset, ANGULAR_MODULE_NAME } from '../laxar-angular-adapter';
import ng from 'angular';
import 'angular-mocks';
import { create as createEventBusMock } from 'laxar/lib/testing/event_bus_mock';
import { create as createConfigurationMock } from 'laxar/lib/testing/configuration_mock';
import { create as createLogMock } from 'laxar/lib/testing/log_mock';
import * as features from 'laxar/lib/loaders/features_provider';
import widgetData from './widget_data';

const { module, inject } = window;

const defaultCssAssetPath_ = 'the_themes/default.theme/test/test_widget/css/test_widget.css';
const themeCssAssetPath_ = 'the_themes/blue.theme/test/test_widget/css/test_widget.css';
const htmlAssetPath_ = 'the_widgets/test/test_widget/default.theme/test_widget.html';
const assets = {
   [ themeCssAssetPath_ ]: 'h1 { color: blue }',
   [ defaultCssAssetPath_ ]: 'h1 { color: #ccc }',
   [ htmlAssetPath_ ]: '<h1>hello there<i ng-if="false"></i></h1>',
};

let widgetSpec_;
let widgetConfiguration_;
let widgetFeatures_;
let anchor_;

let widgetServices_;

let angularBootstrap;

beforeEach( () => {

   angularBootstrap = ng.bootstrap.bind( ng );

   spyOn( ng, 'bootstrap' );

   widgetSpec_ = widgetData.specification;
   widgetConfiguration_ = widgetData.configuration;

   function throwError( msg ) { throw new Error( msg ); }
   widgetFeatures_ = features.featuresForWidget( widgetSpec_, widgetConfiguration_, throwError );

   anchor_ = document.createElement( 'div' );

   widgetServices_ = {
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

   let environment_;
   let adapterFactory_;
   let adapter_;
   let controllerScope_;
   let injectedEventBus_;
   let injectedContext_;

   beforeEach( () => {
      const widgetModule = ng.module( 'testWidget', [] );
      widgetModule.controller( 'TestWidgetController', ( $scope, axEventBus, axContext ) => {
            controllerScope_ = $scope;
            injectedEventBus_ = axEventBus;
            injectedContext_ = axContext;
         }
      );

      adapterFactory_ = bootstrap( [ widgetModule ], {
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

      environment_ = {
         anchorElement: anchor_,
         context: {
            eventBus: widgetServices_.eventBus,
            features: widgetFeatures_,
            id: widgetServices_.idGenerator,
            widget: {
               area: widgetConfiguration_.area,
               id: widgetConfiguration_.id,
               path: widgetConfiguration_.widget
            }
         },
         specification: widgetSpec_
      };

      adapter_ = adapterFactory_.create( environment_ );
   } );


   ////////////////////////////////////////////////////////////////////////////////////////////////////////

   it( 'for applyViewChanges() calls $apply on the $rootScope', () => {
      inject( $rootScope => {
         adapterFactory_.applyViewChanges();

         expect( $rootScope.$apply ).toHaveBeenCalled();
      } );
   } );

   ////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'asked to instantiate a widget controller', () => {

      let onBeforeControllerCreationSpy;

      beforeEach( () => {
         onBeforeControllerCreationSpy = jasmine.createSpy( 'onBeforeControllerCreationSpy' );
         adapter_.createController( {
            onBeforeControllerCreation: onBeforeControllerCreationSpy
         } );
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'instantiates the widget controller with a scope', () => {
         expect( controllerScope_.$new ).toBeDefined();
         expect( controllerScope_.features ).toEqual( widgetFeatures_ );
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'injects the event bus instance for the widget as service (#107)', () => {
         expect( injectedEventBus_ ).toEqual( controllerScope_.eventBus );
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'injects a context for the widget as service (#167)', () => {
         expect( injectedContext_ ).toEqual( environment_.context );
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'calls onBeforeControllerCreation with environment and injections', () => {
         expect( onBeforeControllerCreationSpy ).toHaveBeenCalled();

         const args = onBeforeControllerCreationSpy.calls.argsFor( 0 );
         expect( args[ 0 ] ).toEqual( environment_ );
         expect( Object.keys( args[ 1 ] ) ).toContain( 'axContext' );
         expect( Object.keys( args[ 1 ] ) ).toContain( 'axEventBus' );
         expect( Object.keys( args[ 1 ] ) ).toContain( '$scope' );
      } );

   } );

   ////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'asked to attach its DOM representation', () => {

      let mockAreaNode_;

      beforeEach( () => {
         mockAreaNode_= document.createElement( 'DIV' );
         adapter_.createController( { onBeforeControllerCreation: () => {} } );
         adapter_.domAttachTo( mockAreaNode_, assets[ htmlAssetPath_ ] );
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'links the widget template', () => {
         expect( document.querySelector( 'i', anchor_ ) ).toBe( null );
         expect( anchor_.innerHTML ).not.toEqual( '' );
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'attaches its representation to the given widget area', () => {
         expect( mockAreaNode_.children.length ).toBe( 1 );
         expect( mockAreaNode_.children[ 0 ] ).toBe( anchor_ );
         // anchor class is (mostly) managed externally
         expect( anchor_.className ).toEqual( 'ng-scope' );
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'and then to detach it again', () => {

         beforeEach( () => {
            spyOn( controllerScope_, '$destroy' );
            adapter_.domDetach();
         } );

         //////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'detaches its dom node from the widget area', () => {
            expect( mockAreaNode_.children.length ).toBe( 0 );
         } );

         //////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'retains its widget services and scope', () => {
            expect( widgetServices_.release ).not.toHaveBeenCalled();
            expect( controllerScope_.$destroy ).not.toHaveBeenCalled();
         } );

      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'and then to destroy itself', () => {

         beforeEach( () => {
            spyOn( controllerScope_, '$destroy' );
            adapter_.destroy();
         } );

         //////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'destroys the corresponding angular scope', () => {
            expect( controllerScope_.$destroy ).toHaveBeenCalled();
         } );

      } );

   } );

} );
