// IPC Channel names
export enum IpcChannels {
  // Camera Management
  CAMERA_GET_ALL = 'camera:getAll',
  CAMERA_GET_BY_ID = 'camera:getById',
  CAMERA_CREATE = 'camera:create',
  CAMERA_UPDATE = 'camera:update',
  CAMERA_DELETE = 'camera:delete',
  CAMERA_CALIBRATE = 'camera:calibrate',

  // Detection
  DETECTION_START = 'detection:start',
  DETECTION_STOP = 'detection:stop',
  DETECTION_CONFIGURE = 'detection:configure',

  // Tracking
  TRACKING_START = 'tracking:start',
  TRACKING_STOP = 'tracking:stop',
  TRACKING_GET_STATS = 'tracking:getStats',

  // System
  SYSTEM_GET_INFO = 'system:getInfo',
  SYSTEM_GET_MEMORY = 'system:getMemory'
}

// IPC Request/Response types
export interface IpcRequest<T = any> {
  channel: IpcChannels;
  data?: T;
}

export interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}