import { Camera } from '@shared/types';
import React, { memo, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { Videocam } from '@mui/icons-material';

interface CameraTileProps {
  camera: Camera;
  index: number;
  darkMode: boolean;
  onClick: (camera: Camera) => void;
}

export const CameraTile = memo<CameraTileProps>(({
                                                   camera,
                                                   index,
                                                   darkMode,
                                                   onClick
                                                 }) => {
  const handleClick = useCallback(() => {
    onClick(camera);
  }, [camera, onClick]);

  return (
    <Box
      sx={{
        position: 'relative',
        backgroundColor: darkMode ? '#1a1a1a' : '#000',
        border: '2px solid',
        borderColor: darkMode ? '#333' : '#666',
        borderRadius: 1,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
          transform: 'scale(1.02)',
        },
      }}
      onClick={handleClick}
    >
      {/* Channel Number */}
      <Box
        sx={{
          position: 'absolute',
          top: 4,
          left: 4,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          px: 1,
          py: 0.5,
          borderRadius: 0.5,
          fontSize: '0.75rem',
          fontWeight: 'bold',
          zIndex: 2,
        }}
      >
        CH{index + 1}
      </Box>

      {/* Status Indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor:
            camera.status === 'online' ? '#4caf50' :
              camera.status === 'recording' ? '#ff9800' : '#f44336',
          zIndex: 2,
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

      {/* Camera Feed Area */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: camera.status === 'offline' ? '#333' : '#1a1a1a',
        }}
      >
        {camera.status === 'offline' ? (
          <Box sx={{ textAlign: 'center', color: '#666' }}>
            <Videocam sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="caption" display="block">
              NO SIGNAL
            </Typography>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', color: '#888' }}>
            <Videocam sx={{ fontSize: 40 }} />
          </Box>
        )}
      </Box>

      {/* Camera Info Overlay */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          p: 1,
        }}
      >
        <Typography variant="caption" display="block" fontWeight="bold">
          {camera.name}
        </Typography>
        <Typography variant="caption" color="#ccc">
          {camera.location}
        </Typography>
      </Box>
    </Box>
  );
});

CameraTile.displayName = 'CameraTile';

