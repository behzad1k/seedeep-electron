import { CameraFeed } from '@features/camera-management/components/CameraFeed.tsx';
import { useIntersectionObserver } from '@hooks/useIntersectionObserver.ts';
import { BackendCamera, Camera } from '@shared/types';
import React, { useRef, memo } from 'react';
import { Box } from '@mui/material';
import { CameraTile } from './CameraTile';

interface LazyLoadedCameraTileProps {
  camera: Camera;
  index: number;
  darkMode: boolean;
  onClick: (camera: Camera) => void;
  wsUrl: string;
  handleOpenFeatureConfig: (camera: BackendCamera) => void;
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
                                                                       wsUrl,
  handleOpenFeatureConfig
                                                                     }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(containerRef, {
    threshold: 0.1,
    rootMargin: '50px' // Pre-load slightly before entering viewport
  });

  return (
    <Box ref={containerRef} sx={{ width: '100%', height: '100%' }}>
      {/* {isVisible ? ( */}
        <CameraFeed
          cameraId={camera.id}
          wsUrl={wsUrl}
          targetFPS={15}
          isVisible={isVisible}
        />
      {/* ) : ( */}
      {/*   <CameraTile */}
      {/*     handleOpenFeatureConfig={handleOpenFeatureConfig} */}
      {/*     camera={camera} */}
      {/*     index={index} */}
      {/*     darkMode={darkMode} */}
      {/*     onClick={onClick} */}
      {/*   /> */}
      {/* )} */}
    </Box>
  );
});

LazyLoadedCameraTile.displayName = 'LazyLoadedCameraTile';