const path = require('path');

module.exports = {
  target: 'webworker',
  entry: './src/backend/index.js',
  output: {
    filename: 'worker.js',
    path: path.resolve(__dirname, 'dist-worker')
  },
  mode: process.env.NODE_ENV || 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  node: '18'
                }
              }]
            ]
          }
        }
      }
    ]
  }
};