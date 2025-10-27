import { ipcMain } from 'electron';
import { IpcChannels, IpcResponse } from '@shared/types/ipc.types';
import { backendAPI } from '@shared/services/api';

export function registerDetectionHandlers() {
  ipcMain.handle(
    IpcChannels.DETECTION_START,
    async (_, config: any): Promise<IpcResponse> => {
      // TODO: Implement detection start logic with backend
      // const response = await backendAPI.startDetection(config);
      return { success: true };
    }
  );

  ipcMain.handle(
    IpcChannels.DETECTION_STOP,
    async (): Promise<IpcResponse> => {
      // TODO: Implement detection stop logic with backend
      return { success: true };
    }
  );

  ipcMain.handle(
    IpcChannels.DETECTION_CONFIGURE,
    async (_, config: any): Promise<IpcResponse> => {
      // TODO: Implement detection configuration
      return { success: true };
    }
  );

  console.log('[IPC] Detection handlers registered');
}