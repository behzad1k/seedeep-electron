
import { WebSocketPool } from '@utils/websocket/WebsocketPool.ts';
import { useState, useEffect, useCallback, useRef } from 'react';

interface CameraStreamOptions {
  cameraId: string;
  wsUrl?: string;
  autoConnect?: boolean;
  onDetection?: (data: any) => void;
  onTracking?: (data: any) => void;
  onError?: (error: string) => void;
}

interface CameraStreamState {
  isConnected: boolean;
  lastFrame: any | null;
  detectionCount: number;
  trackingCount: number;
  error: string | null;
}

export const useCameraStream = (options: CameraStreamOptions) => {
  const {
    cameraId,
    wsUrl = 'ws://localhost:8000/ws',
    autoConnect = true,
    onDetection,
    onTracking,
    onError
  } = options;

  const [state, setState] = useState<CameraStreamState>({
    isConnected: false,
    lastFrame: null,
    detectionCount: 0,
    trackingCount: 0,
    error: null
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  const handleMessage = useCallback((data: any) => {
    setState(prev => ({
      ...prev,
      isConnected: true,
      lastFrame: data,
      error: null
    }));

    // Handle detections
    if (data.results) {
      let totalDetections = 0;
      Object.values(data.results).forEach((modelResult: any) => {
        if (modelResult.detections) {
          totalDetections += modelResult.detections.length;
        }
      });

      setState(prev => ({ ...prev, detectionCount: totalDetections }));
      onDetection?.(data);
    }

    // Handle tracking
    if (data.results?.tracking) {
      const trackingData = data.results.tracking;
      setState(prev => ({
        ...prev,
        trackingCount: trackingData.summary?.total_tracks || 0
      }));
      onTracking?.(trackingData);
    }

    // Handle errors
    if (data.error) {
      setState(prev => ({ ...prev, error: data.error }));
      onError?.(data.error);
    }
  }, [onDetection, onTracking, onError]);

  const handleError = useCallback((error: any) => {
    const errorMessage = error instanceof Error ? error.message : 'Connection error';
    setState(prev => ({
      ...prev,
      isConnected: false,
      error: errorMessage
    }));
    onError?.(errorMessage);
  }, [onError]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (unsubscribeRef.current) {
      return; // Already connected
    }

    const pool = WebSocketPool.getInstance();
    unsubscribeRef.current = pool.subscribe(
      wsUrl,
      cameraId,
      handleMessage,
      handleError
    );
  }, [cameraId, wsUrl, handleMessage, handleError]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
      setState(prev => ({ ...prev, isConnected: false }));
    }
  }, []);

  // Send frame to backend
  const sendFrame = useCallback(async (imageData: ArrayBuffer) => {
    const pool = WebSocketPool.getInstance();
    pool.sendBinaryFrame(wsUrl, {
      cameraId,
      timestamp: Math.floor(Date.now() / 1000),
      imageData
    });
  }, [cameraId, wsUrl]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    sendFrame
  };
};
