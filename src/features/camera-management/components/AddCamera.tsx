// src/features/camera-management/components/AddCamera.tsx - CALIBRATION & WEBCAM FIX

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
    channel: '',
    subChannel: '',
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
  const [previewDimensions, setPreviewDimensions] = useState({ width: 0, height: 0 });
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const previewRef = useRef<HTMLImageElement>(null);
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

  const generateStreamUrl = () => {
    if (formData.ipAddress && formData.port) {
      let url = `${formData.protocol}://${formData.ipAddress}:${formData.port}/stream`;
      if (formData.authRequired && formData.username && formData.password) {
        url = `${formData.protocol}://${formData.username}:${formData.password}@${formData.ipAddress}:${formData.port}/stream`;
      }
      if (formData.channel){
        url += ('?chID=' + formData.channel + '&streamType=' + (formData.subChannel || 'main'))
      }
      setFormData(prev => ({ ...prev, streamUrl: url }));
    }
  };

  const testWebcamConnection = async () => {
    setConnectionStatus('testing');
    setConnectionError('');
    setPreviewFrame(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      setWebcamStream(stream);
      console.log('h1');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('h2', stream);
        videoRef.current.onloadedmetadata = () => {
          if (!videoRef.current) return;

          videoRef.current.play()
          .then(() => {
            setTimeout(() => {
              if (videoRef.current && videoRef.current.videoWidth > 0) {
                console.log('h3');
                const canvas = document.createElement('canvas');
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                const ctx = canvas.getContext('2d');

                if (ctx) {
                  ctx.drawImage(videoRef.current, 0, 0);
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                  setPreviewFrame(dataUrl.split(',')[1]);

                  setPreviewDimensions({
                    width: videoRef.current.videoWidth,
                    height: videoRef.current.videoHeight
                  });

                  // FIX: Set status to success
                  setConnectionStatus('success');

                  console.log('✅ Webcam connected:', {
                    width: videoRef.current.videoWidth,
                    height: videoRef.current.videoHeight
                  });
                }
              } else {
                // If still no video dimensions, show error
                setConnectionStatus('error');
                setConnectionError('Unable to read video dimensions');
              }
            }, 500);
          })
          .catch(err => {
            console.error('Play error:', err);
            setConnectionStatus('error');
            setConnectionError('Failed to play video: ' + err.message);
          });
        };

        videoRef.current.onerror = () => {
          console.error('Video element error');
          setConnectionStatus('error');
          setConnectionError('Video error occurred');
        };
      }
    } catch (error: any) {
      console.error('Webcam error:', error);
      setConnectionStatus('error');
      setConnectionError(error.message || 'Failed to access webcam');

      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        setWebcamStream(null);
      }
    }
  };
  const testConnection = async () => {
    if (formData.sourceType === 'webcam') {
      await testWebcamConnection();
      return;
    }

    setConnectionStatus('testing');
    setConnectionError('');
    setPreviewFrame(null);

    try {
      const rtspUrl = formData.streamUrl || `${formData.protocol}://${formData.ipAddress}:${formData.port}/stream`;

      const response = await fetch(`http://localhost:8000/api/v1/cameras/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rtsp_url: rtspUrl })
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus('success');
        setPreviewFrame(data.preview_frame);
        setPreviewDimensions({ width: data.width, height: data.height });
      } else {
        setConnectionStatus('error');
        setConnectionError('Failed to connect to camera');
      }
    } catch (error: any) {
      setConnectionStatus('error');
      setConnectionError(error.message || 'Connection failed');
    }
  };

  const handleCalibrationClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!calibrationMode || !previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Get actual image dimensions
    const imgElement = previewRef.current;
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Get resolution from form
    const selectedRes = RESOLUTION_OPTIONS.find(r => r.value === formData.resolution);
    const actualWidth = selectedRes?.width || 1920;
    const actualHeight = selectedRes?.height || 1080;

    // Scale coordinates to actual resolution
    const scaleX = actualWidth / displayWidth;
    const scaleY = actualHeight / displayHeight;

    const actualX = clickX * scaleX;
    const actualY = clickY * scaleY;

    console.log('Click:', { clickX, clickY, actualX, actualY, scaleX, scaleY });

    const newPoint = {
      pixel_x: actualX,
      pixel_y: actualY,
      real_x: 0,
      real_y: 0
    };

    setFormData(prev => ({
      ...prev,
      calibrationPoints: [...prev.calibrationPoints, newPoint]
    }));
  };

  const clearCalibrationPoints = () => {
    setFormData(prev => ({ ...prev, calibrationPoints: [] }));
  };

  const calculatePixelsPerMeter = () => {
    if (formData.calibrationPoints.length < 2 || !formData.referenceDistance) return null;

    const p1 = formData.calibrationPoints[0];
    const p2 = formData.calibrationPoints[1];

    const pixelDistance = Math.sqrt(
      Math.pow(p2.pixel_x - p1.pixel_x, 2) + Math.pow(p2.pixel_y - p1.pixel_y, 2)
    );

    const realDistance = parseFloat(formData.referenceDistance);
    const pixelsPerMeter = pixelDistance / realDistance;

    return pixelsPerMeter;
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
      const requiredModels = ClassModelMapper.getRequiredModels(formData.selectedClasses);
      const [width, height] = formData.resolution.split('x').map(Number);

      let finalStreamUrl = '';
      if (formData.sourceType === 'webcam') {
        finalStreamUrl = 'webcam://0'; // Special indicator for webcam
      } else {
        finalStreamUrl = formData.streamUrl ||
          `${formData.protocol}://${formData.username && formData.password ? `${formData.username}:${formData.password}@` : ''}${formData.ipAddress}:${formData.port}/stream`;
      }

      // Build calibration data with corrected coordinates
      let calibrationData = undefined;
      if (formData.calibrationPoints.length >= 2 && formData.referenceDistance) {
        const refDist = parseFloat(formData.referenceDistance);
        calibrationData = {
          mode: 'reference_object',
          points: [
            { ...formData.calibrationPoints[0], real_x: 0, real_y: 0 },
            { ...formData.calibrationPoints[1], real_x: refDist, real_y: 0 }
          ],
          reference_width_meters: refDist
        };

        const ppm = calculatePixelsPerMeter();
        console.log('Calibration:', {
          points: calibrationData.points,
          pixelsPerMeter: ppm,
          refDistance: refDist
        });
      }

      const cameraData = {
        name: formData.name,
        location: formData.location,
        rtsp_url: finalStreamUrl,
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
          counting: formData.countingEnabled,
          tracking_classes: formData.trackingEnabled ? formData.selectedClasses : [],
          speed_classes: formData.speedEnabled ? formData.selectedClasses : [],
          distance_classes: formData.distanceEnabled ? formData.selectedClasses : [],
        },
        calibration: calibrationData,
        protocol: formData.protocol,
        ipAddress: formData.ipAddress,
        port: formData.port,
        sourceType: formData.sourceType
      };

      console.log('Submitting camera:', cameraData);

      // Stop webcam if used
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        setWebcamStream(null);
      }

      await onSubmit?.(cameraData);
      onClose?.();
    } catch (error) {
      console.error('Error adding camera:', error);
      alert('Failed to add camera');
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [webcamStream]);

  const isStepValid = () => {
    switch (activeStep) {
      case 0: return formData.name.trim() && formData.location.trim();
      case 1:
        if (formData.sourceType === 'webcam') return true;
        return formData.ipAddress && formData.port;
      case 2: return formData.selectedClasses.length > 0;
      case 3: return connectionStatus === 'success';
      default: return false;
    }
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
      <Grid item xs={12}>
        <TextField fullWidth label="Description" value={formData.description} onChange={handleInputChange('description')} multiline rows={3} />
      </Grid>
    </Grid>
  );

  const renderSourceConfig = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Camera Source</Typography>
      </Grid>

      {formData.sourceType !== 'webcam' && (
        <>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="IP Address" value={formData.ipAddress} onChange={handleInputChange('ipAddress')} placeholder="192.168.1.100" required />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Port" value={formData.port} onChange={handleInputChange('port')} placeholder="554" type="number" required />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Channel" value={formData.channel} onChange={handleInputChange('channel')} placeholder="1" />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Sub-Channel" value={formData.subChannel} onChange={handleInputChange('subChannel')} placeholder="main" />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Protocol</InputLabel>
              <Select value={formData.protocol} onChange={handleInputChange('protocol')} label="Protocol">
                <MenuItem value="rtsp">RTSP</MenuItem>
                <MenuItem value="rtmp">RTMP</MenuItem>
                <MenuItem value="http">HTTP</MenuItem>
                <MenuItem value="https">HTTPS</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box display="flex" gap={1}>
              <TextField fullWidth label="Stream URL" value={formData.streamUrl} onChange={handleInputChange('streamUrl')} placeholder="Auto-generated" />
              <Button variant="outlined" onClick={generateStreamUrl}>Generate</Button>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={formData.authRequired} onChange={handleInputChange('authRequired')} />}
              label="Authentication Required"
            />
          </Grid>
          {formData.authRequired && (
            <>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Username" value={formData.username} onChange={handleInputChange('username')} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={() => setShowPassword(!showPassword)}>
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
            Webcam mode uses your device's camera for testing. Not recommended for production.
          </Alert>
        </Grid>
      )}
    </Grid>
  );

  const renderClassSelection = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Select Detection Classes</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose objects to detect. Models will be automatically selected.
        </Typography>
      </Grid>

      {Object.entries(CLASSES_BY_CATEGORY).map(([category, classes]) => (
        <Grid item xs={12} key={category}>
          <Typography variant="subtitle2" gutterBottom sx={{ textTransform: 'capitalize' }}>{category}</Typography>
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

      <Grid item xs={12}>
        <Alert severity="info">
          Selected: {formData.selectedClasses.length} classes |
          Required models: {ClassModelMapper.getRequiredModels(formData.selectedClasses).map(m => m.name).join(', ') || 'None'}
        </Alert>
      </Grid>
    </Grid>
  );

  const renderFeaturesAndTest = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Features & Settings</Typography>
      </Grid>

      <Grid item xs={12} md={4}>
        <FormControl fullWidth>
          <InputLabel>Resolution</InputLabel>
          <Select value={formData.resolution} onChange={handleInputChange('resolution')} label="Resolution">
            {RESOLUTION_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} md={4}>
        <FormControl fullWidth>
          <InputLabel>Frame Rate</InputLabel>
          <Select value={formData.fps} onChange={handleInputChange('fps')} label="Frame Rate">
            {FPS_OPTIONS.map(fps => <MenuItem key={fps} value={fps}>{fps} FPS</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" gutterBottom>Advanced Features</Typography>
      </Grid>

      <Grid item xs={12} md={6}>
        <FormControlLabel control={<Switch checked={formData.trackingEnabled} onChange={handleInputChange('trackingEnabled')} />} label="Object Tracking" />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControlLabel control={<Switch checked={formData.speedEnabled} onChange={handleInputChange('speedEnabled')} />} label="Speed Detection" />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControlLabel control={<Switch checked={formData.distanceEnabled} onChange={handleInputChange('distanceEnabled')} />} label="Distance Measurement" />
      </Grid>

      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" gutterBottom>Connection Test</Typography>
      </Grid>

      <Grid item xs={12}>
        <Button
          variant="outlined"
          startIcon={connectionStatus === 'testing' ? <CircularProgress size={16} /> : <NetworkCheck />}
          onClick={testConnection}
          disabled={connectionStatus === 'testing'}
          fullWidth
        >
          {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
        </Button>
      </Grid>

      {formData.sourceType === 'webcam' && (connectionStatus === 'testing' || connectionStatus === 'success') && (
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {connectionStatus === 'testing' ? 'Testing Webcam...' : 'Webcam Preview'}
            </Typography>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                maxHeight: '400px',
                objectFit: 'contain',
                backgroundColor: '#000'
              }}
            />
          </Paper>
        </Grid>
      )}
      {connectionStatus === 'success' && previewFrame && formData.sourceType !== 'webcam' && (
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Camera Preview</Typography>
            <Box sx={{ position: 'relative', cursor: calibrationMode ? 'crosshair' : 'default' }}>
              <img
                ref={previewRef}
                src={`data:image/jpeg;base64,${previewFrame}`}
                alt="Camera preview"
                style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }}
                onClick={handleCalibrationClick}
              />
              {formData.calibrationPoints.map((point, idx) => {
                // Scale points back to display coordinates
                if (!previewRef.current) return null;
                const rect = previewRef.current.getBoundingClientRect();
                const selectedRes = RESOLUTION_OPTIONS.find(r => r.value === formData.resolution);
                const scaleX = rect.width / (selectedRes?.width || 1920);
                const scaleY = rect.height / (selectedRes?.height || 1080);

                return (
                  <Box
                    key={idx}
                    sx={{
                      position: 'absolute',
                      left: point.pixel_x * scaleX,
                      top: point.pixel_y * scaleY,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: 'red',
                      border: '2px solid white',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 10
                    }}
                  >
                    <Typography sx={{
                      position: 'absolute',
                      top: -25,
                      left: -10,
                      color: 'white',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      px: 1,
                      borderRadius: 1,
                      fontSize: '12px'
                    }}>
                      {idx + 1}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            <Box sx={{ mt: 2 }}>
              <Button variant={calibrationMode ? 'contained' : 'outlined'} onClick={() => setCalibrationMode(!calibrationMode)}>
                {calibrationMode ? 'Stop Calibration' : 'Start Calibration'}
              </Button>
              {formData.calibrationPoints.length > 0 && (
                <Button variant="outlined" color="error" onClick={clearCalibrationPoints} sx={{ ml: 1 }}>
                  Clear Points ({formData.calibrationPoints.length})
                </Button>
              )}

              {calibrationMode && (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    label="Reference Distance (meters)"
                    type="number"
                    value={formData.referenceDistance}
                    onChange={handleInputChange('referenceDistance')}
                    size="small"
                    sx={{ mr: 2 }}
                    helperText="Distance between the two points you'll click"
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Click two points on the camera that are <strong>{formData.referenceDistance || '?'} meters</strong> apart
                  </Typography>
                  <Typography variant="caption" color="primary" display="block">
                    Points selected: {formData.calibrationPoints.length}/2
                  </Typography>
                  {formData.calibrationPoints.length === 2 && formData.referenceDistance && (
                    <Alert severity="success" sx={{ mt: 1 }}>
                      Calibration ready! Pixels per meter: {calculatePixelsPerMeter()?.toFixed(2)}
                    </Alert>
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      )}

      {connectionStatus === 'error' && (
        <Grid item xs={12}>
          <Alert severity="error">{connectionError}</Alert>
        </Grid>
      )}
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
              <Button onClick={handleSubmit} variant="contained" disabled={!isStepValid()} startIcon={<Videocam />}>
                Add Camera
              </Button>
            ) : (
              <Button onClick={handleNext} variant="contained" disabled={!isStepValid()}>Next</Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default AddCamera;