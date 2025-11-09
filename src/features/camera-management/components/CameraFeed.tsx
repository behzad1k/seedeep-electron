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

interface TrackedObject {
  track_id: string;
  class_name: string;
  bbox: [number, number, number, number];
  centroid: [number, number];
  confidence: number;
  speed_kmh?: number;
  speed_m_per_sec?: number;
}

interface FrameData {
  frame: string;
  timestamp: number;
  serverTime: number;
}

interface AnnotationData {
  detections: DetectionBox[];
  trackedObjects: TrackedObject[];
  timestamp: number;
}

export const CameraFeed = memo<CameraFeedProps>(({
                                                   cameraId,
                                                   wsUrl = 'ws://localhost:8000',
                                                   targetFPS = 20, // INCREASED default FPS
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

  // OPTIMIZATION: Use OffscreenCanvas if available
  const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null);
  const renderWorkerRef = useRef<Worker | null>(null);

  // Separate storage for video frame and annotations
  const currentFrameRef = useRef<FrameData | null>(null);
  const annotationsRef = useRef<AnnotationData>({
    detections: [],
    trackedObjects: [],
    timestamp: 0
  });

  // OPTIMIZATION: Track render performance
  const lastRenderTime = useRef(0);
  const renderQueue = useRef<FrameData[]>([]);

  // Track latency for sync
  const [latencyMs, setLatencyMs] = useState(0);
  const timeOffsetRef = useRef(0);

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ detections: 0, tracks: 0 });

  const normalizedCameraId = String(cameraId);

  // OPTIMIZATION: Throttled render function
  const scheduleRender = useCallback(() => {
    if (!mountedRef.current || !isActiveRef.current) return;

    const now = performance.now();
    const minFrameTime = 1000 / targetFPS;

    if (now - lastRenderTime.current < minFrameTime) {
      // Skip this frame to maintain target FPS
      return;
    }

    lastRenderTime.current = now;
    requestAnimationFrame(() => drawFrameWithAnnotations());
  }, [targetFPS]);

  // OPTIMIZED: Draw frame and annotations together
  const drawFrameWithAnnotations = useCallback(() => {
    if (!canvasRef.current || !mountedRef.current || !currentFrameRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true // OPTIMIZATION: Better performance
    });
    if (!ctx) return;

    if (!imageRef.current) {
      imageRef.current = new Image();
    }

    const img = imageRef.current;
    const frameData = currentFrameRef.current;

    img.onload = () => {
      if (!mountedRef.current || !canvasRef.current) return;

      // OPTIMIZATION: Only resize if needed
      if (canvas.width !== img.width || canvas.height !== img.height) {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      // Draw video frame
      ctx.drawImage(img, 0, 0);

      // Draw annotations on top (only if enabled and fresh)
      if (renderDetections) {
        const annotations = annotationsRef.current;
        const annotationAge = Math.abs(annotations.timestamp - frameData.serverTime);
        const isAnnotationFresh = annotationAge < 500;

        if (isAnnotationFresh) {
          // OPTIMIZATION: Batch drawing operations
          ctx.save();

          // Draw detections
          ctx.globalAlpha = 1.0;
          annotations.detections.forEach((det) => {
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

          // Draw tracked objects
          annotations.trackedObjects.forEach((obj) => {
            const [x1, y1, x2, y2] = obj.bbox;

            // Draw bounding box
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 3;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

            // Draw centroid
            ctx.fillStyle = '#ff00ff';
            ctx.beginPath();
            ctx.arc(obj.centroid[0], obj.centroid[1], 5, 0, 2 * Math.PI);
            ctx.fill();

            // Draw tracking info
            const trackLabel = `ID: ${obj.track_id}`;
            const speedLabel = obj.speed_kmh
              ? `${obj.speed_kmh.toFixed(1)} km/h`
              : obj.speed_m_per_sec
                ? `${obj.speed_m_per_sec.toFixed(2)} m/s`
                : '';

            ctx.font = 'bold 14px Arial';
            const trackMetrics = ctx.measureText(trackLabel);
            const textHeight = 20;

            const boxWidth = Math.max(
              trackMetrics.width,
              speedLabel ? ctx.measureText(speedLabel).width : 0
            ) + 8;
            const boxHeight = textHeight * (speedLabel ? 2 : 1);

            ctx.fillStyle = 'rgba(255, 0, 255, 0.8)';
            ctx.fillRect(x1, y2 + 2, boxWidth, boxHeight);

            ctx.fillStyle = '#fff';
            ctx.fillText(trackLabel, x1 + 4, y2 + textHeight - 2);

            if (speedLabel) {
              ctx.font = '12px Arial';
              ctx.fillText(speedLabel, x1 + 4, y2 + textHeight * 2 - 2);
            }
          });

          ctx.restore();
        }
      }
    };

    // OPTIMIZATION: Reuse image src if it's the same
    const src = frameData.frame.startsWith('data:')
      ? frameData.frame
      : `data:image/jpeg;base64,${frameData.frame}`;

    if (img.src !== src) {
      img.src = src;
    }
  }, [renderDetections, normalizedCameraId]);

  // OPTIMIZED: Handle WebSocket messages
  const handleMessage = useCallback((data: any) => {
    if (!isActiveRef.current || !mountedRef.current || !isVisible) return;

    if (data.camera_id && String(data.camera_id) !== normalizedCameraId) {
      return;
    }

    const receiveTime = Date.now();
    const serverTime = data.timestamp || receiveTime;

    frameCountRef.current++;

    // Calculate latency
    const latency = receiveTime - serverTime;
    setLatencyMs(latency);

    // Update time offset with smoothing
    if (timeOffsetRef.current === 0) {
      timeOffsetRef.current = latency;
    } else {
      timeOffsetRef.current = timeOffsetRef.current * 0.9 + latency * 0.1;
    }

    setIsConnected(true);
    setError(null);
    onFrame?.(data);

    // Extract and store frame if present
    if (data.frame) {
      currentFrameRef.current = {
        frame: data.frame,
        timestamp: receiveTime,
        serverTime: serverTime
      };
    }

    // Extract detections
    const currentDetections: DetectionBox[] = [];
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

    // Extract tracked objects
    const trackedObjects: TrackedObject[] = [];
    if (data.results?.tracking?.tracked_objects) {
      Object.values(data.results.tracking.tracked_objects).forEach((obj: any) => {
        trackedObjects.push({
          track_id: obj.track_id,
          class_name: obj.class_name,
          bbox: obj.bbox,
          centroid: obj.centroid,
          confidence: obj.confidence,
          speed_kmh: obj.speed_kmh,
          speed_m_per_sec: obj.speed_m_per_sec
        });
      });
    }

    // Update annotations
    annotationsRef.current = {
      detections: currentDetections,
      trackedObjects: trackedObjects,
      timestamp: serverTime
    };

    // Update stats
    setStats({
      detections: currentDetections.length,
      tracks: trackedObjects.length
    });

    // OPTIMIZED: Schedule render instead of immediate draw
    if (data.frame) {
      scheduleRender();
    }
  }, [isVisible, normalizedCameraId, onFrame, renderDetections, scheduleRender]);

  useEffect(() => {
    if (!isVisible) {
      // OPTIMIZATION: Disconnect when not visible
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      isActiveRef.current = false;
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
    <Box sx={{ flex: 1, width: '100%', height: '100%', position: 'relative', backgroundColor: '#000' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: '#000',
          display: isConnected ? 'block' : 'none',
          imageRendering: 'crisp-edges' // OPTIMIZATION: Faster rendering
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
        <>
          <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: '4px 8px', borderRadius: '4px' }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#00ff00', animation: 'pulse 2s infinite', '@keyframes pulse': { '0%': { opacity: 1 }, '50%': { opacity: 0.5 }, '100%': { opacity: 1 } } }} />
            <Typography variant="caption" color="white">Live</Typography>
            {latencyMs > 0 && (
              <Typography
                variant="caption"
                sx={{
                  ml: 1,
                  color: latencyMs > 300 ? '#ff9800' : latencyMs > 500 ? '#f44336' : '#4caf50',
                  fontWeight: latencyMs > 300 ? 'bold' : 'normal'
                }}
              >
                {latencyMs}ms
              </Typography>
            )}
          </Box>

          {renderDetections && (stats.detections > 0 || stats.tracks > 0) && (
            <Box sx={{ position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}>
              <Typography variant="caption" sx={{ color: '#00ff00', display: 'block' }}>
                Detections: {stats.detections}
              </Typography>
              {stats.tracks > 0 && (
                <Typography variant="caption" sx={{ color: '#ff00ff', display: 'block' }}>
                  Tracks: {stats.tracks}
                </Typography>
              )}
            </Box>
          )}

          {latencyMs > 500 && (
            <Box sx={{
              position: 'absolute',
              top: 40,
              right: 8,
              backgroundColor: 'rgba(244, 67, 54, 0.9)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              ⚠️ High latency
            </Box>
          )}
        </>
      )}
    </Box>
  );
});

CameraFeed.displayName = 'CameraFeed';