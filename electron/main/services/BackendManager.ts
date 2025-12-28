import { spawn, ChildProcess } from 'child_process';
import { app, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BackendManager {
  private static instance: BackendManager;
  private backendProcess: ChildProcess | null = null;
  private readonly PORT = 8000;
  private readonly HOST = '127.0.0.1';
  private readonly MAX_RETRIES = 60;
  private readonly RETRY_DELAY = 1000;
  private startupLogs: string[] = [];

  private constructor() {}

  static getInstance(): BackendManager {
    if (!BackendManager.instance) {
      BackendManager.instance = new BackendManager();
    }
    return BackendManager.instance;
  }
  private getBackendPath(): string {
    if (app.isPackaged) {
      // In production, backend is in Resources folder
      if (process.platform === 'win32') {
        return path.join(process.resourcesPath, 'backend', 'start-backend.bat');
      }
      return path.join(process.resourcesPath, 'backend', 'start-backend');
    } else {
      // In development
      if (process.platform === 'win32') {
        return path.join(__dirname, '../../../backend/main.py');
      }
      return path.join(__dirname, '../../../backend/main.py');
    }
  }
  private getBackendWorkingDir(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'backend');
    } else {
      return path.join(__dirname, '../../..');
    }
  }

  private async isBackendRunning(): Promise<boolean> {
    try {
      const response = await axios.get(`http://${this.HOST}:${this.PORT}/health`, {
        timeout: 2000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private async waitForBackend(): Promise<boolean> {
    console.log('⏳ Waiting for backend to be ready...');

    for (let i = 0; i < this.MAX_RETRIES; i++) {
      if (await this.isBackendRunning()) {
        console.log('✅ Backend is ready!');
        return true;
      }

      if (i % 10 === 0) {
        console.log(`⏳ Still waiting... (${i + 1}/${this.MAX_RETRIES})`);
      }
      await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
    }

    console.error('❌ Backend failed to start within timeout');
    console.error('📋 Startup logs:');
    this.startupLogs.forEach(log => console.error(log));

    // Show detailed error dialog
    await this.showDetailedError();

    return false;
  }

  private async showDetailedError() {
    const logContent = this.startupLogs.join('\n');
    const message = `Backend failed to start. Recent logs:\n\n${logContent}\n\nPlease check Console.app for more details.`;

    await dialog.showMessageBox({
      type: 'error',
      title: 'Backend Startup Failed',
      message: 'Failed to start the application backend',
      detail: message,
      buttons: ['OK']
    });
  }

  private debugBackendDirectory() {
    if (!app.isPackaged) return;

    const backendDir = path.join(process.resourcesPath, 'backend');
    console.log('\n📂 =================================');
    console.log('📂 BACKEND DIRECTORY DEBUG INFO');
    console.log('📂 =================================');

    try {
      console.log(`📍 Backend directory: ${backendDir}`);
      console.log(`📍 Exists: ${fs.existsSync(backendDir)}`);

      if (fs.existsSync(backendDir)) {
        const files = fs.readdirSync(backendDir);
        console.log(`📄 Files in backend directory (${files.length}):`);
        files.forEach(file => {
          const filePath = path.join(backendDir, file);
          const stats = fs.statSync(filePath);
          const permissions = (stats.mode & parseInt('777', 8)).toString(8);
          console.log(`   ${stats.isDirectory() ? '📁' : '📄'} ${file} (${permissions})`);
        });

        // Check for start-backend script
        const startScript = path.join(backendDir, 'start-backend');
        if (fs.existsSync(startScript)) {
          const scriptStats = fs.statSync(startScript);
          const scriptPerms = (scriptStats.mode & parseInt('777', 8)).toString(8);
          console.log(`\n✅ start-backend found (permissions: ${scriptPerms})`);

          // Try to read first few lines
          try {
            const content = fs.readFileSync(startScript, 'utf-8');
            const firstLines = content.split('\n').slice(0, 5).join('\n');
            console.log(`📜 First lines of start-backend:\n${firstLines}`);
          } catch (e) {
            console.error(`❌ Could not read start-backend: ${e}`);
          }
        } else {
          console.error('❌ start-backend script NOT FOUND');
        }

        // Check for Python environment
        const pythonEnv = path.join(backendDir, 'python-env');
        console.log(`\n🐍 Python environment: ${fs.existsSync(pythonEnv) ? 'EXISTS' : 'MISSING'}`);

        if (fs.existsSync(pythonEnv)) {
          const pythonBin = path.join(pythonEnv, 'bin', 'python3');
          console.log(`🐍 Python binary: ${fs.existsSync(pythonBin) ? 'EXISTS' : 'MISSING'}`);

          if (fs.existsSync(pythonBin)) {
            const pythonStats = fs.statSync(pythonBin);
            const pythonPerms = (pythonStats.mode & parseInt('777', 8)).toString(8);
            console.log(`🐍 Python permissions: ${pythonPerms}`);
          }
        }

        // Check for main.py
        const mainPy = path.join(backendDir, 'main.py');
        console.log(`📄 main.py: ${fs.existsSync(mainPy) ? 'EXISTS' : 'MISSING'}`);

      } else {
        console.error('❌ Backend directory does not exist!');
      }
    } catch (error) {
      console.error('❌ Error inspecting backend directory:', error);
    }

    console.log('📂 =================================\n');
  }

  async start(): Promise<boolean> {
    console.log('🚀 Starting backend server...');
    console.log(`📍 Platform: ${process.platform}`);
    console.log(`📍 Architecture: ${process.arch}`);
    console.log(`📦 Packaged: ${app.isPackaged}`);
    console.log(`🏠 User Data: ${app.getPath('userData')}`);
    console.log(`📦 Resources Path: ${process.resourcesPath}`);

    // Debug backend directory
    this.debugBackendDirectory();

    if (await this.isBackendRunning()) {
      console.log('✅ Backend already running');
      return true;
    }

    try {
      const backendPath = this.getBackendPath();
      const workingDir = this.getBackendWorkingDir();

      console.log('📂 Backend path:', backendPath);
      console.log('📂 Working directory:', workingDir);

      if (!fs.existsSync(backendPath)) {
        console.error('❌ Backend script not found at:', backendPath);
        this.startupLogs.push(`Backend script not found: ${backendPath}`);
        return false;
      }

      // Make script executable (critical for M1/M2 Macs)
      if (app.isPackaged && process.platform !== 'win32') {
        try {
          fs.chmodSync(backendPath, '755');
          console.log('✅ Set executable permissions on start-backend');
        } catch (e) {
          console.error('⚠️ Could not set executable permissions:', e);
        }
      }

      const dbPath = path.join(app.getPath('userData'), 'seedeep.db');
      console.log('💾 Database path:', dbPath);

      if (app.isPackaged) {
        console.log('🏭 Running packaged backend');
        if (process.platform === 'win32') {
          // Windows: Run batch file directly
          this.backendProcess = spawn('cmd.exe', ['/c', backendPath], {
            env: {
              ...process.env,
              HOST: this.HOST,
              PORT: this.PORT.toString(),
              PYTHONUNBUFFERED: '1',
              DATABASE_URL: `sqlite+aiosqlite:///${dbPath}`,
              LOG_LEVEL: 'INFO',
            },
            cwd: workingDir,
            stdio: ['ignore', 'pipe', 'pipe']
          });
        } else {
        // For M1/M2 Macs, we need to ensure the shell can execute the script
        const shellPath = '/bin/bash';

        this.backendProcess = spawn(shellPath, [backendPath], {
          env: {
            ...process.env,
            HOST: this.HOST,
            PORT: this.PORT.toString(),
            PYTHONUNBUFFERED: '1',
            DATABASE_URL: `sqlite+aiosqlite:///${dbPath}`,
            LOG_LEVEL: 'INFO',
            // Help Python find the correct libraries on M1/M2
            DYLD_FALLBACK_LIBRARY_PATH: '/usr/local/lib:/usr/lib',
          },
          cwd: workingDir,
          stdio: ['ignore', 'pipe', 'pipe']
        });
      }
      }
      else {
        console.log('🔧 Running development backend');

        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

        this.backendProcess = spawn(pythonCmd, [backendPath], {
          env: {
            ...process.env,
            HOST: this.HOST,
            PORT: this.PORT.toString(),
            PYTHONUNBUFFERED: '1'
          },
          cwd: workingDir,
          stdio: ['ignore', 'pipe', 'pipe']
        });
      }

      this.backendProcess.stdout?.on('data', (data) => {
        const output = data.toString().trim();
        console.log(`[Backend] ${output}`);
        this.startupLogs.push(`[stdout] ${output}`);
        // Keep only last 50 logs
        if (this.startupLogs.length > 50) {
          this.startupLogs.shift();
        }
      });

      this.backendProcess.stderr?.on('data', (data) => {
        const output = data.toString().trim();
        if (output.includes('ERROR') || output.includes('Error') || output.includes('failed')) {
          console.error(`[Backend Error] ${output}`);
          this.startupLogs.push(`[stderr ERROR] ${output}`);
        } else {
          console.log(`[Backend] ${output}`);
          this.startupLogs.push(`[stderr] ${output}`);
        }
        // Keep only last 50 logs
        if (this.startupLogs.length > 50) {
          this.startupLogs.shift();
        }
      });

      this.backendProcess.on('error', (error) => {
        console.error('❌ Backend process error:', error);
        this.startupLogs.push(`[Process Error] ${error.message}`);
      });

      this.backendProcess.on('exit', (code, signal) => {
        console.log(`⚠️ Backend process exited - code: ${code}, signal: ${signal}`);
        this.startupLogs.push(`[Process Exit] code: ${code}, signal: ${signal}`);
        this.backendProcess = null;
      });

      const isReady = await this.waitForBackend();

      if (!isReady) {
        console.error('❌ Backend failed to start within timeout');
        this.stop();
        return false;
      }

      console.log('✅ Backend started successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to start backend:', error);
      this.startupLogs.push(`[Exception] ${error}`);
      return false;
    }
  }

  stop(): void {
    if (this.backendProcess) {
      console.log('🛑 Stopping backend server...');
      this.backendProcess.kill();
      this.backendProcess = null;
      console.log('✅ Backend stopped');
    }
  }

  getBackendURL(): string {
    return `http://${this.HOST}:${this.PORT}`;
  }

  getStartupLogs(): string[] {
    return this.startupLogs;
  }
}
