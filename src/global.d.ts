/// <reference types="vite/client" />

import type { ElectronAPI } from '@shared/types/electron.types';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Vite environment variables
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_ELECTRON_MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};