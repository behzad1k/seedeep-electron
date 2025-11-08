interface BinaryFrameData {
  cameraId: string;
  timestamp: number;
  imageData: ArrayBuffer;
}

export class WebSocketPool {
  private static instance: WebSocketPool;
  private connections: Map<string, {
    ws: WebSocket;
    subscribers: Set<string>;
    reconnectAttempts: number;
    isConnecting: boolean;
    messageHandlers: Map<string, (data: any) => void>;
  }> = new Map();

  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  private constructor() {}

  static getInstance(): WebSocketPool {
    if (!WebSocketPool.instance) {
      WebSocketPool.instance = new WebSocketPool();
    }
    return WebSocketPool.instance;
  }

  /**
   * Subscribe to WebSocket connection
   * Supports per-camera URLs: ws://localhost:8000/ws/camera/{camera_id}
   */
  subscribe(
    url: string,
    subscriberId: string,
    onMessage: (data: any) => void,
    onError?: (error: any) => void
  ): () => void {
    let connection = this.connections.get(url);

    if (!connection) {
      // Create new connection
      const ws = new WebSocket(url);
      connection = {
        ws,
        subscribers: new Set([subscriberId]),
        reconnectAttempts: 0,
        isConnecting: true,
        messageHandlers: new Map([[subscriberId, onMessage]])
      };

      ws.onopen = () => {
        console.log(`[WebSocketPool] Connected to ${url}`);
        if (connection) {
          connection.isConnecting = false;
          connection.reconnectAttempts = 0;
        }
      };

      ws.onmessage = (event) => {
        try {
          // Parse JSON response from backend
          const data = JSON.parse(event.data);

          // Route message to specific subscriber if camera_id matches
          if (data.camera_id) {
            const handler = connection?.messageHandlers.get(data.camera_id);
            if (handler) {
              handler(data);
            } else {
              // Fallback: route to first handler (for single subscriber)
              const firstHandler = connection?.messageHandlers.values().next().value;
              if (firstHandler) {
                firstHandler(data);
              }
            }
          } else {
            // Broadcast to all subscribers
            connection?.messageHandlers.forEach(handler => handler(data));
          }
        } catch (error) {
          console.error('[WebSocketPool] Message parsing error:', error);
          connection?.messageHandlers.forEach(handler => onError?.(error));
        }
      };

      ws.onerror = (error) => {
        console.error(`[WebSocketPool] Error on ${url}:`, error);
        connection?.messageHandlers.forEach(handler => onError?.(error));
      };

      ws.onclose = () => {
        console.log(`[WebSocketPool] Disconnected from ${url}`);
        if (connection && connection.subscribers.size > 0) {
          this.attemptReconnect(url);
        } else {
          this.connections.delete(url);
        }
      };

      this.connections.set(url, connection);
    } else {
      // Add subscriber to existing connection
      connection.subscribers.add(subscriberId);
      connection.messageHandlers.set(subscriberId, onMessage);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(url, subscriberId);
    };
  }

  private unsubscribe(url: string, subscriberId: string): void {
    const connection = this.connections.get(url);
    if (!connection) return;

    connection.subscribers.delete(subscriberId);
    connection.messageHandlers.delete(subscriberId);

    // Close connection if no more subscribers
    if (connection.subscribers.size === 0) {
      connection.ws.close();
      this.connections.delete(url);
      console.log(`[WebSocketPool] Closed connection to ${url} (no subscribers)`);
    }
  }

  private attemptReconnect(url: string): void {
    const connection = this.connections.get(url);
    if (!connection || connection.isConnecting) return;

    if (connection.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[WebSocketPool] Max reconnect attempts reached for ${url}`);
      this.connections.delete(url);
      return;
    }

    connection.reconnectAttempts++;
    connection.isConnecting = true;

    setTimeout(() => {
      console.log(`[WebSocketPool] Reconnecting to ${url} (attempt ${connection.reconnectAttempts})`);

      // Store handlers for reconnection
      const handlers = Array.from(connection.messageHandlers.entries());

      // Remove old connection
      this.connections.delete(url);

      // Recreate connections for each subscriber
      handlers.forEach(([subscriberId, handler]) => {
        this.subscribe(url, subscriberId, handler);
      });
    }, this.reconnectDelay * connection.reconnectAttempts);
  }

  /**
   * Send binary frame to specific camera WebSocket
   */
  sendBinaryFrame(url: string, frameData: BinaryFrameData): boolean {
    const connection = this.connections.get(url);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[WebSocketPool] Cannot send to ${url} - not connected`);
      return false;
    }

    try {
      // Encode camera ID
      const encoder = new TextEncoder();
      const cameraIdBytes = encoder.encode(frameData.cameraId);

      // Calculate buffer size
      const headerSize = 1 + cameraIdBytes.length + 4;
      const totalSize = headerSize + frameData.imageData.byteLength;

      // Create binary buffer
      const buffer = new ArrayBuffer(totalSize);
      const view = new DataView(buffer);
      const uint8View = new Uint8Array(buffer);

      let offset = 0;

      // Camera ID length (1 byte)
      view.setUint8(offset, cameraIdBytes.length);
      offset += 1;

      // Camera ID (variable length)
      uint8View.set(cameraIdBytes, offset);
      offset += cameraIdBytes.length;

      // Timestamp (4 bytes, little-endian)
      view.setUint32(offset, frameData.timestamp, true);
      offset += 4;

      // Image data
      uint8View.set(new Uint8Array(frameData.imageData), offset);

      // Send binary data
      connection.ws.send(buffer);
      return true;
    } catch (error) {
      console.error('[WebSocketPool] Send error:', error);
      return false;
    }
  }

  /**
   * Send JSON message (for configuration, etc.)
   */
  sendJson(url: string, data: any): boolean {
    const connection = this.connections.get(url);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[WebSocketPool] Cannot send to ${url} - not connected`);
      return false;
    }

    try {
      connection.ws.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('[WebSocketPool] Send error:', error);
      return false;
    }
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      connections: Array.from(this.connections.entries()).map(([url, conn]) => ({
        url,
        subscribers: conn.subscribers.size,
        state: conn.ws.readyState,
        reconnectAttempts: conn.reconnectAttempts
      }))
    };
  }

  /**
   * Close specific connection
   */
  closeConnection(url: string): boolean {
    const connection = this.connections.get(url);
    if (!connection) return false;

    connection.ws.close();
    this.connections.delete(url);
    console.log(`[WebSocketPool] Manually closed connection to ${url}`);
    return true;
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    this.connections.forEach((connection, url) => {
      connection.ws.close();
    });
    this.connections.clear();
    console.log('[WebSocketPool] All connections closed');
  }
}