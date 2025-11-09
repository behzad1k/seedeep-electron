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
  const videoRef = useRef<HTMLVideoElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isActiveRef = useRef(true);
  const frameCountRef = useRef(0);
  const mountedRef = useRef(true);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const sendFrameIntervalRef = useRef<any | null>(null);

  const [detections, setDetections] = useState<DetectionBox[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWebcamMode, setIsWebcamMode] = useState(false);
  const [webcamStarted, setWebcamStarted] = useState(false);

  const normalizedCameraId = String(cameraId);

  // Handle WebSocket messages
  const handleMessage = useCallback((data: any) => {
    if (!isActiveRef.current || !mountedRef.current || !isVisible) return;

    // Webcam mode detection
    if (data.status === 'connected' && data.message?.includes('Webcam mode')) {
      console.log('[CameraFeed] Webcam mode detected');
      setIsWebcamMode(true);
      setIsConnected(true);
      return;
    }

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

    if (data.frame) {
      setLastFrame(data.frame);
    }

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
  }, [isVisible, normalizedCameraId, onFrame, renderDetections]);

  // Start webcam and send frames
  const startWebcamStream = useCallback(async () => {
    if (webcamStarted) {
      console.log('[CameraFeed] Webcam already started');
      return;
    }

    try {
      console.log('[CameraFeed] Starting webcam...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      webcamStreamRef.current = stream;
      setWebcamStarted(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
          if (!videoRef.current) return;

          videoRef.current.play()
          .then(() => {
            console.log('✅ Webcam started');

            const frameInterval = 1000 / targetFPS;

            sendFrameIntervalRef.current = setInterval(async () => {
              if (!videoRef.current || !isActiveRef.current) return;

              const canvas = document.createElement('canvas');
              canvas.width = videoRef.current.videoWidth;
              canvas.height = videoRef.current.videoHeight;
              const ctx = canvas.getContext('2d');

              if (ctx && videoRef.current.videoWidth > 0) {
                ctx.drawImage(videoRef.current, 0, 0);

                canvas.toBlob(async (blob) => {
                  if (!blob) return;

                  try {
                    const timestamp = Math.floor(Date.now() / 1000);
                    const cameraIdBytes = new TextEncoder().encode(normalizedCameraId);
                    const imageBuffer = await blob.arrayBuffer();

                    const headerSize = 1 + cameraIdBytes.length + 4;
                    const totalSize = headerSize + imageBuffer.byteLength;

                    const buffer = new ArrayBuffer(totalSize);
                    const view = new DataView(buffer);
                    const uint8View = new Uint8Array(buffer);

                    let offset = 0;

                    view.setUint8(offset, cameraIdBytes.length);
                    offset += 1;

                    uint8View.set(cameraIdBytes, offset);
                    offset += cameraIdBytes.length;

                    view.setUint32(offset, timestamp, true);
                    offset += 4;

                    uint8View.set(new Uint8Array(imageBuffer), offset);

                    // OPTION 1: Use WebSocketPool's sendBinaryFrame (if available)
                    const pool = WebSocketPool.getInstance();
                    const cameraWsUrl = `${wsUrl.replace(/\/ws$/, '')}/ws/camera/${normalizedCameraId}`;

                    // Try the new method if it exists
                    if (typeof (pool as any).sendRawBinary === 'function') {
                      (pool as any).sendRawBinary(cameraWsUrl, buffer);
                    } else {
                      // Fallback: use sendBinaryFrame
                      pool.sendBinaryFrame(cameraWsUrl, {
                        cameraId: normalizedCameraId,
                        timestamp,
                        imageData: imageBuffer
                      });
                    }
                  } catch (err) {
                    console.error('[CameraFeed] Error sending frame:', err);
                  }
                }, 'image/jpeg', 0.7);
              }
            }, frameInterval);

            console.log(`✅ Sending webcam frames every ${frameInterval}ms`);
          })
          .catch(err => {
            console.error('Play error:', err);
            setError('Failed to play video: ' + err.message);
          });
        };
      }
    } catch (error: any) {
      console.error('Webcam error:', error);
      setError(error.message || 'Failed to access webcam');
      onError?.(error);
    }
  }, [webcamStarted, normalizedCameraId, targetFPS, wsUrl, onError]);

  // Stop webcam
  const stopWebcamStream = useCallback(() => {
    if (sendFrameIntervalRef.current) {
      clearInterval(sendFrameIntervalRef.current);
      sendFrameIntervalRef.current = null;
    }

    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => track.stop());
      webcamStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setWebcamStarted(false);
    console.log('[CameraFeed] Webcam stopped');
  }, []);

  // Initialize WebSocket
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

      stopWebcamStream();

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [normalizedCameraId, wsUrl, isVisible, handleMessage, onError, stopWebcamStream]);

  // Start webcam when mode detected
  useEffect(() => {
    if (isWebcamMode && isConnected && !webcamStarted) {
      startWebcamStream();
    }

    return () => {
      if (isWebcamMode) {
        stopWebcamStream();
      }
    };
  }, [isWebcamMode, isConnected, webcamStarted, startWebcamStream, stopWebcamStream]);

  // Draw frame and detections
  useEffect(() => {
    if (!canvasRef.current || !lastFrame) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      if (!mountedRef.current) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      if (renderDetections && detections.length > 0) {
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
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        autoPlay
        playsInline
        muted
      />

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
          <Typography variant="body2">Connecting...</Typography>
        </Box>
      )}

      {isConnected && !lastFrame && !error && !webcamStarted && (
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: 'white' }}>
          <CircularProgress color="primary" size={40} sx={{ mb: 2 }} />
          <Typography variant="body2">
            {isWebcamMode ? 'Starting webcam...' : 'Waiting for stream...'}
          </Typography>
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
          <Typography variant="caption" color="white">
            Live{isWebcamMode && ' (Webcam)'}
          </Typography>
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