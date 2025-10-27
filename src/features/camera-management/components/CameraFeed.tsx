import { FrameRateLimiter } from '@utils/performance/FrameRateLimiter.ts';
import { WebSocketPool } from '@utils/websocket/WebsocketPool.ts';
import React, { useRef, useEffect, useCallback, memo, useState } from 'react';
import { Box, Typography } from '@mui/material';

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

/**
 * Optimized Camera Feed Component integrated with FastAPI backend
 * - Uses shared WebSocket connection pool
 * - Frame rate limiting
 * - Lazy loading support
 * - Proper cleanup on unmount
 * - Renders detection boxes from backend
 */
export const CameraFeed = memo<CameraFeedProps>(({
                                                                     cameraId,
                                                                     wsUrl = 'ws://localhost:8000/ws',
                                                                     targetFPS = 15,
                                                                     onFrame,
                                                                     onError,
                                                                     isVisible = true,
                                                                     renderDetections = true
                                                                   }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRateLimiterRef = useRef(new FrameRateLimiter(targetFPS));
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isActiveRef = useRef(true);
  const animationFrameRef = useRef<number | null>(null);

  const [detections, setDetections] = useState<DetectionBox[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Handle WebSocket messages from backend
  const handleMessage = useCallback((data: any) => {
    if (!isActiveRef.current || !isVisible) return;

    // Check if this message is for our camera
    if (data.camera_id !== cameraId.toString()) return;

    setIsConnected(true);
    onFrame?.(data);

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
    unsubscribeRef.current = pool.subscribe(
      wsUrl,
      cameraId.toString(),
      handleMessage,
      onError
    );

    return () => {
      isActiveRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [cameraId, wsUrl, isVisible, handleMessage, onError]);

  // Send frames to backend
  const sendFrameToBackend = useCallback(async () => {
    if (!videoRef.current || !isVisible || !isActiveRef.current) return;

    // Apply frame rate limiting
    if (!frameRateLimiterRef.current.shouldProcessFrame()) {
      animationFrameRef.current = requestAnimationFrame(sendFrameToBackend);
      return;
    }

    try {
      const video = videoRef.current;

      // Create canvas to capture frame
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const ctx = tempCanvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0);

        // Convert to JPEG blob
        tempCanvas.toBlob(async (blob) => {
          if (blob) {
            const arrayBuffer = await blob.arrayBuffer();
            const pool = WebSocketPool.getInstance();

            pool.sendBinaryFrame(wsUrl, {
              cameraId: cameraId.toString(),
              timestamp: Math.floor(Date.now() / 1000),
              imageData: arrayBuffer
            });
          }
        }, 'image/jpeg', 0.8);
      }
    } catch (error) {
      console.error('[CameraFeed] Error sending frame:', error);
      onError?.(error);
    }

    animationFrameRef.current = requestAnimationFrame(sendFrameToBackend);
  }, [isVisible, cameraId, wsUrl, onError]);

  // Start/stop frame capture based on visibility
  useEffect(() => {
    if (isVisible && videoRef.current) {
      animationFrameRef.current = requestAnimationFrame(sendFrameToBackend);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isVisible, sendFrameToBackend]);

  // Draw detections on canvas
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current || !renderDetections) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video frame
    if (video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      // Draw detection boxes
      detections.forEach((det) => {
        // Draw box
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(det.x1, det.y1, det.x2 - det.x1, det.y2 - det.y1);

        // Draw label background
        const label = `${det.label} ${(det.confidence * 100).toFixed(0)}%`;
        ctx.font = '14px Arial';
        const textMetrics = ctx.measureText(label);
        const textHeight = 20;

        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.fillRect(det.x1, det.y1 - textHeight, textMetrics.width + 8, textHeight);

        // Draw label text
        ctx.fillStyle = '#000';
        ctx.fillText(label, det.x1 + 4, det.y1 - 6);
      });
    }
  }, [detections, renderDetections]);

  // Update frame rate if changed
  useEffect(() => {
    frameRateLimiterRef.current.setTargetFPS(targetFPS);
  }, [targetFPS]);

  if (!isVisible) {
    return null;
  }

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#000' }}>
      {/* Hidden video element for camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />

      {/* Canvas for rendering video + detections */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: '#000'
        }}
      />

      {/* Connection status indicator */}
      {!isConnected && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'white'
          }}
        >
          <Typography variant="body2">Connecting...</Typography>
        </Box>
      )}

      {/* Detection count overlay */}
      {renderDetections && detections.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#00ff00',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}
        >
          Detections: {detections.length}
        </Box>
      )}
    </Box>
  );
});

CameraFeed.displayName = 'CameraFeed';