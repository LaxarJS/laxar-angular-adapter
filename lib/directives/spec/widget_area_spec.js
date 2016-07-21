/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import { name as widgetAreaModuleName } from '../widget_area';
import 'angular-mocks';

const { module, inject } = window;

describe( 'A widget area module', () => {

   let axAreaHelperMock;
   let axWidgetServicesMock;

   beforeEach( () => {

      axAreaHelperMock = jasmine.createSpyObj( 'axAreaHelper', [ 'register' ] );
      axWidgetServicesMock = jasmine.createSpy( 'axWidgetServices' ).and.returnValue( {
         axAreaHelper: axAreaHelperMock
      } );

      module( widgetAreaModuleName, ( $provide, $controllerProvider ) => {
         $provide.factory( 'axWidgetServices', () => axWidgetServicesMock );
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

      it( 'registers any named widget area with the area helper when linked', () => {
         const link = $compile( '<div data-ax-widget-area="one"></div>' );
         expect( axAreaHelperMock.register ).not.toHaveBeenCalled();
         const element = link( scope );
         expect( axWidgetServicesMock ).toHaveBeenCalledWith( scope );
         expect( axAreaHelperMock.register ).toHaveBeenCalledWith( 'one', element[ 0 ] );
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'registers any bound widget area with the page controller when linked', () => {
         const link = $compile( '<div data-ax-widget-area data-ax-widget-area-binding="boundArea"></div>' );
         expect( axAreaHelperMock.register ).not.toHaveBeenCalled();
         const element = link( scope );
         expect( axWidgetServicesMock ).toHaveBeenCalledWith( scope );
         expect( axAreaHelperMock.register ).toHaveBeenCalledWith( 'two', element[ 0 ] );
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'triggers an error when there is neither name nor binding', () => {
         expect( () => {
            $compile( '<div data-ax-widget-area></div>' )( scope );
         } ).toThrow();
      } );

   } );

} );
