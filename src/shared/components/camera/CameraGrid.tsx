import { Camera } from '@shared/types';
import React, { memo, useCallback } from 'react';
import { Box } from '@mui/material';
import { CameraTile } from './CameraTile';
import { EmptySlot } from './EmptySlot';

interface CameraGridProps {
  cameras: Camera[];
  gridSize: '2x2' | '3x3' | '4x4' | '5x5';
  darkMode: boolean;
  onCameraClick: (camera: Camera) => void;
  onAddCamera: () => void;
  renderCamera?: (camera: Camera, index: number) => React.ReactNode;
}

export const CameraGrid = memo<CameraGridProps>(({
                                                   cameras,
                                                   gridSize,
                                                   darkMode,
                                                   onCameraClick,
                                                   onAddCamera,
                                                   renderCamera
                                                 }) => {
  const getGridColumns = useCallback(() => {
    switch (gridSize) {
      case '2x2': return 2;
      case '3x3': return 3;
      case '4x4': return 4;
      case '5x5': return 5;
      default: return 3;
    }
  }, [gridSize]);

  const columns = getGridColumns();
  const maxCameras = columns * columns;
  const displayCameras = cameras.slice(0, maxCameras);
  const emptySlotsCount = maxCameras - displayCameras.length;

  return (
    <Box sx={{
      p: 2,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      backgroundColor: darkMode ? '#000' : '#f0f0f0',
    }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 1,
          height: '100%',
          aspectRatio: '1',
          maxHeight: 'calc(100vh - 160px)',
        }}
      >
        {displayCameras.map((camera, index) => (
          renderCamera ?
            renderCamera(camera, index) :
            <CameraTile
              key={camera.id}
              camera={camera}
              index={index}
              darkMode={darkMode}
              onClick={onCameraClick}
            />
        ))}

        {Array(emptySlotsCount).fill(null).map((_, index) => (
          <EmptySlot
            key={`empty-${index}`}
            darkMode={darkMode}
            onAddCamera={onAddCamera}
          />
        ))}
      </Box>
    </Box>
  );
});

CameraGrid.displayName = 'CameraGrid';

