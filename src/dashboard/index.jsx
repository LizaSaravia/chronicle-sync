import CssBaseline from '@mui/material/CssBaseline/index.js';
import { ThemeProvider, createTheme } from '@mui/material/styles/index.js';
import React from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.jsx';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);