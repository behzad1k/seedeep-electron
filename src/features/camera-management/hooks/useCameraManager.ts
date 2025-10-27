import { DetectionModelKey, Camera, IpcResponse, BackendCamera } from '@shared/types';
import { MemoryMonitor } from '@utils/performance/MemoryMonitor';
import { useState, useCallback, useEffect } from 'react';

export const useCameraManager = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [fullScreenCamera, setFullScreenCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if Electron API is available
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

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
   * Transform backend camera to frontend format
   */
  const transformCamera = (cam: BackendCamera): Camera => ({
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
    },
    isCalibrated: cam.is_calibrated,
    pixelsPerMeter: cam.pixels_per_meter,
    calibrationMode: cam.calibration_mode
  });

  /**
   * Fetch all cameras from backend
   */
  const fetchCameras = useCallback(async (activeOnly: boolean = false) => {
    if (!isElectron) {
      setError('Electron API not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response: IpcResponse<BackendCamera[]> = await window.electronAPI.camera.getAll();

      if (response.success && response.data) {
        const transformedCameras = response.data.map(transformCamera);
        setCameras(transformedCameras);
      } else {
        setError(response.error || 'Failed to fetch cameras');
        console.error('Failed to fetch cameras:', response.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch cameras';
      setError(errorMessage);
      console.error('Error fetching cameras:', err);
    } finally {
      setLoading(false);
    }
  }, [isElectron]);

  /**
   * Create a new camera
   */
  const createCamera = useCallback(async (cameraData: any) => {
    if (!isElectron) {
      console.error('Electron API not available');
      return null;
    }

    try {
      const response: IpcResponse<BackendCamera> = await window.electronAPI.camera.create({
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

      if (response.success && response.data) {
        await fetchCameras();
        return response.data;
      } else {
        console.error('Failed to create camera:', response.error);
        return null;
      }
    } catch (err) {
      console.error('Error creating camera:', err);
      return null;
    }
  }, [isElectron, fetchCameras]);

  /**
   * Update camera model settings
   */
  const updateCameraModel = useCallback(async (
    cameraId: number | string,
    model: DetectionModelKey
  ) => {
    if (!isElectron) {
      console.error('Electron API not available');
      return;
    }

    const camera = cameras.find(c => c.id === cameraId);
    if (!camera) return;

    const currentModels = camera.detectionModels || {
      ppeDetection: false,
      personDetection: false,
      generalDetection: false,
      fireDetection: false,
      weaponDetection: false,
    };
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

    const newModels = currentModels[model]
      ? currentBackendModels.filter(m => m !== backendModelName)
      : [...currentBackendModels, backendModelName];

    try {
      const response: IpcResponse<BackendCamera> = await window.electronAPI.camera.update(
        cameraId.toString(),
        { active_models: newModels }
      );

      if (response.success) {
        // Update local state optimistically
        const updatedDetectionModels = {
          ...currentModels,
          [model]: !currentModels[model]
        };

        setCameras(prev => prev.map(cam =>
          cam.id === cameraId
            ? { ...cam, detectionModels: updatedDetectionModels }
            : cam
        ));

        if (selectedCamera?.id === cameraId) {
          setSelectedCamera(prev => prev
            ? { ...prev, detectionModels: updatedDetectionModels }
            : null
          );
        }

        if (fullScreenCamera?.id === cameraId) {
          setFullScreenCamera(prev => prev
            ? { ...prev, detectionModels: updatedDetectionModels }
            : null
          );
        }
      } else {
        console.error('Failed to update camera:', response.error);
      }
    } catch (err) {
      console.error('Error updating camera model:', err);
    }
  }, [cameras, selectedCamera, fullScreenCamera, isElectron]);

  /**
   * Delete a camera
   */
  const deleteCamera = useCallback(async (cameraId: string) => {
    if (!isElectron) {
      console.error('Electron API not available');
      return false;
    }

    try {
      const response: IpcResponse<void> = await window.electronAPI.camera.delete(cameraId);

      if (response.success) {
        await fetchCameras();
        return true;
      } else {
        console.error('Failed to delete camera:', response.error);
        return false;
      }
    } catch (err) {
      console.error('Error deleting camera:', err);
      return false;
    }
  }, [isElectron, fetchCameras]);

  /**
   * Calibrate a camera
   */
  const calibrateCamera = useCallback(async (
    cameraId: string,
    calibrationData: any
  ) => {
    if (!isElectron) {
      console.error('Electron API not available');
      return null;
    }

    try {
      const response: IpcResponse<BackendCamera> = await window.electronAPI.camera.calibrate(
        cameraId,
        calibrationData
      );

      if (response.success && response.data) {
        await fetchCameras();
        return response.data;
      } else {
        console.error('Failed to calibrate camera:', response.error);
        return null;
      }
    } catch (err) {
      console.error('Error calibrating camera:', err);
      return null;
    }
  }, [isElectron, fetchCameras]);

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