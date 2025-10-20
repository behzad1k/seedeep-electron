import { BackendHealthIndicator } from '@/components';
import MainWindow from './windows/MainWindow';
import React, { useState } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
} from '@mui/material';

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#2e7d32',
        dark: '#1b5e20',
        light: '#4caf50',
      },
      secondary: {
        main: '#388e3c',
      },
      success: {
        main: '#4caf50',
      },
      background: {
        default: darkMode ? '#121212' : '#f5f5f5',
        paper: darkMode ? '#1e1e1e' : '#ffffff',
      },
    },
  });

  return(
    <ThemeProvider theme={theme}>
      <MainWindow />
      <BackendHealthIndicator position="top-right" />
      <CssBaseline />
    </ThemeProvider>

  )
};

export default App;