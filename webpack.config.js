const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: {
    background: './src/extension/background.js',
    popup: './src/extension/popup.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  resolve: {
    fallback: {
      "crypto": false,
      "stream": false,
      "buffer": require.resolve("buffer/")
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    new CopyPlugin({
      patterns: [
        { 
          from: './src/extension/manifest.json',
          to: 'manifest.json'
        },
        {
          from: './src/extension/popup.html',
          to: 'popup.html'
        },
        {
          from: './src/extension/icons',
          to: 'icons'
        }
      ]
    })
  ]
};