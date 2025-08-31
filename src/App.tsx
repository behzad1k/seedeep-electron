import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Card,
  CardContent,
  Button,
  Box,
  Grid,
  Paper,
  IconButton,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Brightness4,
  Brightness7,
  Computer,
  Info,
} from '@mui/icons-material';

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [electronInfo, setElectronInfo] = useState<{
    version?: string;
    platform?: string;
  }>({});

  // Create theme based on dark mode state
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
    },
  });

  useEffect(() => {
    // Check if we're running in Electron
    if (window.electronAPI) {
      setElectronInfo({
        version: window.electronAPI.getVersion(),
        platform: window.electronAPI.getPlatform(),
      });
    }
  }, []);

  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
  };

  const handleSendMessage = () => {
    if (window.electronAPI) {
      window.electronAPI.sendMessage('app-message', {
        type: 'hello',
        message: 'Hello from React!',
      });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* App Bar */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Computer sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SeeDeep - Deep Insights, Deeper Understanding
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={handleThemeToggle}
                color="default"
              />
            }
            label=""
          />
          <IconButton
            color="inherit"
            onClick={handleThemeToggle}
            aria-label="toggle theme"
          >
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>

          {/* Welcome Card */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h4" gutterBottom>
                  Welcome to SeeDeep! 🔍
                </Typography>
                <Typography variant="body1" paragraph>
                  This is a modern desktop application built with:
                </Typography>
                <Box component="ul" sx={{ pl: 2 }}>
                  <Typography component="li" variant="body2">
                    ⚛️ React 18 with TypeScript
                  </Typography>
                  <Typography component="li" variant="body2">
                    🎨 Material-UI (MUI) for beautiful components
                  </Typography>
                  <Typography component="li" variant="body2">
                    ⚡ Electron for cross-platform desktop support
                  </Typography>
                  <Typography component="li" variant="body2">
                    🌙 Dark/Light theme toggle
                  </Typography>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={handleSendMessage}
                    sx={{ mr: 2 }}
                  >
                    Send Message to Electron
                  </Button>
                  <Button
                    variant="outlined"
                    href="https://mui.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    MUI Documentation
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* System Info Card */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <Info sx={{ mr: 1 }} />
                <Typography variant="h6">
                  System Information
                </Typography>
              </Box>

              <Typography variant="body2" gutterBottom>
                <strong>Electron Version:</strong> {electronInfo.version || 'N/A'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Platform:</strong> {electronInfo.platform || 'N/A'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Theme:</strong> {darkMode ? 'Dark' : 'Light'}
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong> {window.electronAPI ? '✅ Electron' : '🌐 Browser'}
              </Typography>
            </Paper>
          </Grid>

          {/* Feature Cards */}
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
              Get Started
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      Add Components
                    </Typography>
                    <Typography variant="body2">
                      Explore MUI's extensive component library
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      IPC Communication
                    </Typography>
                    <Typography variant="body2">
                      Set up communication between main and renderer
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      File System
                    </Typography>
                    <Typography variant="body2">
                      Add file operations and native dialogs
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      Build & Package
                    </Typography>
                    <Typography variant="body2">
                      Create distributable packages for all platforms
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </ThemeProvider>
  );
};

export default App;