// Karma configuration for the laxar-angular-adapter
/* eslint-env node */


const webpackConfig = Object.assign( {}, require('./webpack.base.config' ) );
webpackConfig.devtool = 'inline-source-map';

module.exports = function(config) {
   config.set({

      // frameworks to use
      // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
      frameworks: [ 'jasmine' ],
      webpack: webpackConfig,

      // test results reporter to use
      // possible values: 'dots', 'progress'
      // available reporters: https://npmjs.org/browse/keyword/karma-reporter
      reporters: [ 'progress' ],
      unit: {
         singleRun: true,
      },
      junitReporter: {
         outputDir: 'karma-output/'
      },
      logLevel: config.LOG_INFO,
      client: {
         captureConsole: true
      },

      // web server port
      port: 9876,

      // enable / disable colors in the output (reporters and logs)
      colors: true,

      // start these browsers
      // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
      browsers: [ 'PhantomJS' ],

      browserNoActivityTimeout: 100000,
      singleRun: true,
   });
};
