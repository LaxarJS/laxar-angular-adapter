/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import { name as layoutModuleName } from '../layout';
import ng from 'angular';
import 'angular-mocks';
import { create as createLogMock } from 'laxar/lib/testing/log_mock';

const { module, inject } = window;

///////////////////////////////////////////////////////////////////////////////////////////////////////////

describe( 'A layout module', () => {

   let scope;
   let element;
   let layoutLoaderMock;
   let logMock;

   beforeEach( () => {
      module( layoutModuleName, $provide => {
         $provide.service( 'axLayoutLoader', () => layoutLoaderMock );
      } );

      const layoutDataMock = {
         html: 'theHtmlFile',
         htmlContent: '<h1>I am {{ model.prop }}</h1>',
         className: 'theCssClass'
      };

      ng.module( 'axAngularGlobalServices', [] )
         .service( 'axGlobalLog', () => logMock )
         .service( 'axLayoutLoader', () => layoutLoaderMock );

      logMock = createLogMock();
      inject( $q => {
         layoutLoaderMock = {
            load: jasmine.createSpy( 'load' ).and.returnValue( $q.when( layoutDataMock ) )
         };
      } );
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'provides an axLayout directive that', () => {

      let $rootScope;

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      beforeEach( inject( ( _$compile_, _$rootScope_ ) => {
         $rootScope = _$rootScope_;
         scope = _$rootScope_.$new();
         scope.model = {
            layout: 'theLayout',
            prop: 'linked'
         };

         element = _$compile_( '<div data-ax-layout="model.layout"/>' )( scope );
      } ) );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'when invoked', () => {

         it( 'uses the LayoutLoader service to load the layout data', () => {
            expect( layoutLoaderMock.load ).toHaveBeenCalledWith( 'theLayout' );
         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'when the layout has been loaded', () => {

         it( 'compiles and attaches the layout\'s html to the directive element', () => {
            scope.$digest();

            const match = /<[^>]*class="([^"]*)"/.exec( element.html() );
            expect( match ).toBeTruthy();

            const classes = match[ 1 ].split(' ');
            expect( classes ).toContain( 'ng-binding' );
            expect( classes ).toContain( 'ng-scope' );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'sets the respective css class on the scope', () => {
            scope.$digest();
            expect( element[ 0 ].className ).toMatch( /\btheCssClass\b/ );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'emits an AngularJS event `axLayoutLoaded` with the layout name', () => {
            let layoutName = null;
            $rootScope.$on( 'axLayoutLoaded', ( _, name ) => {
               layoutName = name;
            } );
            scope.$digest();
            expect( layoutName ).toEqual( 'theLayout' );
         } );

      } );

   } );

} );
