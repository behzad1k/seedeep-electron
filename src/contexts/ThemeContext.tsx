import { createTheme, CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  darkMode: boolean;
  toggleTheme: () => void;
  setDarkMode: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [darkMode, setDarkModeState] = useState(() => {
    // Load from localStorage
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true; // Default to dark
  });

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('darkMode', JSON.stringify(darkMode));

    // Update document class for CSS variables
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

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
        default: darkMode ? '#0a0a0a' : '#f5f5f5',
        paper: darkMode ? '#1a1a1a' : '#ffffff',
      },
      divider: darkMode ? '#333' : '#e0e0e0',
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: darkMode ? '#0a0a0a' : '#f5f5f5',
            color: darkMode ? '#ffffff' : '#000000',
            transition: 'background-color 0.3s ease, color 0.3s ease',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            transition: 'background-color 0.3s ease',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            transition: 'background-color 0.3s ease',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
          },
        },
      },
    },
  });

  const toggleTheme = () => {
    setDarkModeState((prev: any) => !prev);
  };

  const setDarkMode = (isDark: boolean) => {
    setDarkModeState(isDark);
  };

  return (
    <ThemeContext.Provider value={{
      darkMode,
      toggleTheme,
      setDarkMode
    }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline/>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};