
import React from 'react';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { CheckCircle, Error, HourglassEmpty } from '@mui/icons-material';
import { useBackendHealth } from '../hooks/useBackendHealth';

interface BackendHealthIndicatorProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const BackendHealthIndicator: React.FC<BackendHealthIndicatorProps> = ({
                                                                                position = 'top-right'
                                                                              }) => {
  const { isHealthy, isChecking, error, healthData, lastCheck } = useBackendHealth();

  const getPositionStyles = () => {
    const base = { position: 'fixed', zIndex: 9998 };
    switch (position) {
      case 'top-right': return { ...base, top: 16, right: 16 };
      case 'top-left': return { ...base, top: 16, left: 16 };
      case 'bottom-right': return { ...base, bottom: 16, right: 16 };
      case 'bottom-left': return { ...base, bottom: 16, left: 16 };
      default: return { ...base, top: 16, right: 16 };
    }
  };

  const getTooltipContent = () => {
    if (isChecking) {
      return 'Checking backend health...';
    }
    if (error) {
      return `Backend Error: ${error}`;
    }
    if (isHealthy && healthData) {
      return (
        <Box>
          <Typography variant="caption" display="block">Backend Online</Typography>
          <Typography variant="caption" display="block">Device: {healthData.device}</Typography>
          <Typography variant="caption" display="block">Active Streams: {healthData.active_streams}</Typography>
          <Typography variant="caption" display="block">Models: {healthData.available_models.length}</Typography>
          <Typography variant="caption" display="block" sx={{ opacity: 0.7, mt: 0.5 }}>
            Last check: {lastCheck?.toLocaleTimeString()}
          </Typography>
        </Box>
      );
    }
    return 'Backend status unknown';
  };

  return (
    <Tooltip title={getTooltipContent()} arrow>
      <Chip
        icon={
          isChecking ? <HourglassEmpty /> :
            isHealthy ? <CheckCircle /> :
              <Error />
        }
        label={
          isChecking ? 'Checking...' :
            isHealthy ? 'Backend Online' :
              'Backend Offline'
        }
        color={
          isChecking ? 'default' :
            isHealthy ? 'success' :
              'error'
        }
        size="small"
        sx={getPositionStyles()}
      />
    </Tooltip>
  );
};
