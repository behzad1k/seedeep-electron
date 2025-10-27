import { ipcMain } from 'electron';
import { IpcChannels, IpcResponse } from '@shared/types/ipc.types';

export function registerTrackingHandlers() {
  ipcMain.handle(IpcChannels.TRACKING_START, async (_, config: any): Promise<IpcResponse> => {
    // TODO: Implement tracking start logic
    return { success: true };
  });

  ipcMain.handle(IpcChannels.TRACKING_STOP, async (): Promise<IpcResponse> => {
    // TODO: Implement tracking stop logic
    return { success: true };
  });

  console.log('[IPC] Tracking handlers registered');
}