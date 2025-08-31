import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  Switch,
  FormControlLabel,
  Paper,
  Chip,
  Divider,
} from '@mui/material';
import {
  Videocam,
  Settings,
  Add,
  Build,
  Brightness4,
  Brightness7,
  Menu,
  VideoLibrary,
  Security,
  Notifications,
  Analytics,
  Storage,
  CloudSync,
} from '@mui/icons-material';

interface Camera {
  id: number;
  name: string;
  status: 'online' | 'offline' | 'recording';
  location: string;
}

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('cameras');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  // Mock camera data - replace with API data later
  const [cameras] = useState<Camera[]>([
    { id: 1, name: 'Front Entrance', status: 'online', location: 'Building A' },
    { id: 2, name: 'Parking Lot', status: 'recording', location: 'Building A' },
    { id: 3, name: 'Back Exit', status: 'offline', location: 'Building B' },
    { id: 4, name: 'Lobby', status: 'online', location: 'Building A' },
    { id: 5, name: 'Warehouse', status: 'recording', location: 'Building C' },
    { id: 6, name: 'Server Room', status: 'online', location: 'Building B' },
    { id: 7, name: 'Reception', status: 'online', location: 'Building A' },
    { id: 8, name: 'Loading Dock', status: 'offline', location: 'Building C' },
  ]);

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
      background: {
        default: darkMode ? '#121212' : '#f5f5f5',
        paper: darkMode ? '#1e1e1e' : '#ffffff',
      },
    },
  });

  const sidebarItems = [
    { id: 'cameras', label: 'Cameras', icon: <Videocam /> },
    { id: 'recordings', label: 'Recordings', icon: <VideoLibrary /> },
    { id: 'alerts', label: 'Alerts', icon: <Notifications /> },
    { id: 'analytics', label: 'Analytics', icon: <Analytics /> },
    { id: 'storage', label: 'Storage', icon: <Storage /> },
    { id: 'sync', label: 'Cloud Sync', icon: <CloudSync /> },
    { id: 'security', label: 'Security', icon: <Security /> },
    { id: 'settings', label: 'Settings', icon: <Settings /> },
    { id: 'add-camera', label: 'Add Camera', icon: <Add /> },
    { id: 'services', label: 'Services', icon: <Build /> },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'success';
      case 'recording': return 'warning';
      case 'offline': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'recording': return 'Recording';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  const drawerWidth = sidebarOpen || sidebarHovered ? 240 : 60;

  const renderCameraGrid = () => (
    <Grid container spacing={2} sx={{ p: 2 }}>
      {cameras.map((camera) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={camera.id}>
          <Card
            sx={{
              height: 280,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'scale(1.02)',
                boxShadow: 4,
              }
            }}
          >
            <CardContent sx={{ p: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Camera Video Feed Placeholder */}
              <Box
                sx={{
                  flex: 1,
                  backgroundColor: darkMode ? '#333' : '#f0f0f0',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Videocam sx={{ fontSize: 40, color: 'text.secondary' }} />

                {/* Status indicator */}
                <Chip
                  label={getStatusText(camera.status)}
                  color={getStatusColor(camera.status) as any}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                  }}
                />

                {/* Recording indicator */}
                {camera.status === 'recording' && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: 'red',
                      animation: 'pulse 2s infinite',
                      '@keyframes pulse': {
                        '0%': { opacity: 1 },
                        '50%': { opacity: 0.5 },
                        '100%': { opacity: 1 },
                      },
                    }}
                  />
                )}
              </Box>

              {/* Camera Info */}
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" noWrap>
                  {camera.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {camera.location}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'cameras':
        return renderCameraGrid();
      case 'recordings':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Recordings</Typography>
            <Typography variant="body1">Recording management interface will be here</Typography>
          </Box>
        );
      case 'alerts':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Alerts & Notifications</Typography>
            <Typography variant="body1">Alert management interface will be here</Typography>
          </Box>
        );
      case 'analytics':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Analytics Dashboard</Typography>
            <Typography variant="body1">Analytics and insights will be here</Typography>
          </Box>
        );
      case 'settings':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Settings</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
              }
              label="Dark Mode"
            />
          </Box>
        );
      case 'add-camera':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Add New Camera</Typography>
            <Typography variant="body1">Camera setup wizard will be here</Typography>
          </Box>
        );
      case 'services':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Services</Typography>
            <Typography variant="body1">Service management interface will be here</Typography>
          </Box>
        );
      default:
        return renderCameraGrid();
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh' }}>

        {/* Collapsible Sidebar */}
        <Drawer
          variant="permanent"
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            transition: 'width 0.3s ease',
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              transition: 'width 0.3s ease',
              overflow: 'hidden',
              backgroundColor: darkMode ? '#1a1a1a' : '#fafafa',
              borderRight: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
            },
          }}
        >
          {/* Sidebar Header */}
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              minHeight: 64,
            }}
          >
            <IconButton
              onClick={() => setSidebarOpen(!sidebarOpen)}
              sx={{ mr: sidebarOpen || sidebarHovered ? 1 : 0 }}
            >
              <Menu />
            </IconButton>
            {(sidebarOpen || sidebarHovered) && (
              <Typography variant="h6" fontWeight="bold" color="primary">
                SeeDeep
              </Typography>
            )}
          </Box>

          <Divider />

          {/* Navigation Items */}
          <List sx={{ flexGrow: 1, pt: 1 }}>
            {sidebarItems.map((item) => (
              <ListItem key={item.id} disablePadding>
                <ListItemButton
                  selected={activeTab === item.id}
                  onClick={() => setActiveTab(item.id)}
                  sx={{
                    minHeight: 48,
                    justifyContent: sidebarOpen || sidebarHovered ? 'initial' : 'center',
                    px: 2.5,
                    '&.Mui-selected': {
                      backgroundColor: darkMode ? 'rgba(144, 202, 249, 0.16)' : 'rgba(25, 118, 210, 0.12)',
                      '&:hover': {
                        backgroundColor: darkMode ? 'rgba(144, 202, 249, 0.24)' : 'rgba(25, 118, 210, 0.16)',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: sidebarOpen || sidebarHovered ? 3 : 'auto',
                      justifyContent: 'center',
                      color: activeTab === item.id ? 'primary.main' : 'inherit',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {(sidebarOpen || sidebarHovered) && (
                    <ListItemText
                      primary={item.label}
                      sx={{
                        opacity: sidebarOpen || sidebarHovered ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          {/* Theme Toggle at Bottom */}
          <Box sx={{ p: 2 }}>
            <ListItemButton
              onClick={() => setDarkMode(!darkMode)}
              sx={{
                minHeight: 48,
                justifyContent: sidebarOpen || sidebarHovered ? 'initial' : 'center',
                borderRadius: 1,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: sidebarOpen || sidebarHovered ? 3 : 'auto',
                  justifyContent: 'center',
                }}
              >
                {darkMode ? <Brightness7 /> : <Brightness4 />}
              </ListItemIcon>
              {(sidebarOpen || sidebarHovered) && (
                <ListItemText
                  primary="Toggle Theme"
                  sx={{
                    opacity: sidebarOpen || sidebarHovered ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                  }}
                />
              )}
            </ListItemButton>
          </Box>
        </Drawer>

        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            height: '100vh',
            overflow: 'auto',
            backgroundColor: 'background.default',
          }}
        >
          {/* Header */}
          <Paper
            elevation={1}
            sx={{
              p: 2,
              mb: 0,
              borderRadius: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="h5" fontWeight="bold">
              {sidebarItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
            </Typography>

            {activeTab === 'cameras' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  label={`${cameras.filter(c => c.status === 'online').length} Online`}
                  color="success"
                  size="small"
                />
                <Chip
                  label={`${cameras.filter(c => c.status === 'recording').length} Recording`}
                  color="warning"
                  size="small"
                />
                <Chip
                  label={`${cameras.filter(c => c.status === 'offline').length} Offline`}
                  color="error"
                  size="small"
                />
              </Box>
            )}
          </Paper>

          {/* Content Area */}
          <Box sx={{ height: 'calc(100vh - 80px)', overflow: 'auto' }}>
            {renderContent()}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;