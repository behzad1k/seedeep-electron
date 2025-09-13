// Camera-related type definitions for SeeDeep CCTV system

export interface Camera {
  id: number;
  name: string;
  status: 'online' | 'offline' | 'recording';
  location: string;
  description?: string;

  // Network settings
  ipAddress?: string;
  port?: string;
  protocol?: 'http' | 'https' | 'rtsp' | 'rtmp';
  streamUrl?: string;

  // Authentication
  username?: string;
  password?: string;
  authRequired?: boolean;

  // Camera settings
  resolution?: string;
  fps?: string;
  quality?: 'low' | 'medium' | 'high' | 'ultra';

  // Features
  recordingEnabled?: boolean;
  motionDetection?: boolean;
  nightVision?: boolean;
  audioEnabled?: boolean;

  // AI Detection Models
  detectionModels?: {
    ppeDetection: boolean;
    personDetection: boolean;
    vehicleDetection: boolean;
    fireDetection: boolean;
    facemaskDetection: boolean;
  };

  // Location
  latitude?: string;
  longitude?: string;

  // Metadata
  createdAt?: string;
  updatedAt?: string;
  lastSeen?: string;
}

export interface CameraFormData {
  // Basic info
  name: string;
  location: string;
  description: string;

  // Network settings
  ipAddress: string;
  port: string;
  protocol: 'http' | 'https' | 'rtsp' | 'rtmp';
  streamUrl: string;

  // Authentication
  username: string;
  password: string;
  authRequired: boolean;

  // Camera settings
  resolution: string;
  fps: string;
  quality: 'low' | 'medium' | 'high' | 'ultra';

  // Features
  recordingEnabled: boolean;
  motionDetection: boolean;
  nightVision: boolean;
  audioEnabled: boolean;

  // Location
  latitude: string;
  longitude: string;
}

export type GridSize = '2x2' | '3x3' | '4x4' | '5x5';

export type DetectionModelKey = 'ppeDetection' | 'personDetection' | 'vehicleDetection' | 'fireDetection' | 'facemaskDetection';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latency?: number;
}