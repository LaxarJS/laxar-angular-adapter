# laxar-angular-adapter [![Build Status](https://travis-ci.org/LaxarJS/laxar-angular-adapter.svg?branch=master)](https://travis-ci.org/LaxarJS/laxar-angular-adapter)

> Write LaxarJS widgets and controls with AngularJS

Starting with LaxarJS 2, AngularJS is no longer supported (and included) by default.
However, this widget-adapter for LaxarJS 2 allows to use widgets written in AngularJS 1.x with LaxarJS 2.

To use the adapter, install it using Bower or npm, and then pass it to `laxar.bootstrap`.

Note that AngularJS 1.x is not well suited to multiple LaxarJS application instances sharing a page.
If you need this feature, be sure to pass the AngularJS dependencies of all instances as modules to the first `laxar.bootstrap` invocation.
