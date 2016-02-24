/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/*jshint node: true*/
module.exports = function (grunt) {
   'use strict';

   var pkg = grunt.file.readJSON( 'package.json' );

   grunt.initConfig( {
      pkg: pkg,
      pkgFile: 'package.json',
      karma: {
         options: {
            basePath: '',
            browsers: [ 'PhantomJS' ],
            browserNoActivityTimeout: 100000,
            plugins: [
               'karma-jspm',
               'karma-jasmine',
               'karma-junit-reporter',
               'karma-phantomjs-launcher',
               'karma-chrome-launcher'
            ],
            reporters: [ 'progress', 'junit' ],
            junitReporter: {
               outputDir: 'karma-output/'
            },
            frameworks: [ 'jspm', 'jasmine' ],
            proxies: {
               '/jspm_packages/': '/base/jspm_packages/',
               '/laxar-angular-adapter.js': '/base/laxar-angular-adapter.js',
               '/lib/': '/base/lib/',
               '/spec/': '/base/spec/',
            },
            jspm: {
               config: 'system.config.js',
               loadFiles: [
                  'lib/**/*_spec.js',
                  'spec/*_spec.js',
               ],
               serveFiles: [
                  'jspm_packages/**/*.js',
                  'laxar-angular-adapter.js',
                  'lib/**/!(*_spec).js',
                  'spec/!(*_spec).js',
               ]
            }
         },
         unit: {
            singleRun: true,
         }
      },
      eslint: {
         options: {
            config: '.eslintrc.json'
         },
         src: [
            'laxar-angular-adapter.js',
            'lib/**/*.js',
            'spec/*.js'
         ]
      }
   } );

   grunt.loadNpmTasks( 'grunt-karma' );
   grunt.loadNpmTasks( 'gruntify-eslint' );

   grunt.registerTask( 'test', [ 'eslint', 'karma' ] );

   grunt.registerTask( 'default', [ 'test' ] );
};
