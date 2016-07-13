/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import { name as widgetAreaModuleName } from '../widget_area';
import 'angular-mocks';

const { module, inject } = window;

describe( 'A widget area module', () => {

   let register;
   let deregister;
   let controllerForScope;

   beforeEach( () => {

      deregister = jasmine.createSpy( 'deregister' );
      register = jasmine.createSpy( 'pageController.areas.register' ).and.returnValue( deregister );
      controllerForScope = jasmine.createSpy( 'controllerForScope' ).and.returnValue( {
         areas: { register }
      } );

      module( widgetAreaModuleName, ( $provide, $controllerProvider ) => {
         $provide.service( 'axPageService', () => ( { controllerForScope } ) );
         $controllerProvider.register( 'TestWidgetController', () => {} );
      } );
   } );

   ////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'provides an axWidgetArea directive that', () => {

      let $compile;
      let scope;

      beforeEach( inject( ( _$compile_, $rootScope ) => {
         $compile = _$compile_;
         scope = $rootScope.$new();
         scope.boundArea = 'two';
      } ) );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'registers any named widget area with the page controller when linked', () => {
         const link = $compile( '<div data-ax-widget-area="one"></div>' );
         expect( register ).not.toHaveBeenCalled();
         const element = link( scope );
         expect( controllerForScope ).toHaveBeenCalledWith( scope );
         expect( register ).toHaveBeenCalledWith( 'one', element[ 0 ] );
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'registers any bound widget area with the page controller when linked', () => {
         const link = $compile( '<div data-ax-widget-area data-ax-widget-area-binding="boundArea"></div>' );
         expect( register ).not.toHaveBeenCalled();
         const element = link( scope );
         expect( controllerForScope ).toHaveBeenCalledWith( scope );
         expect( register ).toHaveBeenCalledWith( 'two', element[ 0 ] );
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'triggers an error when there is neither name nor binding', () => {
         expect( () => {
            $compile( '<div data-ax-widget-area></div>' )( scope );
         } ).toThrow();
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'deregisters any named area with the page controller when destroyed', () => {
         $compile( '<div data-ax-widget-area="one"></div>' )( scope );
         expect( deregister ).not.toHaveBeenCalled();
         scope.$destroy();
         expect( deregister ).toHaveBeenCalled();
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'deregisters any bound area with the page controller when destroyed', () => {
         $compile( '<div data-ax-widget-area data-ax-widget-area-binding="boundArea"></div>' )( scope );
         expect( deregister ).not.toHaveBeenCalled();
         scope.$destroy();
         expect( deregister ).toHaveBeenCalled();
      } );

   } );

} );
