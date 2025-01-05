import path from 'path';
import { fileURLToPath } from 'url';

import HtmlWebpackPlugin from 'html-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: './src/dashboard/index.jsx',
  output: {
    filename: 'dashboard.js',
    path: path.resolve(__dirname, 'dist/dashboard'),
    clean: true
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    fallback: {
      "crypto": false,
      "stream": false,
      "buffer": "buffer/"
    }
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react'
            ]
          }
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/dashboard/index.html',
      filename: 'index.html'
    })
  ]
};