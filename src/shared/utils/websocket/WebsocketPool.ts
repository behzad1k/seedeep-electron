/**
 * Enhanced WebSocketPool - Persistent camera connections
 * Maintains one connection per camera, shared across all components
 */

interface CameraSubscriber {
	id: string;
	onFrame?: (data: any) => void;
	onMessage?: (data: any) => void;
	onError?: (error: any) => void;
	priority?: "high" | "normal" | "low"; // For frame distribution
}

interface CameraConnection {
	ws: WebSocket;
	url: string;
	cameraId: string;
	subscribers: Map<string, CameraSubscriber>;
	reconnectAttempts: number;
	reconnectTimer: any | null;
	isConnecting: boolean;
	lastFrameTime: number;
	frameCount: number;
	latency: number;
	// Frame buffering
	lastFrame: any | null;
	frameBuffer: any[];
	maxBufferSize: number;
	// Performance tracking
	bytesReceived: number;
	messagesReceived: number;
	lastActivityTime: number;
}

interface ConnectionStats {
	cameraId: string;
	isConnected: boolean;
	subscriberCount: number;
	reconnectAttempts: number;
	frameCount: number;
	latency: number;
	uptime: number;
	bytesReceived: number;
	messagesReceived: number;
}

export class WebSocketPool {
	private static instance: WebSocketPool;
	private connections: Map<string, CameraConnection> = new Map(); // Key: cameraId
	private readonly maxReconnectAttempts = 10;
	private readonly reconnectDelay = 2000;
	private readonly inactivityTimeout = 120000; // 2 minutes
	private cleanupInterval: any;

	private constructor() {
		// Periodic cleanup of inactive connections
		this.cleanupInterval = setInterval(() => {
			this.cleanupInactiveConnections();
		}, 30000); // Every 30 seconds

		// Handle page unload
		if (typeof window !== "undefined") {
			window.addEventListener("beforeunload", () => {
				this.disconnectAll();
			});
		}
	}

	static getInstance(): WebSocketPool {
		if (!WebSocketPool.instance) {
			WebSocketPool.instance = new WebSocketPool();
		}
		return WebSocketPool.instance;
	}

	/**
	 * Subscribe to a camera's WebSocket feed
	 * Creates connection if it doesn't exist, otherwise reuses existing
	 */
	subscribe(
		cameraId: string,
		subscriberId: string,
		callbacks: {
			onFrame?: (data: any) => void;
			onMessage?: (data: any) => void;
			onError?: (error: any) => void;
			priority?: "high" | "normal" | "low";
		},
	): () => void {
		console.log(
			`[WebSocketPool] Subscribe: Camera ${cameraId}, Subscriber: ${subscriberId}`,
		);

		let connection = this.connections.get(cameraId);

		// Create connection if it doesn't exist
		if (!connection) {
			const wsUrl = this.buildWebSocketURL(cameraId);
			connection = this.createConnection(cameraId, wsUrl);
			this.connections.set(cameraId, connection);
		}

		// Check if subscriber already exists
		if (connection.subscribers.has(subscriberId)) {
			console.log(
				`[WebSocketPool] Subscriber ${subscriberId} already exists for camera ${cameraId}`,
			);
			// Update callbacks
			connection.subscribers.set(subscriberId, {
				id: subscriberId,
				...callbacks,
			});
			return () => this.unsubscribe(cameraId, subscriberId);
		}

		// Add new subscriber
		connection.subscribers.set(subscriberId, {
			id: subscriberId,
			...callbacks,
			priority: callbacks.priority || "normal",
		});

		console.log(
			`[WebSocketPool] Added subscriber ${subscriberId} to camera ${cameraId}. Total: ${connection.subscribers.size}`,
		);

		// Send last frame to new subscriber if available
		if (connection.lastFrame && callbacks.onFrame) {
			setTimeout(() => {
				if (connection?.lastFrame) {
					callbacks.onFrame!(connection.lastFrame);
				}
			}, 0);
		}

		// Return unsubscribe function
		return () => this.unsubscribe(cameraId, subscriberId);
	}

	/**
	 * Unsubscribe from a camera feed
	 */
	private unsubscribe(cameraId: string, subscriberId: string): void {
		console.log(
			`[WebSocketPool] Unsubscribe: Camera ${cameraId}, Subscriber: ${subscriberId}`,
		);

		const connection = this.connections.get(cameraId);
		if (!connection) {
			console.log(`[WebSocketPool] No connection found for camera ${cameraId}`);
			return;
		}

		connection.subscribers.delete(subscriberId);
		console.log(
			`[WebSocketPool] Removed subscriber ${subscriberId}. Remaining: ${connection.subscribers.size}`,
		);

		// DON'T close connection immediately - let cleanup handle it
		// This prevents unnecessary reconnections
		connection.lastActivityTime = Date.now();
	}

	/**
	 * Build WebSocket URL for camera
	 */
	private buildWebSocketURL(cameraId: string): string {
		const baseUrl = "ws://localhost:8000";
		return `${baseUrl}/ws/camera/${cameraId}`;
	}

	/**
	 * Create a new WebSocket connection for a camera
	 */
	private createConnection(cameraId: string, url: string): CameraConnection {
		console.log(`[WebSocketPool] Creating connection for camera ${cameraId}`);

		const ws = new WebSocket(url);

		const connection: CameraConnection = {
			ws,
			url,
			cameraId,
			subscribers: new Map(),
			reconnectAttempts: 0,
			reconnectTimer: null,
			isConnecting: true,
			lastFrameTime: 0,
			frameCount: 0,
			latency: 0,
			lastFrame: null,
			frameBuffer: [],
			maxBufferSize: 3, // Keep last 3 frames
			bytesReceived: 0,
			messagesReceived: 0,
			lastActivityTime: Date.now(),
		};

		// Connection opened
		ws.onopen = () => {
			console.log(`[WebSocketPool] ✅ Connected to camera ${cameraId}`);
			connection.isConnecting = false;
			connection.reconnectAttempts = 0;
			connection.lastActivityTime = Date.now();
		};

		// Message received
		ws.onmessage = (event) => {
			const receiveTime = Date.now();
			connection.lastActivityTime = receiveTime;
			connection.messagesReceived++;

			try {
				// Track data size
				if (typeof event.data === "string") {
					connection.bytesReceived += event.data.length;
				} else if (event.data instanceof ArrayBuffer) {
					connection.bytesReceived += event.data.byteLength;
				}

				const data = JSON.parse(event.data);

				// Calculate latency
				if (data.timestamp) {
					connection.latency = receiveTime - data.timestamp;
				}

				// Update frame tracking
				connection.lastFrameTime = receiveTime;
				connection.frameCount++;

				// Store frame in buffer (FIFO)
				connection.lastFrame = data;
				connection.frameBuffer.push(data);
				if (connection.frameBuffer.length > connection.maxBufferSize) {
					connection.frameBuffer.shift();
				}

				// Distribute to subscribers based on priority
				this.distributeFrame(connection, data);
			} catch (error) {
				console.error(
					`[WebSocketPool] Error parsing message for camera ${cameraId}:`,
					error,
				);
				this.notifySubscribersError(connection, error);
			}
		};

		// Error occurred
		ws.onerror = (error) => {
			console.error(`[WebSocketPool] ❌ Error for camera ${cameraId}:`, error);
			connection.isConnecting = false;
			this.notifySubscribersError(connection, error);
		};

		// Connection closed
		ws.onclose = (event) => {
			console.log(
				`[WebSocketPool] Connection closed for camera ${cameraId}. Code: ${event.code}, Reason: ${event.reason}`,
			);
			connection.isConnecting = false;

			// Attempt reconnection if there are subscribers
			if (
				connection.subscribers.size > 0 &&
				connection.reconnectAttempts < this.maxReconnectAttempts
			) {
				this.scheduleReconnect(cameraId, connection);
			} else if (connection.reconnectAttempts >= this.maxReconnectAttempts) {
				console.error(
					`[WebSocketPool] Max reconnection attempts reached for camera ${cameraId}`,
				);
				this.connections.delete(cameraId);
			}
		};

		return connection;
	}

	/**
	 * Distribute frame to subscribers based on priority
	 */
	private distributeFrame(connection: CameraConnection, data: any): void {
		// Sort subscribers by priority (high > normal > low)
		const sortedSubscribers = Array.from(connection.subscribers.values()).sort(
			(a, b) => {
				const priorityOrder = { high: 3, normal: 2, low: 1 };
				return (
					priorityOrder[b.priority || "normal"] -
					priorityOrder[a.priority || "normal"]
				);
			},
		);

		// Distribute frames
		for (const subscriber of sortedSubscribers) {
			try {
				// Call onFrame if available
				if (subscriber.onFrame) {
					subscriber.onFrame(data);
				}
				// Call generic onMessage if available
				if (subscriber.onMessage) {
					subscriber.onMessage(data);
				}
			} catch (error) {
				console.error(
					`[WebSocketPool] Error in subscriber ${subscriber.id} handler:`,
					error,
				);
			}
		}
	}

	/**
	 * Notify all subscribers of an error
	 */
	private notifySubscribersError(
		connection: CameraConnection,
		error: any,
	): void {
		connection.subscribers.forEach((subscriber) => {
			try {
				subscriber.onError?.(error);
			} catch (err) {
				console.error(
					`[WebSocketPool] Error in subscriber error handler:`,
					err,
				);
			}
		});
	}

	/**
	 * Schedule reconnection
	 */
	private scheduleReconnect(
		cameraId: string,
		connection: CameraConnection,
	): void {
		if (connection.reconnectTimer) {
			clearTimeout(connection.reconnectTimer);
		}

		connection.reconnectAttempts++;
		const delay =
			this.reconnectDelay * Math.min(connection.reconnectAttempts, 5);

		console.log(
			`[WebSocketPool] Scheduling reconnect for camera ${cameraId} in ${delay}ms (attempt ${connection.reconnectAttempts}/${this.maxReconnectAttempts})`,
		);

		connection.reconnectTimer = setTimeout(() => {
			// Check if still have subscribers
			if (connection.subscribers.size === 0) {
				console.log(
					`[WebSocketPool] Aborting reconnect - no subscribers for camera ${cameraId}`,
				);
				this.connections.delete(cameraId);
				return;
			}

			console.log(`[WebSocketPool] Reconnecting camera ${cameraId}...`);

			const newConnection = this.createConnection(cameraId, connection.url);
			newConnection.subscribers = connection.subscribers;
			newConnection.reconnectAttempts = connection.reconnectAttempts;

			this.connections.set(cameraId, newConnection);
		}, delay);
	}

	/**
	 * Cleanup inactive connections
	 */
	private cleanupInactiveConnections(): void {
		const now = Date.now();

		this.connections.forEach((connection, cameraId) => {
			// Close connections with no subscribers that have been inactive
			if (
				connection.subscribers.size === 0 &&
				now - connection.lastActivityTime > this.inactivityTimeout
			) {
				console.log(
					`[WebSocketPool] 🧹 Cleaning up inactive connection for camera ${cameraId}`,
				);
				this.forceDisconnect(cameraId);
			}
		});
	}

	/**
	 * Force disconnect a camera (close WebSocket)
	 */
	forceDisconnect(cameraId: string): void {
		const connection = this.connections.get(cameraId);
		if (!connection) return;

		console.log(`[WebSocketPool] Force disconnecting camera ${cameraId}`);

		if (connection.reconnectTimer) {
			clearTimeout(connection.reconnectTimer);
		}

		if (
			connection.ws.readyState === WebSocket.OPEN ||
			connection.ws.readyState === WebSocket.CONNECTING
		) {
			connection.ws.close();
		}

		this.connections.delete(cameraId);
	}

	/**
	 * Get the last frame for a camera (useful for new subscribers)
	 */
	getLastFrame(cameraId: string): any | null {
		const connection = this.connections.get(cameraId);
		return connection?.lastFrame || null;
	}

	/**
	 * Get connection stats for a camera
	 */
	getStats(cameraId: string): ConnectionStats | null {
		const connection = this.connections.get(cameraId);
		if (!connection) return null;

		const uptime =
			connection.lastFrameTime > 0 ? Date.now() - connection.lastFrameTime : 0;

		return {
			cameraId,
			isConnected: connection.ws.readyState === WebSocket.OPEN,
			subscriberCount: connection.subscribers.size,
			reconnectAttempts: connection.reconnectAttempts,
			frameCount: connection.frameCount,
			latency: connection.latency,
			uptime,
			bytesReceived: connection.bytesReceived,
			messagesReceived: connection.messagesReceived,
		};
	}

	/**
	 * Get stats for all cameras
	 */
	getAllStats(): ConnectionStats[] {
		const stats: ConnectionStats[] = [];

		this.connections.forEach((_, cameraId) => {
			const cameraStat = this.getStats(cameraId);
			if (cameraStat) {
				stats.push(cameraStat);
			}
		});

		return stats;
	}

	/**
	 * Check if a camera is connected
	 */
	isConnected(cameraId: string): boolean {
		const connection = this.connections.get(cameraId);
		return connection?.ws.readyState === WebSocket.OPEN;
	}

	/**
	 * Disconnect all cameras
	 */
	disconnectAll(): void {
		console.log("[WebSocketPool] Disconnecting all cameras");

		this.connections.forEach((_, cameraId) => {
			this.forceDisconnect(cameraId);
		});

		this.connections.clear();

		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
	}

	/**
	 * Get debug information
	 */
	getDebugInfo(): string {
		const info: string[] = [];
		info.push(`📊 WebSocket Pool Status`);
		info.push(`Total connections: ${this.connections.size}`);
		info.push("");

		this.connections.forEach((conn, cameraId) => {
			const state = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"][
				conn.ws.readyState
			];
			info.push(`📷 Camera: ${cameraId}`);
			info.push(`  State: ${state}`);
			info.push(`  Subscribers: ${conn.subscribers.size}`);
			info.push(`  Reconnects: ${conn.reconnectAttempts}`);
			info.push(`  Frames: ${conn.frameCount}`);
			info.push(`  Latency: ${conn.latency}ms`);
			info.push(`  Data: ${(conn.bytesReceived / 1024 / 1024).toFixed(2)}MB`);
			info.push("");
		});

		return info.join("\n");
	}

	/**
	 * Memory cleanup helper
	 */
	clearFrameBuffers(): void {
		console.log("[WebSocketPool] Clearing frame buffers");
		this.connections.forEach((connection) => {
			connection.frameBuffer = [];
			connection.lastFrame = null;
		});
	}
}
