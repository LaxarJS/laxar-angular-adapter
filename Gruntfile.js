/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/* eslint-env node */
/* eslint no-var:0 */
module.exports = function (grunt) {
   'use strict';

   var pkg = grunt.file.readJSON( 'package.json' );
   var polyfillPath = require.resolve( 'laxar/dist/polyfills' );
   var preprocessors = {};
   preprocessors[ polyfillPath ] = [ 'webpack', 'sourcemap' ];
   preprocessors[ '**/spec/spec-runner.js' ] = [ 'webpack', 'sourcemap' ];
   preprocessors[ '**/laxar.js' ] = [ 'webpack', 'sourcemap' ];

   grunt.initConfig( {
      pkg,
      pkgFile: 'package.json',
      karma: {
         options: {
            configFile: 'karma.config.js',
            preprocessors
         },
         adapter: {
            options: {
               files: [ polyfillPath, 'spec/spec-runner.js' ]
            }
         },
         directives: {
            options: {
               files: [ polyfillPath, 'lib/directives/spec/spec-runner.js' ]
            }
         },
         profiling: {
            options: {
               files: [ polyfillPath, 'lib/profiling/spec/spec-runner.js' ]
            }
         },
         services: {
            options: {
               files: [ polyfillPath, 'lib/services/spec/spec-runner.js' ]
            }
         }
      }
   } );

   grunt.loadNpmTasks( 'grunt-karma' );
   grunt.registerTask( 'default', [ 'karma' ] );
   grunt.registerTask( 'test', [ 'karma' ] );
};
