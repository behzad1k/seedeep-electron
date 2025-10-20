/**
 * Backend configuration and constants
 */

export const BACKEND_CONFIG = {
  // API URLs
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws',
  API_V1_PREFIX: '/api/v1',

  // WebSocket settings
  WS_RECONNECT_DELAY: 3000,
  WS_MAX_RECONNECT_ATTEMPTS: 5,

  // Frame settings
  DEFAULT_FPS: 15,
  DEFAULT_WIDTH: 640,
  DEFAULT_HEIGHT: 480,
  JPEG_QUALITY: 0.8,

  // Detection settings
  CONFIDENCE_THRESHOLD: 0.5,
  IOU_THRESHOLD: 0.45,
  MAX_DETECTIONS: 100,
};

// Model name mapping (Frontend <-> Backend)
export const MODEL_NAME_MAP = {
  // Frontend -> Backend
  ppeDetection: 'ppe_detection',
  personDetection: 'person_detection',
  vehicleDetection: 'vehicle_detection',
  fireDetection: 'fire_detection',
  weaponDetection: 'weapon_detection',
  faceDetection: 'face_detection',
  capDetection: 'cap_detection',
  generalDetection: 'general_detection',
} as const;

// Backend -> Frontend
export const BACKEND_MODEL_MAP = {
  ppe_detection: 'ppeDetection',
  person_detection: 'personDetection',
  vehicle_detection: 'vehicleDetection',
  fire_detection: 'fireDetection',
  weapon_detection: 'weaponDetection',
  face_detection: 'faceDetection',
  cap_detection: 'capDetection',
  general_detection: 'generalDetection',
} as const;

// Available models from backend
export const AVAILABLE_BACKEND_MODELS = [
  'face_detection',
  'cap_detection',
  'ppe_detection',
  'weapon_detection',
  'fire_detection',
  'general_detection',
] as const;
