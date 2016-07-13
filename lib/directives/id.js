/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/**
 * A module for the `axId` and `axFor` directives.
 *
 * @module axId
 */
import ng from 'angular';
import { assert } from 'laxar';

const module = ng.module( 'axId', [] );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

const ID_DIRECTIVE_NAME = 'axId';

// eslint-disable-next-line valid-jsdoc
/**
 * This directive should be used within a widget whenever a unique id for a DOM element should be created.
 * It's value is evaluated as AngularJS expression and used as a local identifier to generate a distinct,
 * unique document wide id.
 *
 * A common use case is in combination with {@link axFor} for input fields having a label.
 *
 * Example:
 * ```html
 * <label ax-for="'userName'">Please enter your name:</label>
 * <input ax-id="'userName'" type="text" ng-model="username">
 * ```
 *
 * @name axId
 * @directive
 */
module.directive( ID_DIRECTIVE_NAME, [ () => {
   return {
      restrict: 'A',
      link( scope, element, attrs ) {
         const localId = scope.$eval( attrs[ ID_DIRECTIVE_NAME ] );
         assert.state( localId, 'directive axId needs a non-empty local id, e.g. ax-id="\'myLocalId\'".' );

         element.attr( 'id', scope.id( localId ) );
      }
   };
} ] );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

const FOR_DIRECTIVE_NAME = 'axFor';

// eslint-disable-next-line valid-jsdoc
/**
 * This directive should be used within a widget whenever an id, generated using the {@link axId} directive,
 * should be referenced at a `label` element.
 *
 * Example:
 * ```html
 * <label ax-for="'userName'">Please enter your name:</label>
 * <input ax-id="'userName'" type="text" ng-model="username">
 * ```
 *
 * @name axFor
 * @directive
 */
module.directive( FOR_DIRECTIVE_NAME, [ () => {
   return {
      restrict: 'A',
      link( scope, element, attrs ) {
         const localId = scope.$eval( attrs[ FOR_DIRECTIVE_NAME ] );
         assert.state( localId, 'directive axFor needs a non-empty local id, e.g. ax-for="\'myLocalId\'".' );

         element.attr( 'for', scope.id( localId ) );
      }
   };
} ] );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const name = module.name;
