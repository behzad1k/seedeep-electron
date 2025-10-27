/**
 * Backend configuration and constants
 */


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
