import { BackendCameraFeatures } from "@shared/types/backend.types.ts";

export interface Camera {
	id: string;
	name: string;
	status: "online" | "offline" | "recording";
	location: string;
	description?: string;

	// Network settings
	ipAddress?: string;
	rtsp_url?: string;
	port?: string;
	protocol?: "http" | "https" | "rtsp" | "rtmp";
	streamUrl?: string;

	// Authentication
	username?: string;
	password?: string;
	authRequired?: boolean;

	// Camera settings
	resolution?: string;
	isCalibrated?: boolean;
	pixelsPerMeter?: number;
	calibrationMode?: string;
	fps?: string;
	quality?: "low" | "medium" | "high" | "ultra";

	// Features
	recordingEnabled?: boolean;
	motionDetection?: boolean;
	nightVision?: boolean;
	audioEnabled?: boolean;

	// AI Detection Models
	detectionModels?: {
		ppeDetection: boolean;
		capDetection: boolean;
		generalDetection: boolean;
		faceDetection: boolean;
		fireDetection: boolean;
		weaponDetection: boolean;
	};

	// Location
	latitude?: string;
	longitude?: string;

	// Metadata
	createdAt?: string;
	updatedAt?: string;
	lastSeen?: string;
	width?: string;
	height?: string;
	features: BackendCameraFeatures;

	alert_email?: string;
	alert_config?: any;
	email_enabled?: boolean;
}

export interface CameraFormData {
	// Basic info
	name: string;
	location: string;
	description: string;

	// Network settings
	ipAddress: string;
	port: string;
	protocol: "http" | "https" | "rtsp" | "rtmp";
	streamUrl: string;

	// Authentication
	username: string;
	password: string;
	authRequired: boolean;

	// Camera settings
	resolution: string;
	fps: string;
	quality: "low" | "medium" | "high" | "ultra";

	// Features
	recordingEnabled: boolean;
	motionDetection: boolean;
	nightVision: boolean;
	audioEnabled: boolean;

	// Location
	latitude: string;
	longitude: string;
}

export type GridSize = "2x2" | "3x3" | "4x4" | "5x5";

export type DetectionModelKey =
	| "face_detection"
	| "ppeDetection"
	| "capDetection"
	| "generalDetection"
	| "fireDetection"
	| "weaponDetection";

export interface ConnectionTestResult {
	success: boolean;
	message: string;
	latency?: number;
}

export type UrlTemplates = {
	[key: string]: string;
};

export type CameraManufacturer = {
	name: string;
	defaultPort: string;
	protocols: string[];
	urlTemplates: UrlTemplates;
	defaultUsername: string;
	defaultPassword: string;
	notes: string;
	supportsDiscovery?: boolean;
};

export type CameraManufacturers = {
	[key: string]: CameraManufacturer;
};
