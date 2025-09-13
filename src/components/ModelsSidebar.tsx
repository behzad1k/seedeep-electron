import React from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Switch,
  FormControlLabel,
  Button,
} from '@mui/material';
import { Menu } from '@mui/icons-material';
import {Camera, DetectionModelKey} from "../types/camera";

interface ModelsSidebarProps {
  open: boolean;
  onClose: () => void;
  selectedCamera: Camera | null;
  cameras: Camera[];
  darkMode: boolean;
  onDetectionModelChange: (model: DetectionModelKey) => void;
}

const ModelsSidebar: React.FC<ModelsSidebarProps> = ({
                                                       open,
                                                       onClose,
                                                       selectedCamera,
                                                       cameras,
                                                       darkMode,
                                                       onDetectionModelChange,
                                                     }) => {
  const handleApplyModels = () => {
    if (selectedCamera) {
      console.log('Applied detection models:', selectedCamera.detectionModels, 'to camera:', selectedCamera.name);
      alert(`Models applied to ${selectedCamera.name}!`);
    }
  };

  return (
    <Drawer
      anchor="right"
      variant="persistent"
      open={open}
      sx={{
        width: open ? 320 : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 320,
          boxSizing: 'border-box',
          backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
          borderLeft: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
          zIndex: 1200,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 64,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight="bold" color="primary">
            Camera Settings
          </Typography>
          {selectedCamera && (
            <Typography variant="caption" color="text.secondary">
              {selectedCamera.name} - {selectedCamera.location}
            </Typography>
          )}
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
            }
          }}
        >
          <Menu sx={{ transform: 'rotate(180deg)' }} />
        </IconButton>
      </Box>

      {/* Camera Status */}
      {selectedCamera && (
        <Box sx={{ p: 2, borderBottom: `1px solid ${darkMode ? '#333' : '#e0e0e0'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor:
                  selectedCamera.status === 'online' ? '#4caf50' :
                    selectedCamera.status === 'recording' ? '#ff9800' : '#f44336',
              }}
            />
            <Typography variant="body2" fontWeight="medium">
              {selectedCamera.status === 'online' ? 'Online' :
                selectedCamera.status === 'recording' ? 'Recording' : 'Offline'}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Channel {cameras.findIndex(c => c.id === selectedCamera.id) + 1}
          </Typography>
        </Box>
      )}

      {/* Model Selection Section */}
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Model Selection
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Select AI detection models to apply to this camera feed
        </Typography>

        {/* Detection Model Options */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* PPE Detection */}
          <Box
            sx={{
              p: 2,
              border: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
              borderRadius: 2,
              backgroundColor: selectedCamera?.detectionModels?.ppeDetection
                ? (darkMode ? 'rgba(46, 125, 50, 0.1)' : 'rgba(46, 125, 50, 0.05)')
                : 'transparent',
              borderColor: selectedCamera?.detectionModels?.ppeDetection ? 'primary.main' : undefined,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              },
            }}
            onClick={() => onDetectionModelChange('ppeDetection')}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={selectedCamera?.detectionModels?.ppeDetection || false}
                  onChange={() => onDetectionModelChange('ppeDetection')}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    PPE Detection
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Detect safety equipment usage
                  </Typography>
                </Box>
              }
              sx={{ margin: 0, width: '100%' }}
            />
          </Box>

          {/* Person Detection */}
          <Box
            sx={{
              p: 2,
              border: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
              borderRadius: 2,
              backgroundColor: selectedCamera?.detectionModels?.personDetection
                ? (darkMode ? 'rgba(46, 125, 50, 0.1)' : 'rgba(46, 125, 50, 0.05)')
                : 'transparent',
              borderColor: selectedCamera?.detectionModels?.personDetection ? 'primary.main' : undefined,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              },
            }}
            onClick={() => onDetectionModelChange('personDetection')}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={selectedCamera?.detectionModels?.personDetection || false}
                  onChange={() => onDetectionModelChange('personDetection')}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    Person Detection
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Identify people in camera feed
                  </Typography>
                </Box>
              }
              sx={{ margin: 0, width: '100%' }}
            />
          </Box>

          {/* Vehicle Detection */}
          <Box
            sx={{
              p: 2,
              border: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
              borderRadius: 2,
              backgroundColor: selectedCamera?.detectionModels?.vehicleDetection
                ? (darkMode ? 'rgba(46, 125, 50, 0.1)' : 'rgba(46, 125, 50, 0.05)')
                : 'transparent',
              borderColor: selectedCamera?.detectionModels?.vehicleDetection ? 'primary.main' : undefined,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              },
            }}
            onClick={() => onDetectionModelChange('vehicleDetection')}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={selectedCamera?.detectionModels?.vehicleDetection || false}
                  onChange={() => onDetectionModelChange('vehicleDetection')}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    Vehicle Detection
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Detect cars, trucks, and vehicles
                  </Typography>
                </Box>
              }
              sx={{ margin: 0, width: '100%' }}
            />
          </Box>

          {/* Fire Detection */}
          <Box
            sx={{
              p: 2,
              border: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
              borderRadius: 2,
              backgroundColor: selectedCamera?.detectionModels?.fireDetection
                ? (darkMode ? 'rgba(46, 125, 50, 0.1)' : 'rgba(46, 125, 50, 0.05)')
                : 'transparent',
              borderColor: selectedCamera?.detectionModels?.fireDetection ? 'primary.main' : undefined,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              },
            }}
            onClick={() => onDetectionModelChange('fireDetection')}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={selectedCamera?.detectionModels?.fireDetection || false}
                  onChange={() => onDetectionModelChange('fireDetection')}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    Fire Detection
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Early fire and smoke detection
                  </Typography>
                </Box>
              }
              sx={{ margin: 0, width: '100%' }}
            />
          </Box>

          {/* Facemask Detection */}
          <Box
            sx={{
              p: 2,
              border: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
              borderRadius: 2,
              backgroundColor: selectedCamera?.detectionModels?.facemaskDetection
                ? (darkMode ? 'rgba(46, 125, 50, 0.1)' : 'rgba(46, 125, 50, 0.05)')
                : 'transparent',
              borderColor: selectedCamera?.detectionModels?.facemaskDetection ? 'primary.main' : undefined,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              },
            }}
            onClick={() => onDetectionModelChange('facemaskDetection')}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={selectedCamera?.detectionModels?.facemaskDetection || false}
                  onChange={() => onDetectionModelChange('facemaskDetection')}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    Facemask Detection
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Monitor mask compliance
                  </Typography>
                </Box>
              }
              sx={{ margin: 0, width: '100%' }}
            />
          </Box>
        </Box>

        {/* Apply Button */}
        <Button
          variant="contained"
          fullWidth
          sx={{
            mt: 3,
            py: 1.5,
            backgroundColor: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
          }}
          onClick={handleApplyModels}
        >
          Apply Models
        </Button>
      </Box>
    </Drawer>
  );
};

export default ModelsSidebar;