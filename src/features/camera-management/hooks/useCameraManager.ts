import { BackendCamera, Camera, IpcResponse } from "@shared/types";
import { WebSocketPool } from "@utils/websocket/WebsocketPool";
import { useState, useCallback, useEffect } from "react";

export const useCameraManager = () => {
	const [cameras, setCameras] = useState<Camera[]>([]);
	const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
	const [fullScreenCamera, setFullScreenCamera] = useState<Camera | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const isElectron = typeof window !== "undefined" && window.electronAPI;

	/**
	 * Transform backend camera to frontend format
	 */
	const transformCamera = useCallback(
		(cam: BackendCamera): Camera => ({
			id: cam.id,
			name: cam.name,
			status: cam.is_active
				? "online"
				: ("offline" as "online" | "offline" | "recording"),
			location: cam.location || "",
			rtsp_url: cam.rtsp_url,
			width: cam.width?.toString() || "640",
			height: cam.height?.toString() || "480",
			fps: cam.fps?.toString() || "30",
			detectionModels: {
				ppeDetection: cam.active_models?.includes("ppe_detection") || false,
				generalDetection:
					cam.active_models?.includes("general_detection") || false,
				faceDetection: cam.active_models?.includes("face_detection") || false,
				capDetection: cam.active_models?.includes("cap_detection") || false,
				fireDetection: cam.active_models?.includes("fire_detection") || false,
				weaponDetection:
					cam.active_models?.includes("weapon_detection") || false,
			},
			isCalibrated: cam.is_calibrated,
			pixelsPerMeter: cam.pixels_per_meter,
			calibrationMode: cam.calibration_mode,
			features: cam.features || {},
			alert_email: cam.alert_email,
			alert_config: cam.alert_config,
			email_enabled: cam.email_enabled,
		}),
		[],
	);

	/**
	 * Fetch all cameras from backend
	 */
	const fetchCameras = useCallback(
		async (activeOnly: boolean = false) => {
			if (!isElectron) {
				setError("Electron API not available");
				setLoading(false);
				return;
			}

			setLoading(true);
			setError(null);

			try {
				const response: IpcResponse<BackendCamera[]> =
					await window.electronAPI.camera.getAll();

				if (response.success && response.data) {
					const transformedCameras = Array.isArray(response.data)
						? response.data.map(transformCamera)
						: [];
					setCameras(transformedCameras);
					console.log(
						`[CameraManager] Loaded ${transformedCameras.length} cameras`,
					);

					// WebSocket connections are managed by WebSocketPool
					// No need to manually connect/disconnect here
				} else {
					setError(response.error || "Failed to fetch cameras");
					console.error("Failed to fetch cameras:", response.error);
				}
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to fetch cameras";
				setError(errorMessage);
				console.error("Error fetching cameras:", err);
			} finally {
				setLoading(false);
			}
		},
		[isElectron, transformCamera],
	);

	/**
	 * Create a new camera
	 */
	const createCamera = useCallback(
		async (cameraData: any) => {
			if (!isElectron) {
				console.error("Electron API not available");
				return null;
			}

			try {
				const response: IpcResponse<BackendCamera> =
					await window.electronAPI.camera.create(cameraData);

				if (response.success && response.data) {
					await fetchCameras();

					console.log(`[CameraManager] Created camera: ${response.data.id}`);

					// WebSocket will auto-connect when components subscribe
					return response.data;
				} else {
					console.error("Failed to create camera:", response.error);
					return null;
				}
			} catch (err) {
				console.error("Error creating camera:", err);
				return null;
			}
		},
		[isElectron, fetchCameras],
	);

	/**
	 * Update camera features
	 */
	const updateCameraFeatures = useCallback(
		async (cameraId: string, features: any) => {
			if (!isElectron) {
				console.error("Electron API not available");
				return null;
			}

			try {
				const response: IpcResponse<BackendCamera> =
					await window.electronAPI.camera.updateFeatures(cameraId, features);

				if (response.success && response.data) {
					await fetchCameras();
					return response.data;
				} else {
					console.error("Failed to update camera features:", response.error);
					return null;
				}
			} catch (err) {
				console.error("Error updating camera features:", err);
				return null;
			}
		},
		[isElectron, fetchCameras],
	);

	/**
	 * Delete a camera
	 */
	const deleteCamera = useCallback(
		async (cameraId: string) => {
			if (!isElectron) {
				console.error("Electron API not available");
				return false;
			}

			try {
				const response: IpcResponse<void> =
					await window.electronAPI.camera.delete(cameraId);

				if (response.success) {
					await fetchCameras();

					// Force disconnect WebSocket (will auto-cleanup if no subscribers)
					const pool = WebSocketPool.getInstance();
					pool.forceDisconnect(cameraId);

					console.log(`[CameraManager] Deleted camera: ${cameraId}`);
					return true;
				} else {
					console.error("Failed to delete camera:", response.error);
					return false;
				}
			} catch (err) {
				console.error("Error deleting camera:", err);
				return false;
			}
		},
		[isElectron, fetchCameras],
	);

	/**
	 * Calibrate a camera
	 */
	const calibrateCamera = useCallback(
		async (cameraId: string, calibrationData: any) => {
			if (!isElectron) {
				console.error("Electron API not available");
				return null;
			}

			try {
				const response: IpcResponse<BackendCamera> =
					await window.electronAPI.camera.calibrate(cameraId, calibrationData);

				if (response.success && response.data) {
					await fetchCameras();
					return response.data;
				} else {
					console.error("Failed to calibrate camera:", response.error);
					return null;
				}
			} catch (err) {
				console.error("Error calibrating camera:", err);
				return null;
			}
		},
		[isElectron, fetchCameras],
	);

	// Initial fetch
	useEffect(() => {
		fetchCameras();
	}, [fetchCameras]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			// WebSocketPool handles cleanup automatically
			console.log(
				"[CameraManager] Cleanup - WebSocket connections managed by pool",
			);
		};
	}, []);

	// Get WebSocket stats for debugging
	const getWebSocketStats = useCallback(() => {
		const pool = WebSocketPool.getInstance();
		return pool.getAllStats();
	}, []);

	return {
		cameras,
		selectedCamera,
		fullScreenCamera,
		loading,
		error,
		setCameras,
		setSelectedCamera,
		setFullScreenCamera,
		fetchCameras,
		createCamera,
		updateCameraFeatures,
		deleteCamera,
		calibrateCamera,
		getWebSocketStats, // For debugging
	};
};
