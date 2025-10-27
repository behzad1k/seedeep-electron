import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { WindowManager } from './window/WindowManager';
import { registerIpcHandlers } from './ipc/ipcMain';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevelopment = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  const windowManager = WindowManager.getInstance();
  mainWindow = await windowManager.createMainWindow(isDevelopment);

  // Register all IPC handlers
  registerIpcHandlers();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});