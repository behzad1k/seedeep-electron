import { WebSocketPool } from "@utils/websocket/WebsocketPool.ts";
import { useRef, useEffect, useCallback, memo, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";

interface CameraFeedProps {
  cameraId: string | number;
  targetFPS?: number;
  onFrame?: (data: any) => void;
  onError?: (error: any) => void;
  isVisible?: boolean;
  renderDetections?: boolean;
  priority?: "high" | "normal" | "low";
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
  speed_kmh?: number;
  speed_m_per_sec?: number;
  distance_from_camera_m?: number;
  distance_from_camera_ft?: number;
}

export const CameraFeed = memo<CameraFeedProps>(
  ({
    cameraId,
    targetFPS = 20,
    onFrame,
    onError,
    isVisible = true,
    renderDetections = true,
    priority = "normal",
  }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const mountedRef = useRef(true);
    const imageRef = useRef<HTMLImageElement | null>(null);

    // Frame storage
    const pendingFrameRef = useRef<string | null>(null);
    const annotationsRef = useRef<{
      detections: DetectionBox[];
      trackedObjects: TrackedObject[];
    }>({
      detections: [],
      trackedObjects: [],
    });

    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({ detections: 0, tracks: 0 });
    const [latencyMs, setLatencyMs] = useState(0);

    const normalizedCameraId = String(cameraId);

    // Drawing function - simplified and direct
    const drawFrame = useCallback(() => {
      if (
        !canvasRef.current ||
        !mountedRef.current ||
        !pendingFrameRef.current
      ) {
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", {
        alpha: false,
        desynchronized: true,
      });

      if (!ctx) return;

      // Create image if needed
      if (!imageRef.current) {
        imageRef.current = new Image();
      }

      const img = imageRef.current;
      const frameData = pendingFrameRef.current;

      img.onload = () => {
        if (!mountedRef.current || !canvasRef.current) return;

        // Resize canvas if needed
        if (canvas.width !== img.width || canvas.height !== img.height) {
          canvas.width = img.width;
          canvas.height = img.height;
          console.log(
            `[CameraFeed ${normalizedCameraId}] Canvas resized to ${img.width}x${img.height}`,
          );
        }

        // Draw video frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        // Draw annotations (if enabled)
        if (renderDetections) {
          const annotations = annotationsRef.current;

          ctx.save();

          // Build tracked object map
          const trackedBBoxMap = new Map();
          annotations.trackedObjects.forEach((obj) => {
            const key = `${Math.round(obj.bbox[0])},${Math.round(obj.bbox[1])},${Math.round(obj.bbox[2])},${Math.round(obj.bbox[3])}`;
            trackedBBoxMap.set(key, obj);
          });

          // Draw detections (skip if tracked)
          annotations.detections.forEach((det) => {
            const detKey = `${Math.round(det.x1)},${Math.round(det.y1)},${Math.round(det.x2)},${Math.round(det.y2)}`;
            if (trackedBBoxMap.has(detKey)) return;

            // Simple detection box
            ctx.strokeStyle = "#00ff00";
            ctx.lineWidth = 2;
            ctx.strokeRect(det.x1, det.y1, det.x2 - det.x1, det.y2 - det.y1);

            // Label
            const label = `${det.label} ${(det.confidence * 100).toFixed(0)}%`;
            ctx.font = "bold 14px Arial";
            const textMetrics = ctx.measureText(label);

            ctx.fillStyle = "rgba(0, 255, 0, 0.9)";
            ctx.fillRect(det.x1, det.y1 - 20, textMetrics.width + 10, 20);

            ctx.fillStyle = "#000";
            ctx.fillText(label, det.x1 + 5, det.y1 - 5);
          });

          // Draw tracked objects
          annotations.trackedObjects.forEach((obj) => {
            const [x1, y1, x2, y2] = obj.bbox;

            // Bounding box
            ctx.strokeStyle = "#ff00ff";
            ctx.lineWidth = 3;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

            // Centroid
            ctx.fillStyle = "#ff00ff";
            ctx.beginPath();
            ctx.arc(obj.centroid[0], obj.centroid[1], 5, 0, 2 * Math.PI);
            ctx.fill();

            // Labels
            const labels = [];
            labels.push(`${obj.class_name} [${obj.track_id.slice(0, 8)}]`);

            if (obj.time_in_frame_seconds !== undefined) {
              labels.push(`Time: ${obj.time_in_frame_seconds.toFixed(1)}s`);
            }
            if (obj.speed_kmh) {
              labels.push(`Speed: ${obj.speed_kmh.toFixed(1)} km/h`);
            }
            if (obj.distance_from_camera_m !== undefined) {
              labels.push(
                `Distance: ${obj.distance_from_camera_m.toFixed(2)}m`,
              );
            }

            // Label background
            ctx.font = "bold 13px Arial";
            const maxWidth = Math.max(
              ...labels.map((l) => ctx.measureText(l).width),
            );
            const lineHeight = 18;
            const boxWidth = maxWidth + 12;
            const boxHeight = lineHeight * labels.length + 4;

            ctx.fillStyle = "rgba(255, 0, 255, 0.85)";
            ctx.fillRect(x1, y2 + 2, boxWidth, boxHeight);

            // Draw labels
            ctx.fillStyle = "#fff";
            labels.forEach((label, idx) => {
              ctx.fillText(label, x1 + 6, y2 + lineHeight * (idx + 1) - 2);
            });
          });

          ctx.restore();
        }
      };

      img.onerror = (e) => {
        console.error(
          `[CameraFeed ${normalizedCameraId}] Image load error:`,
          e,
        );
      };

      // Set image source
      const src = frameData.startsWith("data:")
        ? frameData
        : `data:image/jpeg;base64,${frameData}`;

      if (img.src !== src) {
        img.src = src;
      }
    }, [renderDetections, normalizedCameraId]);

    // Handle incoming WebSocket messages
    const handleMessage = useCallback(
      (data: any) => {
        if (!mountedRef.current || !isVisible) return;

        const receiveTime = Date.now();
        const serverTime = data.timestamp || receiveTime;

        // Calculate latency
        const latency = receiveTime - serverTime;
        setLatencyMs(latency);

        setIsConnected(true);
        setError(null);
        onFrame?.(data);

        // Store frame for drawing
        if (data.frame) {
          pendingFrameRef.current = data.frame;

          // Immediately draw the frame
          drawFrame();
        }

        // Extract detections
        const currentDetections: DetectionBox[] = [];
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

        // Extract tracked objects
        const trackedObjects: TrackedObject[] = [];
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
                speed_kmh: obj.speed_kmh,
                speed_m_per_sec: obj.speed_m_per_sec,
                distance_from_camera_m: obj.distance_from_camera_m,
                distance_from_camera_ft: obj.distance_from_camera_ft,
              });
            },
          );
        }

        // Update annotations
        annotationsRef.current = {
          detections: currentDetections,
          trackedObjects: trackedObjects,
        };

        // Update stats
        setStats({
          detections: currentDetections.length,
          tracks: trackedObjects.length,
        });
      },
      [isVisible, onFrame, renderDetections, drawFrame],
    );

    const handleError = useCallback(
      (err: any) => {
        if (!mountedRef.current) return;
        console.error(
          `[CameraFeed ${normalizedCameraId}] WebSocket error:`,
          err,
        );
        setIsConnected(false);
        setError("Connection error");
        onError?.(err);
      },
      [normalizedCameraId, onError],
    );

    // Subscribe to WebSocket on mount
    useEffect(() => {
      if (!isVisible) return;

      mountedRef.current = true;

      const pool = WebSocketPool.getInstance();

      console.log(
        `[CameraFeed ${normalizedCameraId}] Subscribing (priority: ${priority})`,
      );

      // Subscribe
      unsubscribeRef.current = pool.subscribe(
        normalizedCameraId,
        `feed-${normalizedCameraId}`,
        {
          onFrame: handleMessage,
          onError: handleError,
          priority: priority,
        },
      );

      // Get last frame if available
      const lastFrame = pool.getLastFrame(normalizedCameraId);
      if (lastFrame) {
        console.log(
          `[CameraFeed ${normalizedCameraId}] Loading last frame from cache`,
        );
        handleMessage(lastFrame);
      }

      return () => {
        console.log(`[CameraFeed ${normalizedCameraId}] Cleaning up`);
        mountedRef.current = false;

        if (imageRef.current) {
          imageRef.current.onload = null;
          imageRef.current.onerror = null;
          imageRef.current.src = "";
          imageRef.current = null;
        }

        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }

        pendingFrameRef.current = null;
      };
    }, [normalizedCameraId, isVisible, handleMessage, handleError, priority]);

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
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            backgroundColor: "#000",
            display: isConnected ? "block" : "none",
          }}
        />

        {!isConnected && !error && (
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
            <Typography variant="body2">Connecting...</Typography>
          </Box>
        )}

        {error && (
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
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          </Box>
        )}

        {isConnected && (
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
                  backgroundColor: "#00ff00",
                  animation: "pulse 2s infinite",
                  "@keyframes pulse": {
                    "0%": { opacity: 1 },
                    "50%": { opacity: 0.5 },
                    "100%": { opacity: 1 },
                  },
                }}
              />
              <Typography variant="caption" color="white">
                Live
              </Typography>
              {latencyMs > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    ml: 1,
                    color:
                      latencyMs > 300
                        ? "#ff9800"
                        : latencyMs > 500
                          ? "#f44336"
                          : "#4caf50",
                  }}
                >
                  {latencyMs}ms
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
                }}
              >
                <Typography variant="caption" sx={{ color: "#00ff00" }}>
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
              </Box>
            )}
          </>
        )}
      </Box>
    );
  },
);

CameraFeed.displayName = "CameraFeed";
