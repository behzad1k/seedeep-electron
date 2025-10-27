import { useEffect, useState } from 'react';
import type { ElectronAPI } from '@shared/types';

/**
 * Hook to safely access Electron API with type safety
 */
export const useElectronAPI = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [api, setApi] = useState<ElectronAPI | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      setIsAvailable(true);
      setApi(window.electronAPI);
    } else {
      console.warn('[useElectronAPI] Electron API not available');
    }
  }, []);

  return {
    isAvailable,
    api,
    camera: api?.camera,
    detection: api?.detection,
    tracking: api?.tracking,
    system: api?.system
  };
};

/**
 * Hook to safely use camera API
 */
export const useElectronCamera = () => {
  const { camera, isAvailable } = useElectronAPI();

  if (!isAvailable || !camera) {
    throw new Error('Electron Camera API not available');
  }

  return camera;
};

/**
 * Hook to safely use detection API
 */
export const useElectronDetection = () => {
  const { detection, isAvailable } = useElectronAPI();

  if (!isAvailable || !detection) {
    throw new Error('Electron Detection API not available');
  }

  return detection;
};

/**
 * Hook to safely use tracking API
 */
export const useElectronTracking = () => {
  const { tracking, isAvailable } = useElectronAPI();

  if (!isAvailable || !tracking) {
    throw new Error('Electron Tracking API not available');
  }

  return tracking;
};