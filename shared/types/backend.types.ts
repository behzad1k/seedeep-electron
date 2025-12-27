/**
 * Backend API and WebSocket type definitions
 * Matches FastAPI backend response structures
 */

// ==================== Interface Definitions ====================

export type BackendCameraFeature =
	| "detection"
	| "tracking"
	| "speed"
	| "counting";

export interface BackendCameraFeatures {
	detection: boolean;
	tracking: boolean;
	distance: boolean;
	speed: boolean;
	counting: boolean;
	tracking_classes: string[];
	speed_classes: string[];
	distance_classes: string[];
	detection_classes: string[];
}

export interface BackendCamera {
	id: string;
	name: string;
	location: string | undefined;
	rtsp_url: string | undefined;
	width: number;
	height: number;
	fps: number;
	is_calibrated: boolean;
	pixels_per_meter: number | undefined;
	calibration_mode: string | undefined;
	features: BackendCameraFeatures;
	active_models: string[];
	created_at: string;
	is_active: boolean;
	alert_email: string;
	alert_config: any;
	email_enabled: boolean;
}

export interface BackendDetection {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	confidence: number;
	class_id: number;
	label: string;
}

export interface BackendModelResult {
	detections: BackendDetection[];
	count: number;
	model: string;
	error: string | null;
}

export interface BackendTrackedObject {
	track_id: string;
	class_name: string;
	bbox: [number, number, number, number];
	centroid: [number, number];
	confidence: number;
	age: number;
	velocity: [number, number];
	distance_traveled: number;
	speed_px_per_sec?: number;
	speed_m_per_sec?: number;
	speed_kmh?: number;
}

export interface BackendTrackingResult {
	tracked_objects: {
		[trackId: string]: BackendTrackedObject;
	};
	summary: {
		total_tracks: number;
		active_tracks: number;
	};
}

export interface BackendWebSocketResponse {
	camera_id: string;
	timestamp: number;
	results: {
		[modelName: string]: BackendModelResult | BackendTrackingResult;
	} & {
		tracking?: BackendTrackingResult;
	};
	calibrated: boolean;
}

export interface BackendHealthResponse {
	status: string;
	device: string;
	available_models: string[];
	active_streams: number;
}

export interface BackendAvailableModels {
	camera_id: string;
	available_models: string[];
}

// ==================== Type Guards ====================

/**
 * Type guard to check if a value is a BackendModelResult
 * @param value - Value to check
 * @returns True if value is BackendModelResult
 */
export function isModelResult(value: unknown): value is BackendModelResult {
	if (!value || typeof value !== "object") return false;
	const obj = value as any;
	return (
		Array.isArray(obj.detections) &&
		typeof obj.count === "number" &&
		typeof obj.model === "string"
	);
}

/**
 * Type guard to check if a value is a BackendTrackingResult
 * @param value - Value to check
 * @returns True if value is BackendTrackingResult
 */
export function isTrackingResult(
	value: unknown,
): value is BackendTrackingResult {
	if (!value || typeof value !== "object") return false;
	const obj = value as any;
	return (
		obj.tracked_objects &&
		typeof obj.tracked_objects === "object" &&
		obj.summary &&
		typeof obj.summary === "object" &&
		typeof obj.summary.total_tracks === "number" &&
		typeof obj.summary.active_tracks === "number"
	);
}

// ==================== Utility Functions ====================

/**
 * Parse WebSocket response from backend
 * Safely extracts detections and tracking data
 * @param data - Raw WebSocket response
 * @returns Parsed response with separated detections and tracking
 */
export function parseWebSocketResponse(data: BackendWebSocketResponse) {
	const detections: Array<{
		modelName: string;
		detections: BackendDetection[];
		count: number;
		error: string | null;
	}> = [];

	let trackingData: BackendTrackingResult | null = null;

	// Safely iterate through results
	Object.entries(data.results).forEach(([key, value]) => {
		if (key === "tracking") {
			if (isTrackingResult(value)) {
				trackingData = value;
			}
		} else if (isModelResult(value)) {
			detections.push({
				modelName: key,
				detections: value.detections,
				count: value.count,
				error: value.error,
			});
		}
	});

	return {
		cameraId: data.camera_id,
		timestamp: data.timestamp,
		calibrated: data.calibrated,
		detections,
		tracking: trackingData
			? {
					trackedObjects: Object.values(
						(trackingData as BackendTrackingResult).tracked_objects,
					),
					summary: (trackingData as BackendTrackingResult).summary,
				}
			: null,
	};
}

/**
 * Extract all detections from WebSocket response
 * @param data - WebSocket response
 * @returns Array of all detections from all models
 */
export function extractDetections(
	data: BackendWebSocketResponse,
): BackendDetection[] {
	const allDetections: BackendDetection[] = [];

	Object.entries(data.results).forEach(([key, value]) => {
		if (key !== "tracking" && isModelResult(value)) {
			allDetections.push(...value.detections);
		}
	});

	return allDetections;
}

/**
 * Extract tracking data from WebSocket response
 * @param data - WebSocket response
 * @returns Tracking result or null
 */
export function extractTracking(
	data: BackendWebSocketResponse,
): BackendTrackingResult | null {
	if (data.results.tracking && isTrackingResult(data.results.tracking)) {
		return data.results.tracking;
	}
	return null;
}

/**
 * Get detection counts by model
 * @param data - WebSocket response
 * @returns Object with model names as keys and detection counts as values
 */
export function getDetectionCountsByModel(
	data: BackendWebSocketResponse,
): Record<string, number> {
	const counts: Record<string, number> = {};

	Object.entries(data.results).forEach(([key, value]) => {
		if (key !== "tracking" && isModelResult(value)) {
			counts[key] = value.count;
		}
	});

	return counts;
}

/**
 * Get total detection count across all models
 * @param data - WebSocket response
 * @returns Total number of detections
 */
export function getTotalDetectionCount(data: BackendWebSocketResponse): number {
	return Object.values(getDetectionCountsByModel(data)).reduce(
		(sum, count) => sum + count,
		0,
	);
}
