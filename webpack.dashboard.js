import path from 'path';
import { fileURLToPath } from 'url';

import HtmlWebpackPlugin from 'html-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'development',
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist/dashboard'),
    },
    compress: true,
    port: 3000,
    hot: true,
  },
  entry: './src/dashboard/index.jsx',
  output: {
    filename: 'dashboard.js',
    path: path.resolve(__dirname, 'dist/dashboard'),
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
    new HtmlWebpackPlugin({
      template: './src/dashboard/index.html',
      filename: 'index.html'
    })
  ]
};