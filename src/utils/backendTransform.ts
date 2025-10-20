
import { Camera } from '@/types/camera';
import { BackendCamera, BackendDetection, BackendModelResult, BackendTrackingResult, BackendWebSocketResponse } from '@/types/backend';
import { MODEL_NAME_MAP, BACKEND_MODEL_MAP } from '@/config/backend';

/**
 * Transform backend camera to frontend camera type
 */
export function transformBackendCamera(backendCamera: BackendCamera): Camera {
  return {
    id: backendCamera.id,
    name: backendCamera.name,
    status: backendCamera.is_active ? 'online' : 'offline',
    location: backendCamera.location || '',
    rtsp_url: backendCamera.rtsp_url || undefined,
    width: backendCamera.width.toString(),
    height: backendCamera.height.toString(),
    fps: backendCamera.fps.toString(),
    detectionModels: {
      ppeDetection: backendCamera.active_models?.includes('ppe_detection') || false,
      personDetection: backendCamera.active_models?.includes('person_detection') || false,
      generalDetection: backendCamera.active_models?.includes('general_detection') || false,
      fireDetection: backendCamera.active_models?.includes('fire_detection') || false,
      weaponDetection: backendCamera.active_models?.includes('weapon_detection') || false,
    },
    // Additional backend fields
    isCalibrated: backendCamera.is_calibrated,
    pixelsPerMeter: backendCamera.pixels_per_meter,
    calibrationMode: backendCamera.calibration_mode,
  };
}

/**
 * Transform frontend camera data to backend format
 */
export function transformToBackendCamera(camera: Partial<Camera>): Partial<BackendCamera> {
  const activeModels: string[] = [];

  if (camera.detectionModels) {
    Object.entries(camera.detectionModels).forEach(([key, enabled]) => {
      if (enabled) {
        const backendKey = MODEL_NAME_MAP[key as keyof typeof MODEL_NAME_MAP];
        if (backendKey) {
          activeModels.push(backendKey);
        }
      }
    });
  }

  return {
    name: camera.name,
    location: camera.location,
    rtsp_url: camera.rtsp_url,
    width: camera.width ? parseInt(camera.width) : undefined,
    height: camera.height ? parseInt(camera.height) : undefined,
    fps: camera.fps ? parseInt(camera.fps) : undefined,
    active_models: activeModels.length > 0 ? activeModels : undefined,
    is_active: camera.status === 'online' || camera.status === 'recording',
  };
}

/**
 * Parse WebSocket response from backend
 */
export function parseWebSocketResponse(data: BackendWebSocketResponse) {
  const detections: Array<{
    modelName: string;
    detections: BackendDetection[];
    count: number;
    error: string | null;
  }> = [];

  // Separate tracking from model results
  let trackingData: BackendTrackingResult | null = null;

  Object.entries(data.results).forEach(([key, value]) => {
    if (key === 'tracking') {
      trackingData = value as BackendTrackingResult;
    } else if (isModelResult(value)) {
      detections.push({
        modelName: key,
        detections: value.detections,
        count: value.count,
        error: value.error
      });
    }
  });

  return {
    cameraId: data.camera_id,
    timestamp: data.timestamp,
    calibrated: data.calibrated,
    detections,
    tracking: trackingData ? {
      trackedObjects: Object.values(trackingData.tracked_objects),
      summary: trackingData.summary
    } : null
  };
}

/**
 * Type guard to check if result is a model result
 */
function isModelResult(value: any): value is BackendModelResult {
  return (
    value &&
    typeof value === 'object' &&
    'detections' in value &&
    'count' in value &&
    'model' in value
  );
}

/**
 * Type guard to check if result is tracking result
 */
export function isTrackingResult(value: any): value is BackendTrackingResult {
  return (
    value &&
    typeof value === 'object' &&
    'tracked_objects' in value &&
    'summary' in value
  );
}
