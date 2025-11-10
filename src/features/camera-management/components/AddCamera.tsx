// src/features/camera-management/components/AddCamera.tsx - UPDATED WITH TABLE VIEW

import React, { useState, useRef } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Stepper, Step, StepLabel,
  Grid, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Alert, Chip, Divider, IconButton, Checkbox, FormGroup, CircularProgress
} from '@mui/material';
import { Videocam, NetworkCheck, Settings, Close, Visibility, VisibilityOff, Camera as CameraIcon } from '@mui/icons-material';
import { useTheme } from '@/contexts/ThemeContext';
import { ClassModelMapper } from '@utils/models/classModelMapper';
import { ALL_CLASSES, CLASSES_BY_CATEGORY, MODEL_DEFINITIONS } from '@utils/models/modelDefinitions';

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
    ipAddress: '192.168.1.2',
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
    trackingClasses: [] as string[],
    speedClasses: [] as string[],
    distanceClasses: [] as string[],
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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (!videoRef.current) return;

          videoRef.current.play()
          .then(() => {
            setTimeout(() => {
              if (videoRef.current && videoRef.current.videoWidth > 0) {
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

                  setConnectionStatus('success');
                  console.log('✅ Webcam connected:', {
                    width: videoRef.current.videoWidth,
                    height: videoRef.current.videoHeight
                  });
                }
              } else {
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

    const imgElement = previewRef.current;
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    const selectedRes = RESOLUTION_OPTIONS.find(r => r.value === formData.resolution);
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
        finalStreamUrl = 'webcam://0';
      } else {
        finalStreamUrl = formData.streamUrl ||
          `${formData.protocol}://${formData.username && formData.password ? `${formData.username}:${formData.password}@` : ''}${formData.ipAddress}:${formData.port}/stream`;
      }

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
        protocol: formData.protocol,
        ipAddress: formData.ipAddress,
        port: formData.port,
        sourceType: formData.sourceType
      };

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

  const renderClassSelection = () => {
    // Build a flat list of all classes with their categories
    const allClassesWithCategory: Array<{ className: string; category: string; model: string }> = [];

    Object.entries(CLASSES_BY_CATEGORY).forEach(([category, classes]) => {
      classes.forEach(className => {
        const modelInfo = Object.entries(MODEL_DEFINITIONS).find(([_, def]) =>
          def.classes.includes(className)
        );
        allClassesWithCategory.push({
          className,
          category,
          model: modelInfo ? modelInfo[1].name : 'Unknown'
        });
      });
    });

    // Sort by category then class name
    allClassesWithCategory.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.className.localeCompare(b.className);
    });

    const handleFeatureToggle = (className: string, feature: 'detection' | 'tracking' | 'speed' | 'distance') => {
      setFormData(prev => {
        const featureKey = feature === 'detection' ? 'selectedClasses' :
          feature === 'tracking' ? 'trackingClasses' :
            feature === 'speed' ? 'speedClasses' : 'distanceClasses';

        const currentList = prev[featureKey] || [];
        const isSelected = currentList.includes(className);

        // For detection, also update selectedClasses
        if (feature === 'detection') {
          return {
            ...prev,
            selectedClasses: isSelected
              ? currentList.filter(c => c !== className)
              : [...currentList, className]
          };
        }

        // For other features, check if detection is enabled
        if (!prev.selectedClasses.includes(className) && !isSelected) {
          // Auto-enable detection if not enabled
          return {
            ...prev,
            selectedClasses: [...prev.selectedClasses, className],
            [featureKey]: [...currentList, className]
          };
        }

        return {
          ...prev,
          [featureKey]: isSelected
            ? currentList.filter(c => c !== className)
            : [...currentList, className]
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
          <Typography variant="h6" gutterBottom>Configure Detection & Tracking</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select which classes to detect and which features to enable per class.
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={<span>🎯</span>}
              label={`Detection: ${getDetectionCount()} classes`}
              color={getDetectionCount() > 0 ? 'success' : 'default'}
              variant="outlined"
            />
            <Chip
              icon={<span>🔍</span>}
              label={`Tracking: ${getTrackingCount()} classes`}
              color={getTrackingCount() > 0 ? 'primary' : 'default'}
              variant="outlined"
            />
            <Chip
              icon={<span>⚡</span>}
              label={`Speed: ${getSpeedCount()} classes`}
              color={getSpeedCount() > 0 ? 'warning' : 'default'}
              variant="outlined"
            />
            <Chip
              icon={<span>📏</span>}
              label={`Distance: ${getDistanceCount()} classes`}
              color={getDistanceCount() > 0 ? 'info' : 'default'}
              variant="outlined"
            />
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ maxHeight: 500, overflow: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem'
            }}>
              <thead style={{
                position: 'sticky',
                top: 0,
                backgroundColor: darkMode ? '#1a1a1a' : '#f5f5f5',
                zIndex: 1,
                borderBottom: `2px solid ${darkMode ? '#333' : '#ddd'}`
              }}>
              <tr>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: 600,
                  minWidth: '180px'
                }}>
                  Class Name
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: 600,
                  minWidth: '120px'
                }}>
                  Category
                </th>
                <th style={{
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontWeight: 600,
                  width: '80px'
                }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <span>🎯</span>
                    <span style={{ fontSize: '0.75rem' }}>Detection</span>
                  </Box>
                </th>
                <th style={{
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontWeight: 600,
                  width: '80px'
                }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <span>🔍</span>
                    <span style={{ fontSize: '0.75rem' }}>Tracking</span>
                  </Box>
                </th>
                <th style={{
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontWeight: 600,
                  width: '80px'
                }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <span>⚡</span>
                    <span style={{ fontSize: '0.75rem' }}>Speed</span>
                  </Box>
                </th>
                <th style={{
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontWeight: 600,
                  width: '80px'
                }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <span>📏</span>
                    <span style={{ fontSize: '0.75rem' }}>Distance</span>
                  </Box>
                </th>
              </tr>
              </thead>
              <tbody>
              {allClassesWithCategory.map((item, index) => {
                const isDetectionEnabled = formData.selectedClasses?.includes(item.className);
                const isTrackingEnabled = formData.trackingClasses?.includes(item.className);
                const isSpeedEnabled = formData.speedClasses?.includes(item.className);
                const isDistanceEnabled = formData.distanceClasses?.includes(item.className);

                return (
                  <tr
                    key={item.className}
                    style={{
                      borderBottom: `1px solid ${darkMode ? '#333' : '#eee'}`,
                      backgroundColor: index % 2 === 0
                        ? (darkMode ? '#0a0a0a' : '#fafafa')
                        : 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = darkMode ? '#1a1a1a' : '#f0f0f0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = index % 2 === 0
                        ? (darkMode ? '#0a0a0a' : '#fafafa')
                        : 'transparent';
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {item.className}
                        </Typography>
                      </Box>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Chip
                        label={item.category}
                        size="small"
                        sx={{
                          fontSize: '0.7rem',
                          height: 24,
                          textTransform: 'capitalize'
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <Checkbox
                        checked={isDetectionEnabled}
                        onChange={() => handleFeatureToggle(item.className, 'detection')}
                        size="small"
                        color="success"
                      />
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <Checkbox
                        checked={isTrackingEnabled}
                        onChange={() => handleFeatureToggle(item.className, 'tracking')}
                        size="small"
                        color="primary"
                        disabled={!isDetectionEnabled}
                      />
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <Checkbox
                        checked={isSpeedEnabled}
                        onChange={() => handleFeatureToggle(item.className, 'speed')}
                        size="small"
                        color="warning"
                        disabled={!isDetectionEnabled}
                      />
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <Checkbox
                        checked={isDistanceEnabled}
                        onChange={() => handleFeatureToggle(item.className, 'distance')}
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
              {ClassModelMapper.getRequiredModels(formData.selectedClasses || []).map(m => m.name).join(', ') || 'None selected'}
            </Typography>
          </Alert>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                // Select all for detection
                const allClasses = allClassesWithCategory.map(item => item.className);
                setFormData(prev => ({ ...prev, selectedClasses: allClasses }));
              }}
            >
              Select All Detection
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                // Clear all selections
                setFormData(prev => ({
                  ...prev,
                  selectedClasses: [],
                  trackingClasses: [],
                  speedClasses: [],
                  distanceClasses: []
                }));
              }}
            >
              Clear All
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                // Enable tracking for all detected classes
                setFormData(prev => ({
                  ...prev,
                  trackingClasses: [...prev.selectedClasses]
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
      maxWidth: 1000,
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