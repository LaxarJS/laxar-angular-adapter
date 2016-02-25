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

   let heartbeatMock_;
   let mockWidgetScope_;
   let nestedScope_;

   let visibilityService_;

   beforeEach( () => {
      heartbeatMock_ = createHeartbeatMock();

      module( axVisibilityServiceModuleName );
      module( $provide => {
         $provide.value( 'axHeartbeat', heartbeatMock_ );
      } );
   } );

   beforeEach( inject( ( $rootScope, axVisibilityService ) => {
      mockWidgetScope_ = $rootScope.$new();
      mockWidgetScope_.widget = { area: 'mockArea' };
      nestedScope_ = mockWidgetScope_.$new();

      visibilityService_ = axVisibilityService;
      visibilityService_._reset();
   } ) );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   it( 'allows to query area visibility (isVisible)', () => {
      expect( visibilityService_.isVisible( 'mockArea' ) ).toBe( false );
      visibilityService_._updateState( 'mockArea', true );
      expect( visibilityService_.isVisible( 'mockArea' ) ).toBe( true );
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'allows to create a visibility handler for a given scope (handlerFor)', () => {

      let visibilityHandler_;
      let onShowSpy_;
      let onHideSpy_;
      let onChangeSpy_;

      beforeEach( () => {
         onShowSpy_ = jasmine.createSpy( 'onShow spy' );
         onHideSpy_ = jasmine.createSpy( 'onHide spy' );
         onChangeSpy_ = jasmine.createSpy( 'onChange spy' );
         visibilityHandler_ = visibilityService_.handlerFor( nestedScope_ );
         visibilityHandler_.onShow( onShowSpy_ ).onHide( onHideSpy_ ).onChange( onChangeSpy_ );
         // also test multiple handlers:
         visibilityHandler_.onShow( onShowSpy_ );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'which allows to query widget visibility (isVisible)', () => {
         expect( visibilityHandler_.isVisible() ).toBe( false );
         visibilityService_._updateState( 'mockArea', true );
         expect( visibilityHandler_.isVisible() ).toBe( true );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'which informs any onShow handler when the widget has become visible', () => {
         expect( onShowSpy_ ).not.toHaveBeenCalled();
         // simulate an event that induces a visibility change:
         visibilityService_._updateState( 'mockArea', true );
         expect( heartbeatMock_.onAfterNext ).toHaveBeenCalled();
         simulateEventBusTick();
         expect( onShowSpy_ ).toHaveBeenCalledWith( true );
         expect( onShowSpy_.calls.count() ).toEqual( 2 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'which informs any onHide handler when the widget has become invisible', () => {
         expect( onHideSpy_ ).not.toHaveBeenCalled();
         visibilityService_._updateState( 'mockArea', false );
         simulateEventBusTick();
         expect( onHideSpy_ ).toHaveBeenCalledWith( false );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'which informs any onChange handler about any change', () => {
         expect( onChangeSpy_ ).not.toHaveBeenCalled();
         // simulate an event that induces a visibility change:
         visibilityService_._updateState( 'mockArea', true );
         simulateEventBusTick();
         expect( onChangeSpy_ ).toHaveBeenCalledWith( true );

         onChangeSpy_.calls.reset();
         visibilityService_._updateState( 'mockArea', true );
         simulateEventBusTick();
         expect( onChangeSpy_ ).not.toHaveBeenCalled();

         onChangeSpy_.calls.reset();
         visibilityService_._updateState( 'mockArea', false );
         simulateEventBusTick();
         expect( onChangeSpy_ ).toHaveBeenCalledWith( false );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'which allows to remove any registered handlers manually', () => {
         visibilityHandler_.clear();
         visibilityService_._updateState( 'mockArea', true );
         simulateEventBusTick();
         expect( onShowSpy_ ).not.toHaveBeenCalled();

         visibilityService_._updateState( 'mockArea', false );
         simulateEventBusTick();
         expect( onChangeSpy_ ).not.toHaveBeenCalled();
         expect( onHideSpy_ ).not.toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'which removes any registered handlers when the governing scope is destroyed', () => {
         mockWidgetScope_.$destroy();
         visibilityService_._updateState( 'mockArea', true );
         simulateEventBusTick();
         expect( onShowSpy_ ).not.toHaveBeenCalled();

         visibilityService_._updateState( 'mockArea', false );
         simulateEventBusTick();
         expect( onChangeSpy_ ).not.toHaveBeenCalled();
         expect( onHideSpy_ ).not.toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function simulateEventBusTick() {
         heartbeatMock_.onNext( () => {} );
         heartbeatMock_.flush();
      }

   } );

} );
