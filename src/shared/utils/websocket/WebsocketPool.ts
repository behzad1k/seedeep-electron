/**
 * WebSocketPool - Manages WebSocket connections efficiently
 * Prevents duplicate connections and handles reconnection logic
 */

interface WSConnection {
  ws: WebSocket;
  url: string;
  subscribers: Map<string, {
    onMessage: (data: any) => void;
    onError: (error: any) => void;
  }>;
  reconnectAttempts: number;
  reconnectTimer: any | null;
  isConnecting: boolean;
}

export class WebSocketPool {
  private static instance: WebSocketPool;
  private connections: Map<string, WSConnection> = new Map();
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
   * Subscribe to a WebSocket connection
   */
  subscribe(
    url: string,
    subscriberId: string,
    onMessage: (data: any) => void,
    onError: (error: any) => void
  ): () => void {
    console.log(`[WebSocketPool] Subscribe request - URL: ${url}, Subscriber: ${subscriberId}`);

    let connection = this.connections.get(url);

    // If connection exists and has this subscriber, return existing unsubscribe
    if (connection && connection.subscribers.has(subscriberId)) {
      console.log(`[WebSocketPool] Subscriber ${subscriberId} already exists for ${url}`);
      return () => this.unsubscribe(url, subscriberId);
    }

    // Create new connection if it doesn't exist
    if (!connection) {
      console.log(`[WebSocketPool] Creating new connection for ${url}`);
      connection = this.createConnection(url);
      this.connections.set(url, connection);
    }

    // Add subscriber
    connection.subscribers.set(subscriberId, { onMessage, onError });
    console.log(`[WebSocketPool] Added subscriber ${subscriberId}. Total subscribers: ${connection.subscribers.size}`);

    // Return unsubscribe function
    return () => this.unsubscribe(url, subscriberId);
  }

  /**
   * Unsubscribe from a WebSocket connection
   */
  private unsubscribe(url: string, subscriberId: string): void {
    console.log(`[WebSocketPool] Unsubscribe - URL: ${url}, Subscriber: ${subscriberId}`);

    const connection = this.connections.get(url);
    if (!connection) {
      console.log(`[WebSocketPool] No connection found for ${url}`);
      return;
    }

    connection.subscribers.delete(subscriberId);
    console.log(`[WebSocketPool] Removed subscriber ${subscriberId}. Remaining: ${connection.subscribers.size}`);

    // Close connection if no more subscribers
    if (connection.subscribers.size === 0) {
      console.log(`[WebSocketPool] No more subscribers, closing connection for ${url}`);
      this.closeConnection(url);
    }
  }

  /**
   * Create a new WebSocket connection
   */
  private createConnection(url: string): WSConnection {
    const ws = new WebSocket(url);

    const connection: WSConnection = {
      ws,
      url,
      subscribers: new Map(),
      reconnectAttempts: 0,
      reconnectTimer: null,
      isConnecting: true
    };

    ws.onopen = () => {
      console.log(`[WebSocketPool] Connected to ${url}`);
      connection.isConnecting = false;
      connection.reconnectAttempts = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Broadcast to all subscribers
        connection.subscribers.forEach((subscriber, id) => {
          try {
            subscriber.onMessage(data);
          } catch (error) {
            console.error(`[WebSocketPool] Error in subscriber ${id} message handler:`, error);
          }
        });
      } catch (error) {
        console.error('[WebSocketPool] Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error(`[WebSocketPool] WebSocket error for ${url}:`, error);
      connection.subscribers.forEach((subscriber) => {
        subscriber.onError(error);
      });
    };

    ws.onclose = (event) => {
      console.log(`[WebSocketPool] Connection closed for ${url}. Code: ${event.code}, Reason: ${event.reason}`);
      connection.isConnecting = false;

      // Only attempt reconnection if there are still subscribers
      if (connection.subscribers.size > 0 && connection.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`[WebSocketPool] Attempting to reconnect... (${connection.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        this.reconnect(url, connection);
      } else if (connection.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error(`[WebSocketPool] Max reconnection attempts reached for ${url}`);
        this.connections.delete(url);
      }
    };

    return connection;
  }

  /**
   * Reconnect to a WebSocket
   */
  private reconnect(url: string, connection: WSConnection): void {
    if (connection.reconnectTimer) {
      clearTimeout(connection.reconnectTimer);
    }

    connection.reconnectAttempts++;

    connection.reconnectTimer = setTimeout(() => {
      if (connection.subscribers.size === 0) {
        console.log(`[WebSocketPool] Aborting reconnect - no subscribers for ${url}`);
        this.connections.delete(url);
        return;
      }

      console.log(`[WebSocketPool] Reconnecting to ${url}...`);

      const newConnection = this.createConnection(url);
      newConnection.subscribers = connection.subscribers;
      newConnection.reconnectAttempts = connection.reconnectAttempts;

      this.connections.set(url, newConnection);
    }, this.reconnectDelay);
  }

  /**
   * Close a WebSocket connection
   */
  private closeConnection(url: string): void {
    const connection = this.connections.get(url);
    if (!connection) return;

    if (connection.reconnectTimer) {
      clearTimeout(connection.reconnectTimer);
    }

    if (connection.ws.readyState === WebSocket.OPEN || connection.ws.readyState === WebSocket.CONNECTING) {
      connection.ws.close();
    }

    this.connections.delete(url);
    console.log(`[WebSocketPool] Closed and removed connection for ${url}`);
  }

  /**
   * Send binary frame data
   */
  sendBinaryFrame(url: string, data: {
    cameraId: string;
    timestamp: number;
    imageData: ArrayBuffer;
  }): void {
    const connection = this.connections.get(url);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[WebSocketPool] Cannot send data - connection not ready for ${url}`);
      return;
    }

    try {
      const cameraIdBytes = new TextEncoder().encode(data.cameraId);
      const headerSize = 1 + cameraIdBytes.length + 4;
      const totalSize = headerSize + data.imageData.byteLength;

      const buffer = new ArrayBuffer(totalSize);
      const view = new DataView(buffer);
      const uint8View = new Uint8Array(buffer);

      let offset = 0;

      // Camera ID length
      view.setUint8(offset, cameraIdBytes.length);
      offset += 1;

      // Camera ID
      uint8View.set(cameraIdBytes, offset);
      offset += cameraIdBytes.length;

      // Timestamp
      view.setUint32(offset, data.timestamp, true);
      offset += 4;

      // Image data
      uint8View.set(new Uint8Array(data.imageData), offset);

      connection.ws.send(buffer);
    } catch (error) {
      console.error(`[WebSocketPool] Error sending binary frame:`, error);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(url: string): {
    isConnected: boolean;
    subscriberCount: number;
    reconnectAttempts: number;
  } | null {
    const connection = this.connections.get(url);
    if (!connection) return null;

    return {
      isConnected: connection.ws.readyState === WebSocket.OPEN,
      subscriberCount: connection.subscribers.size,
      reconnectAttempts: connection.reconnectAttempts
    };
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    console.log('[WebSocketPool] Closing all connections');
    this.connections.forEach((_, url) => {
      this.closeConnection(url);
    });
    this.connections.clear();
  }

  /**
   * Get debug info
   */
  getDebugInfo(): string {
    const info: string[] = [];
    info.push(`Total connections: ${this.connections.size}`);

    this.connections.forEach((conn, url) => {
      info.push(`  ${url}:`);
      info.push(`    - State: ${['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][conn.ws.readyState]}`);
      info.push(`    - Subscribers: ${conn.subscribers.size}`);
      info.push(`    - Reconnect attempts: ${conn.reconnectAttempts}`);
    });

    return info.join('\n');
  }
}