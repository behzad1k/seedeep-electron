/**
 * Camera API Service - Integrates with FastAPI backend
 * Handles all CRUD operations for cameras
 */
import { BackendCamera } from '@/types/backend';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_V1_PREFIX = '/api/v1';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

interface CameraCreateData {
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

interface CameraUpdateData {
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

interface CalibrationData {
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

class CameraApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${API_V1_PREFIX}${endpoint}`;
      console.log(`[API] ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const status = response.status;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API] Error ${status}:`, errorText);
        return {
          error: `HTTP ${status}: ${response.statusText}`,
          status
        };
      }

      // Handle 204 No Content
      if (status === 204) {
        return { data: undefined as any, status };
      }

      const data = await response.json();
      console.log(`[API] Response:`, data);

      return { data, status };
    } catch (error) {
      console.error('[API] Request failed:', error);
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0
      };
    }
  }

  /**
   * Create a new camera
   */
  async createCamera(cameraData: CameraCreateData): Promise<ApiResponse<BackendCamera>> {
    return this.request<BackendCamera>('/cameras', {
      method: 'POST',
      body: JSON.stringify(cameraData)
    });
  }

  /**
   * Get all cameras
   */
  async getCameras(activeOnly: boolean = false): Promise<ApiResponse<BackendCamera[]>> {
    const query = activeOnly ? '?active_only=true' : '';
    return this.request<BackendCamera[]>(`/cameras${query}`);
  }

  /**
   * Get a single camera by ID
   */
  async getCamera(cameraId: string): Promise<ApiResponse<BackendCamera>> {
    return this.request<BackendCamera>(`/cameras/${cameraId}`);
  }

  /**
   * Update a camera
   */
  async updateCamera(
    cameraId: string,
    updateData: CameraUpdateData
  ): Promise<ApiResponse<BackendCamera>> {
    return this.request<BackendCamera>(`/cameras/${cameraId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });
  }

  /**
   * Delete a camera
   */
  async deleteCamera(cameraId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/cameras/${cameraId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Calibrate a camera
   */
  async calibrateCamera(
    cameraId: string,
    calibrationData: CalibrationData
  ): Promise<ApiResponse<BackendCamera>> {
    return this.request<BackendCamera>(`/cameras/${cameraId}/calibrate`, {
      method: 'POST',
      body: JSON.stringify(calibrationData)
    });
  }

  /**
   * Get available models for a camera
   */
  async getAvailableModels(cameraId: string): Promise<ApiResponse<{ available_models: string[] }>> {
    return this.request<{ available_models: string[] }>(`/cameras/${cameraId}/models`);
  }

  /**
   * Check API health
   */
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request<any>('/health');
  }
}

// Export singleton instance
export const cameraApi = new CameraApiService();
