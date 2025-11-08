import { BackendCamera, Camera } from '@shared/types';
import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { CameraTile } from './CameraTile';
import { EmptySlot } from './EmptySlot';

interface VirtualizedCameraGridProps {
  cameras: Camera[];
  gridSize: '2x2' | '3x3' | '4x4' | '5x5';
  darkMode: boolean;
  onCameraClick: (camera: Camera) => void;
  onAddCamera: () => void;
  handleOpenFeatureConfig: (camera: BackendCamera) => void;
}

/**
 * Virtualized grid for rendering large numbers of cameras efficiently
 * Only renders cameras that are currently visible in the viewport
 */
export const VirtualizedCameraGrid = memo<VirtualizedCameraGridProps>(({
                                                                         cameras,
                                                                         gridSize,
                                                                         darkMode,
                                                                         onCameraClick,
                                                                         onAddCamera,
  handleOpenFeatureConfig,
                                                                       }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

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

  // Calculate visible items based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const scrollTop = container.scrollTop;
      const clientHeight = container.clientHeight;
      const itemHeight = container.scrollHeight / Math.ceil(cameras.length / columns);

      const start = Math.floor(scrollTop / itemHeight) * columns;
      const end = Math.ceil((scrollTop + clientHeight) / itemHeight) * columns;

      setVisibleRange({
        start: Math.max(0, start - columns), // Add buffer
        end: Math.min(cameras.length, end + columns)
      });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial calculation
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [cameras.length, columns]);

  const displayCameras = cameras.slice(visibleRange.start, visibleRange.end);
  const emptySlotsCount = maxCameras - cameras.length;

  return (
    <Box
      ref={containerRef}
      sx={{
        p: 2,
        height: '100%',
        overflow: 'auto',
        backgroundColor: darkMode ? '#000' : '#f0f0f0',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 1,
          minHeight: `${Math.ceil(cameras.length / columns) * 300}px`, // Maintain scroll height
        }}
      >
        {displayCameras.map((camera, index) => (
          <CameraTile
            handleOpenFeatureConfig={handleOpenFeatureConfig}
            key={camera.id}
            camera={camera}
            index={visibleRange.start + index}
            darkMode={darkMode}
            onClick={onCameraClick}
          />
        ))}

        {emptySlotsCount > 0 && Array(emptySlotsCount).fill(null).map((_, index) => (
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

VirtualizedCameraGrid.displayName = 'VirtualizedCameraGrid';