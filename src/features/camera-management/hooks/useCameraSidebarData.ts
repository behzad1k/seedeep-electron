/**
 * Hook for subscribing to camera WebSocket in sidebar
 * Reuses the same WebSocket connection as CameraFeed
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { WebSocketPool } from "@utils/websocket/WebsocketPool.ts";

interface UseCameraSidebarDataProps {
	cameraId: string;
	enabled?: boolean;
}

export function useCameraSidebarData({
	cameraId,
	enabled = true,
}: UseCameraSidebarDataProps) {
	const [currentFrame, setCurrentFrame] = useState<any>(null);
	const [logs, setLogs] = useState<any[]>([]);
	const unsubscribeRef = useRef<(() => void) | null>(null);

	const handleMessage = useCallback((data: any) => {
		setCurrentFrame(data);

		setLogs((prev) => [
			{
				timestamp: new Date(),
				data: data,
			},
			...prev.slice(0, 49), // Keep last 50
		]);
	}, []);

	const handleError = useCallback((err: any) => {
		console.error("[CameraSidebar] WebSocket error:", err);
	}, []);

	useEffect(() => {
		if (!enabled || !cameraId) return;

		const pool = WebSocketPool.getInstance();

		console.log(`[CameraSidebar] Subscribing to camera ${cameraId}`);

		// Subscribe with low priority (sidebar is less critical than main feed)
		unsubscribeRef.current = pool.subscribe(cameraId, `sidebar-${cameraId}`, {
			onFrame: handleMessage,
			onError: handleError,
			priority: "low",
		});

		// Get last frame if available
		const lastFrame = pool.getLastFrame(cameraId);
		if (lastFrame) {
			setCurrentFrame(lastFrame);
		}

		return () => {
			console.log(`[CameraSidebar] Unsubscribing from camera ${cameraId}`);
			if (unsubscribeRef.current) {
				unsubscribeRef.current();
				unsubscribeRef.current = null;
			}
		};
	}, [cameraId, enabled, handleMessage, handleError]);

	return {
		currentFrame,
		logs,
		clearLogs: () => setLogs([]),
	};
}
