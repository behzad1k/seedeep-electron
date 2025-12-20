// src/features/camera-management/components/AddCamera.tsx - UPDATED VERSION
// Changes:
// 1. Moved Class Selection to last step (step 4)
// 2. Added webcam support
// 3. Added manufacturer-specific RTSP/HTTP generators (Hikvision, Dahua, Axis, etc.)

import React, { useState, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  Divider,
  IconButton,
  Checkbox,
  FormGroup,
  CircularProgress,
  Radio,
  RadioGroup,
  Collapse,
  FormLabel,
} from "@mui/material";
import {
  Videocam,
  NetworkCheck,
  Settings,
  Close,
  Visibility,
  VisibilityOff,
  Camera as CameraIcon,
  Laptop,
  Info,
  CheckCircle,
} from "@mui/icons-material";
import { useTheme } from "@/contexts/ThemeContext";
import { ClassModelMapper } from "@utils/models/classModelMapper";
import {
  ALL_CLASSES,
  CLASSES_BY_CATEGORY,
  MODEL_DEFINITIONS,
} from "@utils/models/modelDefinitions";

interface AddCameraProps {
  onClose?: () => void;
  onSubmit?: (cameraData: any) => void;
}

const RESOLUTION_OPTIONS = [
  { value: "640x480", label: "480p (640×480)", width: 640, height: 480 },
  { value: "1280x720", label: "720p (1280×720)", width: 1280, height: 720 },
  { value: "1920x1080", label: "1080p (1920×1080)", width: 1920, height: 1080 },
  { value: "3840x2160", label: "4K (3840×2160)", width: 3840, height: 2160 },
];

const FPS_OPTIONS = [5, 10, 15, 20, 25, 30];

// Camera manufacturer configurations
const CAMERA_MANUFACTURERS = {
  onvif: {
    name: "ONVIF (Universal)",
    defaultPort: "80",
    protocols: ["onvif", "rtsp", "http"],
    urlTemplates: {
      onvif: "onvif://{username}:{password}@{ip}:{port}/onvif/device_service",
      rtsp: "rtsp://{username}:{password}@{ip}:554/onvif1",
      http: "http://{username}:{password}@{ip}:{port}/onvif/snapshot",
    },
    defaultUsername: "admin",
    defaultPassword: "admin",
    notes:
      "ONVIF standard - works with most modern IP cameras. Will auto-discover stream URLs.",
    supportsDiscovery: true,
  },
  hikvision: {
    name: "Hikvision",
    defaultPort: "554",
    protocols: ["rtsp", "http", "onvif"],
    urlTemplates: {
      rtsp_main:
        "rtsp://{username}:{password}@{ip}:{port}/Streaming/Channels/101",
      rtsp_sub:
        "rtsp://{username}:{password}@{ip}:{port}/Streaming/Channels/102",
      http: "http://{username}:{password}@{ip}/ISAPI/Streaming/channels/101/picture",
      onvif: "onvif://{username}:{password}@{ip}:80/onvif/device_service",
    },
    defaultUsername: "admin",
    defaultPassword: "admin12345",
    notes:
      "Supports RTSP, HTTP snapshots, and ONVIF. Channel 101 = Main Stream, 102 = Sub Stream",
  },
  dahua: {
    name: "Dahua",
    defaultPort: "554",
    protocols: ["rtsp", "http", "onvif"],
    urlTemplates: {
      rtsp_main:
        "rtsp://{username}:{password}@{ip}:{port}/cam/realmonitor?channel={channel}&subtype=0",
      rtsp_sub:
        "rtsp://{username}:{password}@{ip}:{port}/cam/realmonitor?channel={channel}&subtype=1",
      http: "http://{username}:{password}@{ip}/cgi-bin/snapshot.cgi?channel={channel}",
      onvif: "onvif://{username}:{password}@{ip}:80/onvif/device_service",
    },
    defaultUsername: "admin",
    defaultPassword: "admin",
    notes:
      "Supports RTSP, HTTP snapshots, and ONVIF. subtype=0 for main stream, subtype=1 for sub stream",
  },
  axis: {
    name: "Axis",
    defaultPort: "554",
    protocols: ["rtsp", "http", "onvif"],
    urlTemplates: {
      rtsp: "rtsp://{username}:{password}@{ip}:{port}/axis-media/media.amp",
      http: "http://{username}:{password}@{ip}:{port}/axis-cgi/mjpg/video.cgi",
      onvif: "onvif://{username}:{password}@{ip}:80/onvif/device_service",
    },
    defaultUsername: "root",
    defaultPassword: "pass",
    notes: "Supports RTSP, HTTP/MJPEG, and ONVIF streaming",
  },
  amcrest: {
    name: "Amcrest",
    defaultPort: "554",
    protocols: ["rtsp", "http", "onvif"],
    urlTemplates: {
      rtsp_main:
        "rtsp://{username}:{password}@{ip}:{port}/cam/realmonitor?channel={channel}&subtype=0",
      rtsp_sub:
        "rtsp://{username}:{password}@{ip}:{port}/cam/realmonitor?channel={channel}&subtype=1",
      http: "http://{username}:{password}@{ip}/cgi-bin/snapshot.cgi?channel={channel}",
      onvif: "onvif://{username}:{password}@{ip}:80/onvif/device_service",
    },
    defaultUsername: "admin",
    defaultPassword: "admin",
    notes: "Same as Dahua (OEM). Supports RTSP, HTTP, and ONVIF.",
  },
  foscam: {
    name: "Foscam",
    defaultPort: "88",
    protocols: ["rtsp", "http", "onvif"],
    urlTemplates: {
      rtsp_main: "rtsp://{username}:{password}@{ip}:{port}/videoMain",
      rtsp_sub: "rtsp://{username}:{password}@{ip}:{port}/videoSub",
      http: "http://{username}:{password}@{ip}:{port}/cgi-bin/CGIProxy.fcgi?cmd=snapPicture2",
      onvif: "onvif://{username}:{password}@{ip}:{port}/onvif/device_service",
    },
    defaultUsername: "admin",
    defaultPassword: "",
    notes: "Default port is 88, not 554. Supports RTSP, HTTP, and ONVIF.",
  },
  reolink: {
    name: "Reolink",
    defaultPort: "554",
    protocols: ["rtsp", "http", "onvif"],
    urlTemplates: {
      rtsp_main: "rtsp://{username}:{password}@{ip}:{port}/h264Preview_01_main",
      rtsp_sub: "rtsp://{username}:{password}@{ip}:{port}/h264Preview_01_sub",
      http: "http://{username}:{password}@{ip}/cgi-bin/api.cgi?cmd=Snap&channel=0",
      onvif: "onvif://{username}:{password}@{ip}:8000/onvif/device_service",
    },
    defaultUsername: "admin",
    defaultPassword: "",
    notes: "Supports RTSP, HTTP, and ONVIF. ONVIF port is 8000.",
  },
  custom: {
    name: "Custom/Other",
    defaultPort: "554",
    protocols: ["rtsp", "http", "rtmp", "onvif"],
    urlTemplates: {
      rtsp: "rtsp://{username}:{password}@{ip}:{port}/{path}",
      http: "http://{username}:{password}@{ip}:{port}/{path}",
      rtmp: "rtmp://{ip}:{port}/{path}",
      onvif: "onvif://{username}:{password}@{ip}:{port}/onvif/device_service",
    },
    defaultUsername: "admin",
    defaultPassword: "",
    notes: "Enter custom URL path. Try ONVIF for auto-discovery.",
  },
};

const AddCamera: React.FC<AddCameraProps> = ({ onClose, onSubmit }) => {
  const { darkMode } = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    sourceType: "ip_camera" as "ip_camera" | "webcam",
    manufacturer: "onvif" as keyof typeof CAMERA_MANUFACTURERS,
    streamType: "main" as "main" | "sub" | "custom",
    protocol: "rtsp" as "rtsp" | "rtmp" | "http" | "https" | "onvif",
    ipAddress: "192.168.1.64",
    port: "80",
    channel: "1",
    customPath: "",
    streamUrl: "",
    username: "admin",
    password: "",
    authRequired: true,
    resolution: "1920x1080",
    fps: 15,
    selectedClasses: [] as string[],
    trackingClasses: [] as string[],
    speedClasses: [] as string[],
    distanceClasses: [] as string[],
    trackingEnabled: false,
    speedEnabled: false,
    distanceEnabled: false,
    countingEnabled: false,
    calibrationMode: "reference_object" as
      | "reference_object"
      | "perspective"
      | "vanishing_point",
    calibrationPoints: [] as Array<{
      pixel_x: number;
      pixel_y: number;
      real_x: number;
      real_y: number;
    }>,
    referenceDistance: "",
    referenceHeight: "",
    perspectiveWidth: "",
    perspectiveHeight: "",
  });

  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [connectionError, setConnectionError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [previewFrame, setPreviewFrame] = useState<string | null>(null);
  const [previewDimensions, setPreviewDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [onvifDiscovering, setOnvifDiscovering] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);
  const previewRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // NEW: Updated steps - Class Selection moved to last
  const steps = [
    "Basic Information",
    "Camera Source",
    "Connection Test & Settings",
    "Class Selection & Features",
  ];

  const handleInputChange = (field: string) => (event: any) => {
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;

    // Auto-populate manufacturer defaults when manufacturer changes
    if (field === "manufacturer") {
      const manufacturer =
        CAMERA_MANUFACTURERS[value as keyof typeof CAMERA_MANUFACTURERS];
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        port: manufacturer.defaultPort,
        username: manufacturer.defaultUsername,
        password: manufacturer.defaultPassword,
        protocol: manufacturer.protocols[0] as any,
      }));
    }
    // Auto-update port when protocol changes
    else if (field === "protocol") {
      const manufacturer = CAMERA_MANUFACTURERS[formData.manufacturer];
      let newPort = formData.port;

      // Set default ports based on protocol
      if (value === "rtsp") newPort = "554";
      else if (value === "http" || value === "https") newPort = "80";
      else if (value === "rtmp") newPort = "1935";
      else if (value === "onvif") newPort = "80";

      setFormData((prev) => ({ ...prev, [field]: value, port: newPort }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  // ONVIF Discovery function
  const discoverOnvifDevices = async () => {
    setOnvifDiscovering(true);
    setDiscoveredDevices([]);

    try {
      // Call backend ONVIF discovery endpoint with current IP/credentials
      const response = await fetch(
        "http://localhost:8000/api/v1/ptz/discover",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ip: formData.ipAddress,
            port: parseInt(formData.port),
            username: formData.username,
            password: formData.password,
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.device) {
          // Build device info from ONVIF response
          const device = {
            ip: formData.ipAddress,
            port: formData.port,
            name: `${data.device.manufacturer} ${data.device.model}`,
            manufacturer: data.device.manufacturer,
            model: data.device.model,
            firmware: data.device.firmware,
            serial: data.device.serial,
            hardware_id: data.device.hardware_id,
            capabilities: data.capabilities,
            streams: data.streams,
          };

          setDiscoveredDevices([device]);

          // Auto-fill with discovered info
          setFormData((prev) => ({
            ...prev,
            name: prev.name || device.name,
            manufacturer: "onvif",
            protocol: "onvif",
          }));

          setConnectionError("");
        } else {
          setConnectionError("No ONVIF device found at this address");
        }
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Unknown error" }));
        setConnectionError(
          `ONVIF discovery failed: ${errorData.detail || "Invalid credentials or not an ONVIF device"}`,
        );
      }
    } catch (error: any) {
      console.error("ONVIF discovery error:", error);
      setConnectionError(
        error.message ||
          "ONVIF discovery failed. Check IP address and network connection.",
      );
    } finally {
      setOnvifDiscovering(false);
    }
  };

  const selectDiscoveredDevice = (device: any) => {
    // Auto-populate form with discovered device info
    setFormData((prev) => ({
      ...prev,
      ipAddress: device.ip,
      port: device.port.toString(),
      name: prev.name || device.name,
      manufacturer: "onvif",
      protocol: "onvif",
    }));

    // If device has streams, we can optionally set the stream URL
    if (device.streams && device.streams.length > 0) {
      // Use the first (usually main) stream
      const mainStream = device.streams[0];
      setFormData((prev) => ({
        ...prev,
        streamUrl: mainStream.uri,
        resolution: `${mainStream.width}x${mainStream.height}`,
        fps: mainStream.fps || prev.fps,
      }));
    }
  };

  const generateStreamUrl = () => {
    if (formData.sourceType === "webcam") {
      setFormData((prev) => ({ ...prev, streamUrl: "webcam://0" }));
      return;
    }

    const manufacturer = CAMERA_MANUFACTURERS[formData.manufacturer];
    let template = "";

    // Build template key based on protocol and stream type
    if (formData.protocol === "onvif") {
      template =
        manufacturer.urlTemplates.onvif ||
        manufacturer.urlTemplates[Object.keys(manufacturer.urlTemplates)[0]];
    } else if (formData.manufacturer === "custom") {
      template =
        manufacturer.urlTemplates[formData.protocol] ||
        manufacturer.urlTemplates.rtsp;
    } else {
      // For manufacturer-specific URLs, combine protocol and stream type
      const templateKey = `${formData.protocol}_${formData.streamType}`;
      template =
        manufacturer.urlTemplates[templateKey] ||
        manufacturer.urlTemplates[formData.protocol] ||
        manufacturer.urlTemplates[`${formData.protocol}_main`] ||
        Object.values(manufacturer.urlTemplates)[0];
    }

    // Replace placeholders
    let url = template
      .replace("{username}", formData.username)
      .replace("{password}", formData.password)
      .replace("{ip}", formData.ipAddress)
      .replace("{port}", formData.port)
      .replace("{channel}", formData.channel)
      .replace("{path}", formData.customPath);

    setFormData((prev) => ({ ...prev, streamUrl: url }));
    return url;
  };

  const testWebcamConnection = async () => {
    setConnectionStatus("testing");
    setConnectionError("");
    setPreviewFrame(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      setWebcamStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (!videoRef.current) return;

          videoRef.current
            .play()
            .then(() => {
              setTimeout(() => {
                if (videoRef.current && videoRef.current.videoWidth > 0) {
                  const canvas = document.createElement("canvas");
                  canvas.width = videoRef.current.videoWidth;
                  canvas.height = videoRef.current.videoHeight;
                  const ctx = canvas.getContext("2d");

                  if (ctx) {
                    ctx.drawImage(videoRef.current, 0, 0);
                    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
                    setPreviewFrame(dataUrl.split(",")[1]);

                    setPreviewDimensions({
                      width: videoRef.current.videoWidth,
                      height: videoRef.current.videoHeight,
                    });

                    setConnectionStatus("success");
                    console.log("✅ Webcam connected:", {
                      width: videoRef.current.videoWidth,
                      height: videoRef.current.videoHeight,
                    });
                  }
                } else {
                  setConnectionStatus("error");
                  setConnectionError("Unable to read video dimensions");
                }
              }, 500);
            })
            .catch((err) => {
              console.error("Play error:", err);
              setConnectionStatus("error");
              setConnectionError("Failed to play video: " + err.message);
            });
        };

        videoRef.current.onerror = () => {
          console.error("Video element error");
          setConnectionStatus("error");
          setConnectionError("Video error occurred");
        };
      }
    } catch (error: any) {
      console.error("Webcam error:", error);
      setConnectionStatus("error");
      setConnectionError(error.message || "Failed to access webcam");

      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
        setWebcamStream(null);
      }
    }
  };

  const testConnection = async () => {
    if (formData.sourceType === "webcam") {
      await testWebcamConnection();
      return;
    }

    setConnectionStatus("testing");
    setConnectionError("");
    setPreviewFrame(null);

    try {
      const rtspUrl = formData.streamUrl || generateStreamUrl();

      const response = await fetch(
        `http://localhost:8000/api/v1/cameras/test-connection`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rtsp_url: rtspUrl }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus("success");
        setPreviewFrame(data.preview_frame);
        setPreviewDimensions({ width: data.width, height: data.height });
      } else {
        setConnectionStatus("error");
        setConnectionError("Failed to connect to camera");
      }
    } catch (error: any) {
      setConnectionStatus("error");
      setConnectionError(error.message || "Connection failed");
    }
  };

  const handleCalibrationClick = (
    event: React.MouseEvent<HTMLImageElement>,
  ) => {
    if (!calibrationMode || !previewRef.current) return;

    // Limit points based on calibration mode
    const maxPoints =
      formData.calibrationMode === "reference_object"
        ? 2
        : formData.calibrationMode === "perspective"
          ? 4
          : 6;

    if (formData.calibrationPoints.length >= maxPoints) return;

    const rect = previewRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const imgElement = previewRef.current;
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    const selectedRes = RESOLUTION_OPTIONS.find(
      (r) => r.value === formData.resolution,
    );
    const actualWidth = selectedRes?.width || 1920;
    const actualHeight = selectedRes?.height || 1080;

    const scaleX = actualWidth / displayWidth;
    const scaleY = actualHeight / displayHeight;

    const actualX = clickX * scaleX;
    const actualY = clickY * scaleY;

    const newPoint = {
      pixel_x: actualX,
      pixel_y: actualY,
      real_x: 0,
      real_y: 0,
    };

    setFormData((prev) => ({
      ...prev,
      calibrationPoints: [...prev.calibrationPoints, newPoint],
    }));
  };

  const clearCalibrationPoints = () => {
    setFormData((prev) => ({ ...prev, calibrationPoints: [] }));
  };

  const calculatePixelsPerMeter = () => {
    if (formData.calibrationPoints.length < 2 || !formData.referenceDistance)
      return null;

    const p1 = formData.calibrationPoints[0];
    const p2 = formData.calibrationPoints[1];

    const pixelDistance = Math.sqrt(
      Math.pow(p2.pixel_x - p1.pixel_x, 2) +
        Math.pow(p2.pixel_y - p1.pixel_y, 2),
    );

    const realDistance = parseFloat(formData.referenceDistance);
    const pixelsPerMeter = pixelDistance / realDistance;

    return pixelsPerMeter;
  };

  const handleNext = () => {
    if (isStepValid()) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    try {
      const requiredModels = ClassModelMapper.getRequiredModels(
        formData.selectedClasses,
      );
      const [width, height] = formData.resolution.split("x").map(Number);

      let finalStreamUrl = "";
      if (formData.sourceType === "webcam") {
        finalStreamUrl = "webcam://0";
      } else {
        // Build RTSP URL (backend will also store components separately)
        finalStreamUrl =
          formData.streamUrl ||
          `${formData.protocol}://${formData.username && formData.password ? `${formData.username}:${formData.password}@` : ""}${formData.ipAddress}:${formData.port}/stream`;
      }

      let calibrationData = undefined;

      // Reference Object Method
      if (
        formData.calibrationMode === "reference_object" &&
        formData.calibrationPoints.length === 2 &&
        formData.referenceDistance
      ) {
        const refDist = parseFloat(formData.referenceDistance);
        calibrationData = {
          mode: "reference_object",
          points: [
            { ...formData.calibrationPoints[0], real_x: 0, real_y: 0 },
            { ...formData.calibrationPoints[1], real_x: refDist, real_y: 0 },
          ],
          reference_width_meters: refDist,
        };
      }

      // Perspective Transform Method
      else if (
        formData.calibrationMode === "perspective" &&
        formData.calibrationPoints.length === 4 &&
        formData.perspectiveWidth &&
        formData.perspectiveHeight
      ) {
        const width = parseFloat(formData.perspectiveWidth);
        const height = parseFloat(formData.perspectiveHeight);
        calibrationData = {
          mode: "perspective",
          points: [
            { ...formData.calibrationPoints[0], real_x: 0, real_y: 0 },
            { ...formData.calibrationPoints[1], real_x: width, real_y: 0 },
            { ...formData.calibrationPoints[2], real_x: width, real_y: height },
            { ...formData.calibrationPoints[3], real_x: 0, real_y: height },
          ],
          rectangle_width_meters: width,
          rectangle_height_meters: height,
        };
      }

      // Vanishing Point Method
      else if (
        formData.calibrationMode === "vanishing_point" &&
        formData.calibrationPoints.length === 6 &&
        formData.referenceHeight
      ) {
        const refHeight = parseFloat(formData.referenceHeight);
        calibrationData = {
          mode: "vanishing_point",
          parallel_lines: [
            [formData.calibrationPoints[0], formData.calibrationPoints[1]],
            [formData.calibrationPoints[2], formData.calibrationPoints[3]],
          ],
          reference_height_points: [
            formData.calibrationPoints[4],
            formData.calibrationPoints[5],
          ],
          reference_height_meters: refHeight,
        };
      }

      // NEW: Send connection fields separately
      const cameraData = {
        name: formData.name,
        location: formData.location,
        rtsp_url: finalStreamUrl,

        // NEW: Connection fields
        ip_address:
          formData.sourceType === "ip_camera" ? formData.ipAddress : null,
        username:
          formData.sourceType === "ip_camera" ? formData.username : null,
        password:
          formData.sourceType === "ip_camera" ? formData.password : null,

        // NEW: Ports
        rtsp_port: formData.protocol === "rtsp" ? parseInt(formData.port) : 554,
        onvif_port: 80, // Default ONVIF port
        http_port: formData.protocol === "http" ? parseInt(formData.port) : 80,

        // NEW: Stream details
        channel: formData.channel || "1",
        subtype: formData.streamType === "main" ? "0" : "1",
        stream_path:
          formData.customPath ||
          (formData.manufacturer === "dahua" ||
          formData.manufacturer === "amcrest"
            ? "cam/realmonitor"
            : null),
        manufacturer: formData.manufacturer,

        // Existing fields
        width,
        height,
        fps: formData.fps,
        selected_classes: formData.selectedClasses,
        active_models: requiredModels.map((m) => m.name),
        features: {
          detection: formData.selectedClasses.length > 0,
          tracking: formData.trackingClasses.length > 0,
          speed: formData.speedClasses.length > 0,
          distance: formData.distanceClasses.length > 0,
          counting: formData.countingEnabled,
          tracking_classes: formData.trackingClasses,
          speed_classes: formData.speedClasses,
          distance_classes: formData.distanceClasses,
          detection_classes: formData.selectedClasses,
        },
        calibration: calibrationData,
      };

      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
        setWebcamStream(null);
      }

      console.log("📹 Submitting camera data:", cameraData);

      await onSubmit?.(cameraData);
      onClose?.();
    } catch (error) {
      console.error("Error adding camera:", error);
      alert("Failed to add camera");
    }
  };

  React.useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [webcamStream]);

  const isStepValid = () => {
    switch (activeStep) {
      case 0:
        return formData.name.trim() && formData.location.trim();
      case 1:
        if (formData.sourceType === "webcam") return true;
        return formData.ipAddress && formData.port;
      case 2:
        return connectionStatus === "success";
      case 3:
        return formData.selectedClasses.length > 0;
      default:
        return false;
    }
  };

  const renderBasicInfo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Camera Information
        </Typography>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Camera Name"
          value={formData.name}
          onChange={handleInputChange("name")}
          required
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Location"
          value={formData.location}
          onChange={handleInputChange("location")}
          required
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Description"
          value={formData.description}
          onChange={handleInputChange("description")}
          multiline
          rows={3}
        />
      </Grid>
    </Grid>
  );

  const renderSourceConfig = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Camera Source
        </Typography>
      </Grid>

      {/* Source Type Selection */}
      <Grid item xs={12}>
        <FormControl component="fieldset">
          <Typography variant="subtitle2" gutterBottom>
            Select Source Type
          </Typography>
          <RadioGroup
            value={formData.sourceType}
            onChange={handleInputChange("sourceType")}
            row
          >
            <FormControlLabel
              value="ip_camera"
              control={<Radio />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Videocam />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      IP Camera
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Network camera via RTSP/HTTP/ONVIF
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <FormControlLabel
              value="webcam"
              control={<Radio />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Laptop />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      Webcam
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Local computer camera
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <Divider />
      </Grid>

      {formData.sourceType === "ip_camera" ? (
        <>
          {/* ONVIF Discovery Section */}
          <Grid item xs={12}>
            <Alert severity="info" icon={<Info />}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight="bold">
                    ONVIF Device Discovery
                  </Typography>
                  <Typography variant="caption">
                    Connect to camera using IP address and credentials to
                    discover capabilities
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  onClick={discoverOnvifDevices}
                  disabled={
                    onvifDiscovering ||
                    !formData.ipAddress ||
                    !formData.username ||
                    !formData.password
                  }
                  startIcon={
                    onvifDiscovering ? (
                      <CircularProgress size={16} />
                    ) : (
                      <NetworkCheck />
                    )
                  }
                >
                  {onvifDiscovering ? "Discovering..." : "Discover Camera"}
                </Button>
              </Box>
            </Alert>
          </Grid>

          {/* Connection Error */}
          {connectionError && !onvifDiscovering && (
            <Grid item xs={12}>
              <Alert severity="error" onClose={() => setConnectionError("")}>
                {connectionError}
              </Alert>
            </Grid>
          )}

          {/* Discovered Device Details */}
          {discoveredDevices.length > 0 && (
            <Grid item xs={12}>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: "success.dark",
                  border: 2,
                  borderColor: "success.main",
                }}
              >
                {discoveredDevices.map((device, idx) => (
                  <Box key={idx}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 2,
                      }}
                    >
                      <CheckCircle color="success" />
                      <Typography variant="h6" fontWeight="bold">
                        ONVIF Device Discovered!
                      </Typography>
                    </Box>

                    {/* Device Information */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Device Information
                      </Typography>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "auto 1fr",
                          gap: 1,
                          fontSize: "0.875rem",
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Name:
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {device.name}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          Manufacturer:
                        </Typography>
                        <Typography variant="body2">
                          {device.manufacturer}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          Model:
                        </Typography>
                        <Typography variant="body2">{device.model}</Typography>

                        <Typography variant="body2" color="text.secondary">
                          Firmware:
                        </Typography>
                        <Typography variant="body2">
                          {device.firmware}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          Serial:
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                        >
                          {device.serial}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Capabilities */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Capabilities
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        <Chip
                          label={
                            device.capabilities.ptz
                              ? "✓ PTZ Control"
                              : "✗ No PTZ"
                          }
                          size="small"
                          color={
                            device.capabilities.ptz ? "success" : "default"
                          }
                        />
                        <Chip
                          label={
                            device.capabilities.audio ? "✓ Audio" : "✗ No Audio"
                          }
                          size="small"
                          color={
                            device.capabilities.audio ? "success" : "default"
                          }
                        />
                        <Chip
                          label={`${device.streams.length} Stream${device.streams.length !== 1 ? "s" : ""}`}
                          size="small"
                          color="primary"
                        />
                      </Box>
                    </Box>

                    {/* Available Streams */}
                    {device.streams && device.streams.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Available Streams
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          {device.streams.map(
                            (stream: any, streamIdx: number) => (
                              <Paper
                                key={streamIdx}
                                sx={{
                                  p: 1.5,
                                  bgcolor: "background.paper",
                                  border: 1,
                                  borderColor:
                                    streamIdx === 0
                                      ? "primary.main"
                                      : "divider",
                                  cursor: "pointer",
                                  "&:hover": {
                                    borderColor: "primary.main",
                                    bgcolor: "action.hover",
                                  },
                                }}
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    streamUrl: stream.uri,
                                    resolution: `${stream.width}x${stream.height}`,
                                    fps: stream.fps || prev.fps,
                                  }));
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                  }}
                                >
                                  <Box>
                                    <Typography
                                      variant="body2"
                                      fontWeight="bold"
                                    >
                                      {stream.name}{" "}
                                      {streamIdx === 0 && "(Main Stream)"}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      display="block"
                                    >
                                      Resolution: {stream.width}x{stream.height}{" "}
                                      @ {stream.fps || "?"} FPS
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontFamily: "monospace",
                                        fontSize: "0.7rem",
                                        display: "block",
                                        mt: 0.5,
                                        color: "text.secondary",
                                      }}
                                    >
                                      {stream.uri}
                                    </Typography>
                                  </Box>
                                  {formData.streamUrl === stream.uri && (
                                    <CheckCircle
                                      color="primary"
                                      fontSize="small"
                                    />
                                  )}
                                </Box>
                              </Paper>
                            ),
                          )}
                        </Box>
                      </Box>
                    )}

                    <Alert severity="success" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        Device information has been auto-filled. Click on a
                        stream above to select it, or proceed with manual
                        configuration.
                      </Typography>
                    </Alert>
                  </Box>
                ))}
              </Paper>
            </Grid>
          )}

          <Grid item xs={12}>
            <Divider>
              <Typography variant="caption">
                {discoveredDevices.length > 0
                  ? "Or Configure Manually"
                  : "Enter Camera Details"}
              </Typography>
            </Divider>
          </Grid>

          {/* Manufacturer Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Camera Manufacturer</InputLabel>
              <Select
                value={formData.manufacturer}
                onChange={handleInputChange("manufacturer")}
                label="Camera Manufacturer"
              >
                {Object.entries(CAMERA_MANUFACTURERS).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    {config.name}
                    {key === "onvif" && " ⭐"}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Protocol Selection - NEW PROMINENT DROPDOWN */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Protocol</InputLabel>
              <Select
                value={formData.protocol}
                onChange={handleInputChange("protocol")}
                label="Protocol"
              >
                {CAMERA_MANUFACTURERS[formData.manufacturer].protocols.map(
                  (proto) => (
                    <MenuItem key={proto} value={proto}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {proto.toUpperCase()}
                        {proto === "onvif" && (
                          <Chip
                            label="Universal"
                            size="small"
                            color="primary"
                          />
                        )}
                        {proto === "rtsp" && (
                          <Chip label="Standard" size="small" />
                        )}
                        {proto === "http" && <Chip label="Web" size="small" />}
                      </Box>
                    </MenuItem>
                  ),
                )}
              </Select>
            </FormControl>
          </Grid>

          {/* Manufacturer Notes */}
          {CAMERA_MANUFACTURERS[formData.manufacturer].notes && (
            <Grid item xs={12}>
              <Alert severity="info" sx={{ fontSize: "0.875rem" }}>
                {CAMERA_MANUFACTURERS[formData.manufacturer].notes}
              </Alert>
            </Grid>
          )}

          {/* Stream Type (if not ONVIF or custom) */}
          {formData.protocol !== "onvif" &&
            formData.manufacturer !== "custom" && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Stream Quality</InputLabel>
                  <Select
                    value={formData.streamType}
                    onChange={handleInputChange("streamType")}
                    label="Stream Quality"
                  >
                    <MenuItem value="main">Main Stream (High Quality)</MenuItem>
                    <MenuItem value="sub">Sub Stream (Low Quality)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

          {/* IP Address and Port */}
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="IP Address"
              value={formData.ipAddress}
              onChange={handleInputChange("ipAddress")}
              placeholder="192.168.1.100"
              required
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Port"
              value={formData.port}
              onChange={handleInputChange("port")}
              type="number"
              required
              helperText={
                formData.protocol === "rtsp"
                  ? "Default: 554"
                  : formData.protocol === "http"
                    ? "Default: 80"
                    : formData.protocol === "onvif"
                      ? "Default: 80"
                      : formData.protocol === "rtmp"
                        ? "Default: 1935"
                        : ""
              }
            />
          </Grid>

          {/* Channel (for Dahua/Amcrest) */}
          {["dahua", "amcrest"].includes(formData.manufacturer) &&
            formData.protocol !== "onvif" && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Channel"
                  value={formData.channel}
                  onChange={handleInputChange("channel")}
                  placeholder="1"
                />
              </Grid>
            )}

          {/* Custom Path (for custom manufacturer or custom protocol) */}
          {formData.manufacturer === "custom" &&
            formData.protocol !== "onvif" && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Custom Path"
                  value={formData.customPath}
                  onChange={handleInputChange("customPath")}
                  placeholder="e.g., Streaming/Channels/101"
                  helperText="Enter the camera-specific path (without IP/port)"
                />
              </Grid>
            )}

          {/* Authentication */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.authRequired}
                  onChange={handleInputChange("authRequired")}
                />
              }
              label="Authentication Required"
            />
          </Grid>
          {formData.authRequired && (
            <>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={formData.username}
                  onChange={handleInputChange("username")}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange("password")}
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    ),
                  }}
                />
              </Grid>
            </>
          )}

          {/* Generated Stream URL */}
          <Grid item xs={12}>
            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                label="Generated Stream URL"
                value={formData.streamUrl}
                onChange={handleInputChange("streamUrl")}
                helperText="Auto-generated based on settings. You can edit manually."
                multiline
                maxRows={2}
              />
              <Button
                variant="outlined"
                onClick={generateStreamUrl}
                sx={{ minWidth: 120 }}
              >
                Generate
              </Button>
            </Box>
          </Grid>
        </>
      ) : (
        /* Webcam Info */
        <Grid item xs={12}>
          <Alert severity="info" icon={<Laptop />}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Using Local Webcam
            </Typography>
            <Typography variant="caption">
              This will use your computer's built-in camera or USB webcam.
              Perfect for testing, but not recommended for production
              monitoring.
            </Typography>
          </Alert>
        </Grid>
      )}
    </Grid>
  );

  const renderConnectionTest = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Connection Test & Settings
        </Typography>
      </Grid>

      {/* Camera Settings */}
      <Grid item xs={12} md={4}>
        <FormControl fullWidth>
          <InputLabel>Resolution</InputLabel>
          <Select
            value={formData.resolution}
            onChange={handleInputChange("resolution")}
            label="Resolution"
          >
            {RESOLUTION_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} md={4}>
        <FormControl fullWidth>
          <InputLabel>Frame Rate</InputLabel>
          <Select
            value={formData.fps}
            onChange={handleInputChange("fps")}
            label="Frame Rate"
          >
            {FPS_OPTIONS.map((fps) => (
              <MenuItem key={fps} value={fps}>
                {fps} FPS
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" gutterBottom>
          Test Connection
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <Button
          variant="outlined"
          startIcon={
            connectionStatus === "testing" ? (
              <CircularProgress size={16} />
            ) : (
              <NetworkCheck />
            )
          }
          onClick={testConnection}
          disabled={connectionStatus === "testing"}
          fullWidth
        >
          {connectionStatus === "testing" ? "Testing..." : "Test Connection"}
        </Button>
      </Grid>

      {/* Webcam Preview */}
      {formData.sourceType === "webcam" &&
        (connectionStatus === "testing" || connectionStatus === "success") && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {connectionStatus === "testing"
                  ? "Testing Webcam..."
                  : "Webcam Preview"}
              </Typography>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  maxHeight: "400px",
                  objectFit: "contain",
                  backgroundColor: "#000",
                }}
              />
            </Paper>
          </Grid>
        )}

      {/* IP Camera Preview */}
      {connectionStatus === "success" &&
        previewFrame &&
        formData.sourceType !== "webcam" && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Camera Preview
              </Typography>
              <Box
                sx={{
                  position: "relative",
                  cursor: calibrationMode ? "crosshair" : "default",
                }}
              >
                <img
                  ref={previewRef}
                  src={`data:image/jpeg;base64,${previewFrame}`}
                  alt="Camera preview"
                  style={{
                    width: "100%",
                    maxHeight: "400px",
                    objectFit: "contain",
                  }}
                  onClick={handleCalibrationClick}
                />
                {formData.calibrationPoints.map((point, idx) => {
                  if (!previewRef.current) return null;
                  const rect = previewRef.current.getBoundingClientRect();
                  const selectedRes = RESOLUTION_OPTIONS.find(
                    (r) => r.value === formData.resolution,
                  );
                  const scaleX = rect.width / (selectedRes?.width || 1920);
                  const scaleY = rect.height / (selectedRes?.height || 1080);

                  // Different colors and labels based on calibration mode
                  let color = "red";
                  let label = `${idx + 1}`;

                  if (formData.calibrationMode === "perspective") {
                    const colors = ["red", "blue", "green", "yellow"];
                    const labels = ["TL", "TR", "BR", "BL"];
                    color = colors[idx] || "red";
                    label = labels[idx] || `${idx + 1}`;
                  } else if (formData.calibrationMode === "vanishing_point") {
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
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        backgroundColor: color,
                        border: "2px solid white",
                        transform: "translate(-50%, -50%)",
                        zIndex: 10,
                      }}
                    >
                      <Typography
                        sx={{
                          position: "absolute",
                          top: -25,
                          left: -10,
                          color: "white",
                          backgroundColor: "rgba(0,0,0,0.7)",
                          px: 1,
                          borderRadius: 1,
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {label}
                      </Typography>
                    </Box>
                  );
                })}

                {/* Draw lines for visualization */}
                {previewRef.current && (
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
                    {/* Reference Object: Line between 2 points */}
                    {formData.calibrationMode === "reference_object" &&
                      formData.calibrationPoints.length === 2 &&
                      (() => {
                        const rect =
                          previewRef.current!.getBoundingClientRect();
                        const selectedRes = RESOLUTION_OPTIONS.find(
                          (r) => r.value === formData.resolution,
                        );
                        const scaleX =
                          rect.width / (selectedRes?.width || 1920);
                        const scaleY =
                          rect.height / (selectedRes?.height || 1080);
                        return (
                          <line
                            x1={formData.calibrationPoints[0].pixel_x * scaleX}
                            y1={formData.calibrationPoints[0].pixel_y * scaleY}
                            x2={formData.calibrationPoints[1].pixel_x * scaleX}
                            y2={formData.calibrationPoints[1].pixel_y * scaleY}
                            stroke="red"
                            strokeWidth="3"
                            strokeDasharray="5,5"
                          />
                        );
                      })()}

                    {/* Perspective: Rectangle */}
                    {formData.calibrationMode === "perspective" &&
                      formData.calibrationPoints.length === 4 &&
                      (() => {
                        const rect =
                          previewRef.current!.getBoundingClientRect();
                        const selectedRes = RESOLUTION_OPTIONS.find(
                          (r) => r.value === formData.resolution,
                        );
                        const scaleX =
                          rect.width / (selectedRes?.width || 1920);
                        const scaleY =
                          rect.height / (selectedRes?.height || 1080);
                        return (
                          <polygon
                            points={formData.calibrationPoints
                              .map(
                                (p) =>
                                  `${p.pixel_x * scaleX},${p.pixel_y * scaleY}`,
                              )
                              .join(" ")}
                            fill="rgba(255, 0, 0, 0.1)"
                            stroke="red"
                            strokeWidth="3"
                            strokeDasharray="5,5"
                          />
                        );
                      })()}

                    {/* Vanishing Point: Lines */}
                    {formData.calibrationMode === "vanishing_point" &&
                      (() => {
                        const rect =
                          previewRef.current!.getBoundingClientRect();
                        const selectedRes = RESOLUTION_OPTIONS.find(
                          (r) => r.value === formData.resolution,
                        );
                        const scaleX =
                          rect.width / (selectedRes?.width || 1920);
                        const scaleY =
                          rect.height / (selectedRes?.height || 1080);
                        return (
                          <>
                            {/* Line 1 */}
                            {formData.calibrationPoints.length >= 2 && (
                              <line
                                x1={
                                  formData.calibrationPoints[0].pixel_x * scaleX
                                }
                                y1={
                                  formData.calibrationPoints[0].pixel_y * scaleY
                                }
                                x2={
                                  formData.calibrationPoints[1].pixel_x * scaleX
                                }
                                y2={
                                  formData.calibrationPoints[1].pixel_y * scaleY
                                }
                                stroke="red"
                                strokeWidth="3"
                              />
                            )}
                            {/* Line 2 */}
                            {formData.calibrationPoints.length >= 4 && (
                              <line
                                x1={
                                  formData.calibrationPoints[2].pixel_x * scaleX
                                }
                                y1={
                                  formData.calibrationPoints[2].pixel_y * scaleY
                                }
                                x2={
                                  formData.calibrationPoints[3].pixel_x * scaleX
                                }
                                y2={
                                  formData.calibrationPoints[3].pixel_y * scaleY
                                }
                                stroke="blue"
                                strokeWidth="3"
                              />
                            )}
                            {/* Height reference */}
                            {formData.calibrationPoints.length === 6 && (
                              <line
                                x1={
                                  formData.calibrationPoints[4].pixel_x * scaleX
                                }
                                y1={
                                  formData.calibrationPoints[4].pixel_y * scaleY
                                }
                                x2={
                                  formData.calibrationPoints[5].pixel_x * scaleX
                                }
                                y2={
                                  formData.calibrationPoints[5].pixel_y * scaleY
                                }
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
              </Box>

              {/* Calibration Controls */}
              <Box sx={{ mt: 2 }}>
                <Button
                  variant={calibrationMode ? "contained" : "outlined"}
                  onClick={() => setCalibrationMode(!calibrationMode)}
                >
                  {calibrationMode
                    ? "Stop Calibration"
                    : "Start Calibration (Optional)"}
                </Button>
                {formData.calibrationPoints.length > 0 && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={clearCalibrationPoints}
                    sx={{ ml: 1 }}
                  >
                    Clear Points ({formData.calibrationPoints.length})
                  </Button>
                )}

                {calibrationMode && (
                  <Box sx={{ mt: 2 }}>
                    {/* Calibration Method Selection */}
                    <FormControl component="fieldset" sx={{ mb: 2 }}>
                      <FormLabel component="legend">
                        Calibration Method
                      </FormLabel>
                      <RadioGroup
                        value={formData.calibrationMode}
                        onChange={handleInputChange("calibrationMode")}
                        row
                      >
                        <FormControlLabel
                          value="reference_object"
                          control={<Radio size="small" />}
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                📏 Reference
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                2 points
                              </Typography>
                            </Box>
                          }
                        />
                        <FormControlLabel
                          value="perspective"
                          control={<Radio size="small" />}
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                🔲 Perspective
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                4 corners
                              </Typography>
                            </Box>
                          }
                        />
                        <FormControlLabel
                          value="vanishing_point"
                          control={<Radio size="small" />}
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                🎯 Vanishing
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                6 points
                              </Typography>
                            </Box>
                          }
                        />
                      </RadioGroup>
                    </FormControl>

                    {/* Method-specific instructions */}
                    {formData.calibrationMode === "reference_object" && (
                      <Alert
                        severity="info"
                        sx={{ mb: 2, fontSize: "0.85rem" }}
                      >
                        Click TWO points on an object with known distance (e.g.,
                        door width: 0.9m)
                      </Alert>
                    )}
                    {formData.calibrationMode === "perspective" && (
                      <Alert
                        severity="info"
                        sx={{ mb: 2, fontSize: "0.85rem" }}
                      >
                        Click FOUR corners of a rectangle in order: top-left,
                        top-right, bottom-right, bottom-left
                      </Alert>
                    )}
                    {formData.calibrationMode === "vanishing_point" && (
                      <Alert
                        severity="info"
                        sx={{ mb: 2, fontSize: "0.85rem" }}
                      >
                        1. Click two points on first parallel line
                        <br />
                        2. Click two points on second parallel line
                        <br />
                        3. Click two points on object with known height
                      </Alert>
                    )}

                    {/* Input fields based on calibration method */}
                    {formData.calibrationMode === "reference_object" && (
                      <>
                        <TextField
                          label="Distance between points (meters)"
                          type="number"
                          value={formData.referenceDistance}
                          onChange={handleInputChange("referenceDistance")}
                          size="small"
                          fullWidth
                          sx={{ mb: 1 }}
                          helperText={`Points selected: ${formData.calibrationPoints.length}/2`}
                        />
                        {formData.calibrationPoints.length === 2 &&
                          formData.referenceDistance && (
                            <Alert severity="success" sx={{ mt: 1 }}>
                              ✅ Ready! Pixels/meter:{" "}
                              {calculatePixelsPerMeter()?.toFixed(2)}
                            </Alert>
                          )}
                      </>
                    )}

                    {formData.calibrationMode === "perspective" && (
                      <>
                        <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                          <TextField
                            label="Width (m)"
                            type="number"
                            value={formData.perspectiveWidth}
                            onChange={handleInputChange("perspectiveWidth")}
                            size="small"
                            fullWidth
                          />
                          <TextField
                            label="Height (m)"
                            type="number"
                            value={formData.perspectiveHeight}
                            onChange={handleInputChange("perspectiveHeight")}
                            size="small"
                            fullWidth
                          />
                        </Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          Points: {formData.calibrationPoints.length}/4
                        </Typography>
                        {formData.calibrationPoints.length === 4 &&
                          formData.perspectiveWidth &&
                          formData.perspectiveHeight && (
                            <Alert severity="success" sx={{ mt: 1 }}>
                              ✅ Perspective calibration ready!
                            </Alert>
                          )}
                      </>
                    )}

                    {formData.calibrationMode === "vanishing_point" && (
                      <>
                        <TextField
                          label="Reference height (meters)"
                          type="number"
                          value={formData.referenceHeight}
                          onChange={handleInputChange("referenceHeight")}
                          size="small"
                          fullWidth
                          sx={{ mb: 1 }}
                          helperText={`Points: ${formData.calibrationPoints.length}/6 (Line1: ${Math.min(formData.calibrationPoints.length, 2)}/2, Line2: ${Math.max(0, Math.min(formData.calibrationPoints.length - 2, 2))}/2, Height: ${Math.max(0, Math.min(formData.calibrationPoints.length - 4, 2))}/2)`}
                        />
                        {formData.calibrationPoints.length === 6 &&
                          formData.referenceHeight && (
                            <Alert severity="success" sx={{ mt: 1 }}>
                              ✅ Vanishing point calibration ready!
                            </Alert>
                          )}
                      </>
                    )}
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        )}

      {/* Connection Error */}
      {connectionStatus === "error" && (
        <Grid item xs={12}>
          <Alert severity="error">{connectionError}</Alert>
        </Grid>
      )}
    </Grid>
  );

  const renderClassSelection = () => {
    const allClassesWithCategory: Array<{
      className: string;
      category: string;
      model: string;
    }> = [];

    Object.entries(CLASSES_BY_CATEGORY).forEach(([category, classes]) => {
      classes.forEach((className) => {
        const modelInfo = Object.entries(MODEL_DEFINITIONS).find(([_, def]) =>
          def.classes.includes(className),
        );
        allClassesWithCategory.push({
          className,
          category,
          model: modelInfo ? modelInfo[1].name : "Unknown",
        });
      });
    });

    allClassesWithCategory.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.className.localeCompare(b.className);
    });

    const handleFeatureToggle = (
      className: string,
      feature: "detection" | "tracking" | "speed" | "distance",
    ) => {
      setFormData((prev) => {
        const featureKey =
          feature === "detection"
            ? "selectedClasses"
            : feature === "tracking"
              ? "trackingClasses"
              : feature === "speed"
                ? "speedClasses"
                : "distanceClasses";

        const currentList = prev[featureKey] || [];
        const isSelected = currentList.includes(className);

        if (feature === "detection") {
          return {
            ...prev,
            selectedClasses: isSelected
              ? currentList.filter((c) => c !== className)
              : [...currentList, className],
          };
        }

        if (!prev.selectedClasses.includes(className) && !isSelected) {
          return {
            ...prev,
            selectedClasses: [...prev.selectedClasses, className],
            [featureKey]: [...currentList, className],
          };
        }

        return {
          ...prev,
          [featureKey]: isSelected
            ? currentList.filter((c) => c !== className)
            : [...currentList, className],
        };
      });
    };

    const getDetectionCount = () => formData.selectedClasses?.length || 0;
    const getTrackingCount = () => formData.trackingClasses?.length || 0;
    const getSpeedCount = () => formData.speedClasses?.length || 0;
    const getDistanceCount = () => formData.distanceClasses?.length || 0;

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Configure Detection & Tracking
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select which classes to detect and which features to enable per
            class.
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
            <Chip
              icon={<span>🎯</span>}
              label={`Detection: ${getDetectionCount()} classes`}
              color={getDetectionCount() > 0 ? "success" : "default"}
              variant="outlined"
            />
            <Chip
              icon={<span>🔍</span>}
              label={`Tracking: ${getTrackingCount()} classes`}
              color={getTrackingCount() > 0 ? "primary" : "default"}
              variant="outlined"
            />
            <Chip
              icon={<span>⚡</span>}
              label={`Speed: ${getSpeedCount()} classes`}
              color={getSpeedCount() > 0 ? "warning" : "default"}
              variant="outlined"
            />
            <Chip
              icon={<span>📏</span>}
              label={`Distance: ${getDistanceCount()} classes`}
              color={getDistanceCount() > 0 ? "info" : "default"}
              variant="outlined"
            />
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ maxHeight: 500, overflow: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.875rem",
              }}
            >
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  backgroundColor: darkMode ? "#1a1a1a" : "#f5f5f5",
                  zIndex: 1,
                  borderBottom: `2px solid ${darkMode ? "#333" : "#ddd"}`,
                }}
              >
                <tr>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      minWidth: "180px",
                    }}
                  >
                    Class Name
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      minWidth: "120px",
                    }}
                  >
                    Category
                  </th>
                  <th
                    style={{
                      padding: "12px 8px",
                      textAlign: "center",
                      fontWeight: 600,
                      width: "80px",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      <span>🎯</span>
                      <span style={{ fontSize: "0.75rem" }}>Detection</span>
                    </Box>
                  </th>
                  <th
                    style={{
                      padding: "12px 8px",
                      textAlign: "center",
                      fontWeight: 600,
                      width: "80px",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      <span>🔍</span>
                      <span style={{ fontSize: "0.75rem" }}>Tracking</span>
                    </Box>
                  </th>
                  <th
                    style={{
                      padding: "12px 8px",
                      textAlign: "center",
                      fontWeight: 600,
                      width: "80px",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      <span>⚡</span>
                      <span style={{ fontSize: "0.75rem" }}>Speed</span>
                    </Box>
                  </th>
                  <th
                    style={{
                      padding: "12px 8px",
                      textAlign: "center",
                      fontWeight: 600,
                      width: "80px",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      <span>📏</span>
                      <span style={{ fontSize: "0.75rem" }}>Distance</span>
                    </Box>
                  </th>
                </tr>
              </thead>
              <tbody>
                {allClassesWithCategory.map((item, index) => {
                  const isDetectionEnabled = formData.selectedClasses?.includes(
                    item.className,
                  );
                  const isTrackingEnabled = formData.trackingClasses?.includes(
                    item.className,
                  );
                  const isSpeedEnabled = formData.speedClasses?.includes(
                    item.className,
                  );
                  const isDistanceEnabled = formData.distanceClasses?.includes(
                    item.className,
                  );

                  return (
                    <tr
                      key={item.className}
                      style={{
                        borderBottom: `1px solid ${darkMode ? "#333" : "#eee"}`,
                        backgroundColor:
                          index % 2 === 0
                            ? darkMode
                              ? "#0a0a0a"
                              : "#fafafa"
                            : "transparent",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = darkMode
                          ? "#1a1a1a"
                          : "#f0f0f0";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          index % 2 === 0
                            ? darkMode
                              ? "#0a0a0a"
                              : "#fafafa"
                            : "transparent";
                      }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography variant="body2" fontWeight={500}>
                            {item.className}
                          </Typography>
                        </Box>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <Chip
                          label={item.category}
                          size="small"
                          sx={{
                            fontSize: "0.7rem",
                            height: 24,
                            textTransform: "capitalize",
                          }}
                        />
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "center" }}>
                        <Checkbox
                          checked={isDetectionEnabled}
                          onChange={() =>
                            handleFeatureToggle(item.className, "detection")
                          }
                          size="small"
                          color="success"
                        />
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "center" }}>
                        <Checkbox
                          checked={isTrackingEnabled}
                          onChange={() =>
                            handleFeatureToggle(item.className, "tracking")
                          }
                          size="small"
                          color="primary"
                          disabled={!isDetectionEnabled}
                        />
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "center" }}>
                        <Checkbox
                          checked={isSpeedEnabled}
                          onChange={() =>
                            handleFeatureToggle(item.className, "speed")
                          }
                          size="small"
                          color="warning"
                          disabled={!isDetectionEnabled}
                        />
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "center" }}>
                        <Checkbox
                          checked={isDistanceEnabled}
                          onChange={() =>
                            handleFeatureToggle(item.className, "distance")
                          }
                          size="small"
                          color="info"
                          disabled={!isDetectionEnabled}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Required Models
            </Typography>
            <Typography variant="body2">
              {ClassModelMapper.getRequiredModels(
                formData.selectedClasses || [],
              )
                .map((m) => m.name)
                .join(", ") || "None selected"}
            </Typography>
          </Alert>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                const allClasses = allClassesWithCategory.map(
                  (item) => item.className,
                );
                setFormData((prev) => ({
                  ...prev,
                  selectedClasses: allClasses,
                }));
              }}
            >
              Select All Detection
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  selectedClasses: [],
                  trackingClasses: [],
                  speedClasses: [],
                  distanceClasses: [],
                }));
              }}
            >
              Clear All
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  trackingClasses: [...prev.selectedClasses],
                }));
              }}
              disabled={!formData.selectedClasses?.length}
            >
              Enable Tracking for All Detected
            </Button>
          </Box>
        </Grid>
      </Grid>
    );
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderSourceConfig();
      case 2:
        return renderConnectionTest();
      case 3:
        return renderClassSelection();
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        maxWidth: 1000,
        mx: "auto",
        maxHeight: "90vh",
        overflow: "auto",
        bgcolor: "background.paper",
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">Add New Camera</Typography>
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </Box>

      <Paper sx={{ p: 3, bgcolor: "background.default" }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: 400, mb: 3 }}>{renderStepContent()}</Box>

        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            variant="outlined"
          >
            Back
          </Button>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button onClick={onClose} variant="outlined" color="inherit">
              Cancel
            </Button>
            {activeStep === steps.length - 1 ? (
              <Button
                onClick={handleSubmit}
                variant="contained"
                disabled={!isStepValid()}
                startIcon={<Videocam />}
              >
                Add Camera
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                variant="contained"
                disabled={!isStepValid()}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default AddCamera;
