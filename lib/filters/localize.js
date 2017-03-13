/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * A module for the `axLocalize` filter
 *
 * @module axId
 */

import ng from 'angular';
import { string } from 'laxar';

const axLocalizeFactory = [ 'axGlobalLog', log => {

   /**
    * Localize the given value, based on the given i18n state.
    *
    * Primitive values will be left as they are, independent of the presence of any language tag.
    * Using this filter is less efficient than precomputing the localization in the controller because
    * the `i18n` instance has to be an object (not efficient to watch).
    *
    * @param {*} i18nValue
    *   a value to localize
    * @param {axI18n} [i18n]
    *   an AxI18n instance to use for localization
    *
    * @return {*} value
    *   the localized value
    */
   return ( i18nValue, i18n, ...args ) => {

      if( typeof i18nValue !== 'object' ) {
         return args.length ?
            string.format( i18nValue, ...args ) :
            i18nValue;
      }

      if( !i18n || !i18n.localize ) {
         log.warn(
            'axLocalize:i18n cannot localize [0:anonymize]. Pass an AxI18n instance as `i18n`, not [1]',
            i18nValue, i18n
         );
         return undefined;
      }

      return args.length ?
         i18n.format( i18nValue, ...args ) :
         i18n.localize( i18nValue );

   };

} ];


export const name = ng.module( 'axLocalize', [] )
   .filter( 'axLocalize', axLocalizeFactory )
   .name;
