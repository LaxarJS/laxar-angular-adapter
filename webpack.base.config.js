/* eslint-env node */

const path = require( 'path' );

module.exports = {
   entry: {
   },
   resolve: {
      root: [
         path.resolve( './node_modules' )
      ],
      alias: {
         'page': path.resolve( './node_modules/page/page' )
      }
   },
   module: {
      noParse: /node_modules\/page\/page\.js/,
      loaders: [
         {
            test: /\.js$/,
            exclude: /node_modules\/(?!laxar)/,
            loader: 'babel-loader'
         }
      ]
   }
};
