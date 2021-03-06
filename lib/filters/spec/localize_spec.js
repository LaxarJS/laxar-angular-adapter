/**
 * Copyright 2016-2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import { name as localizeModuleName } from '../localize';
import 'angular-mocks';

const { module, inject } = window;
let scope;
let compile;
let $dom;
let warn;

const setup = () => {
   warn = jasmine.createSpy( 'axGlobalLog.warn' );
   module( { axGlobalLog: { warn } } );
   module( localizeModuleName );

   inject( ( $rootScope, $compile ) => {
      scope = $rootScope.$new();
      compile = $compile;
   } );

   scope.localValue = 'LaxarJS';
   scope.i18nValue = { en: 'Hello', de: 'Guten Tag' };
   scope.i18nFormatString = { en: 'Hello, [0]', de: 'Guten Tag, [0]' };
   scope.i18n = {
      localize: jasmine.createSpy( 'localize' ).and.callFake( i18nValue => {
         expect( i18nValue ).toBe( scope.i18nValue );
         // To test that axLocalize really uses the service, we come up with something new:
         return 'Buongiorno!';
      } ),
      format: jasmine.createSpy( 'format' ).and.callFake( ( i18nValue, arg ) => {
         expect( i18nValue ).toBe( scope.i18nFormatString );
         return 'Buongiorno, [0]!'.replace( '[0]', arg );
      } )
   };
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe( 'An axLocalize filter', () => {

   beforeEach( setup );

   describe( 'asked to localize an i18n value', () => {

      beforeEach( () => {
         $dom = compile(
            '<div class="localized">{{ i18nValue | axLocalize:i18n }}</div>'
         )( scope );
         scope.$digest();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'provides the localization', () => {
         expect( $dom.text() ).toEqual( 'Buongiorno!' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'uses axI18n to lookup the localization', () => {
         expect( scope.i18n.localize ).toHaveBeenCalledWith(
            { en: 'Hello', de: 'Guten Tag' }
         );
         expect( scope.i18n.format ).not.toHaveBeenCalled();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'asked to localize an i18n value *without i18n instance*', () => {

      beforeEach( () => {
         $dom = compile(
            '<div class="localized">{{ i18nValue | axLocalize }}</div>'
         )( scope );
         warn.calls.reset();
         scope.$digest();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'returns undefined', () => {
         expect( $dom.text() ).toEqual( '' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'logs a warning about the issue', () => {
         expect( warn ).toHaveBeenCalled();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'asked to localize an already-localized value', () => {

      beforeEach( () => {
         $dom = compile(
            '<div class="localized">{{ localValue | axLocalize:i18n }}</div>'
         )( scope );
         scope.$digest();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'simply uses the already-localized value', () => {
         expect( $dom.text() ).toEqual( 'LaxarJS' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'does not ask axI18n for a localization', () => {
         expect( scope.i18n.localize ).not.toHaveBeenCalled();
         expect( scope.i18n.format ).not.toHaveBeenCalled();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'asked to localize an i18n value with formatting ', () => {

      beforeEach( () => {
         $dom = compile(
            '<div class="localized">{{ i18nFormatString | axLocalize:i18n:"Rolf" }}</div>'
         )( scope );
         scope.$digest();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'provides the localization', () => {
         expect( $dom.text() ).toEqual( 'Buongiorno, Rolf!' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'uses axI18n to lookup the localization', () => {
         expect( scope.i18n.format ).toHaveBeenCalledWith(
            { en: 'Hello, [0]', de: 'Guten Tag, [0]' },
            'Rolf'
         );
         expect( scope.i18n.localize ).not.toHaveBeenCalled();
      } );

   } );

} );
