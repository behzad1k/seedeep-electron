import { Camera } from '@/types';
import { useState, useCallback, useEffect } from 'react';
import { DetectionModelKey } from '@/types/camera';
import { cameraApi } from '@/services/api/cameraApi';
import { MemoryMonitor } from '@/utils/MemoryMonitor';

export const useCameraManager = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [fullScreenCamera, setFullScreenCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch cameras from backend on mount
  useEffect(() => {
    fetchCameras();
  }, []);

  // Update memory monitor with camera count
  useEffect(() => {
    const monitor = MemoryMonitor.getInstance();
    monitor.updateResourceCounts({
      cameras: cameras.length,
      connections: cameras.filter(c => c.status !== 'offline').length
    });
  }, [cameras]);

  /**
   * Fetch all cameras from backend
   */
  const fetchCameras = useCallback(async (activeOnly: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await cameraApi.getCameras(activeOnly);

      if (response.error) {
        setError(response.error);
        console.error('Failed to fetch cameras:', response.error);
      } else if (response.data) {
        // Transform backend data to frontend Camera type
        const transformedCameras = response.data.map(cam => ({
          id: cam.id,
          name: cam.name,
          status: cam.is_active ? 'online' : 'offline' as 'online' | 'offline' | 'recording',
          location: cam.location || '',
          rtsp_url: cam.rtsp_url,
          width: cam.width?.toString() || '640',
          height: cam.height?.toString() || '480',
          fps: cam.fps?.toString() || '30',
          detectionModels: {
            ppeDetection: cam.active_models?.includes('ppe_detection') || false,
            personDetection: cam.active_models?.includes('person_detection') || false,
            generalDetection: cam.active_models?.includes('general_detection') || false,
            fireDetection: cam.active_models?.includes('fire_detection') || false,
            weaponDetection: cam.active_models?.includes('weapon_detection') || false,
          }
        }));

        setCameras(transformedCameras);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch cameras';
      setError(errorMessage);
      console.error('Error fetching cameras:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new camera
   */
  const createCamera = useCallback(async (cameraData: any) => {
    try {
      const response = await cameraApi.createCamera({
        name: cameraData.name,
        location: cameraData.location,
        rtsp_url: cameraData.rtsp_url,
        width: parseInt(cameraData.width) || 640,
        height: parseInt(cameraData.height) || 480,
        fps: parseInt(cameraData.fps) || 30,
        features: cameraData.features || {
          detection: true,
          tracking: false,
          speed: false,
          counting: false
        },
        active_models: cameraData.active_models || []
      });

      if (response.error) {
        console.error('Failed to create camera:', response.error);
        return null;
      }

      // Refresh camera list
      await fetchCameras();
      return response.data;
    } catch (err) {
      console.error('Error creating camera:', err);
      return null;
    }
  }, [fetchCameras]);

  /**
   * Update camera model settings
   */
  const updateCameraModel = useCallback(async (
    cameraId: number | string,
    model: DetectionModelKey
  ) => {
    const camera = cameras.find(c => c.id === cameraId);
    if (!camera) return;

    // Get current models
    const currentModels = camera.detectionModels
    const modelMapping: Record<DetectionModelKey, string> = {
      ppeDetection: 'ppe_detection',
      personDetection: 'person_detection',
      generalDetection: 'general_detection',
      fireDetection: 'fire_detection',
      weaponDetection: 'weapon_detection'
    };

    const backendModelName = modelMapping[model];
    const currentBackendModels = Object.entries(currentModels)
    .filter(([_, enabled]) => enabled)
    .map(([key, _]) => modelMapping[key as DetectionModelKey])
    .filter(Boolean);

    // Toggle model
    const newModels = currentModels[model]
      ? currentBackendModels.filter(m => m !== backendModelName)
      : [...currentBackendModels, backendModelName];

    try {
      const response = await cameraApi.updateCamera(cameraId.toString(), {
        active_models: newModels
      });

      if (response.error) {
        console.error('Failed to update camera:', response.error);
        return;
      }

      // Update local state
      setCameras(prev => prev.map(cam => {
        if (cam.id === cameraId) {
          return {
            ...cam,
            detectionModels: {
              ...currentModels,
              [model]: !currentModels[model]
            }
          };
        }
        return cam;
      }));

      // Update selected camera
      if (selectedCamera?.id === cameraId) {
        setSelectedCamera(prev => {
          if (!prev) return null;
          return {
            ...prev,
            detectionModels: {
              ...currentModels,
              [model]: !currentModels[model]
            }
          };
        });
      }

      // Update fullscreen camera
      if (fullScreenCamera?.id === cameraId) {
        setFullScreenCamera(prev => {
          if (!prev) return null;
          return {
            ...prev,
            detectionModels: {
              ...currentModels,
              [model]: !currentModels[model]
            }
          };
        });
      }
    } catch (err) {
      console.error('Error updating camera model:', err);
    }
  }, [cameras, selectedCamera, fullScreenCamera]);

  /**
   * Delete a camera
   */
  const deleteCamera = useCallback(async (cameraId: string) => {
    try {
      const response = await cameraApi.deleteCamera(cameraId);

      if (response.error) {
        console.error('Failed to delete camera:', response.error);
        return false;
      }

      // Refresh camera list
      await fetchCameras();
      return true;
    } catch (err) {
      console.error('Error deleting camera:', err);
      return false;
    }
  }, [fetchCameras]);

  /**
   * Calibrate a camera
   */
  const calibrateCamera = useCallback(async (
    cameraId: string,
    calibrationData: any
  ) => {
    try {
      const response = await cameraApi.calibrateCamera(cameraId, calibrationData);

      if (response.error) {
        console.error('Failed to calibrate camera:', response.error);
        return null;
      }

      // Refresh camera list
      await fetchCameras();
      return response.data;
    } catch (err) {
      console.error('Error calibrating camera:', err);
      return null;
    }
  }, [fetchCameras]);

  return {
    cameras,
    selectedCamera,
    fullScreenCamera,
    loading,
    error,
    setCameras,
    setSelectedCamera,
    setFullScreenCamera,
    updateCameraModel,
    fetchCameras,
    createCamera,
    deleteCamera,
    calibrateCamera
  };
};