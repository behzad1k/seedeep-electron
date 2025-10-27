import { CameraStats } from '@components/camera/CameraStats.tsx';
import { Camera } from '@shared/types';
import React, { memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { GridControls } from './GridControls';

interface AppHeaderProps {
  title: string;
  cameras: Camera[];
  gridSize: '2x2' | '3x3' | '4x4' | '5x5';
  onGridSizeChange: (size: '2x2' | '3x3' | '4x4' | '5x5') => void;
  onAddCamera: () => void;
  showCameraControls?: boolean;
}

export const AppHeader = memo<AppHeaderProps>(({
                                                 title,
                                                 cameras,
                                                 gridSize,
                                                 onGridSizeChange,
                                                 onAddCamera,
                                                 showCameraControls = false
                                               }) => {
  return (
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
        {title}
      </Typography>

      {showCameraControls && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={onAddCamera}
            sx={{
              backgroundColor: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
            }}
          >
            Add Camera
          </Button>

          <Divider orientation="vertical" flexItem />

          <GridControls
            gridSize={gridSize}
            onGridSizeChange={onGridSizeChange}
          />

          <Divider orientation="vertical" flexItem />

          <CameraStats cameras={cameras} />
        </Box>
      )}
    </Paper>
  );
});

AppHeader.displayName = 'AppHeader';
