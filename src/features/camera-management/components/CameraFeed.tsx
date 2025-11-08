import { FrameRateLimiter } from '@utils/performance/FrameRateLimiter.ts';
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

  const [detections, setDetections] = useState<DetectionBox[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle WebSocket messages from backend
  const handleMessage = useCallback((data: any) => {
    if (!isActiveRef.current || !isVisible) return;

    if (data.camera_id && data.camera_id !== cameraId.toString()) return;

    setIsConnected(true);
    setError(null);
    onFrame?.(data);

    // If backend sends back the frame as base64
    if (data.frame) {
      setLastFrame(data.frame);
    }

    // Extract detections from all models
    if (data.results && renderDetections) {
      const allDetections: DetectionBox[] = [];

      Object.values(data.results).forEach((modelResult: any) => {
        if (modelResult.detections && Array.isArray(modelResult.detections)) {
          modelResult.detections.forEach((det: any) => {
            allDetections.push({
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

      setDetections(allDetections);
    }
  }, [isVisible, cameraId, onFrame, renderDetections]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!isVisible) return;

    const pool = WebSocketPool.getInstance();
    const cameraWsUrl = `${wsUrl.replace(/\/ws$/, '')}/ws/camera/${cameraId}`;

    console.log('[CameraFeed] Connecting to:', cameraWsUrl);

    unsubscribeRef.current = pool.subscribe(
      cameraWsUrl,
      cameraId.toString(),
      handleMessage,
      (err) => {
        console.error('[CameraFeed] WebSocket error:', err);
        setIsConnected(false);
        setError('Connection error');
        onError?.(err);
      }
    );

    return () => {
      isActiveRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [cameraId, wsUrl, isVisible, handleMessage, onError]);

  // Draw frame and detections on canvas
  useEffect(() => {
    if (!canvasRef.current || !lastFrame) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      if (renderDetections) {
        detections.forEach((det) => {
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

    img.src = lastFrame.startsWith('data:') ? lastFrame : `data:image/jpeg;base64,${lastFrame}`;
  }, [lastFrame, detections, renderDetections]);

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
          display: isConnected && lastFrame ? 'block' : 'none'
        }}
      />

      {!isConnected && !error && (
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: 'white' }}>
          <CircularProgress color="primary" size={40} sx={{ mb: 2 }} />
          <Typography variant="body2">Connecting to camera...</Typography>
          <Typography variant="caption" sx={{ mt: 1, opacity: 0.7 }}>Camera ID: {cameraId}</Typography>
        </Box>
      )}

      {isConnected && !lastFrame && !error && (
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: 'white' }}>
          <CircularProgress color="primary" size={40} sx={{ mb: 2 }} />
          <Typography variant="body2">Waiting for stream...</Typography>
        </Box>
      )}

      {error && (
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: 'white', maxWidth: '80%' }}>
          <Typography variant="body2" color="error">{error}</Typography>
        </Box>
      )}

      {isConnected && lastFrame && (
        <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: '4px 8px', borderRadius: '4px' }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#00ff00', animation: 'pulse 2s infinite', '@keyframes pulse': { '0%': { opacity: 1 }, '50%': { opacity: 0.5 }, '100%': { opacity: 1 } } }} />
          <Typography variant="caption" color="white">Live</Typography>
        </Box>
      )}

      {renderDetections && detections.length > 0 && lastFrame && (
        <Box sx={{ position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0, 0, 0, 0.7)', color: '#00ff00', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}>
          Detections: {detections.length}
        </Box>
      )}
    </Box>
  );
});

CameraFeed.displayName = 'CameraFeed';