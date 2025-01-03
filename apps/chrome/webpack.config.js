const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: {
    background: './src/background.ts',
    popup: './src/popup.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@chronicle-sync/sync': path.resolve(__dirname, '../../packages/sync')
    }
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/manifest.json' },
        { from: 'src/popup.html' },
        { from: 'src/icons', to: 'icons' }
      ]
    })
  ]
};