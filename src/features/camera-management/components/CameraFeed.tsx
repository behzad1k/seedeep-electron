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
  age: number;
  time_in_frame_seconds?: number;
  time_in_frame_frames?: number;
  speed_kmh?: number;
  speed_m_per_sec?: number;
  distance_from_camera_m?: number;
  distance_from_camera_ft?: number;
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
                                                   targetFPS = 20,
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

  const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null);
  const renderWorkerRef = useRef<Worker | null>(null);

  // Separate storage for video frame and annotations
  const currentFrameRef = useRef<FrameData | null>(null);
  const annotationsRef = useRef<AnnotationData>({
    detections: [],
    trackedObjects: [],
    timestamp: 0
  });

  // Track latency for sync
  const [latencyMs, setLatencyMs] = useState(0);
  const timeOffsetRef = useRef(0);

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ detections: 0, tracks: 0 });

  const normalizedCameraId = String(cameraId);

  // OPTIMIZED: Draw frame and annotations together
  const drawFrameWithAnnotations = useCallback(() => {
    if (!canvasRef.current || !mountedRef.current || !currentFrameRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    });

    if (!ctx) {
      return;
    }

    if (!imageRef.current) {
      imageRef.current = new Image();
    }

    const img = imageRef.current;
    const frameData = currentFrameRef.current;

    img.onload = () => {
      if (!mountedRef.current || !canvasRef.current) {
        return;
      }

      if (canvas.width !== img.width || canvas.height !== img.height) {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      // Draw video frame
      ctx.drawImage(img, 0, 0);

      // Draw annotations on top (only if enabled)
      if (renderDetections) {
        const annotations = annotationsRef.current;

        const annotationAge = Math.abs(annotations.timestamp - frameData.serverTime);
        const isAnnotationFresh = annotationAge < 2000;

        if (annotations.detections.length > 0 || annotations.trackedObjects.length > 0) {
          ctx.save();
          ctx.globalAlpha = 1.0;

          // Build a map of tracked objects by their bounding box
          const trackedBBoxMap = new Map();
          annotations.trackedObjects.forEach((obj) => {
            const key = `${Math.round(obj.bbox[0])},${Math.round(obj.bbox[1])},${Math.round(obj.bbox[2])},${Math.round(obj.bbox[3])}`;
            trackedBBoxMap.set(key, obj);
          });

          // Draw detections (but skip if they match a tracked object)
          annotations.detections.forEach((det) => {
            const detKey = `${Math.round(det.x1)},${Math.round(det.y1)},${Math.round(det.x2)},${Math.round(det.y2)}`;

            // Skip if this detection is also being tracked
            if (trackedBBoxMap.has(detKey)) {
              return;
            }

            // Draw simple detection box (green)
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            const boxWidth = det.x2 - det.x1;
            const boxHeight = det.y2 - det.y1;

            ctx.strokeRect(det.x1, det.y1, boxWidth, boxHeight);

            const label = `${det.label} ${(det.confidence * 100).toFixed(0)}%`;
            ctx.font = 'bold 14px Arial';
            const textMetrics = ctx.measureText(label);
            const textHeight = 20;

            ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
            ctx.fillRect(det.x1, det.y1 - textHeight, textMetrics.width + 10, textHeight);

            ctx.fillStyle = '#000';
            ctx.fillText(label, det.x1 + 5, det.y1 - 5);
          });

          // Draw tracked objects with ENHANCED labels
          annotations.trackedObjects.forEach((obj) => {
            const [x1, y1, x2, y2] = obj.bbox;

            // Draw bounding box (magenta for tracked)
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 3;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

            // Draw centroid
            ctx.fillStyle = '#ff00ff';
            ctx.beginPath();
            ctx.arc(obj.centroid[0], obj.centroid[1], 5, 0, 2 * Math.PI);
            ctx.fill();

            // Build comprehensive label
            const labels = [];

            // Line 1: Class name and ID
            labels.push(`${obj.class_name} [ID: ${obj.track_id}]`);

            // Line 2: Time in frame
            if (obj.time_in_frame_seconds !== undefined) {
              labels.push(`Time: ${obj.time_in_frame_seconds.toFixed(1)}s`);
            } else if (obj.age) {
              const seconds = (obj.age / 30).toFixed(1);
              labels.push(`Time: ${seconds}s`);
            }

            // Line 3: Speed (if available)
            if (obj.speed_kmh) {
              labels.push(`Speed: ${obj.speed_kmh.toFixed(1)} km/h`);
            } else if (obj.speed_m_per_sec) {
              labels.push(`Speed: ${obj.speed_m_per_sec.toFixed(2)} m/s`);
            }

            // Line 4: Distance (if available)
            if (obj.distance_from_camera_m !== undefined) {
              labels.push(`Distance: ${obj.distance_from_camera_m.toFixed(2)}m`);
            } else if (obj.distance_from_camera_ft !== undefined) {
              labels.push(`Distance: ${obj.distance_from_camera_ft.toFixed(2)}ft`);
            }

            // Calculate label box size
            ctx.font = 'bold 13px Arial';
            const maxWidth = Math.max(...labels.map(l => ctx.measureText(l).width));
            const lineHeight = 18;
            const boxWidth = maxWidth + 12;
            const boxHeight = lineHeight * labels.length + 4;

            // Draw label background
            ctx.fillStyle = 'rgba(255, 0, 255, 0.85)';
            ctx.fillRect(x1, y2 + 2, boxWidth, boxHeight);

            // Draw labels
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px Arial';
            labels.forEach((label, idx) => {
              ctx.fillText(label, x1 + 6, y2 + lineHeight * (idx + 1) - 2);
            });
          });

          ctx.restore();
        }
      }
    };

    // Reuse image src if it's the same
    const src = frameData.frame.startsWith('data:')
      ? frameData.frame
      : `data:image/jpeg;base64,${frameData.frame}`;

    if (img.src !== src) {
      img.src = src;
    }
  }, [renderDetections, normalizedCameraId]);

  const scheduleRender = useCallback(() => {
    if (!mountedRef.current || !isActiveRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      drawFrameWithAnnotations();
    });
  }, [normalizedCameraId, drawFrameWithAnnotations]);

  const handleMessage = useCallback((data: any) => {
    if (!isActiveRef.current || !mountedRef.current || !isVisible) {
      return;
    }

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

    // Extract detections from ALL models (excluding tracking)
    const currentDetections: DetectionBox[] = [];
    if (data.results) {
      if (renderDetections) {
        Object.entries(data.results).forEach(([modelName, modelResult]: [string, any]) => {
          if (modelName === 'tracking') {
            return;
          }

          if (modelResult && typeof modelResult === 'object') {
            if (Array.isArray(modelResult.detections)) {
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
          }
        });
      }
    }

    // Extract tracked objects with FULL data including distance
    const trackedObjects: TrackedObject[] = [];
    if (data.results?.tracking?.tracked_objects) {
      const trackingObjects = data.results.tracking.tracked_objects;
      Object.values(trackingObjects).forEach((obj: any) => {
        trackedObjects.push({
          track_id: obj.track_id,
          class_name: obj.class_name,
          bbox: obj.bbox,
          centroid: obj.centroid,
          confidence: obj.confidence,
          age: obj.age,
          time_in_frame_seconds: obj.time_in_frame_seconds,
          time_in_frame_frames: obj.time_in_frame_frames,
          speed_kmh: obj.speed_kmh,
          speed_m_per_sec: obj.speed_m_per_sec,
          distance_from_camera_m: obj.distance_from_camera_m,
          distance_from_camera_ft: obj.distance_from_camera_ft
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

    if (data.frame) {
      scheduleRender();
    }

  }, [isVisible, normalizedCameraId, onFrame, renderDetections, scheduleRender]);

  // CRITICAL FIX: Subscribe once on mount, manage with isActiveRef
  useEffect(() => {
    mountedRef.current = true;

    // CRITICAL FIX: Always subscribe on mount, control with isActiveRef
    const pool = WebSocketPool.getInstance();
    const cameraWsUrl = `${wsUrl.replace(/\/ws$/, '')}/ws/camera/${normalizedCameraId}`;

    // Set initial active state
    isActiveRef.current = isVisible;

    const timeoutId = setTimeout(() => {
      if (!mountedRef.current) {
        return;
      }

      console.log(`[CameraFeed ${normalizedCameraId}] Subscribing to WebSocket (visible: ${isVisible})`);

      unsubscribeRef.current = pool.subscribe(
        cameraWsUrl,
        normalizedCameraId,
        (data) => {
          handleMessage(data);
        },
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
      console.log(`[CameraFeed ${normalizedCameraId}] Cleaning up`);
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
  }, [normalizedCameraId, wsUrl, handleMessage, onError]);

  // CRITICAL FIX: Handle visibility changes without recreating connection
  useEffect(() => {
    console.log(`[CameraFeed ${normalizedCameraId}] Visibility changed to: ${isVisible}`);
    isActiveRef.current = isVisible;

    if (!isVisible) {
      setIsConnected(false);
      // Clear current frame when hidden
      currentFrameRef.current = null;
      annotationsRef.current = {
        detections: [],
        trackedObjects: [],
        timestamp: 0
      };
    }
  }, [isVisible, normalizedCameraId]);

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
          imageRendering: 'crisp-edges'
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