import React, { useState, useEffect } from 'react';
import {
  Drawer, Box, Tabs, Tab, Typography, IconButton, TextField, Button,
  Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails,
  Checkbox, FormGroup, Alert, Chip, Paper, Divider
} from '@mui/material';
import {
  Close, Info, ModelTraining, Straighten, Article, ExpandMore,
  Save, Delete
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

const AVAILABLE_CLASSES = {
  ppe_detection: ['person', 'helmet', 'vest', 'mask', 'gloves'],
  face_detection: ['mask', 'no_mask'],
  cap_detection: ['cap', 'no_cap'],
  weapon_detection: ['pistol', 'knife'],
  fire_detection: ['fire', 'smoke'],
  general_detection: ['person', 'car', 'truck', 'bicycle']
};

export const CameraDetailSidebar: React.FC<CameraDetailSidebarProps> = ({
                                                                          open, camera, onClose, onUpdate, onDelete, onCalibrate
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

  // WebSocket for real-time logs
  useEffect(() => {
    if (!camera || !open) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/camera/${camera.id}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setCurrentFrame(data);

      const logEntry = {
        timestamp: new Date(data.timestamp),
        type: 'detection',
        data: data.results
      };
      setLogs(prev => [logEntry, ...prev].slice(0, 100));
    };

    return () => ws.close();
  }, [camera?.id, open]);

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

  const handleClassToggle = (type: string, className: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [type]: prev[type]?.includes(className)
        ? prev[type].filter((c: string) => c !== className)
        : [...(prev[type] || []), className]
    }));
  };

  if (!camera) return null;

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
      {/* Header */}
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

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<Info />} label="Info" />
        <Tab icon={<ModelTraining />} label="Models" />
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

      {/* Tab 1: Model Configuration */}
      <TabPanel value={activeTab} index={1}>
        <Typography variant="subtitle2" gutterBottom>Detection Classes</Typography>
        {Object.entries(AVAILABLE_CLASSES).map(([model, classes]) => (
          <Accordion key={model}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>{model.replace('_', ' ')}</Typography>
              <Chip
                label={formData.active_models?.includes(model) ? 'Active' : 'Inactive'}
                size="small"
                color={formData.active_models?.includes(model) ? 'success' : 'default'}
                sx={{ ml: 'auto', mr: 1 }}
              />
            </AccordionSummary>
            <AccordionDetails>
              <FormGroup>
                {classes.map((cls) => (
                  <FormControlLabel
                    key={cls}
                    control={<Checkbox size="small" />}
                    label={cls}
                  />
                ))}
              </FormGroup>
            </AccordionDetails>
          </Accordion>
        ))}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>Tracking Classes</Typography>
        {formData.features?.tracking && (
          <FormGroup>
            {['person', 'car', 'truck'].map((cls) => (
              <FormControlLabel
                key={cls}
                control={<Checkbox checked={formData.tracking_classes?.includes(cls)} onChange={() => handleClassToggle('tracking_classes', cls)} />}
                label={cls}
              />
            ))}
          </FormGroup>
        )}

        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Speed Detection Classes</Typography>
        {formData.features?.speed && (
          <FormGroup>
            {['person', 'car', 'truck'].map((cls) => (
              <FormControlLabel
                key={cls}
                control={<Checkbox checked={formData.speed_classes?.includes(cls)} onChange={() => handleClassToggle('speed_classes', cls)} />}
                label={cls}
              />
            ))}
          </FormGroup>
        )}
      </TabPanel>

      {/* Tab 2: Calibration */}
      <TabPanel value={activeTab} index={2}>
        {camera.is_calibrated ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Camera is calibrated ({camera.pixels_per_meter?.toFixed(2)} px/m)
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 2 }}>Camera not calibrated</Alert>
        )}
        <Button variant="outlined" fullWidth>Configure Calibration</Button>
      </TabPanel>

      {/* Tab 3: Logs */}
      <TabPanel value={activeTab} index={3}>
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
    </Drawer>
  );
};