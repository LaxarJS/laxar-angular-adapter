/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/* eslint-env node */

module.exports = {
   entry: {
      'laxar-angular-adapter': './laxar-angular-adapter.js'
   },
   resolve: {
      alias: {
         'laxar-widget-service-mocks': 'laxar/dist/laxar-widget-service-mocks'
      }
   },
   module: {
      loaders: [
         {
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader'
         }
      ]
   }
};
