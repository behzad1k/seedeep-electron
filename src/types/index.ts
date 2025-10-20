// ===== src/types/index.ts =====
/**
 * Central export point for all type definitions
 * Provides clean imports throughout the application
 */

import { Camera } from './camera';

// ==================== Backend Types ====================
export type {
  BackendCamera,
  BackendDetection,
  BackendModelResult,
  BackendTrackedObject,
  BackendTrackingResult,
  BackendWebSocketResponse,
  BackendHealthResponse,
  BackendAvailableModels
} from './backend';

// ==================== Camera Types ====================
export type {
  Camera,
  CameraFormData,
  GridSize,
  DetectionModelKey,
  ConnectionTestResult
} from './camera';

// ==================== Performance Types ====================
// Note: performance.d.ts is a declaration file, not exported
// It extends global types automatically

// ==================== Electron Types ====================
export type {
  IElectronAPI
} from './electron';

// ==================== OS Types ====================
export type {
  MemoryInfo
} from './os'
// ==================== Tracking Types ====================
export type {
  TrackingConfig,
  ModelConfig,
  DetectionResult,
  TrackedObjectData,
  TrackingResults
} from './tracking';


// ==================== Re-export Utility Types ====================
// Common utility types used across the app

/**
 * Make all properties of T required
 */
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

/**
 * Make all properties of T optional
 */
export type Optional<T> = {
  [P in keyof T]?: T[P];
};

/**
 * Pick specific properties and make them required
 */
export type RequiredPick<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;

/**
 * API Response wrapper type
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

/**
 * Async state wrapper
 */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}


// ==================== Type Guards (Re-export from backend) ====================
export {
  isModelResult,
  isTrackingResult
} from './backend';


// ==================== Commonly Used Type Combinations ====================

/**
 * Camera with required fields for display
 */
export type CameraDisplay = RequiredPick<Camera, 'id' | 'name' | 'status' | 'location'>;

/**
 * Camera creation payload (subset of Camera)
 */
export type CameraCreatePayload = Pick<
  Camera,
  'name' | 'location' | 'rtsp_url' | 'width' | 'height' | 'fps'
> & {
  features?: Camera['detectionModels'];
};

/**
 * Camera update payload (all optional except id)
 */
export type CameraUpdatePayload = Partial<Omit<Camera, 'id' | 'createdAt'>> & {
  id: string;
};


// ==================== Exports Summary ====================
/**
 * Usage Examples:
 *
 * // Import specific types
 * import { Camera, BackendCamera, DetectionModelKey } from '@/types';
 *
 * // Import type guards
 * import { isModelResult, isTrackingResult } from '@/types';
 *
 * // Import utility types
 * import { ApiResponse, AsyncState } from '@/types';
 *
 * // Import combined types
 * import { CameraDisplay, CameraCreatePayload } from '@/types';
 */