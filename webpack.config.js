import path from 'path';
import { fileURLToPath } from 'url';

import CopyPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'development',
  entry: {
    background: './src/extension/background.js',
    popup: './src/extension/popup.js',
    options: './src/extension/options.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    fallback: {
      "crypto": false,
      "stream": false,
      "buffer": "buffer/"
    }
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript'
            ]
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
          from: './src/extension/options.html',
          to: 'options.html'
        },
        {
          from: './src/extension/icons',
          to: 'icons'
        }
      ]
    })
  ]
};