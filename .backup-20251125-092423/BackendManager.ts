import { spawn, ChildProcess } from 'child_process';
import { app } from 'electron';
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

  private constructor() {}

  static getInstance(): BackendManager {
    if (!BackendManager.instance) {
      BackendManager.instance = new BackendManager();
    }
    return BackendManager.instance;
  }

  private getBackendPath(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'backend', 'start-backend');
    } else {
      return path.join(__dirname, '../../../main.py');
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
    return false;
  }

  async start(): Promise<boolean> {
    console.log('🚀 Starting backend server...');
    console.log(`📍 Platform: ${process.platform}`);
    console.log(`📦 Packaged: ${app.isPackaged}`);
    console.log(`🏠 User Data: ${app.getPath('userData')}`);

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

        // Debug: List what's actually in the Resources directory
        if (app.isPackaged) {
          const resourcesDir = path.join(process.resourcesPath, 'backend');
          console.log('📂 Contents of backend directory:');
          try {
            const files = fs.readdirSync(resourcesDir);
            files.forEach(file => console.log(`   - ${file}`));
          } catch (e) {
            console.error('❌ Cannot read backend directory:', e);
          }
        }

        return false;
      }

      // Make script executable (in case it lost permissions)
      if (app.isPackaged && process.platform !== 'win32') {
        fs.chmodSync(backendPath, '755');
      }

      const dbPath = path.join(app.getPath('userData'), 'seedeep.db');
      console.log('💾 Database path:', dbPath);

      if (app.isPackaged) {
        console.log('🏭 Running packaged backend');

        this.backendProcess = spawn(backendPath, [], {
          env: {
            ...process.env,
            HOST: this.HOST,
            PORT: this.PORT.toString(),
            PYTHONUNBUFFERED: '1',
            DATABASE_URL: `sqlite+aiosqlite:///${dbPath}`,
            LOG_LEVEL: 'INFO'
          },
          cwd: workingDir,
          stdio: ['ignore', 'pipe', 'pipe']
        });
      } else {
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
        console.log(`[Backend] ${data.toString().trim()}`);
      });

      this.backendProcess.stderr?.on('data', (data) => {
        const output = data.toString().trim();
        if (output.includes('ERROR') || output.includes('Error') || output.includes('failed')) {
          console.error(`[Backend Error] ${output}`);
        } else {
          console.log(`[Backend] ${output}`);
        }
      });

      this.backendProcess.on('error', (error) => {
        console.error('❌ Backend process error:', error);
      });

      this.backendProcess.on('exit', (code, signal) => {
        console.log(`⚠️ Backend process exited - code: ${code}, signal: ${signal}`);
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
}