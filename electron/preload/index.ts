import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels } from '@shared/types/ipc.types';
import type { ElectronAPI } from '@shared/types/electron.types';

// Camera API implementation
const cameraAPI = {
  getAll: () => ipcRenderer.invoke(IpcChannels.CAMERA_GET_ALL),
  getById: (id: string) => ipcRenderer.invoke(IpcChannels.CAMERA_GET_BY_ID, id),
  create: (data: any) => ipcRenderer.invoke(IpcChannels.CAMERA_CREATE, data),
  update: (id: string, updates: any) =>
    ipcRenderer.invoke(IpcChannels.CAMERA_UPDATE, { cameraId: id, updates }),
  delete: (id: string) => ipcRenderer.invoke(IpcChannels.CAMERA_DELETE, id),
  calibrate: (id: string, data: any) =>
    ipcRenderer.invoke(IpcChannels.CAMERA_CALIBRATE, { cameraId: id, data })
};

// Detection API implementation
const detectionAPI = {
  start: (config: any) => ipcRenderer.invoke(IpcChannels.DETECTION_START, config),
  stop: () => ipcRenderer.invoke(IpcChannels.DETECTION_STOP),
  configure: (config: any) => ipcRenderer.invoke(IpcChannels.DETECTION_CONFIGURE, config)
};

// Tracking API implementation
const trackingAPI = {
  start: (config: any) => ipcRenderer.invoke(IpcChannels.TRACKING_START, config),
  stop: () => ipcRenderer.invoke(IpcChannels.TRACKING_STOP),
  getStats: () => ipcRenderer.invoke(IpcChannels.TRACKING_GET_STATS)
};

// System API implementation
const systemAPI = {
  getInfo: () => ipcRenderer.invoke(IpcChannels.SYSTEM_GET_INFO),
  getMemory: () => ipcRenderer.invoke(IpcChannels.SYSTEM_GET_MEMORY)
};

// Expose typed API to renderer
const electronAPI: ElectronAPI = {
  camera: cameraAPI,
  detection: detectionAPI,
  tracking: trackingAPI,
  system: systemAPI
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);