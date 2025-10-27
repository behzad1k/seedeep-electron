import type { BackendCamera, IpcResponse } from '@shared/types';

/**
 * Camera service using Electron IPC
 * Communicates with main process which then calls FastAPI backend
 */
class ElectronCameraService {
  /**
   * Get all cameras
   */
  async getCameras(): Promise<BackendCamera[]> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    const response: IpcResponse<BackendCamera[]> = await window.electronAPI.camera.getAll();

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch cameras');
    }

    return response.data || [];
  }

  /**
   * Get single camera by ID
   */
  async getCamera(id: string): Promise<BackendCamera> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    const response: IpcResponse<BackendCamera> = await window.electronAPI.camera.getById(id);

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch camera');
    }

    if (!response.data) {
      throw new Error('Camera not found');
    }

    return response.data;
  }

  /**
   * Create new camera
   */
  async createCamera(data: any): Promise<BackendCamera> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    const response: IpcResponse<BackendCamera> = await window.electronAPI.camera.create(data);

    if (!response.success) {
      throw new Error(response.error || 'Failed to create camera');
    }

    if (!response.data) {
      throw new Error('No camera data returned');
    }

    return response.data;
  }

  /**
   * Update camera
   */
  async updateCamera(id: string, updates: any): Promise<BackendCamera> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    const response: IpcResponse<BackendCamera> = await window.electronAPI.camera.update(id, updates);

    if (!response.success) {
      throw new Error(response.error || 'Failed to update camera');
    }

    if (!response.data) {
      throw new Error('No camera data returned');
    }

    return response.data;
  }

  /**
   * Delete camera
   */
  async deleteCamera(id: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    const response: IpcResponse<void> = await window.electronAPI.camera.delete(id);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete camera');
    }
  }

  /**
   * Calibrate camera
   */
  async calibrateCamera(id: string, calibrationData: any): Promise<BackendCamera> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    const response: IpcResponse<BackendCamera> = await window.electronAPI.camera.calibrate(
      id,
      calibrationData
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to calibrate camera');
    }

    if (!response.data) {
      throw new Error('No camera data returned');
    }

    return response.data;
  }

  /**
   * Check if Electron API is available
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI;
  }
}

// Export singleton instance
export const electronCameraService = new ElectronCameraService();