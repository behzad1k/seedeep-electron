import { AxiosAPIClient } from "@shared/services/api/AxiosApiClient.ts";
import { FastAPIClient, ApiResponse } from "./FastAPIClient";
import type {
	BackendCamera,
	BackendHealthResponse,
	BackendDetection,
	BackendTrackedObject,
} from "@shared/types";

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
	features?: CameraFeatures;
	active_models?: string[];
	calibration?: CalibrationData;
}

export interface CameraFeatures {
	detection: boolean;
	tracking: boolean;
	speed: boolean;
	distance: boolean;
	counting: boolean;
	class_filters?: Record<string, string[]>;
	tracking_classes?: string[];
	speed_classes?: string[];
	distance_classes?: string[];
}

export interface CalibrationData {
	mode: "reference_object" | "perspective_transform";
	points: CalibrationPoint[];
	reference_width_meters?: number;
	reference_height_meters?: number;
}

export interface CalibrationPoint {
	pixel_x: number;
	pixel_y: number;
	real_x: number;
	real_y: number;
}

export interface UpdateCameraRequest {
	name?: string;
	location?: string;
	rtsp_url?: string;
	features?: Partial<CameraFeatures>;
	active_models?: string[];
	is_active?: boolean;
	alert_email?: string;
	email_enabled?: boolean;
	cooldown_seconds?: number;
}

/**
 * Backend API Service - Enhanced with feature management
 */
export class BackendAPIService {
	// private client: FastAPIClient;
	private client: AxiosAPIClient;

	constructor(baseURL: string = "http://localhost:8000/api/v1") {
		this.client = new AxiosAPIClient({
			baseURL,
			timeout: 30000,
			retries: 3,
			retryDelay: 1000,
			onRequest: async (config) => {
				console.log(
					`[BackendAPI] Request: ${config.method} ${config.body ? "with body" : ""}`,
				);
			},
			onResponse: async (response) => {
				console.log(
					`[BackendAPI] Response: ${response.success ? "Success" : "Failed"}`,
				);
			},
			onError: async (error) => {
				console.error(`[BackendAPI] Error:`, error);
			},
		});
	}

	// ==================== CAMERA ENDPOINTS ====================
	async getCameras(
		activeOnly?: boolean,
	): Promise<ApiResponse<BackendCamera[]>> {
		console.log(`[BackendAPI] Getting cameras (activeOnly: ${activeOnly})`);
		return this.client.get<BackendCamera[]>(
			"/cameras/",
			activeOnly ? { active_only: true } : undefined,
		);
	}

	async getCamera(cameraId: string): Promise<ApiResponse<BackendCamera>> {
		console.log(`[BackendAPI] Getting camera: ${cameraId}`);
		return this.client.get<BackendCamera>(`/cameras/${cameraId}/`);
	}

	async createCamera(
		data: CreateCameraRequest,
	): Promise<ApiResponse<BackendCamera>> {
		console.log(`[BackendAPI] Creating camera:`, data);
		return this.client.post<BackendCamera>("/cameras/", data);
	}

	async updateCamera(
		cameraId: string,
		updates: UpdateCameraRequest,
	): Promise<ApiResponse<BackendCamera>> {
		console.log(`[BackendAPI] Updating camera: ${cameraId}`);
		return this.client.patch<BackendCamera>(`/cameras/${cameraId}`, updates);
	}

	async deleteCamera(cameraId: string): Promise<ApiResponse<void>> {
		console.log(`[BackendAPI] Deleting camera: ${cameraId}`);
		return this.client.delete<void>(`/cameras/${cameraId}`);
	}

	async calibrateCamera(
		cameraId: string,
		data: CalibrationData,
	): Promise<ApiResponse<BackendCamera>> {
		console.log(`[BackendAPI] Calibrating camera: ${cameraId}`);
		// FIXED: Added trailing slash
		return this.client.post<BackendCamera>(
			`/cameras/${cameraId}/calibrate`,
			data,
		);
	}

	async updateCameraFeatures(
		cameraId: string,
		features: Partial<CameraFeatures>,
	): Promise<ApiResponse<BackendCamera>> {
		console.log(`[BackendAPI] Updating camera features: ${cameraId}`);
		return this.client.patch<BackendCamera>(
			`/cameras/${cameraId}/features`,
			features,
		);
	}

	async getCameraModels(
		cameraId: string,
	): Promise<ApiResponse<{ available_models: string[] }>> {
		console.log(`[BackendAPI] Getting camera models: ${cameraId}`);
		return this.client.get<{ available_models: string[] }>(
			`/cameras/${cameraId}/models`,
		);
	}

	async healthCheck(): Promise<ApiResponse<BackendHealthResponse>> {
		return this.client.get<BackendHealthResponse>("/health");
	}

	async getInfo(): Promise<ApiResponse<any>> {
		return this.client.get<any>("/");
	}
	// ==================== UTILITY METHODS ====================

	setBaseURL(url: string) {
		this.client.setBaseURL(url);
	}

	getConfig() {
		return this.client.getConfig();
	}
}

// Export singleton instance
export const backendAPI = new BackendAPIService();
