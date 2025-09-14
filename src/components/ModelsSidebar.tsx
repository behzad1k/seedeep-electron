import React, { useState } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Switch,
  FormControlLabel,
  Button,
  Collapse,
  Chip,
  Checkbox,
  FormGroup,
  Divider,
  Paper,
} from '@mui/material';
import {
  Menu,
  ExpandMore,
  ExpandLess,
  Security,
  Person,
  DirectionsCar,
  LocalFireDepartment,
  GpsFixed,
  CheckCircle,
} from '@mui/icons-material';
import { Camera, DetectionModelKey } from "../types/camera";

interface ModelClass {
  id: string;
  label: string;
  enabled: boolean;
}

interface DetectionModel {
  key: DetectionModelKey;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  classes: ModelClass[];
  enabled: boolean;
  expanded: boolean;
}

interface ModelsSidebarProps {
  open: boolean;
  onClose: () => void;
  selectedCamera: Camera | null;
  cameras: Camera[];
  darkMode: boolean;
  onDetectionModelChange: (model: DetectionModelKey) => void;
}

const ModelsSidebar: React.FC<ModelsSidebarProps> = ({
                                                       open,
                                                       onClose,
                                                       selectedCamera,
                                                       cameras,
                                                       darkMode,
                                                       onDetectionModelChange,
                                                     }) => {
  // Initialize detection models with classes
  const [detectionModels, setDetectionModels] = useState<DetectionModel[]>([
    {
      key: 'ppeDetection',
      label: 'PPE Detection',
      description: 'Personal Protective Equipment monitoring',
      icon: <Security />,
      color: '#2196f3',
      enabled: selectedCamera?.detectionModels?.ppeDetection || false,
      expanded: false,
      classes: [
        { id: 'mask', label: 'Mask', enabled: false },
        { id: 'no-mask', label: 'No Mask', enabled: false },
        { id: 'hardhat', label: 'Hard Hat', enabled: false },
        { id: 'no-hardhat', label: 'No Hard Hat', enabled: false },
        { id: 'safety-vest', label: 'Safety Vest', enabled: false },
        { id: 'safety-cone', label: 'Safety Cone', enabled: false },
      ]
    },
    {
      key: 'personDetection',
      label: 'Person Detection',
      description: 'Human presence identification',
      icon: <Person />,
      color: '#4caf50',
      enabled: selectedCamera?.detectionModels?.personDetection || false,
      expanded: false,
      classes: [
        { id: 'person', label: 'Person', enabled: false },
        { id: 'not-person', label: 'Not Person', enabled: false },
      ]
    },
    {
      key: 'vehicleDetection',
      label: 'Vehicle Detection',
      description: 'Vehicle type identification',
      icon: <DirectionsCar />,
      color: '#ff9800',
      enabled: selectedCamera?.detectionModels?.vehicleDetection || false,
      expanded: false,
      classes: [
        { id: 'car', label: 'Car', enabled: false },
        { id: 'bus', label: 'Bus', enabled: false },
        { id: 'truck', label: 'Truck', enabled: false },
      ]
    },
    {
      key: 'fireDetection',
      label: 'Fire Detection',
      description: 'Fire and smoke detection',
      icon: <LocalFireDepartment />,
      color: '#f44336',
      enabled: selectedCamera?.detectionModels?.fireDetection || false,
      expanded: false,
      classes: [
        { id: 'fire', label: 'Fire', enabled: false },
        { id: 'smoke', label: 'Smoke', enabled: false },
      ]
    },
    {
      key: 'weaponDetection',
      label: 'Weapon Detection',
      description: 'Security threat identification',
      icon: <GpsFixed />,
      color: '#e91e63',
      enabled: false,
      expanded: false,
      classes: [
        { id: 'handgun', label: 'Handgun', enabled: false },
        { id: 'rifle', label: 'Rifle', enabled: false },
        { id: 'knife', label: 'Knife', enabled: false },
        { id: 'suspicious-object', label: 'Suspicious Object', enabled: false },
      ]
    }
  ]);

  // Toggle model expansion
  const toggleModelExpansion = (modelKey: DetectionModelKey) => {
    setDetectionModels(prev => prev.map(model =>
      model.key === modelKey
        ? { ...model, expanded: !model.expanded }
        : model
    ));
  };

  // Handle main model toggle
  const handleModelToggle = (modelKey: DetectionModelKey) => {
    setDetectionModels(prev => prev.map(model =>
      model.key === modelKey
        ? {
          ...model,
          enabled: !model.enabled,
          // If disabling, disable all classes
          classes: !model.enabled
            ? model.classes
            : model.classes.map(cls => ({ ...cls, enabled: false }))
        }
        : model
    ));
    onDetectionModelChange(modelKey);
  };

  // Handle class selection
  const handleClassToggle = (modelKey: DetectionModelKey, classId: string) => {
    setDetectionModels(prev => prev.map(model => {
      if (model.key === modelKey) {
        const updatedClasses = model.classes.map(cls =>
          cls.id === classId ? { ...cls, enabled: !cls.enabled } : cls
        );

        // Auto-enable model if any class is selected
        const hasEnabledClasses = updatedClasses.some(cls => cls.enabled);
        const shouldEnableModel = hasEnabledClasses && !model.enabled;

        if (shouldEnableModel) {
          onDetectionModelChange(modelKey);
        }

        return {
          ...model,
          classes: updatedClasses,
          enabled: hasEnabledClasses || model.enabled
        };
      }
      return model;
    }));
  };

  // Get active classes count for a model
  const getActiveClassesCount = (model: DetectionModel) => {
    return model.classes.filter(cls => cls.enabled).length;
  };

  // Apply all selected models and classes
  const handleApplyModels = () => {
    if (selectedCamera) {
      const activeModels = detectionModels.filter(model => model.enabled);
      const activeClasses = detectionModels.reduce((acc, model) => {
        const modelClasses = model.classes.filter(cls => cls.enabled);
        if (modelClasses.length > 0) {
          acc[model.key] = modelClasses.map(cls => cls.id);
        }
        return acc;
      }, {} as Record<string, string[]>);

      console.log('Applied models:', activeModels.map(m => m.label));
      console.log('Applied classes:', activeClasses);
      alert(`Models applied to ${selectedCamera.name}!\n\nActive Models: ${activeModels.length}\nActive Classes: ${Object.values(activeClasses).flat().length}`);
    }
  };

  return (
    <Drawer
      anchor="right"
      variant="persistent"
      open={open}
      sx={{
        width: open ? 380 : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 380,
          boxSizing: 'border-box',
          backgroundColor: darkMode ? '#1a1a1a' : '#ffffff',
          borderLeft: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
          zIndex: 1200,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
          background: darkMode
            ? 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)'
            : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold" color="primary">
            AI Detection Models
          </Typography>
          <IconButton
            onClick={onClose}
            sx={{
              backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              '&:hover': {
                backgroundColor: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
              }
            }}
          >
            <Menu sx={{ transform: 'rotate(180deg)' }} />
          </IconButton>
        </Box>

        {selectedCamera && (
          <Box>
            <Typography variant="subtitle1" fontWeight="medium">
              {selectedCamera.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor:
                    selectedCamera.status === 'online' ? '#4caf50' :
                      selectedCamera.status === 'recording' ? '#ff9800' : '#f44336',
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {selectedCamera.location} • CH{cameras.findIndex(c => c.id === selectedCamera.id) + 1}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Models List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, px: 1 }}>
          Select AI models and their detection classes for this camera
        </Typography>

        {detectionModels.map((model) => (
          <Paper
            key={model.key}
            elevation={0}
            sx={{
              mb: 2,
              border: `1px solid ${model.enabled ? model.color : (darkMode ? '#333' : '#e0e0e0')}`,
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: model.enabled
                ? `${model.color}08`
                : 'transparent',
              transition: 'all 0.3s ease',
            }}
          >
            {/* Model Header */}
            <Box
              sx={{
                p: 2,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                },
              }}
              onClick={() => toggleModelExpansion(model.key)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* Model Icon */}
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: model.enabled ? model.color : (darkMode ? '#333' : '#f5f5f5'),
                    color: model.enabled ? 'white' : 'text.secondary',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {model.icon}
                </Box>

                {/* Model Info */}
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" fontWeight="medium">
                      {model.label}
                    </Typography>
                    {getActiveClassesCount(model) > 0 && (
                      <Chip
                        label={`${getActiveClassesCount(model)} selected`}
                        size="small"
                        sx={{
                          backgroundColor: model.color,
                          color: 'white',
                          fontSize: '0.7rem',
                          height: 20
                        }}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {model.description}
                  </Typography>
                </Box>

                {/* Model Toggle */}
                <Switch
                  checked={model.enabled}
                  onChange={() => handleModelToggle(model.key)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: model.color,
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: model.color,
                    },
                  }}
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Expand Icon */}
                <IconButton size="small">
                  {model.expanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
            </Box>

            {/* Model Classes Dropdown */}
            <Collapse in={model.expanded}>
              <Divider />
              <Box sx={{ p: 2, backgroundColor: darkMode ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.02)' }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  Detection Classes
                </Typography>
                <FormGroup>
                  {model.classes.map((cls) => (
                    <FormControlLabel
                      key={cls.id}
                      control={
                        <Checkbox
                          checked={cls.enabled}
                          onChange={() => handleClassToggle(model.key, cls.id)}
                          sx={{
                            color: model.color,
                            '&.Mui-checked': {
                              color: model.color,
                            },
                          }}
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {cls.label}
                        </Typography>
                      }
                      sx={{
                        ml: 0,
                        mr: 0,
                        '& .MuiFormControlLabel-label': {
                          fontSize: '0.875rem',
                        },
                      }}
                    />
                  ))}
                </FormGroup>
              </Box>
            </Collapse>
          </Paper>
        ))}
      </Box>

      {/* Footer Actions */}
      <Box sx={{ p: 3, borderTop: `1px solid ${darkMode ? '#333' : '#e0e0e0'}` }}>
        <Button
          variant="contained"
          fullWidth
          size="large"
          startIcon={<CheckCircle />}
          onClick={handleApplyModels}
          sx={{
            py: 1.5,
            backgroundColor: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
            fontWeight: 'bold',
          }}
        >
          Apply Configuration
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          {detectionModels.filter(m => m.enabled).length} models • {detectionModels.reduce((acc, m) => acc + getActiveClassesCount(m), 0)} classes selected
        </Typography>
      </Box>
    </Drawer>
  );
};

export default ModelsSidebar;