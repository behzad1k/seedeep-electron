import { Camera } from '@shared/types';
import React from 'react';
import {
  Box,
  IconButton,
  Typography,
  Paper,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Videocam,
  FiberManualRecord,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';

interface FullScreenCameraViewProps {
  camera: Camera;
  onBack: () => void;
  darkMode: boolean;
  channelNumber: number;
}

const FullScreenCameraView: React.FC<FullScreenCameraViewProps> = ({
                                                                     camera,
                                                                     onBack,
                                                                     darkMode,
                                                                     channelNumber,
                                                                   }) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getActiveModels = () => {
    if (!camera.detectionModels) return [];

    return Object.entries(camera.detectionModels)
      .filter(([_, enabled]) => enabled)
      .map(([key, _]) => {
        const modelNames: Record<string, string> = {
          ppeDetection: 'PPE',
          personDetection: 'Person',
          generalDetection: 'General',
          fireDetection: 'Fire',
          weaponDetection: 'Mask',
        };
        return modelNames[key] || key;
      });
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: darkMode ? '#000' : '#f0f0f0',
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 'auto',
      }}
    >
      {/* Header Controls */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          borderRadius: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
          borderBottom: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
        }}
      >
        {/* Left side - Back button and camera info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title="Back to Grid (or click on camera feed)">
            <IconButton
              onClick={onBack}
              sx={{
                backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                '&:hover': {
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                },
              }}
            >
              <ArrowBack />
            </IconButton>
          </Tooltip>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                {camera.name}
              </Typography>
              <Chip
                label={`CH${channelNumber}`}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {camera.location}
            </Typography>
          </Box>
        </Box>

        {/* Right side - Status and controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Active AI Models */}
          {getActiveModels().length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {getActiveModels().map((model) => (
                <Chip
                  key={model}
                  label={model}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          )}

          {/* Camera Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor:
                  camera.status === 'online' ? '#4caf50' :
                    camera.status === 'recording' ? '#ff9800' : '#f44336',
                ...(camera.status === 'recording' && {
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                    '100%': { opacity: 1 },
                  },
                }),
              }}
            />
            <Typography
              variant="body2"
              fontWeight="medium"
              sx={{
                color:
                  camera.status === 'online' ? '#4caf50' :
                    camera.status === 'recording' ? '#ff9800' : '#f44336',
              }}
            >
              {camera.status === 'online' ? 'Live' :
                camera.status === 'recording' ? 'Recording' : 'Offline'}
            </Typography>
          </Box>

          {/* Fullscreen Toggle */}
          <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <IconButton
              onClick={toggleFullscreen}
              sx={{
                backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                '&:hover': {
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                },
              }}
            >
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Main Camera Feed Area */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: camera.status === 'offline' ? '#1a1a1a' : '#000',
          position: 'relative',
          minHeight: '400px',
        }}
      >
        {camera.status === 'offline' ? (
          <Box sx={{ textAlign: 'center', color: '#666' }}>
            <Videocam sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              NO SIGNAL
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Camera is currently offline
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#000',
              position: 'relative',
            }}
          >
            {/* Mock Camera Feed */}
            <Box sx={{ textAlign: 'center', color: '#888' }}>
              <Videocam sx={{ fontSize: 120, mb: 2 }} />
              <Typography variant="h6">
                Live Feed - {camera.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Camera feed will be displayed here
              </Typography>
            </Box>

            {/* Recording Indicator */}
            {camera.status === 'recording' && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  color: '#ff4444',
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  animation: 'pulse 2s infinite',
                  pointerEvents: 'none',
                }}
              >
                <FiberManualRecord sx={{ fontSize: 16 }} />
                <Typography variant="body2" fontWeight="bold">
                  REC
                </Typography>
              </Box>
            )}

            {/* AI Detection Overlay (if models are active) */}
            {getActiveModels().length > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 20,
                  left: 20,
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  p: 1.5,
                  borderRadius: 1,
                  pointerEvents: 'none',
                }}
              >
                <Typography variant="caption" display="block" fontWeight="bold">
                  AI DETECTION ACTIVE
                </Typography>
                <Typography variant="caption" color="#4caf50">
                  {getActiveModels().join(' • ')}
                </Typography>
              </Box>
            )}

            {/* Timestamp */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                backgroundColor: 'rgba(0,0,0,0.8)',
                color: 'white',
                px: 2,
                py: 1,
                borderRadius: 1,
                fontFamily: 'monospace',
                pointerEvents: 'none',
              }}
            >
              <Typography variant="body2">
                {new Date().toLocaleString()}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Bottom Info Bar */}
      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          borderRadius: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
          borderTop: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Stream URL: rtsp://{camera.name.toLowerCase().replace(/\s+/g, '-')}.local:554/stream
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Resolution: 1920×1080 • 30 FPS • H.264
        </Typography>
      </Paper>
    </Box>
  );
};

export default FullScreenCameraView;