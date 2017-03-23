# laxar-angular-adapter [![Build Status](https://travis-ci.org/LaxarJS/laxar-angular-adapter.svg?branch=master)](https://travis-ci.org/LaxarJS/laxar-angular-adapter)

> Write LaxarJS widgets and controls with AngularJS

Starting with LaxarJS 2, AngularJS is no longer supported (nor included) by default.
However, this widget-adapter for LaxarJS 2 allows to use widgets written in AngularJS 1.x within LaxarJS 2 applications.

To use the adapter, install it from NPM:

```console
npm install --save laxar-angular-adapter
```

Then pass it to `laxar.bootstrap`:

```js
import * as angularAdapter from 'laxar-angular-adapter';
import { bootstrap } from 'laxar';
bootstrap( { widgetAdapters: [ angularAdapter ] /*, artifacts: ..., configuration: ... */ } );
```

Note that AngularJS 1.x is not well suited to multiple LaxarJS application instances sharing a page.
If you need this feature, be sure to pass the AngularJS dependencies of all instances as modules to the first `bootstrap` invocation.


### axWidgetServices

Additionally an `axWidgetServices` service is available, which can be used by directives to gain access to services that are only available in the context of a specific widget, such as [`axFeatures`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axfeatures-), [`axI18n`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axi18n-) or the decorated log for widgets ([`axLog`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axlog-)).
The `axWidgetServices` is a function, that must be called with scope of the directive and it returns the map of services that are available for the widget being the same as or a parent of the directive scope in the scope hierarchy.
As a consequence an error is thrown if this service is used with a scope not being (a child of) a widget scope.

Example:
```js
myModule.directive( 'myDirective', [ 'axWidgetServices', axWidgetServices => {
   return {
      link( scope ) {
         const widgetServices = axWidgetServices( scope );
         widgetServices.axLog.info( 'Here we are!' );
      }
   }
} ] );
```


### $scope

As it is always the case for controllers, the `$scope` the controller is bound to can be injected.
For AngularJS widgets this is exactly the same as the [`axContext`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axcontext-) injection.
All widget scopes are child of one specific parent scope and don't copy the hierarchy or placement of widgets within a page, i.e. all widget scopes are siblings of each other.


## Global LaxarJS Service Injections

Most services available as injection for widgets are directly provided by the LaxarJS runtime (see http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services).
In case of this adapter some services are only redefined as AngularJS services to be globally available for other AngularJS services and directives.

The following list covers these:

   * [`axConfiguration`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axconfiguration-)
   * [`axGlobalEventBus`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axglobaleventbus-)
   * [`axGlobalLog`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axgloballog-)
   * [`axGlobalStorage`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axglobalstorage-)
   * [`axHeartbeat`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axheartbeat-)
   * [`axTooling`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axtooling-)
