/**
 * Copyright 2016-2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import { name as axVisibilityServiceModuleName } from '../visibility_service';
import 'angular-mocks';
import {
   createAxEventBusMock,
   createAxHeartbeatMock,
   createAxVisibilityMock
} from 'laxar/laxar-widget-service-mocks';

const { module, inject } = window;

describe( 'The axVisibilityService', () => {

   let widgetData;

   let heartbeatMock;
   let visibilityMock;

   let mockWidgetScope;
   let nestedScope;

   let visibilityService;

   beforeEach( () => {
      widgetData = { id: 'mockWidget', area: 'mockArea' };
      heartbeatMock = createAxHeartbeatMock();
      visibilityMock = createAxVisibilityMock( {
         eventBus: createAxEventBusMock(),
         widget: widgetData
      } );

      module( axVisibilityServiceModuleName );
      module( $provide => {
         $provide.value( 'axHeartbeat', heartbeatMock );
         $provide.value( 'axWidgetServices', () => ({
            axVisibility: visibilityMock
         }) );
      } );
   } );

   beforeEach( inject( ( $rootScope, axVisibilityService ) => {
      mockWidgetScope = $rootScope.$new();
      mockWidgetScope.widget = widgetData;
      nestedScope = mockWidgetScope.$new();

      visibilityService = axVisibilityService;
   } ) );

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
         visibilityMock.mockShow();
         expect( visibilityHandler.isVisible() ).toBe( true );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'which informs any onShow handler when the widget has become visible', () => {
         expect( onShowSpy ).not.toHaveBeenCalled();
         visibilityMock.mockShow();
         expect( heartbeatMock.onAfterNext ).toHaveBeenCalled();
         simulateEventBusTick();
         expect( onShowSpy ).toHaveBeenCalledWith( true );
         expect( onShowSpy.calls.count() ).toEqual( 2 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'which informs any onHide handler when the widget has become invisible', () => {
         expect( onHideSpy ).not.toHaveBeenCalled();
         visibilityMock.mockShow();
         visibilityMock.mockHide();
         simulateEventBusTick();
         expect( onHideSpy ).toHaveBeenCalledWith( false );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'which informs any onChange handler about any change', () => {
         expect( onChangeSpy ).not.toHaveBeenCalled();
         visibilityMock.mockShow();
         simulateEventBusTick();
         expect( onChangeSpy ).toHaveBeenCalledWith( true );

         onChangeSpy.calls.reset();
         visibilityMock.mockShow();
         simulateEventBusTick();
         expect( onChangeSpy ).not.toHaveBeenCalled();

         onChangeSpy.calls.reset();
         visibilityMock.mockHide();
         simulateEventBusTick();
         expect( onChangeSpy ).toHaveBeenCalledWith( false );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'which allows to remove any registered handlers manually', () => {
         visibilityHandler.clear();
         visibilityMock.mockShow();
         simulateEventBusTick();
         expect( onShowSpy ).not.toHaveBeenCalled();

         visibilityMock.mockHide();
         simulateEventBusTick();
         expect( onChangeSpy ).not.toHaveBeenCalled();
         expect( onHideSpy ).not.toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'which removes any registered handlers when the governing scope is destroyed', () => {
         mockWidgetScope.$destroy();
         visibilityMock.mockShow();
         simulateEventBusTick();
         expect( onShowSpy ).not.toHaveBeenCalled();

         visibilityMock.mockHide();
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
