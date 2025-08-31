import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Example API methods - add more as needed
  getVersion: () => process.versions.electron,
  getPlatform: () => process.platform,

  // IPC methods for communicating with main process
  sendMessage: (channel: string, data: any) => {
    // Whitelist channels for security
    const validChannels = ['app-message', 'file-request'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  onMessage: (channel: string, func: (...args: any[]) => void) => {
    const validChannels = ['app-response', 'file-response'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Type declaration for TypeScript
declare global {
  interface Window {
    electronAPI: {
      getVersion: () => string;
      getPlatform: () => string;
      sendMessage: (channel: string, data: any) => void;
      onMessage: (channel: string, func: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}