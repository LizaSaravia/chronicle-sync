const path = require('path');

module.exports = {
  target: 'webworker',
  entry: './src/backend/index.js',
  output: {
    filename: 'worker.js',
    path: path.resolve(__dirname, 'worker'),
    library: {
      type: 'module'
    }
  },
  experiments: {
    outputModule: true
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
                },
                modules: false
              }]
            ]
          }
        }
      }
    ]
  },
  optimization: {
    minimize: true
  }
};