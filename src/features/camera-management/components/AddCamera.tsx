import React, { useState } from 'react';
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
  Card,
  CardContent,
  IconButton,
  Checkbox,
  FormGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
} from '@mui/material';
import {
  Videocam,
  NetworkCheck,
  Settings,
  CheckCircle,
  Error,
  Refresh,
  Visibility,
  VisibilityOff,
  ExpandMore,
  SmartToy,
  TrackChanges,
  Upload,
  Link as LinkIcon,
} from '@mui/icons-material';

interface AddCameraProps {
  onClose?: () => void;
  onSubmit?: (cameraData: CameraFormData) => void;
  availableModels?: Array<{ name: string; classes: string[] }>;
}

interface CameraFormData {
  // Basic Info
  name: string;
  description: string;
  location: string;

  // Connection Settings
  sourceType: 'webcam' | 'ip_camera' | 'rtsp' | 'file_upload';
  ipAddress: string;
  port: string;
  protocol: 'http' | 'https' | 'rtsp' | 'rtmp';
  streamUrl: string;
  username: string;
  password: string;
  authRequired: boolean;

  // Camera Settings
  resolution: string;
  fps: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';

  // AI/ML Settings
  enableAI: boolean;
  selectedModels: string[];
  confidenceThreshold: number;
  trackingEnabled: boolean;
  trackingConfig: {
    trackerType: 'centroid' | 'kalman' | 'deep_sort';
    maxDisappeared: number;
    maxDistance: number;
  };

  // Features
  recordingEnabled: boolean;
  motionDetection: boolean;
  nightVision: boolean;
  audioEnabled: boolean;
  alertsEnabled: boolean;

  // Advanced
  calibrationEnabled: boolean;
  customStreamUrl: string;
  bufferSize: number;
  reconnectAttempts: number;
}

const INITIAL_FORM_DATA: CameraFormData = {
  name: '',
  description: '',
  location: '',
  sourceType: 'webcam',
  ipAddress: '',
  port: '554',
  protocol: 'rtsp',
  streamUrl: '',
  username: '',
  password: '',
  authRequired: false,
  resolution: '1920x1080',
  fps: 15,
  quality: 'medium',
  enableAI: true,
  selectedModels: [],
  confidenceThreshold: 0.5,
  trackingEnabled: false,
  trackingConfig: {
    trackerType: 'centroid',
    maxDisappeared: 30,
    maxDistance: 100
  },
  recordingEnabled: false,
  motionDetection: true,
  nightVision: false,
  audioEnabled: false,
  alertsEnabled: true,
  calibrationEnabled: false,
  customStreamUrl: '',
  bufferSize: 30,
  reconnectAttempts: 3
};

const RESOLUTION_OPTIONS = [
  { value: '640x480', label: '480p (640×480)' },
  { value: '1280x720', label: '720p (1280×720)' },
  { value: '1920x1080', label: '1080p (1920×1080)' },
  { value: '3840x2160', label: '4K (3840×2160)' }
];

const FPS_OPTIONS = [1, 2, 5, 10, 15, 20, 25, 30];

const AddCamera: React.FC<AddCameraProps> = ({
                                                      onClose,
                                                      onSubmit,
                                                      availableModels = [
                                                        { name: 'ppe_detection', classes: ['helmet', 'vest', 'person'] },
                                                        { name: 'face_detection', classes: ['mask', 'no_mask'] },
                                                        { name: 'general_detection', classes: ['car', 'truck', 'motorcycle'] },
                                                        { name: 'others_detection', classes: ['person', 'bicycle', 'car'] }
                                                      ]
                                                    }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<CameraFormData>(INITIAL_FORM_DATA);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  const steps = [
    'Basic Information',
    'Source Configuration',
    'AI & Detection',
    'Features & Settings',
    'Review & Test'
  ];

  const handleInputChange = (field: keyof CameraFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = event.target.type === 'checkbox' ?
      event.target.checked :
      event.target.value;

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (parent: keyof CameraFormData, field: string) => (
    event: React.ChangeEvent<HTMLInputElement> | any
  ) => {
    const value = event.target.type === 'checkbox' ?
      event.target.checked :
      event.target.value;

    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as any),
        [field]: value
      }
    }));
  };

  const handleModelToggle = (modelName: string) => {
    setFormData(prev => ({
      ...prev,
      selectedModels: prev.selectedModels.includes(modelName)
        ? prev.selectedModels.filter(m => m !== modelName)
        : [...prev.selectedModels, modelName]
    }));
  };

  const generateStreamUrl = () => {
    if (formData.sourceType === 'ip_camera' && formData.ipAddress && formData.port) {
      const url = `${formData.protocol}://${formData.ipAddress}:${formData.port}`;
      setFormData(prev => ({ ...prev, streamUrl: url }));
    }
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    setConnectionError('');

    try {
      if (formData.sourceType === 'webcam') {
        // Test webcam access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
        setPreviewStream(stream);
        setConnectionStatus('success');

        // Stop the test stream after a moment
        setTimeout(() => {
          stream.getTracks().forEach(track => track.stop());
          setPreviewStream(null);
        }, 3000);

      } else if (formData.sourceType === 'ip_camera' || formData.sourceType === 'rtsp') {
        // For IP cameras, we'll simulate a connection test
        // In a real implementation, you'd make an actual request to test the stream
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (formData.ipAddress && formData.port) {
          setConnectionStatus('success');
        } else {
          setConnectionStatus('error');
          setConnectionError('IP address and port are required');
        }
      } else {
        setConnectionStatus('success');
      }
    } catch (error: any) {
      setConnectionStatus('error');
      setConnectionError(error.message || 'Connection failed');
    }
  };

  const handleNext = () => {
    if (isStepValid()) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    try {
      const cameraData = {
        name: formData.name,
        location: formData.location,
        description: formData.description,
        rtsp_url: formData.streamUrl,
        width: parseInt(formData.resolution.split('x')[0]),
        height: parseInt(formData.resolution.split('x')[1]),
        fps: formData.fps,
        features: {
          detection: formData.enableAI,
          tracking: formData.trackingEnabled,
          speed: formData.trackingEnabled && formData.calibrationEnabled,
          counting: false,
        },
        active_models: formData.selectedModels,
      };

      const response = await fetch('http://localhost:8000/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cameraData),
      });

      if (response.ok) {
        const newCamera = await response.json();
        if (onSubmit) onSubmit(newCamera);
        alert('Camera added successfully!');
        onClose?.();
      } else {
        const error = await response.json();
        alert(`Failed to add camera: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding camera:', error);
      alert('Failed to add camera');
    }
  };
  const isStepValid = () => {
    switch (activeStep) {
      case 0:
        return formData.name.trim() && formData.location.trim();
      case 1:
        return formData.sourceType === 'webcam' ||
          (formData.ipAddress && formData.port) ||
          formData.customStreamUrl;
      case 2:
        return !formData.enableAI || formData.selectedModels.length > 0;
      case 3:
        return true;
      case 4:
        return connectionStatus === 'success' || formData.sourceType === 'file_upload';
      default:
        return false;
    }
  };

  // Step content renderers
  const renderBasicInfo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Camera Information</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Provide basic information about your camera
        </Typography>
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Camera Name"
          value={formData.name}
          onChange={handleInputChange('name')}
          placeholder="e.g., Front Entrance, Parking Lot"
          required
          helperText="Choose a unique, descriptive name"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Location"
          value={formData.location}
          onChange={handleInputChange('location')}
          placeholder="e.g., Building A - Ground Floor"
          required
          helperText="Physical location of the camera"
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Description"
          value={formData.description}
          onChange={handleInputChange('description')}
          placeholder="Brief description of camera purpose and coverage area"
          multiline
          rows={3}
          helperText="Optional: Add more details about this camera"
        />
      </Grid>
    </Grid>
  );

  const renderSourceConfig = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Camera Source</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure how to connect to your camera
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Source Type</InputLabel>
          <Select
            value={formData.sourceType}
            onChange={handleInputChange('sourceType')}
            label="Source Type"
          >
            <MenuItem value="webcam">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                 Webcam (USB/Built-in)
              </Box>
            </MenuItem>
            <MenuItem value="ip_camera">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NetworkCheck /> IP Camera
              </Box>
            </MenuItem>
            <MenuItem value="rtsp">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinkIcon /> RTSP Stream
              </Box>
            </MenuItem>
            <MenuItem value="file_upload">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Upload /> File Upload
              </Box>
            </MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {(formData.sourceType === 'ip_camera' || formData.sourceType === 'rtsp') && (
        <>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="IP Address"
              value={formData.ipAddress}
              onChange={handleInputChange('ipAddress')}
              placeholder="e.g., 192.168.1.100"
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Port"
              value={formData.port}
              onChange={handleInputChange('port')}
              placeholder="e.g., 554"
              type="number"
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Protocol</InputLabel>
              <Select
                value={formData.protocol}
                onChange={handleInputChange('protocol')}
                label="Protocol"
              >
                <MenuItem value="rtsp">RTSP</MenuItem>
                <MenuItem value="rtmp">RTMP</MenuItem>
                <MenuItem value="http">HTTP</MenuItem>
                <MenuItem value="https">HTTPS</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                label="Stream URL"
                value={formData.streamUrl}
                onChange={handleInputChange('streamUrl')}
                placeholder="Auto-generated or custom URL"
              />
              <Button variant="outlined" onClick={generateStreamUrl}>
                Generate
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.authRequired}
                  onChange={handleInputChange('authRequired')}
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
                  onChange={handleInputChange('username')}
                  placeholder="Camera username"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  placeholder="Camera password"
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    ),
                  }}
                />
              </Grid>
            </>
          )}
        </>
      )}

      {formData.sourceType === 'webcam' && (
        <Grid item xs={12}>
          <Alert severity="info">
            This will use your device's built-in camera or connected USB camera.
            Make sure you grant camera permissions when prompted.
          </Alert>
        </Grid>
      )}

      {formData.sourceType === 'file_upload' && (
        <Grid item xs={12}>
          <Alert severity="info">
            You can upload video files for processing. Supported formats: MP4, AVI, MOV, MKV.
          </Alert>
        </Grid>
      )}
    </Grid>
  );

  const renderAISettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>AI Detection & Tracking</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure AI models and object tracking
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.enableAI}
              onChange={handleInputChange('enableAI')}
            />
          }
          label="Enable AI Detection"
        />
      </Grid>

      {formData.enableAI && (
        <>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Available AI Models
            </Typography>
            <FormGroup>
              {availableModels.map((model) => (
                <Box key={model.name} sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.selectedModels.includes(model.name)}
                        onChange={() => handleModelToggle(model.name)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">
                          {model.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          {model.classes.map((cls) => (
                            <Chip
                              key={cls}
                              label={cls}
                              size="small"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </Box>
                      </Box>
                    }
                  />
                </Box>
              ))}
            </FormGroup>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography gutterBottom>
              Confidence Threshold: {(formData.confidenceThreshold * 100).toFixed(0)}%
            </Typography>
            <Slider
              value={formData.confidenceThreshold}
              onChange={(_, value) => setFormData(prev => ({
                ...prev,
                confidenceThreshold: value as number
              }))}
              min={0.1}
              max={1.0}
              step={0.05}
              marks={[
                { value: 0.3, label: '30%' },
                { value: 0.5, label: '50%' },
                { value: 0.7, label: '70%' },
                { value: 0.9, label: '90%' }
              ]}
            />
          </Grid>

          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrackChanges />
                  <Typography>Object Tracking Settings</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.trackingEnabled}
                          onChange={handleInputChange('trackingEnabled')}
                        />
                      }
                      label="Enable Object Tracking"
                    />
                  </Grid>

                  {formData.trackingEnabled && (
                    <>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Tracker Type</InputLabel>
                          <Select
                            value={formData.trackingConfig.trackerType}
                            onChange={handleNestedInputChange('trackingConfig', 'trackerType')}
                            label="Tracker Type"
                          >
                            <MenuItem value="centroid">Centroid</MenuItem>
                            <MenuItem value="kalman">Kalman Filter</MenuItem>
                            <MenuItem value="deep_sort">DeepSORT</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Max Disappeared Frames"
                          type="number"
                          value={formData.trackingConfig.maxDisappeared}
                          onChange={handleNestedInputChange('trackingConfig', 'maxDisappeared')}
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Max Distance (pixels)"
                          type="number"
                          value={formData.trackingConfig.maxDistance}
                          onChange={handleNestedInputChange('trackingConfig', 'maxDistance')}
                        />
                      </Grid>
                    </>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </>
      )}
    </Grid>
  );

  const renderFeatures = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Features & Settings</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure camera features and quality settings
        </Typography>
      </Grid>

      <Grid item xs={12} md={4}>
        <FormControl fullWidth>
          <InputLabel>Resolution</InputLabel>
          <Select
            value={formData.resolution}
            onChange={handleInputChange('resolution')}
            label="Resolution"
          >
            {RESOLUTION_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
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
            onChange={handleInputChange('fps')}
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

      <Grid item xs={12} md={4}>
        <FormControl fullWidth>
          <InputLabel>Quality</InputLabel>
          <Select
            value={formData.quality}
            onChange={handleInputChange('quality')}
            label="Quality"
          >
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="ultra">Ultra</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" gutterBottom>Camera Features</Typography>
      </Grid>

      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.recordingEnabled}
              onChange={handleInputChange('recordingEnabled')}
            />
          }
          label="Enable Recording"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.motionDetection}
              onChange={handleInputChange('motionDetection')}
            />
          }
          label="Motion Detection"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.alertsEnabled}
              onChange={handleInputChange('alertsEnabled')}
            />
          }
          label="Enable Alerts"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.audioEnabled}
              onChange={handleInputChange('audioEnabled')}
            />
          }
          label="Audio Recording"
        />
      </Grid>

      <Grid item xs={12}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Advanced Settings</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Buffer Size (seconds)"
                  type="number"
                  value={formData.bufferSize}
                  onChange={handleInputChange('bufferSize')}
                  helperText="How long to buffer video data"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Reconnect Attempts"
                  type="number"
                  value={formData.reconnectAttempts}
                  onChange={handleInputChange('reconnectAttempts')}
                  helperText="Number of reconnection attempts"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.calibrationEnabled}
                      onChange={handleInputChange('calibrationEnabled')}
                    />
                  }
                  label="Enable Calibration for Distance Measurement"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Grid>
    </Grid>
  );

  const renderReview = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Review Configuration</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Review your camera settings before adding
        </Typography>
      </Grid>

      {/* Basic Info Card */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom color="primary">
              <Videocam sx={{ mr: 1, verticalAlign: 'middle' }} />
              Basic Information
            </Typography>
            <Typography variant="body2"><strong>Name:</strong> {formData.name}</Typography>
            <Typography variant="body2"><strong>Location:</strong> {formData.location}</Typography>
            {formData.description && (
              <Typography variant="body2"><strong>Description:</strong> {formData.description}</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Source Config Card */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom color="primary">
              <NetworkCheck sx={{ mr: 1, verticalAlign: 'middle' }} />
              Source Configuration
            </Typography>
            <Typography variant="body2"><strong>Type:</strong> {formData.sourceType.replace('_', ' ').toUpperCase()}</Typography>
            {formData.ipAddress && <Typography variant="body2"><strong>IP:</strong> {formData.ipAddress}:{formData.port}</Typography>}
            {formData.streamUrl && <Typography variant="body2"><strong>URL:</strong> {formData.streamUrl}</Typography>}
            <Typography variant="body2"><strong>Protocol:</strong> {formData.protocol.toUpperCase()}</Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* AI Settings Card */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom color="primary">
              <SmartToy sx={{ mr: 1, verticalAlign: 'middle' }} />
              AI & Detection
            </Typography>
            <Typography variant="body2"><strong>AI Enabled:</strong> {formData.enableAI ? 'Yes' : 'No'}</Typography>
            {formData.enableAI && (
              <>
                <Typography variant="body2"><strong>Models:</strong> {formData.selectedModels.length}</Typography>
                <Typography variant="body2"><strong>Confidence:</strong> {(formData.confidenceThreshold * 100).toFixed(0)}%</Typography>
                <Typography variant="body2"><strong>Tracking:</strong> {formData.trackingEnabled ? 'Enabled' : 'Disabled'}</Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Quality Settings Card */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom color="primary">
              <Settings sx={{ mr: 1, verticalAlign: 'middle' }} />
              Quality & Features
            </Typography>
            <Typography variant="body2"><strong>Resolution:</strong> {formData.resolution}</Typography>
            <Typography variant="body2"><strong>Frame Rate:</strong> {formData.fps} FPS</Typography>
            <Typography variant="body2"><strong>Quality:</strong> {formData.quality}</Typography>
            <Box sx={{ mt: 1 }}>
              {formData.recordingEnabled && <Chip label="Recording" size="small" sx={{ mr: 0.5 }} />}
              {formData.motionDetection && <Chip label="Motion Detection" size="small" sx={{ mr: 0.5 }} />}
              {formData.alertsEnabled && <Chip label="Alerts" size="small" sx={{ mr: 0.5 }} />}
              {formData.trackingEnabled && <Chip label="Tracking" size="small" sx={{ mr: 0.5 }} />}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Connection Test */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, backgroundColor: 'background.default' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="subtitle1">Connection Test</Typography>
            <Button
              variant="outlined"
              startIcon={connectionStatus === 'testing' ? <Refresh className="animate-spin" /> : <NetworkCheck />}
              onClick={testConnection}
              disabled={connectionStatus === 'testing'}
            >
              {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </Button>
          </Box>

          {connectionStatus === 'success' && (
            <Alert severity="success" icon={<CheckCircle />}>
              Connection successful! Camera is ready to be added.
            </Alert>
          )}

          {connectionStatus === 'error' && (
            <Alert severity="error" icon={<Error />}>
              Connection failed: {connectionError || 'Please check your settings and try again.'}
            </Alert>
          )}

          {connectionStatus === 'idle' && formData.sourceType !== 'file_upload' && (
            <Alert severity="info">
              Click "Test Connection" to verify your camera settings before adding.
            </Alert>
          )}
        </Paper>
      </Grid>
    </Grid>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: return renderBasicInfo();
      case 1: return renderSourceConfig();
      case 2: return renderAISettings();
      case 3: return renderFeatures();
      case 4: return renderReview();
      default: return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Add New Camera
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: 400, mb: 3 }}>
          {renderStepContent()}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            variant="outlined"
          >
            Back
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              onClick={onClose}
              variant="outlined"
              color="inherit"
            >
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