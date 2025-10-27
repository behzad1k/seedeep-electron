import { BackendAPIService } from '@shared/services/api';
import { BackendCamera } from '@shared/types';

// Create instance for renderer process
const rendererAPI = new BackendAPIService('http://localhost:8000/api/v1');

export class CameraService {
  /**
   * Get all cameras (direct HTTP call)
   */
  async getCamerasDirect(): Promise<BackendCamera[]> {
    const response = await rendererAPI.getCameras();
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch cameras');
    }
    return response.data || [];
  }

  /**
   * Get all cameras (through Electron IPC)
   */
  async getCamerasViaIPC(): Promise<BackendCamera[]> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    const response = await window.electronAPI.camera.getAll();
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch cameras');
    }
    return response.data || [];
  }

  /**
   * Smart method - uses IPC if available, otherwise direct HTTP
   */
  async getCameras(): Promise<BackendCamera[]> {
    if (window.electronAPI) {
      return this.getCamerasViaIPC();
    }
    return this.getCamerasDirect();
  }
}

export const cameraService = new CameraService();