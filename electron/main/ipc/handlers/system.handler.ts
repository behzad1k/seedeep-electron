import { ipcMain } from 'electron';
import { IpcChannels, IpcResponse } from '@shared/types/ipc.types';

export function registerSystemHandlers() {
  ipcMain.handle(IpcChannels.SYSTEM_GET_INFO, async (): Promise<IpcResponse> => {
    return {
      success: true,
      data: {
        platform: process.platform,
        version: process.version,
        arch: process.arch
      }
    };
  });

  console.log('[IPC] System handlers registered');
}