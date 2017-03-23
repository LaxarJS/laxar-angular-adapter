# laxar-angular-adapter [![Build Status](https://travis-ci.org/LaxarJS/laxar-angular-adapter.svg?branch=master)](https://travis-ci.org/LaxarJS/laxar-angular-adapter)

> Write LaxarJS widgets and controls with AngularJS

Starting with LaxarJS 2, AngularJS support is no longer included out-of-the-box.
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

To make LaxarJS use this adapter for your widget, set the `integration.technology` in the `widget.json` descriptor to `"angular"`:

```json
{
   "name": "my-angular-v1-widget",
   "integration": {
      "type": "widget",
      "technology": "angular"
   }
}
```

Note that AngularJS 1.x is not well suited to multiple LaxarJS application instances sharing a page.
If you need this feature, be sure to pass the AngularJS dependencies of all instances as modules to the first `bootstrap` invocation.


## Widgets and Controls with AngularJS

Because the integration technology `"angular"` was built into LaxarJS v1, the [main LaxarJS manuals](http://laxarjs.org/docs/laxar-v2-latest/manuals/) contain several examples on creating widgets and controls for AngularJS.


### Widget Integration

To recapitulate the basics for widgets:

   - each widget implementation module must create an AngularJS module named after the widget, except that `camelCase` should be used for the module, to adhere to the AngularJS naming guidelines,
   - the module name must be exported using the export `name`,
   - the widget controller function must be registered using `.controller` on the widget's AngularJS module, and its name must correspond to the module name: for a module named `myWidget`, the controller must be named `MyWidgetController`.

When using the LaxarJS generator for Yeoman, a suitable implementation module will be prepared for you automatically.


### Control Integration

A control implementation for the technology `"angular"` module should return an AngularJS module defining one or more AngularJS directives.
Dependent widgets (or controls) simply need to declare their dependency using the `controls` array of their descriptor.
The directives and CSS styles will then be made available automatically.


## Additional Injections for AngularJS

The `laxar-angular-adapter` provides additional services for use with the AngularJS dependency injection.
First and foremost, the [regular LaxarJS widget services](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services/) (`axEventBus`, `axFeatures`, and so on) are made available as AngularJS injections to widget controllers.

In addition, the adapter provides or modifies some additional injections, for better interoperability with AngularJS.


### axWidgetServices

An additional `axWidgetServices` injection is provided, which can be used by directives to gain access to services that belong to the context of a specific widget, such as [`axFeatures`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axfeatures-), [`axI18n`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axi18n-) or the decorated widget instance log ([`axLog`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axlog-)).
For `axWidgetServices` a function is injected that must be called with the scope of a directive.
This function returns the map of services available to the _parent-widget_ of the directive.
To determine the parent-widget, the AngularJS scope-chain is traversed from child to parent, until a widget-scope is found.
An error is thrown if this service is used on a scope that is no descendant of a widget scope.

In this example, a directive uses `axWidgetServices` to access the logger of its parent-widget.

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

Note that directives will not work outside of LaxarJS applications if they rely on this injection.
It is often a good idea to package such directives as LaxarJS controls to indicate this fact.


### $scope

For `"angular"` widget controllers, the `$scope` connecting template and controller can be injected as well, as expected for AngularJS controllers.
Because it is an alias of the [`axContext`](http://laxarjs.org/docs/laxar-v2-latest/api/runtime.widget_services.md#axContext) injection, the `$scope` of a LaxarJS widget has additional properties compared to a regular AngularJS scope, for example `features` and `log`.

All widget scopes are children of the same parent scope, regardless of possible nesting relationships in the page DOM due to LaxarJS widget areas.
This ensures isolation between widgets.


### Global LaxarJS Service Injections

Widgets service injections are created by the LaxarJS runtime as their widget controllers request them (see http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services), and are not available as injections to regular AngularJS services or factories.

The AngularJS adapter provides additional globally available service injections that can be used in any AngularJS injection context:

   * [`axConfiguration`](http://laxarjs.org/docs/laxar-v2-latest/manuals/runtime.widget_services.md#axConfiguration) to access the application configuration
   * [`axGlobalEventBus`](http://laxarjs.org/docs/laxar-v2-latest/manuals/runtime.widget_services.md#axGlobalEventBus) to inspect the event bus independent of widget or page lifetimes
   * [`axGlobalLog`](http://laxarjs.org/docs/laxar-v2-latest/manuals/runtime.widget_services.md#axGlobalLog) to use or listen to the log, application-wide
   * [`axGlobalStorage`](http://laxarjs.org/docs/laxar-v2-latest/manuals/runtime.widget_services.md#aGlobalStorage) for application-wide local- or session-storage
   * [`axHeartbeat`](http://laxarjs.org/docs/laxar-v2-latest/manuals/runtime.widget_services.md#axHeartbeat) to be notified whenever events were delivered


## Additional Filters Provided by LaxarJS

This adapter provides the filter `axLocalize`, previously part of [LaxarJS UiKit](http://laxarjs.org/docs/laxar-uikit-v2-latest/).

Use it together with the `axI18n` widget injection to localize values in widgets:

```js
Controller.injections = [ '$scope', 'axI18n' ];
function Controller( $scope, i18n ) {
   $scope.i18n = i18n;
   $scope.i18nGreeting = { en: 'Hello', fr: 'Bonjour' };
}
```

Now you can do this in your widget template:

```html
<h1>{{ i18nGreeting | axLocalize:i18n }}</h1>
```

This causes the headline to stay up-to-date as locales change.


## Additional Directives Provided by LaxarJS

To simplify certain common use cases for widget HTML templates, the adapter also provides a couple of directives.


### axId

Use this to generate unique HTML IDs for anchors and input controls.

```html
<h3 ax-id="'section-b-anchor'">Section B</h3>
```

These IDs are unique, even if a widget is used multiple times on a single page.


### axFor

Use in conjunction with `axId`, this associates a form label to its control:

```html
<label ax-for="'userName'">User Name:</label>
<input type="text" ax-id="'userName'" ng-model="model.userName">
```

Sometimes, you can simply nest an input within a label, eliminating the need to use `axFor/axId`.
Note that both directives use _one-time bindings_ for performance:
using constant expressions is recommended.
Within `ngRepeat` contexts, the `track by` expression is a good candidate.


### axWidgetArea

Use this to offer a nested widget area for your widget.
Page authors can then fill the provided area with their own widgets.

Use the `ax-widget-area-binding` attribute to name a widget area within your widget.
While you do not want to change the name of a widget are after it was created, you can use this to make an area name configurable from the page.

Let us assume the following template, `my-widget.html`:

```html
<div ax-widget-area ax-widget-area-binding="::features.content.area"></div>
```

In your page definition, you would then use:

```js
"content": [
   {
      "widget": "my-widget",
      "id": "my",
      "features": {
         "content": {
            "area": "nested"
         }
      }
   }
],
"my.nested": [
   // ...
]
```

This becomes powerful when you combine an array-valued feature configuration with `ngRepeat`.
This way, you can flexibly configure and name any number of widget areas.


## Testing With LaxarJS Mocks

You can use the integration technology `"angular"` together with [laxar-mocks](laxarjs.org/docs/laxar-mocks-v2-latest/) without additional configuration, as long as you are using the `laxar-mocks/spec-loader` to load spec-files when running tests.

Here are some AngularJS-specific hints for testing:

   - If your are using `$http`, use `axMocks.widget.whenServicesAvailable` to inject and configure `$httpBackend`.
     Trying to inject AngularJS services into your test too early can lead to problems when LaxarJS injections are prepared,
   - when `eventBus.flush()` is run to trigger event bus delivery, a `$rootScope.$digest` is  automatically initiated afterwards.
