import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import CopyPlugin from "copy-webpack-plugin";
import webpack from "webpack";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from package.json
const packageJson = JSON.parse(readFileSync("./package.json", "utf8"));
const version = packageJson.version;

export default {
  mode: "development",
  entry: {
    background: "./src/extension/background.js",
    popup: "./src/extension/popup.js",
    options: "./src/extension/options.js",
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
    fallback: {
      crypto: false,
      stream: false,
      buffer: "buffer/",
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-env",
              "@babel/preset-react",
              "@babel/preset-typescript",
            ],
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new webpack.DefinePlugin({
      "process.env.VERSION": JSON.stringify(version),
      "process.env.GIT_HASH": JSON.stringify(process.env.GIT_HASH || "unknown"),
    }),
    new webpack.BannerPlugin({
      banner: `Chronicle Sync v${version}
Copyright (c) 2024 Chronicle Sync Contributors
Licensed under the MIT License. See LICENSE file for details.`,
      entryOnly: true,
    }),
    new CopyPlugin({
      patterns: [
        {
          from: "./src/extension/manifest.json",
          to: "manifest.json",
          transform(content) {
            const manifest = JSON.parse(content);
            manifest.version = version;
            return JSON.stringify(manifest, null, 2);
          },
        },
        {
          from: "./src/extension/popup.html",
          to: "popup.html",
        },
        {
          from: "./src/extension/options.html",
          to: "options.html",
        },
        {
          from: "./src/extension/icons",
          to: "icons",
        },
      ],
    }),
  ],
};
