import { ipcMain } from 'electron';
import { IpcChannels, IpcResponse } from '@shared/types/ipc.types';
import { BackendCamera } from '@shared/types';
import { backendAPI } from '@shared/services/api';

export function registerCameraHandlers() {
  // Get all cameras
  ipcMain.handle(
    IpcChannels.CAMERA_GET_ALL,
    async (): Promise<IpcResponse<BackendCamera[]>> => {
      const response = await backendAPI.getCameras();
      return {
        success: response.success,
        data: response.data,
        error: response.error
      };
    }
  );

  // Get camera by ID
  ipcMain.handle(
    IpcChannels.CAMERA_GET_BY_ID,
    async (_, cameraId: string): Promise<IpcResponse<BackendCamera>> => {
      const response = await backendAPI.getCamera(cameraId);
      return {
        success: response.success,
        data: response.data,
        error: response.error
      };
    }
  );

  // Create camera
  ipcMain.handle(
    IpcChannels.CAMERA_CREATE,
    async (_, cameraData: any): Promise<IpcResponse<BackendCamera>> => {
      const response = await backendAPI.createCamera(cameraData);
      return {
        success: response.success,
        data: response.data,
        error: response.error
      };
    }
  );

  // Update camera
  ipcMain.handle(
    IpcChannels.CAMERA_UPDATE,
    async (_, { cameraId, updates }: { cameraId: string; updates: any }): Promise<IpcResponse<BackendCamera>> => {
      const response = await backendAPI.updateCamera(cameraId, updates);
      return {
        success: response.success,
        data: response.data,
        error: response.error
      };
    }
  );

  // Delete camera
  ipcMain.handle(
    IpcChannels.CAMERA_DELETE,
    async (_, cameraId: string): Promise<IpcResponse<void>> => {
      const response = await backendAPI.deleteCamera(cameraId);
      return {
        success: response.success,
        error: response.error
      };
    }
  );

  // Calibrate camera
  ipcMain.handle(
    IpcChannels.CAMERA_CALIBRATE,
    async (_, { cameraId, data }: { cameraId: string; data: any }): Promise<IpcResponse<BackendCamera>> => {
      const response = await backendAPI.calibrateCamera(cameraId, data);
      return {
        success: response.success,
        data: response.data,
        error: response.error
      };
    }
  );

  console.log('[IPC] Camera handlers registered');
}