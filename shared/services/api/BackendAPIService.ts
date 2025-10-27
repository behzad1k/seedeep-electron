import { FastAPIClient, ApiResponse } from './FastAPIClient';
import type {
  BackendCamera,
  BackendHealthResponse,
  BackendDetection,
  BackendTrackedObject
} from '@shared/types';

/**
 * Camera API request/response types
 */
export interface CreateCameraRequest {
  name: string;
  location?: string;
  rtsp_url?: string;
  width?: number;
  height?: number;
  fps?: number;
  features?: {
    detection: boolean;
    tracking: boolean;
    speed: boolean;
    counting: boolean;
  };
  active_models?: string[];
}

export interface UpdateCameraRequest {
  name?: string;
  location?: string;
  rtsp_url?: string;
  features?: {
    detection?: boolean;
    tracking?: boolean;
    speed?: boolean;
    counting?: boolean;
  };
  active_models?: string[];
  is_active?: boolean;
}

export interface CalibrationRequest {
  mode: 'reference_object' | 'perspective_transform';
  points: Array<{
    pixel_x: number;
    pixel_y: number;
    real_x: number;
    real_y: number;
  }>;
  reference_width_meters?: number;
  reference_height_meters?: number;
}

/**
 * Model API types
 */
export interface ModelInfo {
  name: string;
  classes: string[];
  loaded: boolean;
  device: string;
}

export interface ModelsResponse {
  models: Record<string, ModelInfo>;
}

/**
 * Tracking API types
 */
export interface TrackingConfig {
  tracker_type: 'centroid' | 'kalman' | 'deep_sort' | 'byte_track';
  tracker_params?: {
    max_disappeared?: number;
    max_distance?: number;
    use_kalman?: boolean;
  };
  speed_config?: {
    fps: number;
    pixel_to_meter_ratio: number;
  };
}

export interface TrackingStats {
  total_tracks: number;
  active_tracks: number;
  class_counts: Record<string, number>;
}

/**
 * Backend API Service - Type-safe wrapper for FastAPI backend
 */
export class BackendAPIService {
  private client: FastAPIClient;

  constructor(baseURL: string = 'http://localhost:8000/api/v1') {
    this.client = new FastAPIClient({
      baseURL,
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      onRequest: async (config) => {
        console.log(`[BackendAPI] Request: ${config.method} ${config.body ? 'with body' : ''}`);
      },
      onResponse: async (response) => {
        console.log(`[BackendAPI] Response: ${response.success ? 'Success' : 'Failed'}`);
      },
      onError: async (error) => {
        console.error(`[BackendAPI] Error:`, error);
      }
    });
  }

  // ==================== CAMERA ENDPOINTS ====================

  /**
   * Get all cameras
   */
  async getCameras(activeOnly?: boolean): Promise<ApiResponse<BackendCamera[]>> {
    return this.client.get<BackendCamera[]>('/cameras',
      activeOnly ? { active_only: true } : undefined
    );
  }

  /**
   * Get single camera by ID
   */
  async getCamera(cameraId: string): Promise<ApiResponse<BackendCamera>> {
    return this.client.get<BackendCamera>(`/cameras/${cameraId}`);
  }

  /**
   * Create new camera
   */
  async createCamera(data: CreateCameraRequest): Promise<ApiResponse<BackendCamera>> {
    return this.client.post<BackendCamera>('/cameras', data);
  }

  /**
   * Update camera
   */
  async updateCamera(cameraId: string, updates: UpdateCameraRequest): Promise<ApiResponse<BackendCamera>> {
    return this.client.patch<BackendCamera>(`/cameras/${cameraId}`, updates);
  }

  /**
   * Delete camera
   */
  async deleteCamera(cameraId: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(`/cameras/${cameraId}`);
  }

  /**
   * Calibrate camera
   */
  async calibrateCamera(cameraId: string, data: CalibrationRequest): Promise<ApiResponse<BackendCamera>> {
    return this.client.post<BackendCamera>(`/cameras/${cameraId}/calibrate`, data);
  }

  /**
   * Get available models for camera
   */
  async getCameraModels(cameraId: string): Promise<ApiResponse<{ available_models: string[] }>> {
    return this.client.get<{ available_models: string[] }>(`/cameras/${cameraId}/models`);
  }

  // ==================== MODEL ENDPOINTS ====================

  /**
   * Get all models
   */
  async getModels(): Promise<ApiResponse<ModelsResponse>> {
    return this.client.get<ModelsResponse>('/models');
  }

  /**
   * Get specific model info
   */
  async getModel(modelName: string): Promise<ApiResponse<ModelInfo>> {
    return this.client.get<ModelInfo>(`/models/${modelName}`);
  }

  /**
   * Get model classes
   */
  async getModelClasses(modelName: string): Promise<ApiResponse<string[]>> {
    return this.client.get<string[]>(`/models/${modelName}/classes`);
  }

  /**
   * Load model
   */
  async loadModel(modelName: string): Promise<ApiResponse<ModelInfo>> {
    return this.client.post<ModelInfo>(`/models/${modelName}/load`);
  }

  /**
   * Unload model
   */
  async unloadModel(modelName: string): Promise<ApiResponse<void>> {
    return this.client.post<void>(`/models/${modelName}/unload`);
  }

  // ==================== TRACKING ENDPOINTS ====================

  /**
   * Get tracking status
   */
  async getTrackingStatus(streamId: string): Promise<ApiResponse<any>> {
    return this.client.get<any>(`/tracking/streams/${streamId}/status`);
  }

  /**
   * Configure tracking
   */
  async configureTracking(streamId: string, config: TrackingConfig): Promise<ApiResponse<any>> {
    return this.client.post<any>(`/tracking/streams/${streamId}/configure`, config);
  }

  /**
   * Get tracked objects
   */
  async getTrackedObjects(streamId: string): Promise<ApiResponse<Record<string, BackendTrackedObject>>> {
    return this.client.get<Record<string, BackendTrackedObject>>(`/tracking/streams/${streamId}/objects`);
  }

  /**
   * Get tracking analytics
   */
  async getTrackingAnalytics(streamId: string): Promise<ApiResponse<TrackingStats>> {
    return this.client.get<TrackingStats>(`/tracking/streams/${streamId}/analytics`);
  }

  /**
   * Define zone
   */
  async defineZone(streamId: string, zone: any): Promise<ApiResponse<any>> {
    return this.client.post<any>(`/tracking/streams/${streamId}/zones`, zone);
  }

  /**
   * Get zones
   */
  async getZones(streamId: string): Promise<ApiResponse<any[]>> {
    return this.client.get<any[]>(`/tracking/streams/${streamId}/zones`);
  }

  // ==================== HEALTH & INFO ENDPOINTS ====================

  /**
   * Health check
   */
  async healthCheck(): Promise<ApiResponse<BackendHealthResponse>> {
    return this.client.get<BackendHealthResponse>('/health');
  }

  /**
   * Get API info
   */
  async getInfo(): Promise<ApiResponse<any>> {
    return this.client.get<any>('/');
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Update base URL
   */
  setBaseURL(url: string) {
    this.client.setBaseURL(url);
  }

  /**
   * Get client configuration
   */
  getConfig() {
    return this.client.getConfig();
  }
}

// Export singleton instance
export const backendAPI = new BackendAPIService();