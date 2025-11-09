import { BackendCamera, Camera, IpcResponse } from '@shared/types';
import { WebSocketPool } from '@utils/websocket/WebsocketPool';
import { useState, useCallback, useEffect, useRef } from 'react';

export const useCameraManager = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [fullScreenCamera, setFullScreenCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track WebSocket connections per camera
  const wsConnectionsRef = useRef<Map<string, () => void>>(new Map());
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  /**
   * Transform backend camera to frontend format
   */
  const transformCamera = useCallback((cam: BackendCamera): Camera => ({
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
      generalDetection: cam.active_models?.includes('general_detection') || false,
      capDetection: cam.active_models?.includes('cap_detection') || false,
      fireDetection: cam.active_models?.includes('fire_detection') || false,
      weaponDetection: cam.active_models?.includes('weapon_detection') || false,
    },
    isCalibrated: cam.is_calibrated,
    pixelsPerMeter: cam.pixels_per_meter,
    calibrationMode: cam.calibration_mode,
    // Enhanced features
    features: cam.features || {},
  }), []);

  /**
   * Connect camera to WebSocket
   */
  const connectCameraWebSocket = useCallback((camera: Camera) => {
    const wsUrl = `ws://localhost:8000/ws/camera/${camera.id}`;
    const pool = WebSocketPool.getInstance();

    // Unsubscribe if already connected
    const existingUnsubscribe = wsConnectionsRef.current.get(camera.id);
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    // Subscribe to camera's WebSocket
    const unsubscribe = pool.subscribe(
      wsUrl,
      camera.id,
      (data: any) => {
        console.log(`[Camera ${camera.id}] Received data:`, data);
        // Handle incoming data - update UI, trigger events, etc.
      },
      (error: any) => {
        console.error(`[Camera ${camera.id}] WebSocket error:`, error);
      }
    );

    wsConnectionsRef.current.set(camera.id, unsubscribe);
    console.log(`✅ Connected WebSocket for camera ${camera.id}`);
  }, []);

  /**
   * Disconnect camera from WebSocket
   */
  const disconnectCameraWebSocket = useCallback((cameraId: string) => {
    const unsubscribe = wsConnectionsRef.current.get(cameraId);
    if (unsubscribe) {
      unsubscribe();
      wsConnectionsRef.current.delete(cameraId);
      console.log(`🔴 Disconnected WebSocket for camera ${cameraId}`);
    }
  }, []);

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
        console.log(response.data, transformedCameras);
        setCameras(transformedCameras);

        // Connect WebSocket for each active camera
        transformedCameras.forEach(camera => {
          if (camera.status === 'online') {
            // connectCameraWebSocket(camera);
          }
        });
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
  }, [isElectron, transformCamera, connectCameraWebSocket]);

  /**
   * Create a new camera
   */
  const createCamera = useCallback(async (cameraData: any) => {
    if (!isElectron) {
      console.error('Electron API not available');
      return null;
    }

    try {
      const response: IpcResponse<BackendCamera> = await window.electronAPI.camera.create(cameraData);

      if (response.success && response.data) {
        await fetchCameras();

        // Connect WebSocket for new camera
        const newCamera = transformCamera(response.data);
        if (newCamera.status === 'online') {
          // connectCameraWebSocket(newCamera);
        }

        return response.data;
      } else {
        console.error('Failed to create camera:', response.error);
        return null;
      }
    } catch (err) {
      console.error('Error creating camera:', err);
      return null;
    }
  }, [isElectron, fetchCameras, transformCamera, connectCameraWebSocket]);

  /**
   * Update camera features
   */
  const updateCameraFeatures = useCallback(async (cameraId: string, features: any) => {
    if (!isElectron) {
      console.error('Electron API not available');
      return null;
    }

    try {
      const response: IpcResponse<BackendCamera> = await window.electronAPI.camera.updateFeatures(
        cameraId,
        features
      );

      if (response.success && response.data) {
        await fetchCameras();
        return response.data;
      } else {
        console.error('Failed to update camera features:', response.error);
        return null;
      }
    } catch (err) {
      console.error('Error updating camera features:', err);
      return null;
    }
  }, [isElectron, fetchCameras]);

  /**
   * Delete a camera
   */
  const deleteCamera = useCallback(async (cameraId: string) => {
    if (!isElectron) {
      console.error('Electron API not available');
      return false;
    }

    try {
      // Disconnect WebSocket first
      disconnectCameraWebSocket(cameraId);

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
  }, [isElectron, fetchCameras, disconnectCameraWebSocket]);

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

  // Initial fetch
  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  // Cleanup WebSocket connections on unmount
  useEffect(() => {
    return () => {
      wsConnectionsRef.current.forEach((unsubscribe) => {
        unsubscribe();
      });
      wsConnectionsRef.current.clear();
    };
  }, []);

  return {
    cameras,
    selectedCamera,
    fullScreenCamera,
    loading,
    error,
    setCameras,
    setSelectedCamera,
    setFullScreenCamera,
    fetchCameras,
    createCamera,
    updateCameraFeatures,
    deleteCamera,
    calibrateCamera,
    connectCameraWebSocket,
    disconnectCameraWebSocket,
  };
};