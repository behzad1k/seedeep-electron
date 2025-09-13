// API utilities for SeeDeep CCTV system
// This file will contain API calls to your backend

// Base API URL - update this to match your backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// API response wrapper type
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Generic API request function
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Camera-specific API functions will be added here
export const cameraAPI = {
  // Placeholder functions - implement when backend is ready
  getAll: () => apiRequest('/cameras'),
  create: (data: any) => apiRequest('/cameras', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest(`/cameras/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest(`/cameras/${id}`, {
    method: 'DELETE',
  }),
  testConnection: (data: any) => apiRequest('/cameras/test', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

export default apiRequest;