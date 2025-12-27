// ============================================
// FRONTEND - CameraDetailSidebar.tsx
// With ALL THREE CALIBRATION METHODS
// ============================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { WebSocketPool } from "@utils/websocket/WebsocketPool.ts";
import {
  Drawer,
  Box,
  Tabs,
  Tab,
  Typography,
  IconButton,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormGroup,
  Alert,
  Chip,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  CircularProgress,
  Card,
  CardContent,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Close,
  Info,
  Speed,
  Timeline,
  Straighten,
  Article,
  ExpandMore,
  Save,
  Delete,
  Visibility,
  Tune,
  CameraAlt,
  Refresh,
  Settings,
  VolumeUp,
  VolumeOff,
  Notifications,
  NotificationsOff,
  FlashOn,
  FlashOff,
  CameraEnhance,
  Bookmark,
  BookmarkBorder,
  MyLocation,
  Email,
} from "@mui/icons-material";
import { useTheme } from "@/contexts/ThemeContext";
import { BackendCamera } from "@shared/types";
import { MODEL_DEFINITIONS } from "@utils/models/modelDefinitions";

interface CameraDetailSidebarProps {
  open: boolean;
  camera: BackendCamera | null;
  onClose: () => void;
  onUpdate: (cameraId: string, updates: any) => Promise<void>;
  onDelete: (cameraId: string) => Promise<void>;
  onCalibrate: (cameraId: string, data: any) => Promise<void>;
  embedded?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface CalibrationPoint {
  pixel_x: number;
  pixel_y: number;
  real_x: number;
  real_y: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ height: "100%" }}>
    {value === index && (
      <Box sx={{ p: 3, height: "100%", overflow: "auto" }}>{children}</Box>
    )}
  </div>
);

// Build ALL_CLASSES from MODEL_DEFINITIONS
const ALL_CLASSES: Record<string, string> = {};
Object.entries(MODEL_DEFINITIONS).forEach(([modelName, definition]) => {
  definition.classes.forEach((className) => {
    ALL_CLASSES[className] = modelName;
  });
});

// Group classes by model
const CLASSES_BY_MODEL: Record<string, string[]> = {};
Object.entries(MODEL_DEFINITIONS).forEach(([modelName, definition]) => {
  CLASSES_BY_MODEL[modelName] = definition.classes;
});

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const getCategoryStats = (data: any) => {
  const stats = {
    detection: { total: 0, byModel: {} as Record<string, number> },
    tracking: { total: 0, active: 0, objects: [] as any[] },
    speed: [] as any[],
    distance: [] as any[],
    performance: { latency: 0, fps: 0 },
  };

  if (!data.results) return stats;

  // Detection stats
  Object.entries(data.results).forEach(([key, value]: [string, any]) => {
    if (key !== "tracking" && value.count !== undefined) {
      stats.detection.total += value.count;
      stats.detection.byModel[key] = value.count;
    }
  });

  // Tracking stats
  if (data.results.tracking) {
    const tracking = data.results.tracking;
    stats.tracking.total = tracking.summary?.total_tracks || 0;
    stats.tracking.active = tracking.summary?.active_tracks || 0;

    if (tracking.tracked_objects) {
      Object.values(tracking.tracked_objects).forEach((obj: any) => {
        stats.tracking.objects.push({
          id: obj.track_id,
          class: obj.class_name,
          time: obj.time_in_frame_seconds,
          confidence: obj.confidence,
        });

        // Speed stats
        if (obj.speed_kmh !== undefined || obj.speed_m_per_sec !== undefined) {
          stats.speed.push({
            id: obj.track_id,
            class: obj.class_name,
            speed_kmh: obj.speed_kmh,
            speed_ms: obj.speed_m_per_sec,
          });
        }

        // Distance stats
        if (obj.distance_from_camera_m !== undefined) {
          stats.distance.push({
            id: obj.track_id,
            class: obj.class_name,
            distance_m: obj.distance_from_camera_m,
            distance_ft: obj.distance_from_camera_ft,
            position: obj.position_meters,
          });
        }
      });
    }
  }

  return stats;
};

export const CameraDetailSidebar: React.FC<CameraDetailSidebarProps> = ({
  open,
  camera,
  onClose,
  onUpdate,
  onDelete,
  onCalibrate,
  embedded = false,
}) => {
  const { darkMode } = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [currentFrame, setCurrentFrame] = useState<any>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Calibration state
  const [calibrationMode, setCalibrationMode] = useState<
    "reference_object" | "perspective" | "vanishing_point"
  >("reference_object");
  const [calibrationPoints, setCalibrationPoints] = useState<
    CalibrationPoint[]
  >([]);
  const [calibrationFrame, setCalibrationFrame] = useState<string | null>(null);
  const [loadingFrame, setLoadingFrame] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [referenceDistance, setReferenceDistance] = useState("");
  const [referenceHeight, setReferenceHeight] = useState("");
  const [perspectiveWidth, setPerspectiveWidth] = useState("");
  const [perspectiveHeight, setPerspectiveHeight] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [trackingAlerts, setTrackingAlerts] = useState<
    Record<
      string,
      { enabled: boolean; threshold: number; condition: "over" | "under" }
    >
  >({});
  const [speedAlerts, setSpeedAlerts] = useState<
    Record<
      string,
      { enabled: boolean; threshold: number; condition: "over" | "under" }
    >
  >({});
  const [distanceAlerts, setDistanceAlerts] = useState<
    Record<
      string,
      { enabled: boolean; threshold: number; condition: "over" | "under" }
    >
  >({});

  // Device Control state
  const [currentVelocity, setCurrentVelocity] = useState({ pan: 0, tilt: 0 });
  const moveIntervalRef = useRef<any>(null);
  const lastMoveCommandRef = useRef<{ pan: number; tilt: number }>({
    pan: 0,
    tilt: 0,
  });
  const currentVelocityRef = useRef({ pan: 0, tilt: 0 });
  const isMovingRef = useRef(false);

  const [deviceCapabilities, setDeviceCapabilities] = useState<any>(null);
  const [ptzPosition, setPtzPosition] = useState<any>(null);
  const [presets, setPresets] = useState<any[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [warningActive, setWarningActive] = useState({
    flash: false,
    siren: false,
  });
  const [snapshotData, setSnapshotData] = useState<string | null>(null);
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [ptzMoving, setPtzMoving] = useState(false);
  const [currentDirection, setCurrentDirection] = useState<string>("");
  const moveTimeoutRef = useRef<any | null>(null);

  useEffect(() => {
    if (camera) {
      console.log(camera);
      setFormData({
        name: camera.name,
        location: camera.location || "",
        rtsp_url: camera.rtsp_url || "",
        fps: camera.fps || 15,
        features: camera.features || {},
        active_models: camera.active_models || [],
        tracking_classes: camera.features?.tracking_classes || [],
        speed_classes: camera.features?.speed_classes || [],
        distance_classes: camera.features?.distance_classes || [],
        detection_classes: camera.features?.detection_classes || [],
        alert_email: camera.alert_email,
      });
    }
  }, [camera]);

  useEffect(() => {
    if (!camera) return;

    const loadAlertConfig = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/v1/alerts/${camera.id}/config`,
        );
        const config = await response.json();

        // Build alert state from config
        const tracking = {};
        config.tracking_alerts?.forEach((alert: any) => {
          // @ts-ignore
          tracking[alert.object_class] = {
            enabled: alert.enabled,
            threshold: alert.threshold_seconds,
            condition: alert.condition,
          };
        });
        setTrackingAlerts(tracking);

        // Similar for speed and distance...
      } catch (error) {
        console.error("Error loading alert config:", error);
      }
    };

    loadAlertConfig();
  }, [camera?.id]);

  // Subscribe to WebSocket for logs
  useEffect(() => {
    if (!camera) return;

    const pool = WebSocketPool.getInstance();
    const wsUrl = `ws://localhost:8000/ws/camera/${camera.id}`;

    unsubscribeRef.current = pool.subscribe(
      wsUrl,
      `sidebar-${camera.id}`,
      (data) => {
        setCurrentFrame(data);
        setLogs((prev) => [
          {
            timestamp: new Date(),
            data: data,
          },
          ...prev.slice(0, 49),
        ]);
      },
      (err) => {
        console.error("[CameraDetailSidebar] WebSocket error:", err);
      },
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [camera?.id]);

  const handleSave = async () => {
    if (!camera) return;
    setSaving(true);
    try {
      console.log(formData);
      await onUpdate(camera.id, {
        name: formData.name,
        location: formData.location,
        rtsp_url: formData.rtsp_url,
        alert_email: formData.alert_email,
        email_enabled: formData.email_enabled,
        cooldown_seconds: formData.cooldown_seconds,
        fps: formData.fps,
        features: {
          ...formData.features,
          tracking_classes: formData.tracking_classes,
          speed_classes: formData.speed_classes,
          distance_classes: formData.distance_classes,
          detection_classes: formData.detection_classes,
        },
        active_models: formData.active_models,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!camera || !confirm("Delete this camera?")) return;
    await onDelete(camera.id);
    onClose();
  };

  const handleClassToggle = (
    type:
      | "tracking_classes"
      | "speed_classes"
      | "distance_classes"
      | "detection_classes",
    className: string,
  ) => {
    setFormData((prev: any) => ({
      ...prev,
      [type]: prev[type]?.includes(className)
        ? prev[type].filter((c: string) => c !== className)
        : [...(prev[type] || []), className],
    }));
  };

  // ==================== DEVICE CONTROL FUNCTIONS ====================
  const sendContinuousMove = useCallback(
    async (pan: number, tilt: number) => {
      if (!camera) return;

      // Skip if values haven't changed significantly (deadband)
      const lastCmd = lastMoveCommandRef.current;
      if (
        Math.abs(pan - lastCmd.pan) < 0.05 &&
        Math.abs(tilt - lastCmd.tilt) < 0.05
      ) {
        return;
      }

      lastMoveCommandRef.current = { pan, tilt };

      try {
        await fetch(`http://localhost:8000/api/v1/ptz/${camera.id}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pan,
            tilt,
            zoom: 0,
            timeout: 1, // Short timeout for continuous refresh
          }),
        });
      } catch (error) {
        console.error("Error sending continuous move:", error);
      }
    },
    [camera],
  );
  const handleJoystickMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!joystickRef.current) return;

      const rect = joystickRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      let clientX, clientY;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = clientX - rect.left - centerX;
      const y = clientY - rect.top - centerY;

      // Calculate distance from center
      const distance = Math.sqrt(x * x + y * y);
      const maxDistance = Math.min(centerX, centerY) * 0.8; // 80% of radius

      // Apply deadzone
      if (distance < 10) {
        setCurrentVelocity({ pan: 0, tilt: 0 });
        return;
      }

      // Normalize to -1 to 1 with scaling
      const scale = Math.min(1, distance / maxDistance);
      const pan = (x / maxDistance) * scale;
      const tilt = (-y / maxDistance) * scale; // Invert Y axis

      // Clamp values
      const clampedPan = Math.max(-1, Math.min(1, pan));
      const clampedTilt = Math.max(-1, Math.min(1, tilt));

      setCurrentVelocity({ pan: clampedPan, tilt: clampedTilt });
    },
    [],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (moveIntervalRef.current) {
        clearInterval(moveIntervalRef.current);
      }
    };
  }, []);
  const loadDeviceCapabilities = async () => {
    if (!camera) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/ptz/${camera.id}/capabilities`,
      );
      const data = await response.json();

      if (data.success) {
        setDeviceCapabilities(data);

        // If PTZ available, load current position and presets
        if (data.capabilities.ptz) {
          loadPTZPosition();
          loadPresets();
        }
      }
    } catch (error) {
      console.error("Error loading device capabilities:", error);
    }
  };

  const loadPresets = async () => {
    if (!camera) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/ptz/${camera.id}/presets`,
      );
      const data = await response.json();

      if (data.success) {
        setPresets(data.presets);
      }
    } catch (error) {
      console.error("Error loading presets:", error);
    }
  };
  // Updated movePTZ for button control (uses proper values 0.5)
  const movePTZ = async (pan: number, tilt: number, zoom: number = 0) => {
    if (!camera) return;

    console.log(`Button PTZ: pan=${pan}, tilt=${tilt}, zoom=${zoom}`);

    setPtzMoving(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/ptz/${camera.id}/move`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pan, // Use value as-is (0.5, -0.5, etc)
            tilt,
            zoom,
            timeout: 1, // 10 second timeout for button hold
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        // Refresh position after movement
        setTimeout(() => loadPTZPosition(), 500);
      }
    } catch (error) {
      console.error("Error moving PTZ:", error);
    } finally {
      setPtzMoving(false);
    }
  };

  const stopPTZ = async () => {
    if (!camera) return;

    try {
      await fetch(`http://localhost:8000/api/v1/ptz/${camera.id}/stop`, {
        method: "POST",
      });
      loadPTZPosition();
    } catch (error) {
      console.error("Error stopping PTZ:", error);
    }
  };

  const gotoPreset = async (presetToken: string, presetName: string) => {
    if (!camera) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/ptz/${camera.id}/presets/goto`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preset_token: presetToken,
            preset_name: presetName,
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        alert(`Moved to preset: ${presetName}`);
        loadPTZPosition();
      }
    } catch (error) {
      console.error("Error going to preset:", error);
      alert("Failed to go to preset");
    }
  };

  const savePreset = async () => {
    if (!camera) return;

    const presetName = prompt("Enter preset name:");
    if (!presetName) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/ptz/${camera.id}/presets/set`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preset_name: presetName }),
        },
      );

      const data = await response.json();
      if (data.success) {
        alert(`Preset saved: ${presetName}`);
        loadPresets();
      }
    } catch (error) {
      console.error("Error saving preset:", error);
      alert("Failed to save preset");
    }
  };

  const toggleAudio = async () => {
    if (!camera) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/ptz/${camera.id}/audio/toggle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: !audioEnabled, volume: 75 }),
        },
      );

      const data = await response.json();
      if (data.success) {
        setAudioEnabled(!audioEnabled);
      }
    } catch (error) {
      console.error("Error toggling audio:", error);
    }
  };

  const toggleAlarm = async (alarmType: string) => {
    if (!camera) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/ptz/${camera.id}/alarm/toggle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alarm_type: alarmType,
            enabled: !alarmEnabled,
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        setAlarmEnabled(!alarmEnabled);
      }
    } catch (error) {
      console.error("Error toggling alarm:", error);
    }
  };

  const toggleWarning = async (
    flash: boolean,
    siren: boolean,
    duration?: number,
  ) => {
    if (!camera) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/ptz/${camera.id}/warning/toggle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flash_enabled: flash,
            siren_enabled: siren,
            duration: duration,
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        setWarningActive({ flash, siren });
        if (duration) {
          setTimeout(
            () => setWarningActive({ flash: false, siren: false }),
            duration * 1000,
          );
        }
      }
    } catch (error) {
      console.error("Error toggling warning:", error);
    }
  };

  const takeSnapshot = async () => {
    if (!camera) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/ptz/${camera.id}/snapshot`,
      );
      const data = await response.json();

      if (data.success) {
        setSnapshotData(data.image);
      }
    } catch (error) {
      console.error("Error taking snapshot:", error);
    }
  };

  // Load capabilities when device tab is opened
  useEffect(() => {
    if (activeTab === 6 && camera) {
      loadDeviceCapabilities();
    }
  }, [activeTab, camera]);

  // Calculate joystick position and update velocity
  const updateVelocity = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!joystickRef.current || !isMovingRef.current) return;

      const rect = joystickRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      let clientX, clientY;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = clientX - rect.left - centerX;
      const y = clientY - rect.top - centerY;

      // Calculate distance from center
      const distance = Math.sqrt(x * x + y * y);
      const maxDistance = Math.min(centerX, centerY) * 0.8;

      // Apply deadzone
      if (distance < 10) {
        currentVelocityRef.current = { pan: 0, tilt: 0 };
        return;
      }

      // Normalize to -1 to 1 with scaling
      const scale = Math.min(1, distance / maxDistance);
      const pan = (x / maxDistance) * scale;
      const tilt = (-y / maxDistance) * scale;

      // Clamp values
      const clampedPan = Math.max(-1, Math.min(1, pan));
      const clampedTilt = Math.max(-1, Math.min(1, tilt));

      currentVelocityRef.current = { pan: clampedPan, tilt: clampedTilt };

      console.log(
        `Velocity updated: pan=${clampedPan.toFixed(2)}, tilt=${clampedTilt.toFixed(2)}`,
      );
    },
    [],
  );

  // Start joystick control
  // ==================== RENDER FUNCTIONS ====================
  // ==================== RENDER DEVICE CONTROL TAB - UPDATED ====================
  const startPTZMove = async (
    pan: number,
    tilt: number,
    zoom: number = 0,
    direction: string,
  ) => {
    if (!camera) return;

    setCurrentDirection(direction);

    console.log(
      `Starting PTZ move: ${direction} (pan=${pan}, tilt=${tilt}, zoom=${zoom})`,
    );

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/ptz/${camera.id}/move`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pan,
            tilt,
            zoom,
            timeout: 1, // Long timeout - we'll stop manually
          }),
        },
      );

      const data = await response.json();
      console.log("PTZ move response:", data);
      await new Promise(() => setTimeout(() => stopPTZ(), 200));
    } catch (error) {
      console.error("Error moving PTZ:", error);
    }
  };

  // FIXED: Stop PTZ (only when explicitly called)
  const stopPTZMove = async () => {
    if (!camera || !ptzMoving) return;

    console.log("Stopping PTZ");
    setPtzMoving(false);
    setCurrentDirection("");

    try {
      await fetch(`http://localhost:8000/api/v1/ptz/${camera.id}/stop`, {
        method: "POST",
      });

      // Only refresh position ONCE after stopping
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
      moveTimeoutRef.current = setTimeout(() => {
        loadPTZPosition();
      }, 500);
    } catch (error) {
      console.error("Error stopping PTZ:", error);
    }
  };

  // FIXED: Load position (remove auto-polling)
  const loadPTZPosition = async () => {
    if (!camera) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/ptz/${camera.id}/position`,
      );
      const data = await response.json();

      if (data.success) {
        setPtzPosition(data.position);
      }
    } catch (error) {
      console.error("Error loading PTZ position:", error);
    }
  };

  // FIXED: Joystick functions
  const sendMoveCommand = useCallback(async () => {
    if (!camera) return;

    const { pan, tilt } = currentVelocityRef.current;

    // Skip if no movement
    if (Math.abs(pan) < 0.01 && Math.abs(tilt) < 0.01) {
      return;
    }

    try {
      console.log(
        `Joystick PTZ: pan=${(pan * 10).toFixed(1)}, tilt=${(tilt * 10).toFixed(1)}`,
      );

      await fetch(`http://localhost:8000/api/v1/ptz/${camera.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pan: pan < 0.01 ? pan * 10 : pan,
          tilt: tilt < 0.01 ? tilt * 10 : tilt,
          zoom: 0,
          timeout: 1,
        }),
      });
    } catch (error) {
      console.error("Error sending move command:", error);
    }
  }, [camera]);

  const handleJoystickStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      console.log("Joystick START");
      e.preventDefault();

      setJoystickActive(true);
      isMovingRef.current = true;

      // Update initial velocity
      updateVelocity(e);

      // Clear any existing interval
      if (moveIntervalRef.current) {
        clearInterval(moveIntervalRef.current);
      }

      // Send initial move command immediately
      sendMoveCommand();

      // Start sending continuous move commands at 5Hz (every 200ms)
      moveIntervalRef.current = setInterval(() => {
        sendMoveCommand();
      }, 200);
    },
    [updateVelocity, sendMoveCommand],
  );

  const handleJoystickEnd = useCallback(async () => {
    console.log("Joystick END");

    setJoystickActive(false);
    isMovingRef.current = false;
    currentVelocityRef.current = { pan: 0, tilt: 0 };

    // Clear interval
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }

    // Send stop command
    // if (camera) {
    //   try {
    //     console.log("Sending PTZ STOP");
    //     await fetch(`http://localhost:8000/api/v1/ptz/${camera.id}/stop`, {
    //       method: "POST",
    //     });

    //     // Refresh position after a delay
    //     if (moveTimeoutRef.current) {
    //       clearTimeout(moveTimeoutRef.current);
    //     }
    //     moveTimeoutRef.current = setTimeout(() => {
    //       loadPTZPosition();
    //     }, 500);
    //   } catch (error) {
    //     console.error("Error stopping PTZ:", error);
    //   }
    // }
  }, [camera]);
  const renderDeviceControlTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Device Control
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Control camera PTZ, audio, alarms, and other features
      </Typography>

      {!deviceCapabilities && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading device capabilities...
          </Typography>
        </Box>
      )}

      {deviceCapabilities && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Device Capabilities
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  label={
                    deviceCapabilities.capabilities.ptz
                      ? "✓ PTZ Control"
                      : "✗ No PTZ"
                  }
                  color={
                    deviceCapabilities.capabilities.ptz ? "success" : "default"
                  }
                  size="small"
                />
                <Chip
                  label={
                    deviceCapabilities.capabilities.audio
                      ? "✓ Audio"
                      : "✗ No Audio"
                  }
                  color={
                    deviceCapabilities.capabilities.audio
                      ? "success"
                      : "default"
                  }
                  size="small"
                />
                <Chip
                  label={
                    deviceCapabilities.capabilities.events
                      ? "✓ Events"
                      : "✗ No Events"
                  }
                  color={
                    deviceCapabilities.capabilities.events
                      ? "success"
                      : "default"
                  }
                  size="small"
                />
                <Chip label="✓ Snapshot" color="success" size="small" />
              </Box>
            </CardContent>
          </Card>

          {deviceCapabilities.capabilities.ptz && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                🎮 PTZ Control
              </Typography>

              {/* Current Position */}
              {ptzPosition && (
                <Alert severity="info" sx={{ mb: 2, fontSize: "0.875rem" }}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 1,
                      textAlign: "center",
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Pan
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {ptzPosition.pan.toFixed(1)}°
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Tilt
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {ptzPosition.tilt.toFixed(1)}°
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Zoom
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {ptzPosition.zoom.toFixed(1)}x
                      </Typography>
                    </Box>
                  </Box>
                </Alert>
              )}

              {/* Movement Status */}
              {ptzMoving && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Moving: {currentDirection}
                </Alert>
              )}

              {/* ==================== BUTTON CONTROL (FIXED) ==================== */}
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Button Control
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 1,
                    maxWidth: 250,
                    mx: "auto",
                  }}
                >
                  {/* Row 1 */}
                  <div></div>

                  <Button
                    variant="outlined"
                    sx={{ minWidth: 0, p: 1.5 }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      startPTZMove(0, 0.7, 0, "Up");
                    }}
                    onMouseUp={(e) => {
                      e.preventDefault();
                      stopPTZMove();
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      startPTZMove(0, 0.7, 0, "Up");
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      stopPTZMove();
                    }}
                    disabled={ptzMoving && currentDirection !== "Up"}
                  >
                    ↑
                  </Button>

                  <div></div>

                  {/* Row 2 */}
                  <Button
                    variant="outlined"
                    sx={{ minWidth: 0, p: 1.5 }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      startPTZMove(-0.7, 0, 0, "Left");
                    }}
                    onMouseUp={(e) => {
                      e.preventDefault();
                      stopPTZMove();
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      startPTZMove(-0.7, 0, 0, "Left");
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      stopPTZMove();
                    }}
                    disabled={ptzMoving && currentDirection !== "Left"}
                  >
                    ←
                  </Button>

                  <Button
                    variant="contained"
                    color="error"
                    sx={{ minWidth: 0, p: 1.5 }}
                    onClick={stopPTZMove}
                  >
                    ⏹
                  </Button>

                  <Button
                    variant="outlined"
                    sx={{ minWidth: 0, p: 1.5 }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      startPTZMove(0.7, 0, 0, "Right");
                    }}
                    onMouseUp={(e) => {
                      e.preventDefault();
                      stopPTZMove();
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      startPTZMove(0.7, 0, 0, "Right");
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      stopPTZMove();
                    }}
                    disabled={ptzMoving && currentDirection !== "Right"}
                  >
                    →
                  </Button>

                  {/* Row 3 */}
                  <div></div>

                  <Button
                    variant="outlined"
                    sx={{ minWidth: 0, p: 1.5 }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      startPTZMove(0, -0.7, 0, "Down");
                    }}
                    onMouseUp={(e) => {
                      e.preventDefault();
                      stopPTZMove();
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      startPTZMove(0, -0.7, 0, "Down");
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      stopPTZMove();
                    }}
                    disabled={ptzMoving && currentDirection !== "Down"}
                  >
                    ↓
                  </Button>

                  <div></div>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* ==================== JOYSTICK CONTROL ==================== */}
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Joystick Control
              </Typography>

              <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                <Box
                  ref={joystickRef}
                  onMouseDown={handleJoystickStart}
                  onMouseMove={updateVelocity}
                  onMouseUp={handleJoystickEnd}
                  onMouseLeave={handleJoystickEnd}
                  onTouchStart={handleJoystickStart}
                  onTouchMove={updateVelocity}
                  onTouchEnd={handleJoystickEnd}
                  sx={{
                    width: 200,
                    height: 200,
                    borderRadius: "50%",
                    background: `radial-gradient(circle at center, ${
                      joystickActive
                        ? "rgba(25, 118, 210, 0.2)"
                        : "rgba(0, 0, 0, 0.1)"
                    } 0%, rgba(0, 0, 0, 0.05) 70%)`,
                    border: "3px solid",
                    borderColor: joystickActive ? "primary.main" : "divider",
                    cursor: joystickActive ? "grabbing" : "grab",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    touchAction: "none",
                    userSelect: "none",
                  }}
                >
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      bgcolor: joystickActive
                        ? "primary.main"
                        : "action.active",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: 2,
                      pointerEvents: "none",
                      transform: joystickActive
                        ? `translate(${currentVelocityRef.current.pan * 40}px, ${-currentVelocityRef.current.tilt * 40}px)`
                        : "translate(0, 0)",
                      transition: joystickActive
                        ? "none"
                        : "transform 0.2s ease-out",
                    }}
                  >
                    <MyLocation sx={{ color: "white" }} />
                  </Box>

                  {joystickActive &&
                    (Math.abs(currentVelocityRef.current.pan) > 0.01 ||
                      Math.abs(currentVelocityRef.current.tilt) > 0.01) && (
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: -30,
                          left: "50%",
                          transform: "translateX(-50%)",
                          bgcolor: "primary.main",
                          color: "white",
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: "0.75rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        P: {currentVelocityRef.current.pan.toFixed(2)} T:{" "}
                        {currentVelocityRef.current.tilt.toFixed(2)}
                      </Box>
                    )}

                  <Typography
                    sx={{
                      position: "absolute",
                      top: 10,
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontSize: "0.75rem",
                      color: "text.secondary",
                      fontWeight: "bold",
                    }}
                  >
                    ▲
                  </Typography>
                  <Typography
                    sx={{
                      position: "absolute",
                      bottom: 10,
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontSize: "0.75rem",
                      color: "text.secondary",
                      fontWeight: "bold",
                    }}
                  >
                    ▼
                  </Typography>
                  <Typography
                    sx={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "0.75rem",
                      color: "text.secondary",
                      fontWeight: "bold",
                    }}
                  >
                    ◀
                  </Typography>
                  <Typography
                    sx={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "0.75rem",
                      color: "text.secondary",
                      fontWeight: "bold",
                    }}
                  >
                    ▶
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Zoom Controls */}
              <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  onMouseDown={(e) => {
                    e.preventDefault();
                    startPTZMove(0, 0, -0.5, "Zoom Out");
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault();
                    stopPTZMove();
                  }}
                  disabled={ptzMoving && currentDirection !== "Zoom Out"}
                >
                  Zoom Out
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onMouseDown={(e) => {
                    e.preventDefault();
                    startPTZMove(0, 0, 0.5, "Zoom In");
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault();
                    stopPTZMove();
                  }}
                  disabled={ptzMoving && currentDirection !== "Zoom In"}
                >
                  Zoom In
                </Button>
              </Box>

              {/* Presets */}
              {presets.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Presets
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {presets.map((preset) => (
                      <Button
                        key={preset.token}
                        variant="outlined"
                        size="small"
                        startIcon={<Bookmark />}
                        onClick={() => gotoPreset(preset.token, preset.name)}
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </Box>
                </Box>
              )}

              <Button
                variant="outlined"
                size="small"
                startIcon={<BookmarkBorder />}
                onClick={savePreset}
                fullWidth
                sx={{ mb: 1 }}
              >
                Save Current Position as Preset
              </Button>

              <Button
                variant="text"
                fullWidth
                size="small"
                onClick={loadPTZPosition}
              >
                Refresh Position
              </Button>
            </Paper>
          )}

          {/* Audio Control */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              🔊 Audio Control
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant={audioEnabled ? "contained" : "outlined"}
                startIcon={audioEnabled ? <VolumeUp /> : <VolumeOff />}
                onClick={toggleAudio}
                fullWidth
              >
                {audioEnabled ? "Audio Enabled" : "Audio Disabled"}
              </Button>
            </Box>
          </Paper>

          {/* Alarm Control */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              🚨 Alarm Detection
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Button
                variant={alarmEnabled ? "contained" : "outlined"}
                startIcon={
                  alarmEnabled ? <Notifications /> : <NotificationsOff />
                }
                onClick={() => toggleAlarm("motion")}
                fullWidth
              >
                {alarmEnabled ? "Motion Detection On" : "Motion Detection Off"}
              </Button>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => toggleAlarm("audio")}
                  fullWidth
                >
                  Audio Detection
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => toggleAlarm("tamper")}
                  fullWidth
                >
                  Tamper Detection
                </Button>
              </Box>
            </Box>
          </Paper>

          {/* Warning Light / Siren */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              ⚠️ Warning System
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant={warningActive.flash ? "contained" : "outlined"}
                  color={warningActive.flash ? "warning" : "inherit"}
                  startIcon={<FlashOn />}
                  onClick={() =>
                    toggleWarning(!warningActive.flash, warningActive.siren)
                  }
                  fullWidth
                >
                  {warningActive.flash ? "Flash On" : "Flash Off"}
                </Button>
                <Button
                  variant={warningActive.siren ? "contained" : "outlined"}
                  color={warningActive.siren ? "error" : "inherit"}
                  startIcon={<VolumeUp />}
                  onClick={() =>
                    toggleWarning(warningActive.flash, !warningActive.siren)
                  }
                  fullWidth
                >
                  {warningActive.siren ? "Siren On" : "Siren Off"}
                </Button>
              </Box>
              <Button
                variant="contained"
                color="warning"
                size="small"
                onClick={() => toggleWarning(true, true, 10)}
              >
                Full Warning (10s)
              </Button>
            </Box>
          </Paper>

          {/* Snapshot */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              📸 Snapshot
            </Typography>
            <Button
              variant="contained"
              startIcon={<CameraEnhance />}
              onClick={takeSnapshot}
              fullWidth
              sx={{ mb: 2 }}
            >
              Take Snapshot
            </Button>

            {snapshotData && (
              <Box>
                <img
                  src={`data:image/jpeg;base64,${snapshotData}`}
                  alt="Camera snapshot"
                  style={{
                    width: "100%",
                    borderRadius: "8px",
                    marginBottom: "8px",
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = `data:image/jpeg;base64,${snapshotData}`;
                    link.download = `snapshot_${camera?.name}_${Date.now()}.jpg`;
                    link.click();
                  }}
                >
                  Download Snapshot
                </Button>
              </Box>
            )}
          </Paper>
        </>
      )}
    </Box>
  );

  // ==================== CALIBRATION FUNCTIONS ====================

  const loadCalibrationFrame = async () => {
    if (!camera) return;

    setLoadingFrame(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/cameras/${camera.id}/frame`,
      );
      const data = await response.json();

      if (data.success) {
        setCalibrationFrame(data.frame);
      } else {
        alert("Failed to load frame: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error loading frame:", error);
      alert("Failed to load camera frame");
    } finally {
      setLoadingFrame(false);
    }
  };

  const handleImageClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current || !calibrationFrame) return;

    const maxPoints =
      calibrationMode === "reference_object"
        ? 2
        : calibrationMode === "perspective"
          ? 4
          : 6;

    if (calibrationPoints.length >= maxPoints) return;

    const rect = imageRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Scale to actual image coordinates
    const scaleX = imageRef.current.naturalWidth / rect.width;
    const scaleY = imageRef.current.naturalHeight / rect.height;

    const actualX = clickX * scaleX;
    const actualY = clickY * scaleY;

    const newPoint: CalibrationPoint = {
      pixel_x: actualX,
      pixel_y: actualY,
      real_x: 0,
      real_y: 0,
    };

    setCalibrationPoints((prev) => [...prev, newPoint]);
  };

  const clearCalibrationPoints = () => {
    setCalibrationPoints([]);
    setTestResult(null);
  };

  const testCalibration = async () => {
    if (!camera) return;

    let calibrationData: any = null;

    // Reference Object
    if (calibrationMode === "reference_object") {
      if (calibrationPoints.length < 2) {
        alert("Need 2 points for reference object calibration");
        return;
      }
      if (!referenceDistance) {
        alert("Please enter reference distance");
        return;
      }

      const refDist = parseFloat(referenceDistance);
      calibrationData = {
        mode: "reference_object",
        points: [
          { ...calibrationPoints[0], real_x: 0, real_y: 0 },
          { ...calibrationPoints[1], real_x: refDist, real_y: 0 },
        ],
        reference_width_meters: refDist,
      };
    }

    // Perspective Transform
    else if (calibrationMode === "perspective") {
      if (calibrationPoints.length < 4) {
        alert("Need 4 corners for perspective calibration");
        return;
      }
      if (!perspectiveWidth || !perspectiveHeight) {
        alert("Please enter width and height");
        return;
      }

      const width = parseFloat(perspectiveWidth);
      const height = parseFloat(perspectiveHeight);
      calibrationData = {
        mode: "perspective",
        points: [
          { ...calibrationPoints[0], real_x: 0, real_y: 0 },
          { ...calibrationPoints[1], real_x: width, real_y: 0 },
          { ...calibrationPoints[2], real_x: width, real_y: height },
          { ...calibrationPoints[3], real_x: 0, real_y: height },
        ],
        rectangle_width_meters: width,
        rectangle_height_meters: height,
      };
    }

    // Vanishing Point
    else if (calibrationMode === "vanishing_point") {
      if (calibrationPoints.length < 6) {
        alert("Need 6 points for vanishing point calibration");
        return;
      }
      if (!referenceHeight) {
        alert("Please enter reference height");
        return;
      }

      const refHeight = parseFloat(referenceHeight);
      calibrationData = {
        mode: "vanishing_point",
        parallel_lines: [
          [calibrationPoints[0], calibrationPoints[1]],
          [calibrationPoints[2], calibrationPoints[3]],
        ],
        reference_height_points: [calibrationPoints[4], calibrationPoints[5]],
        reference_height_meters: refHeight,
      };
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/cameras/${camera.id}/calibration/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(calibrationData),
        },
      );

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      console.error("Error testing calibration:", error);
      alert("Failed to test calibration");
    }
  };

  const saveCalibration = async () => {
    if (!camera || !testResult?.success) {
      alert("Please test calibration first");
      return;
    }

    setCalibrating(true);
    try {
      let calibrationData: any = null;

      // Build calibration data based on mode
      if (calibrationMode === "reference_object") {
        const refDist = parseFloat(referenceDistance);
        calibrationData = {
          mode: "reference_object",
          points: [
            { ...calibrationPoints[0], real_x: 0, real_y: 0 },
            { ...calibrationPoints[1], real_x: refDist, real_y: 0 },
          ],
          reference_width_meters: refDist,
        };
      } else if (calibrationMode === "perspective") {
        const width = parseFloat(perspectiveWidth);
        const height = parseFloat(perspectiveHeight);
        calibrationData = {
          mode: "perspective",
          points: [
            { ...calibrationPoints[0], real_x: 0, real_y: 0 },
            { ...calibrationPoints[1], real_x: width, real_y: 0 },
            { ...calibrationPoints[2], real_x: width, real_y: height },
            { ...calibrationPoints[3], real_x: 0, real_y: height },
          ],
          rectangle_width_meters: width,
          rectangle_height_meters: height,
        };
      } else if (calibrationMode === "vanishing_point") {
        const refHeight = parseFloat(referenceHeight);
        calibrationData = {
          mode: "vanishing_point",
          parallel_lines: [
            [calibrationPoints[0], calibrationPoints[1]],
            [calibrationPoints[2], calibrationPoints[3]],
          ],
          reference_height_points: [calibrationPoints[4], calibrationPoints[5]],
          reference_height_meters: refHeight,
        };
      }

      await onCalibrate(camera.id, calibrationData);

      alert("Calibration saved successfully!");
      clearCalibrationPoints();
      setCalibrationFrame(null);
      setReferenceDistance("");
      setReferenceHeight("");
      setPerspectiveWidth("");
      setPerspectiveHeight("");
    } catch (error) {
      console.error("Error saving calibration:", error);
      alert("Failed to save calibration");
    } finally {
      setCalibrating(false);
    }
  };

  const clearCalibration = async () => {
    if (!camera || !confirm("Clear camera calibration?")) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/cameras/${camera.id}/calibration`,
        { method: "DELETE" },
      );

      if (response.ok) {
        alert("Calibration cleared successfully");
        window.location.reload();
      } else {
        alert("Failed to clear calibration");
      }
    } catch (error) {
      console.error("Error clearing calibration:", error);
      alert("Failed to clear calibration");
    }
  };

  const calculatePixelsPerMeter = () => {
    if (
      calibrationMode !== "reference_object" ||
      calibrationPoints.length < 2 ||
      !referenceDistance
    )
      return null;

    const p1 = calibrationPoints[0];
    const p2 = calibrationPoints[1];

    const pixelDist = Math.sqrt(
      Math.pow(p2.pixel_x - p1.pixel_x, 2) +
        Math.pow(p2.pixel_y - p1.pixel_y, 2),
    );

    return pixelDist / parseFloat(referenceDistance);
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderCalibrationTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Camera Calibration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Calibrate the camera to enable real-world measurements (speed, distance)
      </Typography>

      {/* Current Status */}
      <Card
        sx={{
          mb: 3,
          bgcolor: camera?.is_calibrated ? "success.dark" : "warning.dark",
        }}
      >
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {camera?.is_calibrated ? "✅ Calibrated" : "⚠️ Not Calibrated"}
              </Typography>
              {camera?.is_calibrated && (
                <>
                  <Typography variant="body2">
                    Pixels per meter: {camera.pixels_per_meter?.toFixed(2)}
                  </Typography>
                  <Typography variant="body2">
                    Mode: {camera.calibration_mode}
                  </Typography>
                </>
              )}
            </Box>
            {camera?.is_calibrated && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={clearCalibration}
              >
                Clear
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Calibration Method Selection */}
      <FormControl component="fieldset" sx={{ mb: 3 }}>
        <FormLabel component="legend">Calibration Method</FormLabel>
        <RadioGroup
          value={calibrationMode}
          onChange={(e) => {
            setCalibrationMode(e.target.value as any);
            clearCalibrationPoints();
          }}
        >
          <FormControlLabel
            value="reference_object"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body2" fontWeight="bold">
                  📏 Reference Object
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Mark two points on an object with known distance (easiest)
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            value="perspective"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body2" fontWeight="bold">
                  🔲 Perspective Transform
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Mark 4 corners of a known rectangular area (best for top-down
                  views)
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            value="vanishing_point"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body2" fontWeight="bold">
                  🎯 Vanishing Point
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Use parallel lines and known height (best for road/hallway
                  views)
                </Typography>
              </Box>
            }
          />
        </RadioGroup>
      </FormControl>

      <Divider sx={{ my: 3 }} />

      {/* Step 1: Capture Frame */}
      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
        Step 1: Capture Frame
      </Typography>
      <Button
        variant="contained"
        startIcon={
          loadingFrame ? <CircularProgress size={16} /> : <CameraAlt />
        }
        onClick={loadCalibrationFrame}
        disabled={loadingFrame}
        fullWidth
        sx={{ mb: 3 }}
      >
        {loadingFrame ? "Loading..." : "Capture Frame from Camera"}
      </Button>

      {calibrationFrame && (
        <>
          {/* Step 2: Mark Points */}
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            Step 2: Mark Points
          </Typography>

          {calibrationMode === "reference_object" && (
            <Alert severity="info" sx={{ mb: 2, fontSize: "0.85rem" }}>
              Click TWO points on an object with known distance (e.g., door
              width: 0.9m)
            </Alert>
          )}
          {calibrationMode === "perspective" && (
            <Alert severity="info" sx={{ mb: 2, fontSize: "0.85rem" }}>
              Click FOUR corners in order: top-left, top-right, bottom-right,
              bottom-left
            </Alert>
          )}
          {calibrationMode === "vanishing_point" && (
            <Alert severity="info" sx={{ mb: 2, fontSize: "0.85rem" }}>
              1. Mark parallel line 1 (2 points)
              <br />
              2. Mark parallel line 2 (2 points)
              <br />
              3. Mark object with known height (2 points)
            </Alert>
          )}

          <Paper sx={{ p: 2, mb: 2, position: "relative" }}>
            <img
              ref={imageRef}
              src={`data:image/jpeg;base64,${calibrationFrame}`}
              alt="Calibration frame"
              style={{
                width: "100%",
                cursor: "crosshair",
                display: "block",
              }}
              onClick={handleImageClick}
            />

            {/* Draw points */}
            {calibrationPoints.map((point, idx) => {
              if (!imageRef.current) return null;

              const rect = imageRef.current.getBoundingClientRect();
              const scaleX = rect.width / imageRef.current.naturalWidth;
              const scaleY = rect.height / imageRef.current.naturalHeight;

              // Color and label based on mode
              let color = "red";
              let label = `${idx + 1}`;

              if (calibrationMode === "perspective") {
                const colors = ["red", "blue", "green", "yellow"];
                const labels = ["TL", "TR", "BR", "BL"];
                color = colors[idx] || "red";
                label = labels[idx] || `${idx + 1}`;
              } else if (calibrationMode === "vanishing_point") {
                if (idx < 2) {
                  color = "red";
                  label = `L1-${idx + 1}`;
                } else if (idx < 4) {
                  color = "blue";
                  label = `L2-${idx - 1}`;
                } else {
                  color = "green";
                  label = `H${idx - 3}`;
                }
              }

              return (
                <Box
                  key={idx}
                  sx={{
                    position: "absolute",
                    left: point.pixel_x * scaleX,
                    top: point.pixel_y * scaleY,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    backgroundColor: color,
                    border: "3px solid white",
                    transform: "translate(-50%, -50%)",
                    zIndex: 10,
                    pointerEvents: "none",
                  }}
                >
                  <Typography
                    sx={{
                      position: "absolute",
                      top: -30,
                      left: -10,
                      color: "white",
                      backgroundColor: "rgba(0,0,0,0.8)",
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    {label}
                  </Typography>
                </Box>
              );
            })}

            {/* Draw lines/shapes */}
            {imageRef.current && (
              <svg
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                }}
              >
                {/* Reference Object: Line */}
                {calibrationMode === "reference_object" &&
                  calibrationPoints.length === 2 &&
                  (() => {
                    const rect = imageRef.current!.getBoundingClientRect();
                    const scaleX = rect.width / imageRef.current!.naturalWidth;
                    const scaleY =
                      rect.height / imageRef.current!.naturalHeight;
                    return (
                      <line
                        x1={calibrationPoints[0].pixel_x * scaleX}
                        y1={calibrationPoints[0].pixel_y * scaleY}
                        x2={calibrationPoints[1].pixel_x * scaleX}
                        y2={calibrationPoints[1].pixel_y * scaleY}
                        stroke="red"
                        strokeWidth="3"
                        strokeDasharray="5,5"
                      />
                    );
                  })()}

                {/* Perspective: Rectangle */}
                {calibrationMode === "perspective" &&
                  calibrationPoints.length === 4 &&
                  (() => {
                    const rect = imageRef.current!.getBoundingClientRect();
                    const scaleX = rect.width / imageRef.current!.naturalWidth;
                    const scaleY =
                      rect.height / imageRef.current!.naturalHeight;
                    return (
                      <polygon
                        points={calibrationPoints
                          ?.map(
                            (p) =>
                              `${p.pixel_x * scaleX},${p.pixel_y * scaleY}`,
                          )
                          ?.join(" ")}
                        fill="rgba(255, 0, 0, 0.1)"
                        stroke="red"
                        strokeWidth="3"
                        strokeDasharray="5,5"
                      />
                    );
                  })()}

                {/* Vanishing Point: Lines */}
                {calibrationMode === "vanishing_point" &&
                  (() => {
                    const rect = imageRef.current!.getBoundingClientRect();
                    const scaleX = rect.width / imageRef.current!.naturalWidth;
                    const scaleY =
                      rect.height / imageRef.current!.naturalHeight;
                    return (
                      <>
                        {calibrationPoints.length >= 2 && (
                          <line
                            x1={calibrationPoints[0].pixel_x * scaleX}
                            y1={calibrationPoints[0].pixel_y * scaleY}
                            x2={calibrationPoints[1].pixel_x * scaleX}
                            y2={calibrationPoints[1].pixel_y * scaleY}
                            stroke="red"
                            strokeWidth="3"
                          />
                        )}
                        {calibrationPoints.length >= 4 && (
                          <line
                            x1={calibrationPoints[2].pixel_x * scaleX}
                            y1={calibrationPoints[2].pixel_y * scaleY}
                            x2={calibrationPoints[3].pixel_x * scaleX}
                            y2={calibrationPoints[3].pixel_y * scaleY}
                            stroke="blue"
                            strokeWidth="3"
                          />
                        )}
                        {calibrationPoints.length === 6 && (
                          <line
                            x1={calibrationPoints[4].pixel_x * scaleX}
                            y1={calibrationPoints[4].pixel_y * scaleY}
                            x2={calibrationPoints[5].pixel_x * scaleX}
                            y2={calibrationPoints[5].pixel_y * scaleY}
                            stroke="green"
                            strokeWidth="3"
                            strokeDasharray="5,5"
                          />
                        )}
                      </>
                    );
                  })()}
              </svg>
            )}
          </Paper>

          <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
            {calibrationMode === "reference_object" && (
              <Chip
                label={`Points: ${calibrationPoints.length}/2`}
                color={calibrationPoints.length === 2 ? "success" : "default"}
              />
            )}
            {calibrationMode === "perspective" && (
              <Chip
                label={`Corners: ${calibrationPoints.length}/4`}
                color={calibrationPoints.length === 4 ? "success" : "default"}
              />
            )}
            {calibrationMode === "vanishing_point" && (
              <>
                <Chip
                  label={`Line 1: ${Math.min(calibrationPoints.length, 2)}/2`}
                  color={calibrationPoints.length >= 2 ? "success" : "default"}
                />
                <Chip
                  label={`Line 2: ${Math.max(0, Math.min(calibrationPoints.length - 2, 2))}/2`}
                  color={calibrationPoints.length >= 4 ? "success" : "default"}
                />
                <Chip
                  label={`Height: ${Math.max(0, Math.min(calibrationPoints.length - 4, 2))}/2`}
                  color={calibrationPoints.length === 6 ? "success" : "default"}
                />
              </>
            )}
            {calibrationPoints.length > 0 && (
              <Button size="small" onClick={clearCalibrationPoints}>
                Clear Points
              </Button>
            )}
          </Box>

          {/* Step 3: Enter Measurements */}
          {((calibrationMode === "reference_object" &&
            calibrationPoints.length === 2) ||
            (calibrationMode === "perspective" &&
              calibrationPoints.length === 4) ||
            (calibrationMode === "vanishing_point" &&
              calibrationPoints.length === 6)) && (
            <>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Step 3: Enter Measurements
              </Typography>

              {calibrationMode === "reference_object" && (
                <>
                  <TextField
                    fullWidth
                    label="Distance between points (meters)"
                    type="number"
                    value={referenceDistance}
                    onChange={(e) => setReferenceDistance(e.target.value)}
                    placeholder="e.g., 2.0"
                    helperText="Enter the real-world distance in meters"
                    sx={{ mb: 2 }}
                  />
                  {referenceDistance && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Estimated: {calculatePixelsPerMeter()?.toFixed(2)}{" "}
                      pixels/meter
                    </Alert>
                  )}
                </>
              )}

              {calibrationMode === "perspective" && (
                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Width (meters)"
                    type="number"
                    value={perspectiveWidth}
                    onChange={(e) => setPerspectiveWidth(e.target.value)}
                    placeholder="e.g., 2.5"
                  />
                  <TextField
                    fullWidth
                    label="Height (meters)"
                    type="number"
                    value={perspectiveHeight}
                    onChange={(e) => setPerspectiveHeight(e.target.value)}
                    placeholder="e.g., 5.0"
                  />
                </Box>
              )}

              {calibrationMode === "vanishing_point" && (
                <TextField
                  fullWidth
                  label="Reference Height (meters)"
                  type="number"
                  value={referenceHeight}
                  onChange={(e) => setReferenceHeight(e.target.value)}
                  placeholder="e.g., 1.8"
                  helperText="Height of the marked object (e.g., person, door)"
                  sx={{ mb: 2 }}
                />
              )}

              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={testCalibration}
                  fullWidth
                  startIcon={<Visibility />}
                >
                  Test Calibration
                </Button>
                <Button
                  variant="contained"
                  onClick={saveCalibration}
                  fullWidth
                  disabled={!testResult?.success || calibrating}
                  startIcon={
                    calibrating ? <CircularProgress size={16} /> : <Save />
                  }
                >
                  {calibrating ? "Saving..." : "Save"}
                </Button>
              </Box>

              {testResult && (
                <Alert
                  severity={testResult.success ? "success" : "error"}
                  sx={{ mt: 2 }}
                >
                  {testResult.success ? (
                    <>
                      <Typography variant="body2" fontWeight="bold">
                        Test Successful! ✅
                      </Typography>
                      {testResult.pixels_per_meter && (
                        <Typography variant="body2">
                          Pixels per meter:{" "}
                          {testResult.pixels_per_meter.toFixed(2)}
                        </Typography>
                      )}
                    </>
                  ) : (
                    <Typography variant="body2">
                      Test failed: {testResult.error}
                    </Typography>
                  )}
                </Alert>
              )}
            </>
          )}
        </>
      )}
    </Box>
  );

  if (!camera) return null;

  const content = (
    <>
      {!embedded && (
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Box>
            <Typography variant="h6">{camera.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {camera.location}
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          overflow: "auto",
          width: "100%",
        }}
      >
        <Tab icon={<Info />} label="Info" />
        <Tab icon={<Visibility />} label="Detection" />
        <Tab icon={<Timeline />} label="Tracking" />
        <Tab icon={<Speed />} label="Speed" />
        <Tab icon={<Straighten />} label="Distance" />
        <Tab icon={<Tune />} label="Calibration" />
        <Tab icon={<Settings />} label="Device" />
        <Tab icon={<Article />} label="Logs" />
      </Tabs>

      {/* Tab 0: Camera Info */}
      <TabPanel value={activeTab} index={0}>
        <TextField
          fullWidth
          label="Name"
          value={formData.name || ""}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Location"
          value={formData.location || ""}
          onChange={(e) =>
            setFormData({ ...formData, location: e.target.value })
          }
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="RTSP URL"
          value={formData.rtsp_url || ""}
          onChange={(e) =>
            setFormData({ ...formData, rtsp_url: e.target.value })
          }
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          type="number"
          label="FPS"
          value={formData.fps || 15}
          onChange={(e) =>
            setFormData({ ...formData, fps: parseInt(e.target.value) })
          }
          sx={{ mb: 3 }}
        />
        <Divider sx={{ my: 2 }}>
          <Chip icon={<Email />} label="Alert Configuration" />
        </Divider>

        <TextField
          fullWidth
          label="Alert Email Address"
          type="email"
          value={formData.alert_email || ""}
          onChange={(e) =>
            setFormData({ ...formData, alert_email: e.target.value })
          }
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.email_enabled || false}
                onChange={(e) =>
                  setFormData({ ...formData, email_enabled: e.target.checked })
                }
              />
            }
            label="Email Alerts Enabled"
          />
          <TextField
            label="Cooldown (seconds)"
            type="number"
            value={formData.cooldown_seconds || 60}
            onChange={(e) =>
              setFormData({
                ...formData,
                cooldown_seconds: parseInt(e.target.value),
              })
            }
            sx={{ width: 200 }}
          />
        </Box>

        <Button
          variant="outlined"
          size="small"
          onClick={async () => {
            try {
              await fetch(
                `http://localhost:8000/api/v1/alerts/${camera.id}/test-email`,
                {
                  method: "POST",
                },
              );
              alert("Test email sent!");
            } catch (error) {
              console.error("Error sending test email:", error);
              alert("Failed to send test email");
            }
          }}
        >
          Send Test Email
        </Button>
        <Typography variant="subtitle2" gutterBottom>
          Features
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={formData.features?.detection || false}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  features: {
                    ...formData.features,
                    detection: e.target.checked,
                  },
                })
              }
            />
          }
          label="Detection"
        />
        <FormControlLabel
          control={
            <Switch
              checked={formData.features?.tracking || false}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  features: {
                    ...formData.features,
                    tracking: e.target.checked,
                  },
                })
              }
            />
          }
          label="Object Tracking"
        />
        <FormControlLabel
          control={
            <Switch
              checked={formData.features?.speed || false}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  features: { ...formData.features, speed: e.target.checked },
                })
              }
            />
          }
          label="Speed Detection"
        />
        <FormControlLabel
          control={
            <Switch
              checked={formData.features?.distance || false}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  features: {
                    ...formData.features,
                    distance: e.target.checked,
                  },
                })
              }
            />
          }
          label="Distance Measurement"
        />

        <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleSave}
            disabled={saving}
            startIcon={<Save />}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={handleDelete}
            startIcon={<Delete />}
          >
            Delete
          </Button>
        </Box>
      </TabPanel>

      {/* Tab 1: Detection Classes */}
      <TabPanel value={activeTab} index={1}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Select which classes should be detected by the camera
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Selected: {formData.detection_classes?.length || 0} classes
          </Typography>
          {formData.detection_classes?.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
              {formData.detection_classes.map((cls: string) => (
                <Chip
                  key={cls}
                  label={cls}
                  size="small"
                  onDelete={() => handleClassToggle("detection_classes", cls)}
                  color="primary"
                />
              ))}
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {Object.entries(CLASSES_BY_MODEL).map(([modelName, classes]) => (
          <Accordion key={modelName}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography sx={{ textTransform: "capitalize" }}>
                {MODEL_DEFINITIONS[modelName]?.name ||
                  modelName.replace("_", " ")}
              </Typography>
              <Chip
                label={`${classes.filter((c) => formData.detection_classes?.includes(c)).length}/${classes.length}`}
                size="small"
                sx={{ ml: "auto", mr: 1 }}
              />
            </AccordionSummary>
            <AccordionDetails>
              <FormGroup>
                {classes.map((className) => (
                  <FormControlLabel
                    key={className}
                    control={
                      <Checkbox
                        checked={
                          formData.detection_classes?.includes(className) ||
                          false
                        }
                        onChange={() =>
                          handleClassToggle("detection_classes", className)
                        }
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">{className}</Typography>}
                  />
                ))}
              </FormGroup>
            </AccordionDetails>
          </Accordion>
        ))}

        <Button
          variant="contained"
          fullWidth
          onClick={handleSave}
          disabled={saving}
          startIcon={<Save />}
          sx={{ mt: 2 }}
        >
          Save Detection Classes
        </Button>
      </TabPanel>

      {/* Tab 2: Tracking Classes */}
      <TabPanel value={activeTab} index={2}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Select which classes should be tracked with unique IDs
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Selected: {formData.tracking_classes?.length || 0} classes
          </Typography>
          {formData.tracking_classes?.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
              {formData.tracking_classes.map((cls: string) => (
                <Chip
                  key={cls}
                  label={cls}
                  size="small"
                  onDelete={() => handleClassToggle("tracking_classes", cls)}
                  color="primary"
                />
              ))}
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {Object.entries(CLASSES_BY_MODEL).map(([modelName, classes]) => (
          <Accordion key={modelName}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography sx={{ textTransform: "capitalize" }}>
                {MODEL_DEFINITIONS[modelName]?.name ||
                  modelName.replace("_", " ")}
              </Typography>
              <Chip
                label={`${classes.filter((c) => formData.tracking_classes?.includes(c)).length}/${classes.length}`}
                size="small"
                sx={{ ml: "auto", mr: 1 }}
              />
            </AccordionSummary>
            <AccordionDetails>
              <FormGroup>
                {classes.map((className) => (
                  <FormControlLabel
                    key={className}
                    control={
                      <Checkbox
                        checked={
                          formData.tracking_classes?.includes(className) ||
                          false
                        }
                        onChange={() =>
                          handleClassToggle("tracking_classes", className)
                        }
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">{className}</Typography>}
                  />
                ))}
              </FormGroup>
            </AccordionDetails>
          </Accordion>
        ))}
        {/* Alert Configuration Section */}
        <Divider sx={{ my: 3 }}>
          <Chip icon={<Notifications />} label="Alert Thresholds" />
        </Divider>

        <Alert severity="info" sx={{ mb: 2 }}>
          Configure alerts for selected classes. Alerts will be sent via email
          and displayed in real-time.
        </Alert>

        {formData.tracking_classes?.map(
          (
            className: string, // Use speedClasses, distanceClasses for other tabs
          ) => (
            <Paper
              key={className}
              sx={{ p: 2, mb: 2, bgcolor: "background.default" }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  {className}
                </Typography>
                <Checkbox
                  checked={trackingAlerts[className]?.enabled || false}
                  onChange={(e) => {
                    setTrackingAlerts((prev) => ({
                      ...prev,
                      [className]: {
                        enabled: e.target.checked,
                        threshold: prev[className]?.threshold || 30,
                        condition: "over",
                      },
                    }));
                  }}
                />
              </Box>

              {trackingAlerts[className]?.enabled && (
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Condition</InputLabel>
                    <Select
                      value={trackingAlerts[className]?.condition || "over"}
                      onChange={(e) => {
                        setTrackingAlerts((prev) => ({
                          ...prev,
                          [className]: {
                            ...prev[className],
                            condition: e.target.value as "over" | "under",
                          },
                        }));
                      }}
                      label="Condition"
                      size="small"
                    >
                      <MenuItem value="over">Over</MenuItem>
                      <MenuItem value="under">Under</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Threshold (seconds)" // Use km/h for speed, meters for distance
                    type="number"
                    value={trackingAlerts[className]?.threshold || 30}
                    onChange={(e) => {
                      setTrackingAlerts((prev) => ({
                        ...prev,
                        [className]: {
                          ...prev[className],
                          threshold: parseFloat(e.target.value),
                        },
                      }));
                    }}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                </Box>
              )}
            </Paper>
          ),
        )}

        {/* Save Alert Configuration Button */}
        <Button
          variant="contained"
          fullWidth
          onClick={async () => {
            try {
              const alertConfig = {
                tracking_alerts: Object.entries(trackingAlerts) // Use speed_alerts, distance_alerts for other tabs
                  .filter(([_, config]) => config.enabled)
                  .map(([className, config]) => ({
                    enabled: true,
                    object_class: className,
                    threshold_seconds: config.threshold, // Use threshold_kmh, threshold_meters for other tabs
                    condition: config.condition,
                  })),
                email_enabled: formData.email_enabled,
                cooldown_seconds: formData.cooldown_seconds,
              };

              const response = await fetch(
                `http://localhost:8000/api/v1/alerts/${camera.id}/config`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(alertConfig),
                },
              );

              if (response.ok) {
                alert("Alert configuration saved!");
              } else {
                throw new Error("Failed to save alert configuration");
              }
            } catch (error) {
              console.error("Error saving alert configuration:", error);
              alert("Failed to save alert configuration");
            }
          }}
          startIcon={<Save />}
          sx={{ mt: 2 }}
        >
          Save Alert Configuration
        </Button>
        <Button
          variant="contained"
          fullWidth
          onClick={handleSave}
          disabled={saving}
          startIcon={<Save />}
          sx={{ mt: 2 }}
        >
          Save Tracking Classes
        </Button>
      </TabPanel>

      {/* Tab 3: Speed Detection Classes */}
      <TabPanel value={activeTab} index={3}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Select which classes should have speed calculated
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Selected: {formData.speed_classes?.length || 0} classes
          </Typography>
          {formData.speed_classes?.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
              {formData.speed_classes.map((cls: string) => (
                <Chip
                  key={cls}
                  label={cls}
                  size="small"
                  onDelete={() => handleClassToggle("speed_classes", cls)}
                  color="secondary"
                />
              ))}
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {Object.entries(CLASSES_BY_MODEL).map(([modelName, classes]) => (
          <Accordion key={modelName}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography sx={{ textTransform: "capitalize" }}>
                {MODEL_DEFINITIONS[modelName]?.name ||
                  modelName.replace("_", " ")}
              </Typography>
              <Chip
                label={`${classes.filter((c) => formData.speed_classes?.includes(c)).length}/${classes.length}`}
                size="small"
                sx={{ ml: "auto", mr: 1 }}
              />
            </AccordionSummary>
            <AccordionDetails>
              <FormGroup>
                {classes.map((className) => (
                  <FormControlLabel
                    key={className}
                    control={
                      <Checkbox
                        checked={
                          formData.speed_classes?.includes(className) || false
                        }
                        onChange={() =>
                          handleClassToggle("speed_classes", className)
                        }
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">{className}</Typography>}
                  />
                ))}
              </FormGroup>
            </AccordionDetails>
          </Accordion>
        ))}
        {/* Alert Configuration Section */}
        <Divider sx={{ my: 3 }}>
          <Chip icon={<Notifications />} label="Alert Thresholds" />
        </Divider>

        <Alert severity="info" sx={{ mb: 2 }}>
          Configure alerts for selected classes. Alerts will be sent via email
          and displayed in real-time.
        </Alert>

        {formData.speed_classes?.map(
          (
            className: string, // Use speedClasses, distanceClasses for other tabs
          ) => (
            <Paper
              key={className}
              sx={{ p: 2, mb: 2, bgcolor: "background.default" }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  {className}
                </Typography>
                <Checkbox
                  checked={speedAlerts[className]?.enabled || false}
                  onChange={(e) => {
                    setSpeedAlerts((prev) => ({
                      ...prev,
                      [className]: {
                        enabled: e.target.checked,
                        threshold: prev[className]?.threshold || 30,
                        condition: "over",
                      },
                    }));
                  }}
                />
              </Box>

              {speedAlerts[className]?.enabled && (
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Condition</InputLabel>
                    <Select
                      value={speedAlerts[className]?.condition || "over"}
                      onChange={(e) => {
                        setSpeedAlerts((prev) => ({
                          ...prev,
                          [className]: {
                            ...prev[className],
                            condition: e.target.value as "over" | "under",
                          },
                        }));
                      }}
                      label="Condition"
                      size="small"
                    >
                      <MenuItem value="over">Over</MenuItem>
                      <MenuItem value="under">Under</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Threshold (seconds)" // Use km/h for speed, meters for distance
                    type="number"
                    value={speedAlerts[className]?.threshold || 30}
                    onChange={(e) => {
                      setSpeedAlerts((prev) => ({
                        ...prev,
                        [className]: {
                          ...prev[className],
                          threshold: parseFloat(e.target.value),
                        },
                      }));
                    }}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                </Box>
              )}
            </Paper>
          ),
        )}

        {/* Save Alert Configuration Button */}
        <Button
          variant="contained"
          fullWidth
          onClick={async () => {
            try {
              const alertConfig = {
                speedAlerts: Object.entries(speedAlerts) // Use speed_alerts, distance_alerts for other tabs
                  .filter(([_, config]) => config.enabled)
                  .map(([className, config]) => ({
                    enabled: true,
                    object_class: className,
                    threshold_seconds: config.threshold, // Use threshold_kmh, threshold_meters for other tabs
                    condition: config.condition,
                  })),
                email_enabled: formData.email_enabled,
                cooldown_seconds: formData.cooldown_seconds,
              };

              const response = await fetch(
                `http://localhost:8000/api/v1/alerts/${camera.id}/config`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(alertConfig),
                },
              );

              if (response.ok) {
                alert("Alert configuration saved!");
              } else {
                throw new Error("Failed to save alert configuration");
              }
            } catch (error) {
              console.error("Error saving alert configuration:", error);
              alert("Failed to save alert configuration");
            }
          }}
          startIcon={<Save />}
          sx={{ mt: 2 }}
        >
          Save Alert Configuration
        </Button>
        <Button
          variant="contained"
          fullWidth
          onClick={handleSave}
          disabled={saving}
          startIcon={<Save />}
          sx={{ mt: 2 }}
        >
          Save Speed Classes
        </Button>
      </TabPanel>

      {/* Tab 4: Distance Detection Classes */}
      <TabPanel value={activeTab} index={4}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Select which classes should have distance calculated
        </Alert>

        {camera.is_calibrated ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Camera is calibrated ({camera.pixels_per_meter?.toFixed(2)} px/m)
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Camera not calibrated - distance will not work
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Selected: {formData.distance_classes?.length || 0} classes
          </Typography>
          {formData.distance_classes?.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
              {formData.distance_classes.map((cls: string) => (
                <Chip
                  key={cls}
                  label={cls}
                  size="small"
                  onDelete={() => handleClassToggle("distance_classes", cls)}
                  color="info"
                />
              ))}
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {Object.entries(CLASSES_BY_MODEL).map(([modelName, classes]) => (
          <Accordion key={modelName}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography sx={{ textTransform: "capitalize" }}>
                {MODEL_DEFINITIONS[modelName]?.name ||
                  modelName.replace("_", " ")}
              </Typography>
              <Chip
                label={`${classes.filter((c) => formData.distance_classes?.includes(c)).length}/${classes.length}`}
                size="small"
                sx={{ ml: "auto", mr: 1 }}
              />
            </AccordionSummary>
            <AccordionDetails>
              <FormGroup>
                {classes.map((className) => (
                  <FormControlLabel
                    key={className}
                    control={
                      <Checkbox
                        checked={
                          formData.distance_classes?.includes(className) ||
                          false
                        }
                        onChange={() =>
                          handleClassToggle("distance_classes", className)
                        }
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">{className}</Typography>}
                  />
                ))}
              </FormGroup>
            </AccordionDetails>
          </Accordion>
        ))}
        {/* Alert Configuration Section */}
        <Divider sx={{ my: 3 }}>
          <Chip icon={<Notifications />} label="Alert Thresholds" />
        </Divider>

        <Alert severity="info" sx={{ mb: 2 }}>
          Configure alerts for selected classes. Alerts will be sent via email
          and displayed in real-time.
        </Alert>

        {formData.distance_classes?.map(
          (
            className: string, // Use speedClasses, distanceClasses for other tabs
          ) => (
            <Paper
              key={className}
              sx={{ p: 2, mb: 2, bgcolor: "background.default" }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  {className}
                </Typography>
                <Checkbox
                  checked={distanceAlerts[className]?.enabled || false}
                  onChange={(e) => {
                    setDistanceAlerts((prev) => ({
                      ...prev,
                      [className]: {
                        enabled: e.target.checked,
                        threshold: prev[className]?.threshold || 30,
                        condition: "over",
                      },
                    }));
                  }}
                />
              </Box>

              {distanceAlerts[className]?.enabled && (
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Condition</InputLabel>
                    <Select
                      value={distanceAlerts[className]?.condition || "over"}
                      onChange={(e) => {
                        setDistanceAlerts((prev) => ({
                          ...prev,
                          [className]: {
                            ...prev[className],
                            condition: e.target.value as "over" | "under",
                          },
                        }));
                      }}
                      label="Condition"
                      size="small"
                    >
                      <MenuItem value="over">Over</MenuItem>
                      <MenuItem value="under">Under</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Threshold (seconds)" // Use km/h for speed, meters for distance
                    type="number"
                    value={distanceAlerts[className]?.threshold || 30}
                    onChange={(e) => {
                      setDistanceAlerts((prev) => ({
                        ...prev,
                        [className]: {
                          ...prev[className],
                          threshold: parseFloat(e.target.value),
                        },
                      }));
                    }}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                </Box>
              )}
            </Paper>
          ),
        )}

        {/* Save Alert Configuration Button */}
        <Button
          variant="contained"
          fullWidth
          onClick={async () => {
            try {
              const alertConfig = {
                distance_alerts: Object.entries(distanceAlerts) // Use speed_alerts, distance_alerts for other tabs
                  .filter(([_, config]) => config.enabled)
                  .map(([className, config]) => ({
                    enabled: true,
                    object_class: className,
                    threshold_seconds: config.threshold, // Use threshold_kmh, threshold_meters for other tabs
                    condition: config.condition,
                  })),
                email_enabled: formData.email_enabled,
                cooldown_seconds: formData.cooldown_seconds,
              };

              const response = await fetch(
                `http://localhost:8000/api/v1/alerts/${camera.id}/config`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(alertConfig),
                },
              );

              if (response.ok) {
                alert("Alert configuration saved!");
              } else {
                throw new Error("Failed to save alert configuration");
              }
            } catch (error) {
              console.error("Error saving alert configuration:", error);
              alert("Failed to save alert configuration");
            }
          }}
          startIcon={<Save />}
          sx={{ mt: 2 }}
        >
          Save Alert Configuration
        </Button>
        <Button
          variant="contained"
          fullWidth
          onClick={handleSave}
          disabled={saving}
          startIcon={<Save />}
          sx={{ mt: 2 }}
        >
          Save Distance Classes
        </Button>
      </TabPanel>

      <TabPanel value={activeTab} index={5}>
        {renderCalibrationTab()}
      </TabPanel>

      <TabPanel value={activeTab} index={6}>
        {renderDeviceControlTab()}
      </TabPanel>

      <TabPanel value={activeTab} index={7}>
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {/* Live Stats Summary */}
          <Paper
            sx={{
              p: 2,
              bgcolor: "background.default",
              borderLeft: 3,
              borderColor: "primary.main",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                📊 Live Statistics
              </Typography>
              <Button
                size="small"
                startIcon={<Refresh />}
                onClick={() => window.location.reload()}
              >
                Refresh
              </Button>
            </Box>
            {currentFrame &&
              (() => {
                const stats = getCategoryStats(currentFrame);
                return (
                  <>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Detections
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          {stats.detection.total}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Active Tracks
                        </Typography>
                        <Typography variant="h6" color="primary.main">
                          {stats.tracking.active}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Speed Monitored
                        </Typography>
                        <Typography variant="h6" color="warning.main">
                          {stats.speed.length}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Distance Tracked
                        </Typography>
                        <Typography variant="h6" color="info.main">
                          {stats.distance.length}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Frame Metadata */}
                    <Divider sx={{ my: 1 }} />
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr",
                        gap: 1,
                        fontSize: "0.75rem",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Frame ID:
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {currentFrame.frame_id}
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        Timestamp:
                      </Typography>
                      <Typography variant="caption">
                        {new Date(currentFrame.timestamp).toLocaleString()}
                      </Typography>

                      {currentFrame.processing_time && (
                        <>
                          <Typography variant="caption" color="text.secondary">
                            Processing Time:
                          </Typography>
                          <Typography variant="caption" color="warning.main">
                            {currentFrame.processing_time.toFixed(2)}ms
                          </Typography>
                        </>
                      )}

                      {currentFrame.fps && (
                        <>
                          <Typography variant="caption" color="text.secondary">
                            FPS:
                          </Typography>
                          <Typography variant="caption" color="success.main">
                            {currentFrame.fps.toFixed(1)}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </>
                );
              })()}
          </Paper>

          {/* Current Frame Details */}
          {currentFrame &&
            (() => {
              const stats = getCategoryStats(currentFrame);
              return (
                <Box
                  sx={{
                    flexGrow: 1,
                    overflow: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                  }}
                >
                  {/* Detection Section with Details */}
                  {stats.detection.total > 0 && (
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: "background.default",
                        borderLeft: 3,
                        borderColor: "success.main",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          fontWeight="bold"
                          color="success.main"
                        >
                          🎯 Detections ({stats.detection.total})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(currentFrame.timestamp)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        {Object.entries(stats.detection.byModel).map(
                          ([model, count]) => (
                            <Chip
                              key={model}
                              label={`${model.replace("_detection", "")}: ${count}`}
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          ),
                        )}
                      </Box>

                      {/* Detection Details */}
                      {currentFrame.results &&
                        Object.entries(currentFrame.results).map(
                          ([modelKey, modelData]: [string, any]) => {
                            if (
                              modelKey === "tracking" ||
                              !modelData.detections
                            )
                              return null;

                            return (
                              <Accordion
                                key={modelKey}
                                sx={{
                                  bgcolor: "background.paper",
                                  boxShadow: "none",
                                }}
                              >
                                <AccordionSummary expandIcon={<ExpandMore />}>
                                  <Typography variant="body2">
                                    {modelKey.replace("_detection", "")} -{" "}
                                    {modelData.detections.length} objects
                                  </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                  <List dense>
                                    {modelData.detections
                                      .slice(0, 10)
                                      .map((det: any, idx: number) => (
                                        <ListItem
                                          key={idx}
                                          sx={{ px: 0, py: 0.5 }}
                                        >
                                          <ListItemText
                                            primary={
                                              <Box
                                                sx={{
                                                  display: "flex",
                                                  justifyContent:
                                                    "space-between",
                                                  alignItems: "center",
                                                }}
                                              >
                                                <Typography
                                                  variant="body2"
                                                  fontWeight="bold"
                                                >
                                                  {det.class}
                                                </Typography>
                                                <Chip
                                                  label={`${(det.confidence * 100).toFixed(0)}%`}
                                                  size="small"
                                                  color={
                                                    det.confidence > 0.8
                                                      ? "success"
                                                      : "warning"
                                                  }
                                                  sx={{ height: 20 }}
                                                />
                                              </Box>
                                            }
                                            secondary={
                                              <Typography
                                                variant="caption"
                                                sx={{
                                                  fontFamily: "monospace",
                                                  fontSize: "0.65rem",
                                                }}
                                              >
                                                bbox: [{det?.bbox?.join(", ")}]
                                              </Typography>
                                            }
                                          />
                                        </ListItem>
                                      ))}
                                    {modelData.detections.length > 10 && (
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ pl: 2 }}
                                      >
                                        ... and{" "}
                                        {modelData.detections.length - 10} more
                                      </Typography>
                                    )}
                                  </List>
                                </AccordionDetails>
                              </Accordion>
                            );
                          },
                        )}
                    </Paper>
                  )}

                  {/* Tracking Section */}
                  {stats.tracking.objects.length > 0 && (
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: "background.default",
                        borderLeft: 3,
                        borderColor: "primary.main",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        color="primary.main"
                        gutterBottom
                      >
                        🎯 Tracked Objects ({stats.tracking.objects.length})
                      </Typography>
                      <List dense sx={{ p: 0 }}>
                        {stats.tracking.objects.map((obj) => (
                          <ListItem
                            key={obj.id}
                            sx={{
                              px: 1,
                              py: 0.5,
                              bgcolor: "action.hover",
                              borderRadius: 1,
                              mb: 0.5,
                            }}
                          >
                            <ListItemText
                              primary={
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Typography variant="body2" fontWeight="bold">
                                    {obj.class}
                                  </Typography>
                                  <Chip
                                    label={`ID: ${obj.id.slice(0, 8)}`}
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: "0.7rem",
                                      fontFamily: "monospace",
                                    }}
                                  />
                                </Box>
                              }
                              secondary={
                                <Box sx={{ display: "flex", gap: 2, mt: 0.5 }}>
                                  <Typography variant="caption">
                                    ⏱️ {obj.time?.toFixed(1)}s
                                  </Typography>
                                  <Typography variant="caption">
                                    📊 {(obj.confidence * 100).toFixed(0)}%
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  )}

                  {/* Speed Section */}
                  {stats.speed.length > 0 && (
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: "background.default",
                        borderLeft: 3,
                        borderColor: "warning.main",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        color="warning.main"
                        gutterBottom
                      >
                        🚀 Speed Monitoring ({stats.speed.length})
                      </Typography>
                      <List dense sx={{ p: 0 }}>
                        {stats.speed.map((obj) => (
                          <ListItem
                            key={obj.id}
                            sx={{
                              px: 1,
                              py: 0.5,
                              bgcolor: "action.hover",
                              borderRadius: 1,
                              mb: 0.5,
                            }}
                          >
                            <ListItemText
                              primary={
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Typography variant="body2">
                                    {obj.class}
                                  </Typography>
                                  <Chip
                                    label={obj.id.slice(0, 8)}
                                    size="small"
                                    sx={{
                                      height: 18,
                                      fontSize: "0.65rem",
                                      fontFamily: "monospace",
                                    }}
                                  />
                                </Box>
                              }
                              secondary={
                                <Box sx={{ display: "flex", gap: 2, mt: 0.5 }}>
                                  {obj.speed_kmh !== undefined && (
                                    <Typography
                                      variant="caption"
                                      fontWeight="bold"
                                      color="warning.main"
                                    >
                                      {obj.speed_kmh.toFixed(1)} km/h
                                    </Typography>
                                  )}
                                  {obj.speed_ms !== undefined && (
                                    <Typography variant="caption">
                                      ({obj.speed_ms.toFixed(2)} m/s)
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  )}

                  {/* Distance Section */}
                  {stats.distance.length > 0 && (
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: "background.default",
                        borderLeft: 3,
                        borderColor: "info.main",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        color="info.main"
                        gutterBottom
                      >
                        📏 Distance Tracking ({stats.distance.length})
                      </Typography>
                      <List dense sx={{ p: 0 }}>
                        {stats.distance.map((obj) => (
                          <ListItem
                            key={obj.id}
                            sx={{
                              px: 1,
                              py: 0.5,
                              bgcolor: "action.hover",
                              borderRadius: 1,
                              mb: 0.5,
                            }}
                          >
                            <ListItemText
                              primary={
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Typography variant="body2">
                                    {obj.class}
                                  </Typography>
                                  <Chip
                                    label={obj.id.slice(0, 8)}
                                    size="small"
                                    sx={{
                                      height: 18,
                                      fontSize: "0.65rem",
                                      fontFamily: "monospace",
                                    }}
                                  />
                                </Box>
                              }
                              secondary={
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 0.5,
                                    mt: 0.5,
                                  }}
                                >
                                  <Box sx={{ display: "flex", gap: 2 }}>
                                    <Typography
                                      variant="caption"
                                      fontWeight="bold"
                                      color="info.main"
                                    >
                                      📍 {obj.distance_m.toFixed(2)}m
                                    </Typography>
                                    <Typography variant="caption">
                                      ({obj.distance_ft.toFixed(1)}ft)
                                    </Typography>
                                  </Box>
                                  {obj.position && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontSize: "0.65rem",
                                        fontFamily: "monospace",
                                      }}
                                    >
                                      Position: ({obj.position.x.toFixed(1)},{" "}
                                      {obj.position.y.toFixed(1)})m
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  )}

                  {/* No Data Message */}
                  {stats.detection.total === 0 &&
                    stats.tracking.objects.length === 0 && (
                      <Paper
                        sx={{
                          p: 3,
                          textAlign: "center",
                          bgcolor: "background.default",
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          No detections or tracking data in current frame
                        </Typography>
                      </Paper>
                    )}
                </Box>
              );
            })()}

          {/* Historical Logs */}
          <Accordion defaultExpanded={false}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">
                📜 Frame History ({logs.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ maxHeight: 300, overflow: "auto" }}>
                {logs.slice(0, 20).map((log, i) => {
                  const stats = getCategoryStats(log.data);
                  return (
                    <Paper
                      key={i}
                      sx={{
                        p: 1.5,
                        mb: 1,
                        bgcolor: "background.default",
                        borderLeft: 2,
                        borderColor:
                          stats.detection.total > 0
                            ? "success.main"
                            : "divider",
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        {log.timestamp.toLocaleTimeString()}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          mt: 0.5,
                          flexWrap: "wrap",
                        }}
                      >
                        <Chip
                          label={`${stats.detection.total} detected`}
                          size="small"
                          sx={{ height: 20, fontSize: "0.65rem" }}
                        />
                        <Chip
                          label={`${stats.tracking.active} tracked`}
                          size="small"
                          color="primary"
                          sx={{ height: 20, fontSize: "0.65rem" }}
                        />
                        {stats.speed.length > 0 && (
                          <Chip
                            label={`${stats.speed.length} speed`}
                            size="small"
                            color="warning"
                            sx={{ height: 20, fontSize: "0.65rem" }}
                          />
                        )}
                        {stats.distance.length > 0 && (
                          <Chip
                            label={`${stats.distance.length} distance`}
                            size="small"
                            color="info"
                            sx={{ height: 20, fontSize: "0.65rem" }}
                          />
                        )}
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Developer Mode Toggle */}
          <FormControlLabel
            control={
              <Switch
                size="small"
                onChange={(e) => {
                  if (e.target.checked && currentFrame) {
                    console.log("Current Frame Data:", currentFrame);
                    console.log("All Logs:", logs);
                  }
                }}
              />
            }
            label={
              <Typography variant="caption">
                Developer Mode (logs to console)
              </Typography>
            }
            sx={{ mt: "auto", pt: 1, borderTop: 1, borderColor: "divider" }}
          />
        </Box>
      </TabPanel>
    </>
  );

  if (embedded) {
    return <Box sx={{ height: "90%", overflow: "auto" }}>{content}</Box>;
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      hideBackdrop={true}
      ModalProps={{
        keepMounted: true,
        disablePortal: false,
        BackdropProps: {
          invisible: true,
          sx: { backgroundColor: "transparent" },
        },
      }}
      sx={{
        "& .MuiDrawer-paper": {
          width: 450,
          borderLeft: 1,
          borderColor: "divider",
          boxShadow: "-4px 0 12px rgba(0,0,0,0.15)",
        },
      }}
    >
      {content}
    </Drawer>
  );
};
