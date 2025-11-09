import React, { useState, useRef } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Stepper, Step, StepLabel,
  Grid, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Alert, Chip, Divider, IconButton, Checkbox, FormGroup, CircularProgress
} from '@mui/material';
import { Videocam, NetworkCheck, Settings, Close, Visibility, VisibilityOff, Camera as CameraIcon } from '@mui/icons-material';
import { useTheme } from '@/contexts/ThemeContext';
import { ClassModelMapper } from '@utils/models/classModelMapper';
import { ALL_CLASSES, CLASSES_BY_CATEGORY } from '@utils/models/modelDefinitions';

interface AddCameraProps {
  onClose?: () => void;
  onSubmit?: (cameraData: any) => void;
}

const RESOLUTION_OPTIONS = [
  { value: '640x480', label: '480p (640×480)', width: 640, height: 480 },
  { value: '1280x720', label: '720p (1280×720)', width: 1280, height: 720 },
  { value: '1920x1080', label: '1080p (1920×1080)', width: 1920, height: 1080 },
  { value: '3840x2160', label: '4K (3840×2160)', width: 3840, height: 2160 }
];

const FPS_OPTIONS = [5, 10, 15, 20, 25, 30];

const AddCamera: React.FC<AddCameraProps> = ({ onClose, onSubmit }) => {
  const { darkMode } = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    sourceType: 'rtsp' as 'rtsp' | 'ip_camera' | 'webcam',
    ipAddress: '',
    port: '554',
    protocol: 'rtsp' as 'rtsp' | 'rtmp' | 'http' | 'https',
    streamUrl: '',
    username: '',
    password: '',
    authRequired: false,
    resolution: '1920x1080',
    fps: 15,
    selectedClasses: [] as string[],
    trackingEnabled: false,
    speedEnabled: false,
    distanceEnabled: false,
    countingEnabled: false,
    calibrationPoints: [] as Array<{ pixel_x: number; pixel_y: number; real_x: number; real_y: number }>,
    referenceDistance: '',
  });

  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [previewFrame, setPreviewFrame] = useState<string | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const steps = ['Basic Information', 'Source Configuration', 'Class Selection', 'Features & Connection Test'];

  const handleInputChange = (field: string) => (event: any) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClassToggle = (className: string) => {
    setFormData(prev => ({
      ...prev,
      selectedClasses: prev.selectedClasses.includes(className)
        ? prev.selectedClasses.filter(c => c !== className)
        : [...prev.selectedClasses, className]
    }));
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    // Connection test logic...
    setTimeout(() => setConnectionStatus('success'), 1000);
  };

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    const requiredModels = ClassModelMapper.getRequiredModels(formData.selectedClasses);
    const [width, height] = formData.resolution.split('x').map(Number);

    const cameraData = {
      name: formData.name,
      location: formData.location,
      rtsp_url: formData.sourceType === 'webcam' ? 'webcam://0' : formData.streamUrl,
      width,
      height,
      fps: formData.fps,
      selected_classes: formData.selectedClasses,
      active_models: requiredModels.map(m => m.name),
      features: {
        detection: formData.selectedClasses.length > 0,
        tracking: formData.trackingEnabled,
        speed: formData.speedEnabled,
        distance: formData.distanceEnabled,
      }
    };

    await onSubmit?.(cameraData);
    onClose?.();
  };

  const renderBasicInfo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Camera Information</Typography>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField fullWidth label="Camera Name" value={formData.name} onChange={handleInputChange('name')} required />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField fullWidth label="Location" value={formData.location} onChange={handleInputChange('location')} required />
      </Grid>
    </Grid>
  );

  const renderSourceConfig = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Source Type</InputLabel>
          <Select value={formData.sourceType} onChange={handleInputChange('sourceType')} label="Source Type">
            <MenuItem value="webcam"><CameraIcon /> Webcam (for testing)</MenuItem>
            <MenuItem value="rtsp"><NetworkCheck /> RTSP/IP Camera</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      {formData.sourceType !== 'webcam' && (
        <>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="IP Address" value={formData.ipAddress} onChange={handleInputChange('ipAddress')} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Port" value={formData.port} onChange={handleInputChange('port')} type="number" />
          </Grid>
        </>
      )}
    </Grid>
  );

  const renderClassSelection = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="subtitle2" gutterBottom>Select Detection Classes</Typography>
      </Grid>
      {Object.entries(CLASSES_BY_CATEGORY).map(([category, classes]) => (
        <Grid item xs={12} key={category}>
          <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>{category}</Typography>
          <FormGroup row>
            {classes.map((className) => (
              <FormControlLabel
                key={className}
                control={<Checkbox checked={formData.selectedClasses.includes(className)} onChange={() => handleClassToggle(className)} />}
                label={className}
              />
            ))}
          </FormGroup>
        </Grid>
      ))}
    </Grid>
  );

  const renderFeaturesAndTest = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Button variant="outlined" onClick={testConnection} fullWidth startIcon={connectionStatus === 'testing' ? <CircularProgress size={16} /> : <NetworkCheck />}>
          {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
        </Button>
      </Grid>
      {connectionStatus === 'success' && <Grid item xs={12}><Alert severity="success">Connection successful!</Alert></Grid>}
      {connectionStatus === 'error' && <Grid item xs={12}><Alert severity="error">{connectionError}</Alert></Grid>}
    </Grid>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: return renderBasicInfo();
      case 1: return renderSourceConfig();
      case 2: return renderClassSelection();
      case 3: return renderFeaturesAndTest();
      default: return null;
    }
  };

  return (
    <Box sx={{
      p: 3,
      maxWidth: 900,
      mx: 'auto',
      maxHeight: '90vh',
      overflow: 'auto',
      bgcolor: 'background.paper',
      borderRadius: 2
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Add New Camera</Typography>
        <IconButton onClick={onClose}><Close /></IconButton>
      </Box>

      <Paper sx={{ p: 3, bgcolor: 'background.default' }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: 400, mb: 3 }}>
          {renderStepContent()}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined">Back</Button>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button onClick={onClose} variant="outlined" color="inherit">Cancel</Button>
            {activeStep === steps.length - 1 ? (
              <Button onClick={handleSubmit} variant="contained" startIcon={<Videocam />}>Add Camera</Button>
            ) : (
              <Button onClick={handleNext} variant="contained">Next</Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default AddCamera;