import MainWindow from './windows/MainWindow';
import React, { useState } from 'react';
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
  IconButton,
  Switch,
  FormControlLabel,
  Paper,
  Chip,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogContent,
  Button,
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
  Notifications,
  Analytics,
  GridView,
} from '@mui/icons-material';
import { ModelsSidebar } from './components';
import FullScreenCameraView from './components/FullScreenCameraView';
import {DetectionModelKey} from "./types/camera";

interface AddCameraProps {
  onClose: () => void;
}

// AddCamera Component (inline for now)
const AddCamera: React.FC<AddCameraProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    ipAddress: '',
    port: '554',
  });

  const handleSubmit = () => {
    console.log('Camera data:', formData);
    alert('Camera added successfully!');
    onClose();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Add New Camera
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Basic Information
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          <input
            type="text"
            placeholder="Camera Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input
            type="text"
            placeholder="Location"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input
            type="text"
            placeholder="IP Address"
            value={formData.ipAddress}
            onChange={(e) => setFormData(prev => ({ ...prev, ipAddress: e.target.value }))}
            style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input
            type="text"
            placeholder="Port"
            value={formData.port}
            onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
            style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.name || !formData.location}
          >
            Add Camera
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};


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
      <CssBaseline />
    </ThemeProvider>

  )
};

export default App;