import { registerCameraHandlers } from './handlers/camera.handler';
import { registerDetectionHandlers } from './handlers/detection.handler';
import { registerTrackingHandlers } from './handlers/tracking.handler';
import { registerSystemHandlers } from './handlers/system.handler';

export function registerIpcHandlers() {
  console.log('[IPC] Registering all handlers...');

  registerCameraHandlers();
  registerDetectionHandlers();
  registerTrackingHandlers();
  registerSystemHandlers();

  console.log('[IPC] All handlers registered');
}