// ============================================
// FRONTEND FIXES - CameraDetailSidebar.tsx
// ============================================

/*
Replace the entire CameraDetailSidebar.tsx with this updated version:
*/

import React, { useState, useEffect } from 'react';
import {
  Drawer, Box, Tabs, Tab, Typography, IconButton, TextField, Button,
  Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails,
  Checkbox, FormGroup, Alert, Chip, Paper, Divider, List, ListItem, ListItemText
} from '@mui/material';
import {
  Close, Info, Speed, Timeline, Straighten, Article, ExpandMore,
  Save, Delete, Visibility
} from '@mui/icons-material';
import { useTheme } from '@/contexts/ThemeContext';
import { BackendCamera } from '@shared/types';
import { MODEL_DEFINITIONS } from '@utils/models/modelDefinitions';

interface CameraDetailSidebarProps {
  open: boolean;
  camera: BackendCamera | null;
  onClose: () => void;
  onUpdate: (cameraId: string, updates: any) => Promise<void>;
  onDelete: (cameraId: string) => Promise<void>;
  onCalibrate: (cameraId: string, data: any) => Promise<void>;
  embedded?: boolean;
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

// Build ALL_CLASSES from MODEL_DEFINITIONS
const ALL_CLASSES: Record<string, string> = {};
Object.entries(MODEL_DEFINITIONS).forEach(([modelName, definition]) => {
  definition.classes.forEach(className => {
    ALL_CLASSES[className] = modelName;
  });
});

// Group classes by model
const CLASSES_BY_MODEL: Record<string, string[]> = {};
Object.entries(MODEL_DEFINITIONS).forEach(([modelName, definition]) => {
  CLASSES_BY_MODEL[modelName] = definition.classes;
});


const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const getCategoryStats = (data: any) => {
  const stats = {
    detection: { total: 0, byModel: {} as Record<string, number> },
    tracking: { total: 0, active: 0, objects: [] as any[] },
    speed: [] as any[],
    distance: [] as any[],
    performance: { latency: 0, fps: 0 }
  };

  if (!data.results) return stats;

  // Detection stats
  Object.entries(data.results).forEach(([key, value]: [string, any]) => {
    if (key !== 'tracking' && value.count !== undefined) {
      stats.detection.total += value.count;
      stats.detection.byModel[key] = value.count;
    }
  });

  // Tracking stats
  if (data.results.tracking) {
    const tracking = data.results.tracking;
    stats.tracking.total = tracking.summary?.total_tracks || 0;
    stats.tracking.active = tracking.summary?.active_tracks || 0;

    if (tracking.tracked_objects) {
      Object.values(tracking.tracked_objects).forEach((obj: any) => {
        stats.tracking.objects.push({
          id: obj.track_id,
          class: obj.class_name,
          time: obj.time_in_frame_seconds,
          confidence: obj.confidence
        });

        // Speed stats
        if (obj.speed_kmh !== undefined || obj.speed_m_per_sec !== undefined) {
          stats.speed.push({
            id: obj.track_id,
            class: obj.class_name,
            speed_kmh: obj.speed_kmh,
            speed_ms: obj.speed_m_per_sec
          });
        }

        // Distance stats
        if (obj.distance_from_camera_m !== undefined) {
          stats.distance.push({
            id: obj.track_id,
            class: obj.class_name,
            distance_m: obj.distance_from_camera_m,
            distance_ft: obj.distance_from_camera_ft,
            position: obj.position_meters
          });
        }
      });
    }
  }

  return stats;
};



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
        distance_classes: camera.features?.distance_classes || [],
        detection_classes: camera.features?.detection_classes || []
      });
    }
  }, [camera]);

  // Subscribe to WebSocket for logs (NEW)
  useEffect(() => {
    if (!camera) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/camera/${camera.id}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Update current frame
        setCurrentFrame(data);

        // Add to logs
        setLogs(prev => [
          {
            timestamp: new Date(),
            data: data
          },
          ...prev.slice(0, 49) // Keep last 50 logs
        ]);
      } catch (error) {
        console.error('Error parsing WebSocket data:', error);
      }
    };

    return () => {
      ws.close();
    };
  }, [camera?.id]);

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
          distance_classes: formData.distance_classes,
          detection_classes: formData.detection_classes
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

  const handleClassToggle = (
    type: 'tracking_classes' | 'speed_classes' | 'distance_classes' | 'detection_classes',
    className: string
  ) => {
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
        variant="scrollable"
        sx={{ borderBottom: 1, borderColor: 'divider', overflow: 'auto', width: '100%' }}
      >
        <Tab icon={<Info />} label="Info" />
        <Tab icon={<Visibility />} label="Detection" />
        <Tab icon={<Timeline />} label="Tracking" />
        <Tab icon={<Speed />} label="Speed" />
        <Tab icon={<Straighten />} label="Distance" />
        <Tab icon={<Article />} label="Logs" />
      </Tabs>

      {/* Tab 0: Camera Info */}
      <TabPanel  value={activeTab} index={0}>
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

      {/* Tab 1: Detection Classes */}
      <TabPanel value={activeTab} index={1}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Select which classes should be detected by the camera
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Selected: {formData.detection_classes?.length || 0} classes
          </Typography>
          {formData.detection_classes?.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {formData.detection_classes.map((cls: string) => (
                <Chip
                  key={cls}
                  label={cls}
                  size="small"
                  onDelete={() => handleClassToggle('detection_classes', cls)}
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
                {MODEL_DEFINITIONS[modelName]?.name || modelName.replace('_', ' ')}
              </Typography>
              <Chip
                label={`${classes.filter(c => formData.detection_classes?.includes(c)).length}/${classes.length}`}
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
                        checked={formData.detection_classes?.includes(className) || false}
                        onChange={() => handleClassToggle('detection_classes', className)}
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
          Save Detection Classes
        </Button>
      </TabPanel>

      {/* Tab 2: Tracking Classes */}
      <TabPanel value={activeTab} index={2}>
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
                {MODEL_DEFINITIONS[modelName]?.name || modelName.replace('_', ' ')}
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

      {/* Tab 3: Speed Detection Classes */}
      <TabPanel value={activeTab} index={3}>
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
                {MODEL_DEFINITIONS[modelName]?.name || modelName.replace('_', ' ')}
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

      {/* Tab 4: Distance Detection Classes */}
      <TabPanel value={activeTab} index={4}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Select which classes should have distance calculated
        </Alert>

        {camera.is_calibrated ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Camera is calibrated ({camera.pixels_per_meter?.toFixed(2)} px/m)
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Camera not calibrated - distance will not work
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Selected: {formData.distance_classes?.length || 0} classes
          </Typography>
          {formData.distance_classes?.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {formData.distance_classes.map((cls: string) => (
                <Chip
                  key={cls}
                  label={cls}
                  size="small"
                  onDelete={() => handleClassToggle('distance_classes', cls)}
                  color="info"
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
                {MODEL_DEFINITIONS[modelName]?.name || modelName.replace('_', ' ')}
              </Typography>
              <Chip
                label={`${classes.filter(c => formData.distance_classes?.includes(c)).length}/${classes.length}`}
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
                        checked={formData.distance_classes?.includes(className) || false}
                        onChange={() => handleClassToggle('distance_classes', className)}
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
          Save Distance Classes
        </Button>
      </TabPanel>

      {/* Tab 5: Logs (ENHANCED) */}

      <TabPanel value={activeTab} index={5}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Live Stats Summary */}
          <Paper sx={{ p: 2, bgcolor: 'background.default', borderLeft: 3, borderColor: 'primary.main' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              📊 Live Statistics
            </Typography>
            {currentFrame && (() => {
              const stats = getCategoryStats(currentFrame);
              return (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Detections</Typography>
                    <Typography variant="h6" color="success.main">{stats.detection.total}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Active Tracks</Typography>
                    <Typography variant="h6" color="primary.main">{stats.tracking.active}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Speed Monitored</Typography>
                    <Typography variant="h6" color="warning.main">{stats.speed.length}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Distance Tracked</Typography>
                    <Typography variant="h6" color="info.main">{stats.distance.length}</Typography>
                  </Box>
                </Box>
              );
            })()}
          </Paper>

          {/* Current Frame Details */}
          {currentFrame && (() => {
            const stats = getCategoryStats(currentFrame);
            return (
              <Box sx={{ flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {/* Detection Section */}
                {stats.detection.total > 0 && (
                  <Paper sx={{ p: 2, bgcolor: 'background.default', borderLeft: 3, borderColor: 'success.main' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold" color="success.main">
                        🎯 Detections ({stats.detection.total})
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTimestamp(currentFrame.timestamp)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {Object.entries(stats.detection.byModel).map(([model, count]) => (
                        <Chip
                          key={model}
                          label={`${model.replace('_detection', '')}: ${count}`}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Paper>
                )}

                {/* Tracking Section */}
                {stats.tracking.objects.length > 0 && (
                  <Paper sx={{ p: 2, bgcolor: 'background.default', borderLeft: 3, borderColor: 'primary.main' }}>
                    <Typography variant="subtitle2" fontWeight="bold" color="primary.main" gutterBottom>
                      🎯 Tracked Objects ({stats.tracking.objects.length})
                    </Typography>
                    <List dense sx={{ p: 0 }}>
                      {stats.tracking.objects.map((obj) => (
                        <ListItem
                          key={obj.id}
                          sx={{
                            px: 1,
                            py: 0.5,
                            bgcolor: 'action.hover',
                            borderRadius: 1,
                            mb: 0.5
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" fontWeight="bold">
                                  {obj.class}
                                </Typography>
                                <Chip
                                  label={`ID: ${obj.id.slice(0, 6)}`}
                                  size="small"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                                <Typography variant="caption">
                                  ⏱️ {obj.time?.toFixed(1)}s
                                </Typography>
                                <Typography variant="caption">
                                  📊 {(obj.confidence * 100).toFixed(0)}%
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}

                {/* Speed Section */}
                {stats.speed.length > 0 && (
                  <Paper sx={{ p: 2, bgcolor: 'background.default', borderLeft: 3, borderColor: 'warning.main' }}>
                    <Typography variant="subtitle2" fontWeight="bold" color="warning.main" gutterBottom>
                      🚀 Speed Monitoring ({stats.speed.length})
                    </Typography>
                    <List dense sx={{ p: 0 }}>
                      {stats.speed.map((obj) => (
                        <ListItem
                          key={obj.id}
                          sx={{
                            px: 1,
                            py: 0.5,
                            bgcolor: 'action.hover',
                            borderRadius: 1,
                            mb: 0.5
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">
                                  {obj.class}
                                </Typography>
                                <Chip
                                  label={obj.id.slice(0, 6)}
                                  size="small"
                                  sx={{ height: 18, fontSize: '0.65rem' }}
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                                {obj.speed_kmh !== undefined && (
                                  <Typography variant="caption" fontWeight="bold" color="warning.main">
                                    {obj.speed_kmh.toFixed(1)} km/h
                                  </Typography>
                                )}
                                {obj.speed_ms !== undefined && (
                                  <Typography variant="caption">
                                    ({obj.speed_ms.toFixed(2)} m/s)
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}

                {/* Distance Section */}
                {stats.distance.length > 0 && (
                  <Paper sx={{ p: 2, bgcolor: 'background.default', borderLeft: 3, borderColor: 'info.main' }}>
                    <Typography variant="subtitle2" fontWeight="bold" color="info.main" gutterBottom>
                      📏 Distance Tracking ({stats.distance.length})
                    </Typography>
                    <List dense sx={{ p: 0 }}>
                      {stats.distance.map((obj) => (
                        <ListItem
                          key={obj.id}
                          sx={{
                            px: 1,
                            py: 0.5,
                            bgcolor: 'action.hover',
                            borderRadius: 1,
                            mb: 0.5
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">
                                  {obj.class}
                                </Typography>
                                <Chip
                                  label={obj.id.slice(0, 6)}
                                  size="small"
                                  sx={{ height: 18, fontSize: '0.65rem' }}
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                  <Typography variant="caption" fontWeight="bold" color="info.main">
                                    📍 {obj.distance_m.toFixed(2)}m
                                  </Typography>
                                  <Typography variant="caption">
                                    ({obj.distance_ft.toFixed(1)}ft)
                                  </Typography>
                                </Box>
                                {obj.position && (
                                  <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                                    Position: ({obj.position.x.toFixed(1)}, {obj.position.y.toFixed(1)})m
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}

                {/* No Data Message */}
                {stats.detection.total === 0 && stats.tracking.objects.length === 0 && (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
                    <Typography variant="body2" color="text.secondary">
                      No detections or tracking data in current frame
                    </Typography>
                  </Paper>
                )}
              </Box>
            );
          })()}

          {/* Historical Logs (Collapsed by default) */}
          <Accordion defaultExpanded={false}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">
                📜 Frame History ({logs.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {logs.slice(0, 20).map((log, i) => {
                  const stats = getCategoryStats(log.data);
                  return (
                    <Paper
                      key={i}
                      sx={{
                        p: 1.5,
                        mb: 1,
                        bgcolor: 'background.default',
                        borderLeft: 2,
                        borderColor: stats.detection.total > 0 ? 'success.main' : 'divider'
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" display="block">
                        {log.timestamp.toLocaleTimeString()}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={`${stats.detection.total} detected`}
                          size="small"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                        <Chip
                          label={`${stats.tracking.active} tracked`}
                          size="small"
                          color="primary"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Developer Mode Toggle (Optional) */}
          <FormControlLabel
            control={
              <Switch
                size="small"
                onChange={(e) => {
                  // Store in state if needed
                  const showRaw = e.target.checked;
                  // You can add a state to show/hide raw JSON
                }}
              />
            }
            label={<Typography variant="caption">Developer Mode (Raw JSON)</Typography>}
            sx={{ mt: 'auto', pt: 1, borderTop: 1, borderColor: 'divider' }}
          />
        </Box>
      </TabPanel>
    </>
  );

  if (embedded) {
    return <Box sx={{ height: '100%', overflow: 'auto' }}>{content}</Box>;
  }

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