import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'development',
  entry: {
    mui: [
      '@mui/material',
      '@mui/icons-material'
    ]
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist/mui'),
    library: {
      type: 'module'
    }
  },
  experiments: {
    outputModule: true
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@mui/utils/formatMuiErrorMessage': '@mui/utils/esm/formatMuiErrorMessage/index.js',
      '@mui/utils': '@mui/utils/esm/index.js',
      '@mui/material/styles': '@mui/material/esm/styles/index.js',
      '@mui/material/utils': '@mui/material/esm/utils/index.js',
      '@mui/system': '@mui/system/esm/index.js',
      '@mui/base': '@mui/base/esm/index.js',
      '@mui/private-theming': '@mui/private-theming/esm/index.js',
      '@mui/system/cssVars': '@mui/system/esm/cssVars/index.js',
      '@mui/system/useThemeProps': '@mui/system/esm/useThemeProps/index.js',
      '@mui/system/useMediaQuery': '@mui/system/esm/useMediaQuery/index.js',
      '@mui/system/styleFunctionSx': '@mui/system/esm/styleFunctionSx/index.js',
      '@mui/system/merge': '@mui/system/esm/merge.js',
      '@mui/system/style': '@mui/system/esm/style.js'
    }
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        include: /node_modules\/@mui/,
        use: {
          loader: 'babel-loader',
          options: {
            sourceType: 'unambiguous',
            plugins: [
              ['@babel/plugin-transform-runtime', { regenerator: true }]
            ]
          }
        }
      }
    ]
  }
};