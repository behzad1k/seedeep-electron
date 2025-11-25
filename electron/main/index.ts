import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { WindowManager } from './window/WindowManager';
import { registerIpcHandlers } from './ipc/ipcMain';
import { BackendManager } from './services/BackendManager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevelopment = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
const backendManager = BackendManager.getInstance();

async function createWindow() {
  // Start backend first
  console.log('🚀 Starting application...');

  const backendStarted = await backendManager.start();

  if (!backendStarted) {
    await dialog.showErrorBox(
      'Backend Error',
      'Failed to start the application backend. Please check your installation and try again.'
    );
    app.quit();
    return;
  }

  // Create window
  const windowManager = WindowManager.getInstance();
  mainWindow = await windowManager.createMainWindow(isDevelopment);

  // Register all IPC handlers
  registerIpcHandlers();

  console.log('✅ Application started successfully');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  backendManager.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  console.log('🛑 Application shutting down...');
  backendManager.stop();
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  backendManager.stop();
});