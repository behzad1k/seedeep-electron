import { BackendCamera } from '@shared/types';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormGroup,
  Chip,
  Alert,
} from '@mui/material';
import {
  Close,
  ExpandMore,
  Save,
  Speed,
  TrackChanges,
  Straighten,
  Visibility,
} from '@mui/icons-material';

interface FeatureConfigSidebarProps {
  open: boolean;
  camera: BackendCamera | null;
  darkMode: boolean;
  onClose: () => void;
  onSave: (cameraId: string, features: any) => Promise<void>;
}

interface AvailableClass {
  name: string;
  model: string;
  category: string;
}

const AVAILABLE_CLASSES: AvailableClass[] = [
  // PPE Detection
  { name: 'person', model: 'ppe_detection', category: 'People' },
  { name: 'helmet', model: 'ppe_detection', category: 'Safety' },
  { name: 'vest', model: 'ppe_detection', category: 'Safety' },
  { name: 'mask', model: 'face_detection', category: 'Safety' },
  { name: 'no_mask', model: 'face_detection', category: 'Safety' },

  // Vehicles
  { name: 'car', model: 'general_detection', category: 'Vehicles' },
  { name: 'truck', model: 'general_detection', category: 'Vehicles' },
  { name: 'bus', model: 'general_detection', category: 'Vehicles' },
  { name: 'motorcycle', model: 'general_detection', category: 'Vehicles' },
  { name: 'bicycle', model: 'general_detection', category: 'Vehicles' },

  // Safety
  { name: 'fire', model: 'fire_detection', category: 'Hazards' },
  { name: 'smoke', model: 'fire_detection', category: 'Hazards' },
  { name: 'weapon', model: 'weapon_detection', category: 'Hazards' },
];

export const FeatureConfigSidebar: React.FC<FeatureConfigSidebarProps> = ({
                                                                            open,
                                                                            camera,
                                                                            darkMode,
                                                                            onClose,
                                                                            onSave,
                                                                          }) => {
  const [features, setFeatures] = useState({
    detection: true,
    tracking: false,
    speed: false,
    distance: false,
    counting: false,
    tracking_classes: [] as string[],
    speed_classes: [] as string[],
    distance_classes: [] as string[],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (camera && camera.features) {
      setFeatures({
        detection: camera.features.detection ?? true,
        tracking: camera.features.tracking ?? false,
        speed: camera.features.speed ?? false,
        distance: camera.features.distance ?? false,
        counting: camera.features.counting ?? false,
        tracking_classes: camera.features.tracking_classes || [],
        speed_classes: camera.features.speed_classes || [],
        distance_classes: camera.features.distance_classes || [],
      });
    }
  }, [camera]);

  const handleFeatureToggle = (feature: keyof typeof features) => {
    setFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  const handleClassToggle = (
    type: 'tracking_classes' | 'speed_classes' | 'distance_classes',
    className: string
  ) => {
    setFeatures(prev => {
      const current = prev[type] as string[];
      const updated = current.includes(className)
        ? current.filter(c => c !== className)
        : [...current, className];

      return { ...prev, [type]: updated };
    });
  };

  const handleSelectAll = (
    type: 'tracking_classes' | 'speed_classes' | 'distance_classes'
  ) => {
    const allClasses = AVAILABLE_CLASSES.map(c => c.name);
    setFeatures(prev => ({ ...prev, [type]: allClasses }));
  };

  const handleDeselectAll = (
    type: 'tracking_classes' | 'speed_classes' | 'distance_classes'
  ) => {
    setFeatures(prev => ({ ...prev, [type]: [] }));
  };

  const handleSave = async () => {
    if (!camera) return;

    setSaving(true);
    setError(null);

    try {
      await onSave(camera.id, features);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const groupedClasses = AVAILABLE_CLASSES.reduce((acc, cls) => {
    if (!acc[cls.category]) {
      acc[cls.category] = [];
    }
    acc[cls.category].push(cls);
    return acc;
  }, {} as Record<string, AvailableClass[]>);

  if (!camera) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 450,
          backgroundColor: darkMode ? '#1a1a1a' : '#ffffff',
          borderLeft: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
        },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: `1px solid ${darkMode ? '#333' : '#e0e0e0'}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            Feature Configuration
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {camera.name}
        </Typography>
        {!camera.is_calibrated && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Camera not calibrated. Speed and distance features require calibration.
          </Alert>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Main Features */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            Features
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={features.detection}
                onChange={() => handleFeatureToggle('detection')}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Visibility fontSize="small" />
                <Typography variant="body2">Object Detection</Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={features.tracking}
                onChange={() => handleFeatureToggle('tracking')}
                disabled={!features.detection}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrackChanges fontSize="small" />
                <Typography variant="body2">Object Tracking</Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={features.speed}
                onChange={() => handleFeatureToggle('speed')}
                disabled={!features.tracking || !camera.is_calibrated}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Speed fontSize="small" />
                <Typography variant="body2">Speed Detection</Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={features.distance}
                onChange={() => handleFeatureToggle('distance')}
                disabled={!features.tracking || !camera.is_calibrated}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Straighten fontSize="small" />
                <Typography variant="body2">Distance Measurement</Typography>
              </Box>
            }
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Object Class Selection */}
        {features.tracking && (
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2" fontWeight="bold">
                Tracking Classes ({features.tracking_classes.length} selected)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  onClick={() => handleSelectAll('tracking_classes')}
                >
                  Select All
                </Button>
                <Button
                  size="small"
                  onClick={() => handleDeselectAll('tracking_classes')}
                >
                  Clear
                </Button>
              </Box>

              {Object.entries(groupedClasses).map(([category, classes]) => (
                <Box key={category} sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    {category}
                  </Typography>
                  <FormGroup>
                    {classes.map(cls => (
                      <FormControlLabel
                        key={cls.name}
                        control={
                          <Checkbox
                            size="small"
                            checked={features.tracking_classes.includes(cls.name)}
                            onChange={() => handleClassToggle('tracking_classes', cls.name)}
                          />
                        }
                        label={<Typography variant="body2">{cls.name}</Typography>}
                      />
                    ))}
                  </FormGroup>
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        )}

        {features.speed && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2" fontWeight="bold">
                Speed Detection Classes ({features.speed_classes.length} selected)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  onClick={() => handleSelectAll('speed_classes')}
                >
                  Select All
                </Button>
                <Button
                  size="small"
                  onClick={() => handleDeselectAll('speed_classes')}
                >
                  Clear
                </Button>
              </Box>

              {Object.entries(groupedClasses).map(([category, classes]) => (
                <Box key={category} sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    {category}
                  </Typography>
                  <FormGroup>
                    {classes.map(cls => (
                      <FormControlLabel
                        key={cls.name}
                        control={
                          <Checkbox
                            size="small"
                            checked={features.speed_classes.includes(cls.name)}
                            onChange={() => handleClassToggle('speed_classes', cls.name)}
                          />
                        }
                        label={<Typography variant="body2">{cls.name}</Typography>}
                      />
                    ))}
                  </FormGroup>
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        )}

        {features.distance && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2" fontWeight="bold">
                Distance Measurement Classes ({features.distance_classes.length} selected)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  onClick={() => handleSelectAll('distance_classes')}
                >
                  Select All
                </Button>
                <Button
                  size="small"
                  onClick={() => handleDeselectAll('distance_classes')}
                >
                  Clear
                </Button>
              </Box>

              {Object.entries(groupedClasses).map(([category, classes]) => (
                <Box key={category} sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    {category}
                  </Typography>
                  <FormGroup>
                    {classes.map(cls => (
                      <FormControlLabel
                        key={cls.name}
                        control={
                          <Checkbox
                            size="small"
                            checked={features.distance_classes.includes(cls.name)}
                            onChange={() => handleClassToggle('distance_classes', cls.name)}
                          />
                        }
                        label={<Typography variant="body2">{cls.name}</Typography>}
                      />
                    ))}
                  </FormGroup>
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: `1px solid ${darkMode ? '#333' : '#e0e0e0'}` }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </Box>
    </Drawer>
  );
};