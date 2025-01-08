import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  target: "webworker",
  entry: "./src/backend/index.js",
  output: {
    filename: "worker.js",
    path: path.resolve(__dirname, "dist/worker"),
    library: {
      type: "module",
    },
    clean: false,
  },
  experiments: {
    outputModule: true,
  },
  mode: process.env.NODE_ENV || "production",
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  targets: {
                    node: "18",
                  },
                  modules: false,
                },
              ],
            ],
          },
        },
      },
    ],
  },
  optimization: {
    minimize: true,
  },
};
