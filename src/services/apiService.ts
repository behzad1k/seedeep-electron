// services/apiService.ts
interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log(`API Request: ${options.method || 'GET'} ${url}`);

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
        console.error(`API Error ${status}:`, errorText);

        return {
          error: `HTTP ${status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`,
          status
        };
      }

      const data = await response.json();
      console.log(`API Response:`, data);

      return { data, status };
    } catch (error) {
      console.error('API Request failed:', error);
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0
      };
    }
  }

  // Models endpoints
  async getModels() {
    return this.request<Record<string, any>>('/models');
  }

  async getModel(modelName: string) {
    return this.request<any>(`/models/${modelName}`);
  }

  async getModelClasses(modelName: string) {
    return this.request<string[]>(`/models/${modelName}/classes`);
  }

  async loadModel(modelName: string) {
    return this.request<any>(`/models/${modelName}/load`, { method: 'POST' });
  }

  async unloadModel(modelName: string) {
    return this.request<any>(`/models/${modelName}/unload`, { method: 'POST' });
  }

  // Tracking endpoints
  async getTrackingStatus(streamId: string) {
    return this.request<any>(`/tracking/streams/${streamId}/status`);
  }

  async configureTracking(streamId: string, config: any) {
    return this.request<any>(`/tracking/streams/${streamId}/configure`, {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  async getTrackedObjects(streamId: string) {
    return this.request<any>(`/tracking/streams/${streamId}/objects`);
  }

  async getTrackingAnalytics(streamId: string) {
    return this.request<any>(`/tracking/streams/${streamId}/analytics`);
  }

  async defineZone(streamId: string, zone: any) {
    return this.request<any>(`/tracking/streams/${streamId}/zones`, {
      method: 'POST',
      body: JSON.stringify(zone)
    });
  }

  async getZones(streamId: string) {
    return this.request<any>(`/tracking/streams/${streamId}/zones`);
  }

  // Health check
  async healthCheck() {
    return this.request<any>('/health');
  }

  // General info
  async getInfo() {
    return this.request<any>('/');
  }
}

export const apiService = new ApiService();
