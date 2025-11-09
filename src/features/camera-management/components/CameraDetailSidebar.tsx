import React, { useState, useEffect } from 'react';
import {
  Drawer, Box, Tabs, Tab, Typography, IconButton, TextField, Button,
  Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails,
  Checkbox, FormGroup, Alert, Chip, Paper, Divider, List, ListItem, ListItemText
} from '@mui/material';
import {
  Close, Info, Speed, Timeline, Straighten, Article, ExpandMore,
  Save, Delete, Add, Remove
} from '@mui/icons-material';
import { useTheme } from '@/contexts/ThemeContext';
import { BackendCamera } from '@shared/types';

interface CameraDetailSidebarProps {
  open: boolean;
  camera: BackendCamera | null;
  onClose: () => void;
  onUpdate: (cameraId: string, updates: any) => Promise<void>;
  onDelete: (cameraId: string) => Promise<void>;
  onCalibrate: (cameraId: string, data: any) => Promise<void>;
  embedded?: boolean; // New prop for embedded mode
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ height: '100%' }}>
    {value === index && <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>{children}</Box>}
  </div>
);

// ALL available classes from all models
const ALL_CLASSES = {
  // PPE Detection
  'Hardhat': 'ppe_detection',
  'Mask': 'ppe_detection',
  'NO-Hardhat': 'ppe_detection',
  'NO-Mask': 'ppe_detection',
  'NO-Safety Vest': 'ppe_detection',
  'Person': 'ppe_detection',
  'Safety Cone': 'ppe_detection',
  'Safety Vest': 'ppe_detection',
  'Machinery': 'ppe_detection',
  'General': 'ppe_detection',

  // Face Detection
  'no_mask': 'face_detection',
  'mask': 'face_detection',

  // Cap Detection
  'no_cap': 'cap_detection',
  'cap': 'cap_detection',

  // Weapon Detection
  'pistol': 'weapon_detection',
  'knife': 'weapon_detection',

  // Fire Detection
  'smoke': 'fire_detection',
  'fire': 'fire_detection',

  // General Detection (COCO classes - common ones)
  'person': 'general_detection',
  'bicycle': 'general_detection',
  'car': 'general_detection',
  'motorcycle': 'general_detection',
  'airplane': 'general_detection',
  'bus': 'general_detection',
  'train': 'general_detection',
  'truck': 'general_detection',
  'boat': 'general_detection',
  'cat': 'general_detection',
  'dog': 'general_detection',
};

// Group classes by model
const CLASSES_BY_MODEL: Record<string, string[]> = {};
Object.entries(ALL_CLASSES).forEach(([className, modelName]) => {
  if (!CLASSES_BY_MODEL[modelName]) {
    CLASSES_BY_MODEL[modelName] = [];
  }
  CLASSES_BY_MODEL[modelName].push(className);
});

export const CameraDetailSidebar: React.FC<CameraDetailSidebarProps> = ({
                                                                          open, camera, onClose, onUpdate, onDelete, onCalibrate, embedded = false
                                                                        }) => {
  const { darkMode } = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [currentFrame, setCurrentFrame] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (camera) {
      setFormData({
        name: camera.name,
        location: camera.location || '',
        rtsp_url: camera.rtsp_url || '',
        fps: camera.fps || 15,
        features: camera.features || {},
        active_models: camera.active_models || [],
        tracking_classes: camera.features?.tracking_classes || [],
        speed_classes: camera.features?.speed_classes || [],
        distance_classes: camera.features?.distance_classes || []
      });
    }
  }, [camera]);


  const handleSave = async () => {
    if (!camera) return;
    setSaving(true);
    try {
      await onUpdate(camera.id, {
        name: formData.name,
        location: formData.location,
        rtsp_url: formData.rtsp_url,
        fps: formData.fps,
        features: {
          ...formData.features,
          tracking_classes: formData.tracking_classes,
          speed_classes: formData.speed_classes,
          distance_classes: formData.distance_classes
        },
        active_models: formData.active_models
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!camera || !confirm('Delete this camera?')) return;
    await onDelete(camera.id);
    onClose();
  };

  const handleClassToggle = (type: 'tracking_classes' | 'speed_classes', className: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [type]: prev[type]?.includes(className)
        ? prev[type].filter((c: string) => c !== className)
        : [...(prev[type] || []), className]
    }));
  };

  if (!camera) return null;

  const content = (
    <>
      {/* Header - only show if not embedded */}
      {!embedded && (
        <Box sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}>
          <Box>
            <Typography variant="h6">{camera.name}</Typography>
            <Typography variant="caption" color="text.secondary">{camera.location}</Typography>
          </Box>
          <IconButton onClick={onClose}><Close /></IconButton>
        </Box>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<Info />} label="Info" />
        <Tab icon={<Timeline />} label="Tracking" />
        <Tab icon={<Speed />} label="Speed" />
        <Tab icon={<Straighten />} label="Calibration" />
        <Tab icon={<Article />} label="Logs" />
      </Tabs>

      {/* Tab 0: Camera Info */}
      <TabPanel value={activeTab} index={0}>
        <TextField
          fullWidth
          label="Name"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Location"
          value={formData.location || ''}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="RTSP URL"
          value={formData.rtsp_url || ''}
          onChange={(e) => setFormData({ ...formData, rtsp_url: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          type="number"
          label="FPS"
          value={formData.fps || 15}
          onChange={(e) => setFormData({ ...formData, fps: parseInt(e.target.value) })}
          sx={{ mb: 3 }}
        />

        <Typography variant="subtitle2" gutterBottom>Features</Typography>
        <FormControlLabel
          control={<Switch checked={formData.features?.detection || false} onChange={(e) => setFormData({ ...formData, features: { ...formData.features, detection: e.target.checked } })} />}
          label="Detection"
        />
        <FormControlLabel
          control={<Switch checked={formData.features?.tracking || false} onChange={(e) => setFormData({ ...formData, features: { ...formData.features, tracking: e.target.checked } })} />}
          label="Object Tracking"
        />
        <FormControlLabel
          control={<Switch checked={formData.features?.speed || false} onChange={(e) => setFormData({ ...formData, features: { ...formData.features, speed: e.target.checked } })} />}
          label="Speed Detection"
        />
        <FormControlLabel
          control={<Switch checked={formData.features?.distance || false} onChange={(e) => setFormData({ ...formData, features: { ...formData.features, distance: e.target.checked } })} />}
          label="Distance Measurement"
        />

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button variant="contained" fullWidth onClick={handleSave} disabled={saving} startIcon={<Save />}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="outlined" color="error" onClick={handleDelete} startIcon={<Delete />}>
            Delete
          </Button>
        </Box>
      </TabPanel>

      {/* Tab 1: Tracking Classes */}
      <TabPanel value={activeTab} index={1}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Select which classes should be tracked with unique IDs
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Selected: {formData.tracking_classes?.length || 0} classes
          </Typography>
          {formData.tracking_classes?.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {formData.tracking_classes.map((cls: string) => (
                <Chip
                  key={cls}
                  label={cls}
                  size="small"
                  onDelete={() => handleClassToggle('tracking_classes', cls)}
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
              <Typography sx={{ textTransform: 'capitalize' }}>
                {modelName.replace('_', ' ')}
              </Typography>
              <Chip
                label={`${classes.filter(c => formData.tracking_classes?.includes(c)).length}/${classes.length}`}
                size="small"
                sx={{ ml: 'auto', mr: 1 }}
              />
            </AccordionSummary>
            <AccordionDetails>
              <FormGroup>
                {classes.map((className) => (
                  <FormControlLabel
                    key={className}
                    control={
                      <Checkbox
                        checked={formData.tracking_classes?.includes(className) || false}
                        onChange={() => handleClassToggle('tracking_classes', className)}
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
          Save Tracking Classes
        </Button>
      </TabPanel>

      {/* Tab 2: Speed Detection Classes */}
      <TabPanel value={activeTab} index={2}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Select which classes should have speed calculated
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Selected: {formData.speed_classes?.length || 0} classes
          </Typography>
          {formData.speed_classes?.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {formData.speed_classes.map((cls: string) => (
                <Chip
                  key={cls}
                  label={cls}
                  size="small"
                  onDelete={() => handleClassToggle('speed_classes', cls)}
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
              <Typography sx={{ textTransform: 'capitalize' }}>
                {modelName.replace('_', ' ')}
              </Typography>
              <Chip
                label={`${classes.filter(c => formData.speed_classes?.includes(c)).length}/${classes.length}`}
                size="small"
                sx={{ ml: 'auto', mr: 1 }}
              />
            </AccordionSummary>
            <AccordionDetails>
              <FormGroup>
                {classes.map((className) => (
                  <FormControlLabel
                    key={className}
                    control={
                      <Checkbox
                        checked={formData.speed_classes?.includes(className) || false}
                        onChange={() => handleClassToggle('speed_classes', className)}
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
          Save Speed Classes
        </Button>
      </TabPanel>

      {/* Tab 3: Calibration */}
      <TabPanel value={activeTab} index={3}>
        {camera.is_calibrated ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Camera is calibrated ({camera.pixels_per_meter?.toFixed(2)} px/m)
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 2 }}>Camera not calibrated</Alert>
        )}
        <Button variant="outlined" fullWidth>Configure Calibration</Button>
      </TabPanel>

      {/* Tab 4: Logs */}
      <TabPanel value={activeTab} index={4}>
        <Typography variant="subtitle2" gutterBottom>Current Frame</Typography>
        {currentFrame && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
            {Object.entries(currentFrame.results || {}).map(([model, result]: [string, any]) => (
              <Box key={model} sx={{ mb: 1 }}>
                <Typography variant="caption" fontWeight="bold">{model}: {result.count || 0}</Typography>
              </Box>
            ))}
          </Paper>
        )}

        <Typography variant="subtitle2" gutterBottom>Recent Logs</Typography>
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {logs.map((log, i) => (
            <Paper key={i} sx={{ p: 1.5, mb: 1, fontSize: '0.75rem', bgcolor: 'background.default' }}>
              <Typography variant="caption" color="text.secondary">
                {log.timestamp.toLocaleTimeString()}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                {JSON.stringify(log.data, null, 2)}
              </Typography>
            </Paper>
          ))}
        </Box>
      </TabPanel>
    </>
  );

  // If embedded mode, just return the content
  if (embedded) {
    return <Box sx={{ height: '100%', overflow: 'auto' }}>{content}</Box>;
  }

  // Otherwise, return as Drawer
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
          sx: { backgroundColor: 'transparent' }
        }
      }}
      sx={{
        '& .MuiDrawer-paper': {
          width: 450,
          bgcolor: 'background.paper',
          borderLeft: 1,
          borderColor: 'divider',
          boxShadow: '-4px 0 12px rgba(0,0,0,0.15)'
        }
      }}
    >
      {content}
    </Drawer>
  );
};