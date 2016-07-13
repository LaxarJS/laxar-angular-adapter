/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import { name as axVisibilityServiceModuleName } from '../visibility_service';
import 'angular-mocks';
import { create as createHeartbeatMock } from 'laxar/lib/testing/heartbeat_mock';

const { module, inject } = window;

describe( 'The axVisibilityService', () => {

   let heartbeatMock;
   let mockWidgetScope;
   let nestedScope;

   let visibilityService;

   beforeEach( () => {
      heartbeatMock = createHeartbeatMock();

      module( axVisibilityServiceModuleName );
      module( $provide => {
         $provide.value( 'axHeartbeat', heartbeatMock );
      } );
   } );

   beforeEach( inject( ( $rootScope, axVisibilityService ) => {
      mockWidgetScope = $rootScope.$new();
      mockWidgetScope.widget = { area: 'mockArea' };
      nestedScope = mockWidgetScope.$new();

      visibilityService = axVisibilityService;
      visibilityService._reset();
   } ) );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   it( 'allows to query area visibility (isVisible)', () => {
      expect( visibilityService.isVisible( 'mockArea' ) ).toBe( false );
      visibilityService._updateState( 'mockArea', true );
      expect( visibilityService.isVisible( 'mockArea' ) ).toBe( true );
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'allows to create a visibility handler for a given scope (handlerFor)', () => {

      let visibilityHandler;
      let onShowSpy;
      let onHideSpy;
      let onChangeSpy;

      beforeEach( () => {
         onShowSpy = jasmine.createSpy( 'onShow spy' );
         onHideSpy = jasmine.createSpy( 'onHide spy' );
         onChangeSpy = jasmine.createSpy( 'onChange spy' );
         visibilityHandler = visibilityService.handlerFor( nestedScope );
         visibilityHandler.onShow( onShowSpy ).onHide( onHideSpy ).onChange( onChangeSpy );
         // also test multiple handlers:
         visibilityHandler.onShow( onShowSpy );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'which allows to query widget visibility (isVisible)', () => {
         expect( visibilityHandler.isVisible() ).toBe( false );
         visibilityService._updateState( 'mockArea', true );
         expect( visibilityHandler.isVisible() ).toBe( true );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'which informs any onShow handler when the widget has become visible', () => {
         expect( onShowSpy ).not.toHaveBeenCalled();
         // simulate an event that induces a visibility change:
         visibilityService._updateState( 'mockArea', true );
         expect( heartbeatMock.onAfterNext ).toHaveBeenCalled();
         simulateEventBusTick();
         expect( onShowSpy ).toHaveBeenCalledWith( true );
         expect( onShowSpy.calls.count() ).toEqual( 2 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'which informs any onHide handler when the widget has become invisible', () => {
         expect( onHideSpy ).not.toHaveBeenCalled();
         visibilityService._updateState( 'mockArea', false );
         simulateEventBusTick();
         expect( onHideSpy ).toHaveBeenCalledWith( false );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'which informs any onChange handler about any change', () => {
         expect( onChangeSpy ).not.toHaveBeenCalled();
         // simulate an event that induces a visibility change:
         visibilityService._updateState( 'mockArea', true );
         simulateEventBusTick();
         expect( onChangeSpy ).toHaveBeenCalledWith( true );

         onChangeSpy.calls.reset();
         visibilityService._updateState( 'mockArea', true );
         simulateEventBusTick();
         expect( onChangeSpy ).not.toHaveBeenCalled();

         onChangeSpy.calls.reset();
         visibilityService._updateState( 'mockArea', false );
         simulateEventBusTick();
         expect( onChangeSpy ).toHaveBeenCalledWith( false );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'which allows to remove any registered handlers manually', () => {
         visibilityHandler.clear();
         visibilityService._updateState( 'mockArea', true );
         simulateEventBusTick();
         expect( onShowSpy ).not.toHaveBeenCalled();

         visibilityService._updateState( 'mockArea', false );
         simulateEventBusTick();
         expect( onChangeSpy ).not.toHaveBeenCalled();
         expect( onHideSpy ).not.toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'which removes any registered handlers when the governing scope is destroyed', () => {
         mockWidgetScope.$destroy();
         visibilityService._updateState( 'mockArea', true );
         simulateEventBusTick();
         expect( onShowSpy ).not.toHaveBeenCalled();

         visibilityService._updateState( 'mockArea', false );
         simulateEventBusTick();
         expect( onChangeSpy ).not.toHaveBeenCalled();
         expect( onHideSpy ).not.toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function simulateEventBusTick() {
         heartbeatMock.onNext( () => {} );
         heartbeatMock.flush();
      }

   } );

} );
