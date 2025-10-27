import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WindowManager {
  private static instance: WindowManager;
  private mainWindow: BrowserWindow | null = null;

  private constructor() {}

  static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  async createMainWindow(isDevelopment: boolean): Promise<BrowserWindow> {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: !isDevelopment
      },
      show: false,
      backgroundColor: '#000000'
    });

    if (isDevelopment) {
      // Vite dev server
      await this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      // Production build
      await this.mainWindow.loadFile(
        path.join(__dirname, '../../dist-renderer/index.html')
      );
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    return this.mainWindow;
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }
}