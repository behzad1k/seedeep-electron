import React, { useRef, memo } from 'react';
import { Box } from '@mui/material';
import { Camera } from '@/types/camera';
import { CameraTile } from './CameraTile';
import { CameraFeed } from './CameraFeed';
import { useIntersectionObserver } from '@/hooks';

interface LazyLoadedCameraTileProps {
  camera: Camera;
  index: number;
  darkMode: boolean;
  onClick: (camera: Camera) => void;
  wsUrl: string;
}

/**
 * Lazy-loaded camera tile with intersection observer
 * Only renders feed when visible in viewport
 */
export const LazyLoadedCameraTile = memo<LazyLoadedCameraTileProps>(({
                                                                       camera,
                                                                       index,
                                                                       darkMode,
                                                                       onClick,
                                                                       wsUrl
                                                                     }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(containerRef, {
    threshold: 0.1,
    rootMargin: '50px' // Pre-load slightly before entering viewport
  });

  return (
    <Box ref={containerRef} sx={{ width: '100%', height: '100%' }}>
      {isVisible ? (
        <CameraFeed
          cameraId={camera.id}
          wsUrl={wsUrl}
          targetFPS={15}
          isVisible={isVisible}
        />
      ) : (
        <CameraTile
          camera={camera}
          index={index}
          darkMode={darkMode}
          onClick={onClick}
        />
      )}
    </Box>
  );
});

LazyLoadedCameraTile.displayName = 'LazyLoadedCameraTile';