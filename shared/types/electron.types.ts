import { IpcChannels, IpcResponse } from './ipc.types';
import { BackendCamera } from './backend.types';

// Camera API Interface
export interface ElectronCameraAPI {
  getAll: () => Promise<IpcResponse<BackendCamera[]>>;
  getById: (id: string) => Promise<IpcResponse<BackendCamera>>;
  create: (data: any) => Promise<IpcResponse<BackendCamera>>;
  update: (id: string, updates: any) => Promise<IpcResponse<BackendCamera>>;
  delete: (id: string) => Promise<IpcResponse<void>>;
  calibrate: (id: string, data: any) => Promise<IpcResponse<BackendCamera>>;
}

// Detection API Interface
export interface ElectronDetectionAPI {
  start: (config: any) => Promise<IpcResponse>;
  stop: () => Promise<IpcResponse>;
  configure: (config: any) => Promise<IpcResponse>;
}

// Tracking API Interface
export interface ElectronTrackingAPI {
  start: (config: any) => Promise<IpcResponse>;
  stop: () => Promise<IpcResponse>;
  getStats: () => Promise<IpcResponse>;
}

// System API Interface
export interface ElectronSystemAPI {
  getInfo: () => Promise<IpcResponse>;
  getMemory: () => Promise<IpcResponse>;
}

// Complete Electron API
export interface ElectronAPI {
  camera: ElectronCameraAPI;
  detection: ElectronDetectionAPI;
  tracking: ElectronTrackingAPI;
  system: ElectronSystemAPI;
}

// Window extension
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}