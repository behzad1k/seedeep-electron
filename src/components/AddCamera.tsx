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
} from '@mui/material';
import {
  Videocam,
  NetworkCheck,
  Security,
  Settings,
  CheckCircle,
  Error,
  Refresh,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';

interface AddCameraProps {
  onClose?: () => void;
}

interface CameraFormData {
  // Basic Info
  name: string;
  description: string;
  location: string;

  // Connection Settings
  ipAddress: string;
  port: string;
  protocol: 'http' | 'https' | 'rtsp' | 'rtmp';
  streamUrl: string;

  // Authentication
  username: string;
  password: string;
  authRequired: boolean;

  // Camera Settings
  resolution: string;
  fps: string;
  quality: string;

  // Advanced Settings
  recordingEnabled: boolean;
  motionDetection: boolean;
  nightVision: boolean;
  audioEnabled: boolean;

  // Positioning
  latitude: string;
  longitude: string;
}

const AddCamera: React.FC<AddCameraProps> = ({ onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<CameraFormData>({
    name: '',
    description: '',
    location: '',
    ipAddress: '',
    port: '554',
    protocol: 'rtsp',
    streamUrl: '',
    username: '',
    password: '',
    authRequired: false,
    resolution: '1920x1080',
    fps: '30',
    quality: 'high',
    recordingEnabled: true,
    motionDetection: true,
    nightVision: false,
    audioEnabled: false,
    latitude: '',
    longitude: '',
  });

  const steps = [
    'Basic Information',
    'Network Configuration',
    'Authentication',
    'Camera Settings',
    'Review & Test'
  ];

  const handleInputChange = (field: keyof CameraFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    // Simulate connection test
    setTimeout(() => {
      // In real implementation, this would test the actual camera connection
      const success = Math.random() > 0.3; // 70% success rate for demo
      setConnectionStatus(success ? 'success' : 'error');
    }, 2000);
  };

  const generateStreamUrl = () => {
    if (formData.ipAddress && formData.port) {
      const url = `${formData.protocol}://${formData.ipAddress}:${formData.port}/stream`;
      setFormData(prev => ({ ...prev, streamUrl: url }));
    }
  };

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    // In real implementation, this would send data to your API
    console.log('Camera data:', formData);
    alert('Camera added successfully!');
    if (onClose) {
      onClose();
    }
  };

  const renderBasicInfo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Basic Camera Information</Typography>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Camera Name"
          value={formData.name}
          onChange={handleInputChange('name')}
          placeholder="e.g., Front Entrance"
          required
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
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Latitude"
          value={formData.latitude}
          onChange={handleInputChange('latitude')}
          placeholder="e.g., 40.7128"
          type="number"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Longitude"
          value={formData.longitude}
          onChange={handleInputChange('longitude')}
          placeholder="e.g., -74.0060"
          type="number"
        />
      </Grid>
    </Grid>
  );

  const renderNetworkConfig = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Network Configuration</Typography>
      </Grid>
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
            placeholder="Will be auto-generated"
          />
          <Button variant="outlined" onClick={generateStreamUrl}>
            Generate
          </Button>
        </Box>
      </Grid>
    </Grid>
  );

  const renderAuthentication = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Authentication Settings</Typography>
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
    </Grid>
  );

  const renderCameraSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Camera Settings</Typography>
      </Grid>
      <Grid item xs={12} md={4}>
        <FormControl fullWidth>
          <InputLabel>Resolution</InputLabel>
          <Select
            value={formData.resolution}
            onChange={handleInputChange('resolution')}
            label="Resolution"
          >
            <MenuItem value="1920x1080">1080p (1920×1080)</MenuItem>
            <MenuItem value="1280x720">720p (1280×720)</MenuItem>
            <MenuItem value="3840x2160">4K (3840×2160)</MenuItem>
            <MenuItem value="640x480">480p (640×480)</MenuItem>
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
            <MenuItem value="15">15 FPS</MenuItem>
            <MenuItem value="25">25 FPS</MenuItem>
            <MenuItem value="30">30 FPS</MenuItem>
            <MenuItem value="60">60 FPS</MenuItem>
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
        <Typography variant="subtitle1" gutterBottom>Features</Typography>
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
              checked={formData.nightVision}
              onChange={handleInputChange('nightVision')}
            />
          }
          label="Night Vision"
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
    </Grid>
  );

  const renderReview = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Review Configuration</Typography>
      </Grid>

      {/* Basic Info Card */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom color="primary">
              Basic Information
            </Typography>
            <Typography variant="body2"><strong>Name:</strong> {formData.name}</Typography>
            <Typography variant="body2"><strong>Location:</strong> {formData.location}</Typography>
            <Typography variant="body2"><strong>Description:</strong> {formData.description}</Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Network Config Card */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom color="primary">
              Network Configuration
            </Typography>
            <Typography variant="body2"><strong>IP Address:</strong> {formData.ipAddress}</Typography>
            <Typography variant="body2"><strong>Port:</strong> {formData.port}</Typography>
            <Typography variant="body2"><strong>Protocol:</strong> {formData.protocol.toUpperCase()}</Typography>
            <Typography variant="body2"><strong>Stream URL:</strong> {formData.streamUrl}</Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Camera Settings Card */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom color="primary">
              Camera Settings
            </Typography>
            <Typography variant="body2"><strong>Resolution:</strong> {formData.resolution}</Typography>
            <Typography variant="body2"><strong>Frame Rate:</strong> {formData.fps} FPS</Typography>
            <Typography variant="body2"><strong>Quality:</strong> {formData.quality}</Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Features Card */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom color="primary">
              Enabled Features
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {formData.recordingEnabled && <Chip label="Recording" color="success" size="small" />}
              {formData.motionDetection && <Chip label="Motion Detection" color="success" size="small" />}
              {formData.nightVision && <Chip label="Night Vision" color="success" size="small" />}
              {formData.audioEnabled && <Chip label="Audio" color="success" size="small" />}
              {formData.authRequired && <Chip label="Authentication" color="warning" size="small" />}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Connection Test */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2, backgroundColor: 'background.default' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="subtitle1">Connection Test</Typography>
            <Button
              variant="outlined"
              startIcon={connectionStatus === 'testing' ? <Refresh className="animate-spin" /> : <NetworkCheck />}
              onClick={testConnection}
              disabled={connectionStatus === 'testing' || !formData.ipAddress}
            >
              {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </Button>
          </Box>

          {connectionStatus === 'success' && (
            <Alert severity="success" icon={<CheckCircle />}>
              Connection successful! Camera is reachable and ready to add.
            </Alert>
          )}

          {connectionStatus === 'error' && (
            <Alert severity="error" icon={<Error />}>
              Connection failed. Please check your network settings and try again.
            </Alert>
          )}
        </Paper>
      </Grid>
    </Grid>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: return renderBasicInfo();
      case 1: return renderNetworkConfig();
      case 2: return renderAuthentication();
      case 3: return renderCameraSettings();
      case 4: return renderReview();
      default: return null;
    }
  };

  const isStepValid = () => {
    switch (activeStep) {
      case 0: return formData.name && formData.location;
      case 1: return formData.ipAddress && formData.port;
      case 2: return !formData.authRequired || (formData.username && formData.password);
      case 3: return true;
      case 4: return connectionStatus === 'success';
      default: return false;
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
              onClick={() => onClose && onClose()}
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