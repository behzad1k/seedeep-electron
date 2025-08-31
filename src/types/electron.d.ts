export interface IElectronAPI {
  getVersion: () => string;
  getPlatform: () => string;
  sendMessage: (channel: string, data: any) => void;
  onMessage: (channel: string, func: (...args: any[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}