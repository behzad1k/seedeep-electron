'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { DetectionResult, ModelRequest } from '@/types';

interface WebSocketMessage {
  type: string;
  results?: Record<string, DetectionResult>;
  timestamp?: number;
  message?: string;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  detections: Record<string, DetectionResult>;
  error: string | null;
  sendFrame: (imageData: ArrayBuffer, models: ModelRequest[]) => void;
  stats: { fps: number; latency: number };
}

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [detections, setDetections] = useState<Record<string, DetectionResult>>({});
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ fps: 0, latency: 0 });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const sentTimestampRef = useRef<number>(0);

  const connectWebSocket = useCallback(() => {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://192.168.1.10:8000/ws';
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);

        // Clear any pending reconnection
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'detections' && message.results) {
            setDetections(message.results);

            // Calculate latency using the timestamp we sent
            if (message.timestamp && sentTimestampRef.current) {
              const latency = Date.now() - sentTimestampRef.current;
              setStats(prev => ({ ...prev, latency }));
            }

            // Update FPS
            const now = Date.now();
            frameCountRef.current++;
            if (now - lastFrameTimeRef.current >= 1000) {
              setStats(prev => ({ ...prev, fps: frameCountRef.current }));
              frameCountRef.current = 0;
              lastFrameTimeRef.current = now;
            }
          } else if (message.type === 'error') {
            console.error('WebSocket error:', message.message);
            setError(message.message || 'Unknown error');
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
          setError('Failed to parse server response');
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connectWebSocket();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        setError('WebSocket connection failed');
      };
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to create WebSocket connection');
    }
  }, []);

  const sendFrame = useCallback((imageData: ArrayBuffer, models: ModelRequest[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || models.length === 0) {
      return;
    }

    const timestamp = Date.now();
    sentTimestampRef.current = timestamp;

    try {
      const encoder = new TextEncoder();

      // Calculate buffer size needed
      let bufferSize = 4 + 1; // timestamp + model count

      for (const model of models) {
        const modelNameBytes = encoder.encode(model.name);
        bufferSize += 1 + modelNameBytes.length; // name length + name
        bufferSize += 1; // has class filter flag

        if (model.classFilter && model.classFilter.length > 0) {
          bufferSize += 1; // class count
          for (const className of model.classFilter) {
            const classNameBytes = encoder.encode(className);
            bufferSize += 1 + classNameBytes.length; // class name length + class name
          }
        }
      }

      bufferSize += imageData.byteLength; // image data

      // Create buffer
      const buffer = new ArrayBuffer(bufferSize);
      const uint8View = new Uint8Array(buffer);
      const dataView = new DataView(buffer);

      let position = 0;

      // Write timestamp (4 bytes, big-endian)
      dataView.setUint32(position, Math.floor(timestamp / 1000), false);
      position += 4;

      // Write model count (1 byte)
      uint8View[position] = models.length;
      position += 1;

      // Write each model's data
      for (const model of models) {
        const modelNameBytes = encoder.encode(model.name);

        // Model name length
        uint8View[position] = modelNameBytes.length;
        position += 1;

        // Model name
        uint8View.set(modelNameBytes, position);
        position += modelNameBytes.length;

        // Has class filter flag
        const hasClassFilter = model.classFilter && model.classFilter.length > 0;
        uint8View[position] = hasClassFilter ? 1 : 0;
        position += 1;

        if (hasClassFilter && model.classFilter) {
          // Class count
          uint8View[position] = model.classFilter.length;
          position += 1;

          // Each class name
          for (const className of model.classFilter) {
            const classNameBytes = encoder.encode(className);

            // Class name length
            uint8View[position] = classNameBytes.length;
            position += 1;

            // Class name
            uint8View.set(classNameBytes, position);
            position += classNameBytes.length;
          }
        }
      }

      // Append image data
      uint8View.set(new Uint8Array(imageData), position);

      // Send binary data
      wsRef.current.send(buffer);

    } catch (err) {
      console.error('Error sending frame:', err);
      setError('Failed to send frame to server');
    }
  }, []);

  // Initialize connection
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  return {
    isConnected,
    detections,
    error,
    sendFrame,
    stats
  };
}
