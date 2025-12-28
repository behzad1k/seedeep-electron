import { useRef, useEffect, useCallback, useState, memo } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";

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

interface AnnotationData {
  detections: DetectionBox[];
  trackedObjects: TrackedObject[];
  timestamp: number;
  serverTime: number;
}

class AnnotationQueue {
  private queue: AnnotationData[] = [];
  private maxSize = 30;

  add(annotation: AnnotationData) {
    this.queue.push(annotation);
    if (this.queue.length > this.maxSize) {
      this.queue.shift();
    }
    this.queue.sort((a, b) => a.serverTime - b.serverTime);
  }

  getForTimestamp(currentTime: number): AnnotationData | null {
    if (this.queue.length === 0) return null;
    const tolerance = 500;
    let closest: AnnotationData | null = null;
    let minDiff = Infinity;

    for (const annotation of this.queue) {
      const diff = Math.abs(annotation.serverTime - currentTime);
      if (diff < minDiff && diff < tolerance) {
        minDiff = diff;
        closest = annotation;
      }
    }
    return closest;
  }

  clear() {
    this.queue = [];
  }

  getSize(): number {
    return this.queue.length;
  }
}

export const CameraFeed = memo<CameraFeedProps>(
  ({
    cameraId,
    wsUrl = "ws://localhost:8000",
    targetFPS = 20,
    onFrame,
    onError,
    isVisible = true,
    renderDetections = true,
  }) => {
    const videoCanvasRef = useRef<HTMLCanvasElement>(null);
    const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const mountedRef = useRef(true);
    const streamAbortControllerRef = useRef<AbortController | null>(null);

    const annotationQueueRef = useRef(new AnnotationQueue());
    const [isConnected, setIsConnected] = useState(false);
    const [isStreamActive, setIsStreamActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({
      detections: 0,
      tracks: 0,
      latency: 0,
      queueSize: 0,
      fps: 0,
    });

    const normalizedCameraId = String(cameraId);
    const lastFrameTimeRef = useRef<number>(0);
    const frameCountRef = useRef<number>(0);

    // Connect to WebSocket for annotations
    const connectWebSocket = useCallback(() => {
      const wsFullUrl = `${wsUrl}/ws/camera/${normalizedCameraId}`;
      console.log(
        `[CameraFeed ${normalizedCameraId}] Connecting to WebSocket:`,
        wsFullUrl,
      );

      const ws = new WebSocket(wsFullUrl);

      ws.onopen = () => {
        console.log(`[CameraFeed ${normalizedCameraId}] WebSocket connected`);
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          const currentDetections: DetectionBox[] = [];
          const trackedObjects: TrackedObject[] = [];

          if (data.results && renderDetections) {
            Object.entries(data.results).forEach(
              ([modelName, modelResult]: [string, any]) => {
                if (modelName === "tracking") return;

                if (modelResult && Array.isArray(modelResult.detections)) {
                  modelResult.detections.forEach((det: any) => {
                    currentDetections.push({
                      x1: det.x1,
                      y1: det.y1,
                      x2: det.x2,
                      y2: det.y2,
                      confidence: det.confidence,
                      label: det.label,
                    });
                  });
                }
              },
            );
          }

          if (data.results?.tracking?.tracked_objects) {
            Object.values(data.results.tracking.tracked_objects).forEach(
              (obj: any) => {
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
                  distance_from_camera_ft: obj.distance_from_camera_ft,
                });
              },
            );
          }

          annotationQueueRef.current.add({
            detections: currentDetections,
            trackedObjects: trackedObjects,
            timestamp: Date.now(),
            serverTime: data.timestamp || Date.now(),
          });

          setStats({
            detections: currentDetections.length,
            tracks: trackedObjects.length,
            latency: Date.now() - (data.timestamp || Date.now()),
            queueSize: annotationQueueRef.current.getSize(),
            fps: stats.fps,
          });

          onFrame?.(data);
        } catch (err) {
          console.error(
            `[CameraFeed ${normalizedCameraId}] Error parsing WebSocket message:`,
            err,
          );
        }
      };

      ws.onerror = (err) => {
        console.error(
          `[CameraFeed ${normalizedCameraId}] WebSocket error:`,
          err,
        );
        setIsConnected(false);
        onError?.(err);
      };

      ws.onclose = () => {
        console.log(`[CameraFeed ${normalizedCameraId}] WebSocket closed`);
        setIsConnected(false);
      };

      wsRef.current = ws;
    }, [
      normalizedCameraId,
      wsUrl,
      renderDetections,
      onFrame,
      onError,
      stats.fps,
    ]);

    // Start authenticated MJPEG stream
    const startAuthenticatedMJPEGStream = useCallback(
      async (url: string, username: string, password: string) => {
        if (!videoCanvasRef.current || !mountedRef.current) return;

        const canvas = videoCanvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          console.error(
            `[CameraFeed ${normalizedCameraId}] Failed to get canvas context`,
          );
          return;
        }

        console.log(
          `[CameraFeed ${normalizedCameraId}] Starting MJPEG stream from:`,
          url,
          password,
        );

        try {
          // Create abort controller for this stream
          streamAbortControllerRef.current = new AbortController();

          // Create Basic Auth header
          const credentials = btoa(`${username}:${password}`);

          const response = await fetch(url, {
            headers: {
              Authorization: `Basic ${credentials}`,
              Accept: "multipart/x-mixed-replace, image/jpeg",
            },
            signal: streamAbortControllerRef.current.signal,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          console.log(
            `[CameraFeed ${normalizedCameraId}] Stream connected, status: ${response.status}`,
          );
          console.log(
            `[CameraFeed ${normalizedCameraId}] Content-Type:`,
            response.headers.get("content-type"),
          );

          setIsStreamActive(true);
          setError(null);

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("Cannot read stream");
          }

          let buffer = new Uint8Array(0);
          let frameCount = 0;
          let lastFpsUpdate = Date.now();

          // Read MJPEG stream
          while (mountedRef.current) {
            const { done, value } = await reader.read();

            if (done) {
              console.log(`[CameraFeed ${normalizedCameraId}] Stream ended`);
              break;
            }

            // Append new data to buffer
            const newBuffer = new Uint8Array(buffer.length + value.length);
            newBuffer.set(buffer);
            newBuffer.set(value, buffer.length);
            buffer = newBuffer;

            // Look for JPEG image boundaries (FFD8 = start, FFD9 = end)
            let startIndex = -1;
            let endIndex = -1;

            // Find JPEG start (0xFF 0xD8)
            for (let i = 0; i < buffer.length - 1; i++) {
              if (buffer[i] === 0xff && buffer[i + 1] === 0xd8) {
                startIndex = i;
                break;
              }
            }

            // Find JPEG end (0xFF 0xD9)
            if (startIndex !== -1) {
              for (let i = startIndex + 2; i < buffer.length - 1; i++) {
                if (buffer[i] === 0xff && buffer[i + 1] === 0xd9) {
                  endIndex = i + 2;
                  break;
                }
              }
            }

            // If we have a complete JPEG frame
            if (startIndex !== -1 && endIndex !== -1) {
              const jpegData = buffer.slice(startIndex, endIndex);

              // Convert to blob and create image
              const blob = new Blob([jpegData], { type: "image/jpeg" });
              const imageUrl = URL.createObjectURL(blob);

              const img = new Image();
              img.onload = () => {
                if (!mountedRef.current || !videoCanvasRef.current || !ctx) {
                  URL.revokeObjectURL(imageUrl);
                  return;
                }

                // Set canvas size to match image (only on first frame or size change)
                if (
                  canvas.width !== img.width ||
                  canvas.height !== img.height
                ) {
                  canvas.width = img.width;
                  canvas.height = img.height;
                  console.log(
                    `[CameraFeed ${normalizedCameraId}] Canvas size set to ${img.width}x${img.height}`,
                  );

                  // Also update annotation canvas size
                  if (annotationCanvasRef.current) {
                    annotationCanvasRef.current.width = img.width;
                    annotationCanvasRef.current.height = img.height;
                  }
                }

                // Draw image to canvas
                ctx.drawImage(img, 0, 0);

                // Update FPS counter
                frameCount++;
                const now = Date.now();
                if (now - lastFpsUpdate >= 1000) {
                  const fps = frameCount / ((now - lastFpsUpdate) / 1000);
                  setStats((prev) => ({ ...prev, fps: Math.round(fps) }));
                  frameCount = 0;
                  lastFpsUpdate = now;
                }

                // Clean up
                URL.revokeObjectURL(imageUrl);
              };

              img.onerror = () => {
                console.error(
                  `[CameraFeed ${normalizedCameraId}] Failed to load JPEG frame`,
                );
                URL.revokeObjectURL(imageUrl);
              };

              img.src = imageUrl;

              // Remove processed frame from buffer
              buffer = buffer.slice(endIndex);
            }

            // Prevent buffer from growing too large
            if (buffer.length > 1024 * 1024) {
              // 1MB
              console.warn(
                `[CameraFeed ${normalizedCameraId}] Buffer too large, clearing...`,
              );
              buffer = new Uint8Array(0);
            }
          }

          console.log(
            `[CameraFeed ${normalizedCameraId}] Stream reading loop ended`,
          );
          setIsStreamActive(false);
        } catch (err: any) {
          if (err.name === "AbortError") {
            console.log(`[CameraFeed ${normalizedCameraId}] Stream aborted`);
          } else {
            console.error(
              `[CameraFeed ${normalizedCameraId}] Stream error:`,
              err,
            );
            setError(`Stream error: ${err.message}`);
            setIsStreamActive(false);
          }
        }
      },
      [normalizedCameraId],
    );

    // Draw annotations on top of video
    const drawAnnotations = useCallback(() => {
      if (
        !annotationCanvasRef.current ||
        !videoCanvasRef.current ||
        !mountedRef.current
      ) {
        return;
      }

      const canvas = annotationCanvasRef.current;
      const videoCanvas = videoCanvasRef.current;
      const ctx = canvas.getContext("2d", { alpha: true });

      if (!ctx) return;

      // Match video canvas size
      if (
        canvas.width !== videoCanvas.width ||
        canvas.height !== videoCanvas.height
      ) {
        canvas.width = videoCanvas.width;
        canvas.height = videoCanvas.height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const videoCurrentTime = Date.now();
      const annotation =
        annotationQueueRef.current.getForTimestamp(videoCurrentTime);

      if (!annotation) {
        animationFrameRef.current = requestAnimationFrame(drawAnnotations);
        return;
      }

      // Draw detections
      if (annotation.detections.length > 0) {
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 2;
        ctx.font = "bold 14px Arial";

        annotation.detections.forEach((det) => {
          const width = det.x2 - det.x1;
          const height = det.y2 - det.y1;

          ctx.strokeRect(det.x1, det.y1, width, height);

          const label = `${det.label} ${(det.confidence * 100).toFixed(0)}%`;
          const textMetrics = ctx.measureText(label);
          const textHeight = 20;

          ctx.fillStyle = "rgba(0, 255, 0, 0.9)";
          ctx.fillRect(
            det.x1,
            det.y1 - textHeight,
            textMetrics.width + 10,
            textHeight,
          );

          ctx.fillStyle = "#000";
          ctx.fillText(label, det.x1 + 5, det.y1 - 5);
        });
      }

      // Draw tracked objects
      if (annotation.trackedObjects.length > 0) {
        annotation.trackedObjects.forEach((obj) => {
          const [x1, y1, x2, y2] = obj.bbox;

          ctx.strokeStyle = "#ff00ff";
          ctx.lineWidth = 3;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

          ctx.fillStyle = "#ff00ff";
          ctx.beginPath();
          ctx.arc(obj.centroid[0], obj.centroid[1], 5, 0, 2 * Math.PI);
          ctx.fill();

          const labels = [];
          labels.push(`${obj.class_name} [ID: ${obj.track_id}]`);

          if (obj.time_in_frame_seconds !== undefined) {
            labels.push(`Time: ${obj.time_in_frame_seconds.toFixed(1)}s`);
          }

          if (obj.speed_kmh) {
            labels.push(`Speed: ${obj.speed_kmh.toFixed(1)} km/h`);
          }

          if (obj.distance_from_camera_m !== undefined) {
            labels.push(`Distance: ${obj.distance_from_camera_m.toFixed(2)}m`);
          }

          ctx.font = "bold 13px Arial";
          const maxWidth = Math.max(
            ...labels.map((l) => ctx.measureText(l).width),
          );
          const lineHeight = 18;
          const boxWidth = maxWidth + 12;
          const boxHeight = lineHeight * labels.length + 4;

          ctx.fillStyle = "rgba(255, 0, 255, 0.85)";
          ctx.fillRect(x1, y2 + 2, boxWidth, boxHeight);

          ctx.fillStyle = "#fff";
          ctx.font = "bold 13px Arial";
          labels.forEach((label, idx) => {
            ctx.fillText(label, x1 + 6, y2 + lineHeight * (idx + 1) - 2);
          });
        });
      }

      animationFrameRef.current = requestAnimationFrame(drawAnnotations);
    }, [normalizedCameraId]);

    // Initialize camera
    useEffect(() => {
      mountedRef.current = true;

      const initializeCamera = async () => {
        try {
          console.log(
            `[CameraFeed ${normalizedCameraId}] Initializing camera...`,
          );

          const response = await fetch(
            `http://localhost:8000/api/v1/cameras/${normalizedCameraId}`,
          );
          if (!response.ok) {
            throw new Error("Failed to fetch camera info");
          }

          const camera = await response.json();

          if (!camera.rtsp_url) {
            setError("No stream URL configured for camera");
            return;
          }

          console.log(
            `[CameraFeed ${normalizedCameraId}] Camera config:`,
            camera,
          );
          console.log(
            `[CameraFeed ${normalizedCameraId}] Stream URL:`,
            camera.rtsp_url,
          );

          // Parse credentials from URL
          const urlObj = new URL(camera.rtsp_url);
          const username = urlObj.username || "admin";
          const password = urlObj.password || "";

          // Build URL without credentials
          const cleanUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}${urlObj.search}`;

          console.log(
            `[CameraFeed ${normalizedCameraId}] Clean URL:`,
            cleanUrl,
          );
          console.log(`[CameraFeed ${normalizedCameraId}] Username:`, username);
          console.log(
            `[CameraFeed ${normalizedCameraId}] Password length:`,
            password.length,
          );

          // Start the MJPEG stream with authentication
          startAuthenticatedMJPEGStream(cleanUrl, username, password);

          // Connect WebSocket for annotations
          connectWebSocket();

          // Start drawing annotations
          drawAnnotations();
        } catch (err: any) {
          console.error(
            `[CameraFeed ${normalizedCameraId}] Initialization error:`,
            err,
          );
          setError(err.message);
          onError?.(err);
        }
      };

      if (isVisible) {
        initializeCamera();
      }

      return () => {
        console.log(`[CameraFeed ${normalizedCameraId}] Cleaning up`);
        mountedRef.current = false;

        // Stop MJPEG stream
        if (streamAbortControllerRef.current) {
          streamAbortControllerRef.current.abort();
          streamAbortControllerRef.current = null;
        }

        // Stop animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        // Close WebSocket
        if (wsRef.current) {
          wsRef.current.close();
        }

        annotationQueueRef.current.clear();
        setIsStreamActive(false);
      };
    }, [
      normalizedCameraId,
      isVisible,
      startAuthenticatedMJPEGStream,
      connectWebSocket,
      drawAnnotations,
      onError,
    ]);

    if (!isVisible) return null;

    return (
      <Box
        sx={{
          flex: 1,
          width: "100%",
          height: "100%",
          position: "relative",
          backgroundColor: "#000",
        }}
      >
        {/* Canvas for video stream */}
        <canvas
          ref={videoCanvasRef}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            backgroundColor: "#000",
          }}
        />

        {/* Canvas for annotations (overlay) */}
        <canvas
          ref={annotationCanvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />

        {/* Loading */}
        {!isStreamActive && !error && (
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              color: "white",
            }}
          >
            <CircularProgress color="primary" size={40} sx={{ mb: 2 }} />
            <Typography variant="body2">Connecting to camera...</Typography>
            <Typography
              variant="caption"
              sx={{ mt: 1, display: "block", color: "#888" }}
            >
              Camera ID: {normalizedCameraId}
            </Typography>
          </Box>
        )}

        {/* Error */}
        {error && (
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              color: "white",
              maxWidth: "80%",
              backgroundColor: "rgba(0,0,0,0.8)",
              padding: "20px",
              borderRadius: "8px",
            }}
          >
            <Typography
              variant="body1"
              color="error"
              sx={{ mb: 1, fontWeight: "bold" }}
            >
              Stream Error
            </Typography>
            <Typography variant="body2" color="error">
              {error}
            </Typography>
            <Typography
              variant="caption"
              sx={{ mt: 2, display: "block", color: "#888" }}
            >
              Check camera credentials, network connectivity, and camera
              settings
            </Typography>
          </Box>
        )}

        {/* Stats overlay */}
        {isStreamActive && (
          <>
            <Box
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                display: "flex",
                alignItems: "center",
                gap: 1,
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                padding: "4px 8px",
                borderRadius: "4px",
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: isConnected ? "#00ff00" : "#ff9800",
                  animation: "pulse 2s infinite",
                  "@keyframes pulse": {
                    "0%": { opacity: 1 },
                    "50%": { opacity: 0.5 },
                    "100%": { opacity: 1 },
                  },
                }}
              />
              <Typography variant="caption" color="white">
                {isConnected ? "Live" : "Connecting"}
              </Typography>
              {stats.fps > 0 && (
                <Typography variant="caption" sx={{ ml: 1, color: "#4caf50" }}>
                  {stats.fps} FPS
                </Typography>
              )}
              {stats.latency > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    ml: 1,
                    color:
                      stats.latency > 500
                        ? "#f44336"
                        : stats.latency > 300
                          ? "#ff9800"
                          : "#4caf50",
                    fontWeight: stats.latency > 300 ? "bold" : "normal",
                  }}
                >
                  {stats.latency}ms
                </Typography>
              )}
            </Box>

            {renderDetections && (stats.detections > 0 || stats.tracks > 0) && (
              <Box
                sx={{
                  position: "absolute",
                  bottom: 8,
                  left: 8,
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: "#00ff00", display: "block" }}
                >
                  Detections: {stats.detections}
                </Typography>
                {stats.tracks > 0 && (
                  <Typography
                    variant="caption"
                    sx={{ color: "#ff00ff", display: "block" }}
                  >
                    Tracks: {stats.tracks}
                  </Typography>
                )}
                <Typography
                  variant="caption"
                  sx={{ color: "#888", display: "block" }}
                >
                  Queue: {stats.queueSize}
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>
    );
  },
);

CameraFeed.displayName = "CameraFeed";
