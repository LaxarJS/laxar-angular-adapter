# Changelog

## Last Changes

- [#31](https://github.com/LaxarJS/laxar-angular-adapter/issues/31): Made patching Promise zone.js compatible
- [#30](https://github.com/LaxarJS/laxar-angular-adapter/issues/30): Made patching angular promises defensive


## v0.3.0

- [#7](https://github.com/LaxarJS/laxar-angular-adapter/issues/7): changed the `axVisibilityService` used by directives to use `axWidgetServices`
   + **BREAKING CHANGE:** see ticket for details
- [#29](https://github.com/LaxarJS/laxar-angular-adapter/issues/29): Removed redundant technology field
- [#28](https://github.com/LaxarJS/laxar-angular-adapter/issues/28): Fixed tooling api access
- [#24](https://github.com/LaxarJS/laxar-angular-adapter/issues/24): adjusted to adapter API changes (laxar#358)
- [#23](https://github.com/LaxarJS/laxar-angular-adapter/issues/23): fixed testability and multi-instance operation
- [#22](https://github.com/LaxarJS/laxar-angular-adapter/issues/22): removed AngularJS specific `axI18n` injection in favor of widget-services version
- [#21](https://github.com/LaxarJS/laxar-angular-adapter/issues/21): fixed bower.json `main` entry
- [#20](https://github.com/LaxarJS/laxar-angular-adapter/issues/20): patched window.Promise to integrate with $q
- [#19](https://github.com/LaxarJS/laxar-angular-adapter/issues/19): removed applyViewChanges in favor of a heartbeat listener
- [#18](https://github.com/LaxarJS/laxar-angular-adapter/issues/18): services: share the same object for $scope and axContext injections
- [#16](https://github.com/LaxarJS/laxar-angular-adapter/issues/16): services: provided access to widget specific services
- [#17](https://github.com/LaxarJS/laxar-angular-adapter/issues/17): project: turned framework dependencies into peer-dependencies
- [#5](https://github.com/LaxarJS/laxar-angular-adapter/issues/5): services: added AngularJS injections for widget services
- [#14](https://github.com/LaxarJS/laxar-angular-adapter/issues/14): directives: removed layout directive
    + **BREAKING CHANGE:** see ticket for details
- [#13](https://github.com/LaxarJS/laxar-react-adapter/issues/13): eslint: use shared configuration
- [#12](https://github.com/LaxarJS/laxar-react-adapter/issues/12): additional eslint restrictions
- [#11](https://github.com/LaxarJS/laxar-react-adapter/issues/11): added dist-target for UMD-library
- [#10](https://github.com/LaxarJS/laxar-angular-adapter/issues/10): Upgraded build/test dependencies (grunt v1)
- [#6](https://github.com/LaxarJS/laxar-angular-adapter/issues/6): LaxarJS v2 Compatibility
    + **BREAKING CHANGE:** see ticket for details


## v0.2.0

- [#3](https://github.com/LaxarJS/laxar-angular-adapter/issues/3): AngularJS: Moved all angular bootstrapping to this adapter
- [#8](https://github.com/LaxarJS/laxar-angular-adapter/issues/8): moved AngularJS exception handler to this adapter
- [#6](https://github.com/LaxarJS/laxar-angular-adapter/issues/6): visibility service: moved from core to this adapter
- [#2](https://github.com/LaxarJS/laxar-angular-adapter/issues/2): profiling: moved from core to this adapter
- [#1](https://github.com/LaxarJS/laxar-angular-adapter/issues/1): directives: moved from core to this adapter


## v0.1.0
