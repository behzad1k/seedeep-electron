import { WebSocketPool } from '@utils/websocket/WebsocketPool.ts';
import React, { useRef, useEffect, useCallback, memo, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

interface CameraFeedProps {
  cameraId: string | number;
  wsUrl?: string;
  targetFPS?: number;
  onFrame?: (data: any) => void;
  onError?: (error: any) => void;
  isVisible?: boolean;
  renderDetections?: boolean;
}

interface DetectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  label: string;
}

export const CameraFeed = memo<CameraFeedProps>(({
                                                   cameraId,
                                                   wsUrl = 'ws://localhost:8000',
                                                   targetFPS = 15,
                                                   onFrame,
                                                   onError,
                                                   isVisible = true,
                                                   renderDetections = true
                                                 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isActiveRef = useRef(true);
  const frameCountRef = useRef(0);
  const mountedRef = useRef(true);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [detections, setDetections] = useState<DetectionBox[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedCameraId = String(cameraId);

  const drawFrame = useCallback((frameData: string, dets: DetectionBox[]) => {
    if (!canvasRef.current || !mountedRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    if (!imageRef.current) {
      imageRef.current = new Image();
    }

    const img = imageRef.current;

    img.onload = () => {
      if (!mountedRef.current || !canvasRef.current) return;

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      if (renderDetections && dets.length > 0) {
        dets.forEach((det) => {
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 2;
          ctx.strokeRect(det.x1, det.y1, det.x2 - det.x1, det.y2 - det.y1);

          const label = `${det.label} ${(det.confidence * 100).toFixed(0)}%`;
          ctx.font = '14px Arial';
          const textMetrics = ctx.measureText(label);
          const textHeight = 20;

          ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
          ctx.fillRect(det.x1, det.y1 - textHeight, textMetrics.width + 8, textHeight);

          ctx.fillStyle = '#000';
          ctx.fillText(label, det.x1 + 4, det.y1 - 6);
        });
      }
    };

    const src = frameData.startsWith('data:') ? frameData : `data:image/jpeg;base64,${frameData}`;
    img.src = src;
  }, [renderDetections]);

  const handleMessage = useCallback((data: any) => {
    if (!isActiveRef.current || !mountedRef.current || !isVisible) return;

    if (data.camera_id && String(data.camera_id) !== normalizedCameraId) {
      return;
    }

    frameCountRef.current++;

    if (frameCountRef.current % 30 === 0) {
      console.log(`[CameraFeed ${normalizedCameraId}] Received ${frameCountRef.current} frames`);
    }

    setIsConnected(true);
    setError(null);
    onFrame?.(data);

    let currentDetections: DetectionBox[] = [];

    if (data.results && renderDetections) {
      Object.values(data.results).forEach((modelResult: any) => {
        if (modelResult.detections && Array.isArray(modelResult.detections)) {
          modelResult.detections.forEach((det: any) => {
            currentDetections.push({
              x1: det.x1,
              y1: det.y1,
              x2: det.x2,
              y2: det.y2,
              confidence: det.confidence,
              label: det.label
            });
          });
        }
      });
    }

    setDetections(currentDetections);

    if (data.frame) {
      drawFrame(data.frame, currentDetections);
    }
  }, [isVisible, normalizedCameraId, onFrame, renderDetections, drawFrame]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    if (unsubscribeRef.current) {
      return;
    }

    mountedRef.current = true;
    isActiveRef.current = true;

    const pool = WebSocketPool.getInstance();
    const cameraWsUrl = `${wsUrl.replace(/\/ws$/, '')}/ws/camera/${normalizedCameraId}`;

    console.log(`[CameraFeed ${normalizedCameraId}] Connecting to:`, cameraWsUrl);

    const timeoutId = setTimeout(() => {
      if (!mountedRef.current) return;

      unsubscribeRef.current = pool.subscribe(
        cameraWsUrl,
        normalizedCameraId,
        handleMessage,
        (err) => {
          if (!mountedRef.current) return;
          console.error(`[CameraFeed ${normalizedCameraId}] WebSocket error:`, err);
          setIsConnected(false);
          setError('Connection error');
          onError?.(err);
        }
      );
    }, 100);

    return () => {
      console.log(`[CameraFeed ${normalizedCameraId}] Cleanup`);
      clearTimeout(timeoutId);
      mountedRef.current = false;
      isActiveRef.current = false;

      if (imageRef.current) {
        imageRef.current.onload = null;
        imageRef.current.src = '';
        imageRef.current = null;
      }

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [normalizedCameraId, wsUrl, isVisible, handleMessage, onError]);

  if (!isVisible) return null;

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#000' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: '#000',
          display: isConnected ? 'block' : 'none'
        }}
      />

      {!isConnected && !error && (
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: 'white' }}>
          <CircularProgress color="primary" size={40} sx={{ mb: 2 }} />
          <Typography variant="body2">Connecting...</Typography>
        </Box>
      )}

      {error && (
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: 'white', maxWidth: '80%' }}>
          <Typography variant="body2" color="error">{error}</Typography>
        </Box>
      )}

      {isConnected && (
        <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: '4px 8px', borderRadius: '4px' }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#00ff00', animation: 'pulse 2s infinite', '@keyframes pulse': { '0%': { opacity: 1 }, '50%': { opacity: 0.5 }, '100%': { opacity: 1 } } }} />
          <Typography variant="caption" color="white">Live</Typography>
        </Box>
      )}

      {renderDetections && detections.length > 0 && (
        <Box sx={{ position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0, 0, 0, 0.7)', color: '#00ff00', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}>
          Detections: {detections.length}
        </Box>
      )}
    </Box>
  );
});

CameraFeed.displayName = 'CameraFeed';