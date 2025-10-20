const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

export const cameraService = {
  // Get all cameras
  async getCameras(activeOnly = false) {
    const url = `${API_BASE_URL}/cameras${activeOnly ? '?active_only=true' : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch cameras');
    return response.json();
  },

  // Get single camera
  async getCamera(cameraId: string) {
    const response = await fetch(`${API_BASE_URL}/cameras/${cameraId}`);
    if (!response.ok) throw new Error('Failed to fetch camera');
    return response.json();
  },

  // Create camera
  async createCamera(cameraData: any) {
    const response = await fetch(`${API_BASE_URL}/cameras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cameraData),
    });
    if (!response.ok) throw new Error('Failed to create camera');
    return response.json();
  },

  // Update camera
  async updateCamera(cameraId: string, updates: any) {
    const response = await fetch(`${API_BASE_URL}/cameras/${cameraId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update camera');
    return response.json();
  },

  // Delete camera
  async deleteCamera(cameraId: string) {
    const response = await fetch(`${API_BASE_URL}/cameras/${cameraId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete camera');
  },

  // Calibrate camera
  async calibrateCamera(cameraId: string, calibrationData: any) {
    const response = await fetch(`${API_BASE_URL}/cameras/${cameraId}/calibrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(calibrationData),
    });
    if (!response.ok) throw new Error('Failed to calibrate camera');
    return response.json();
  },
};