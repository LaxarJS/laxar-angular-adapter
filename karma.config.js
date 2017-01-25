/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/* eslint-env node */

const webpackConfig = Object.assign( {}, require('./webpack.config' ) );
delete webpackConfig.entry;
webpackConfig.devtool = 'inline-source-map';

module.exports = function(config) {
   // const browsers = [ 'PhantomJS', 'Firefox' ].concat( [
   //    process.env.TRAVIS ? 'ChromeTravisCi' : 'Chrome'
   // ] );
   const browsers = [ 'Chrome' ];

   config.set( {
      frameworks: [ 'jasmine' ],
      files: [
         // require.resolve( 'laxar/dist/polyfills' ),
         'lib/**/spec/spec-runner.js',
         'spec/spec-runner.js'
      ],
      preprocessors: {
         'lib/**/spec/spec-runner.js': [ 'webpack', 'sourcemap' ],
         'spec/spec-runner.js': [ 'webpack', 'sourcemap' ]
      },
      webpack: webpackConfig,

      reporters: [ 'progress', 'junit' ],
      junitReporter: {
         outputDir: 'karma-output/'
      },
      port: 9876,
      browsers,
      customLaunchers: {
         ChromeTravisCi: {
            base: 'Chrome',
            flags: [ '--no-sandbox' ]
         }
      },
      browserNoActivityTimeout: 100000,
      singleRun: true,
      autoWatch: false,
      concurrency: Infinity
   } );
};
