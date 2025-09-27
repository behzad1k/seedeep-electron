import { EnhancedCamera } from '../components2/EnhancedCamera';
import { Add, Analytics, Brightness4, Brightness7, Build, GridView, Menu, Notifications, Settings, Videocam, VideoLibrary } from '@mui/icons-material';
import { Box, Button, Chip, createTheme, Dialog, DialogContent, Divider, Drawer, FormControlLabel, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper, Switch, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useCallback, useState } from 'react';
import AddCamera from '../components/AddCamera';
import FullScreenCameraView from '../components/FullScreenCameraView';
import ModelsSidebar from '../components/ModelsSidebar';
import { Camera, DetectionModelKey } from '@/types/camera';

const MainWindow = () => {
  const [activeTab, setActiveTab] = useState('cameras');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [gridSize, setGridSize] = useState<'2x2' | '3x3' | '4x4' | '5x5'>('3x3');
  const [addCameraOpen, setAddCameraOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [fullScreenCamera, setFullScreenCamera] = useState<Camera | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [visualConfig, setVisualConfig] = useState({
    showBoundingBoxes: true,
    showTrajectories: true,
    showVelocityVectors: true,
    showZones: true,
    showObjectInfo: true,
    showSpeedInfo: true
  });

  const [config, setConfig] = useState({
    trackingConfig: {
      tracker_type: 'centroid' as const,
      max_disappeared: 30,
      max_distance: 100,
      use_kalman: true,
      fps: 5, // Start with lower FPS for better performance
      pixel_to_meter_ratio: 10000
    },
    models: [
      { name: 'PPE', classFilter: ['person'] }
    ],
    selectedClasses: ['person']
  });

  // Mock camera data
  const [cameras, setCameras] = useState<any[]>([
    {
      id: 1,
      name: 'Front Entrance',
      status: 'online',
      location: 'Building A',
      isStreaming: false,
      detectionModels: {
        ppeDetection: false,
        personDetection: true,
        vehicleDetection: false,
        fireDetection: false,
        weaponDetection: false,
      }
    },
    {
      id: 2,
      name: 'Parking Lot',
      status: 'recording',
      location: 'Building A',
      detectionModels: {
        ppeDetection: false,
        personDetection: false,
        vehicleDetection: true,
        fireDetection: false,
        weaponDetection: false,
      }
    },
    {
      id: 3,
      name: 'Back Exit',
      status: 'offline',
      location: 'Building B',
      detectionModels: {
        ppeDetection: false,
        personDetection: false,
        vehicleDetection: false,
        fireDetection: false,
        weaponDetection: false,
      }
    },
    {
      id: 4,
      name: 'Lobby',
      status: 'online',
      location: 'Building A',
      detectionModels: {
        ppeDetection: false,
        personDetection: true,
        vehicleDetection: false,
        fireDetection: false,
        weaponDetection: true,
      }
    },
    {
      id: 5,
      name: 'Warehouse',
      status: 'recording',
      location: 'Building C',
      detectionModels: {
        ppeDetection: true,
        personDetection: true,
        vehicleDetection: false,
        fireDetection: true,
        weaponDetection: false,
      }
    },
    {
      id: 6,
      name: 'Server Room',
      status: 'online',
      location: 'Building B',
      detectionModels: {
        ppeDetection: false,
        personDetection: true,
        vehicleDetection: false,
        fireDetection: true,
        weaponDetection: false,
      }
    },
    {
      id: 8,
      name: 'Loading Dock',
      status: 'offline',
      location: 'Building C',
      detectionModels: {
        ppeDetection: true,
        personDetection: true,
        vehicleDetection: true,
        fireDetection: false,
        weaponDetection: false,
      }
    },
  ]);


  const sidebarItems = [
    { id: 'cameras', label: 'Cameras', icon: <Videocam /> },
    { id: 'recordings', label: 'Recordings', icon: <VideoLibrary /> },
    { id: 'alerts', label: 'Alerts', icon: <Notifications /> },
    { id: 'analytics', label: 'Analytics', icon: <Analytics /> },
    { id: 'settings', label: 'Settings', icon: <Settings /> },
    { id: 'services', label: 'Services', icon: <Build /> },
  ];

  const getGridColumns = () => {
    switch (gridSize) {
      case '2x2': return 2;
      case '3x3': return 3;
      case '4x4': return 4;
      case '5x5': return 5;
      default: return 3;
    }
  };

  const getMaxCameras = () => {
    const cols = getGridColumns();
    return cols * cols;
  };

  const handleCameraClick = (camera: Camera) => {
    setSelectedCamera(camera);
    setRightSidebarOpen(true);
    setFullScreenCamera(camera);
  };

  const handleExitFullscreen = () => {
    setFullScreenCamera(null);
  };

  const handleDetectionModelChange = (model: DetectionModelKey) => {
    if (!selectedCamera) return;

    setCameras(prev => prev.map(camera => {
      if (camera.id === selectedCamera.id) {
        const currentModels = camera.detectionModels || {
          ppeDetection: false,
          personDetection: false,
          vehicleDetection: false,
          fireDetection: false,
          weaponDetection: false,
        };

        return {
          ...camera,
          detectionModels: {
            ...currentModels,
            [model]: !currentModels[model]
          }
        };
      }
      return camera;
    }));

    setSelectedCamera(prev => {
      if (!prev) return null;
      const currentModels = prev.detectionModels || {
        ppeDetection: false,
        personDetection: false,
        vehicleDetection: false,
        fireDetection: false,
        weaponDetection: false,
      };

      return {
        ...prev,
        detectionModels: {
          ...currentModels,
          [model]: !currentModels[model]
        }
      };
    });

    setFullScreenCamera(prev => {
      if (!prev || prev.id !== selectedCamera.id) return prev;
      const currentModels = prev.detectionModels || {
        ppeDetection: false,
        personDetection: false,
        vehicleDetection: false,
        fireDetection: false,
        weaponDetection: false,
      };

      return {
        ...prev,
        detectionModels: {
          ...currentModels,
          [model]: !currentModels[model]
        }
      };
    });
  };

  const drawerWidth = sidebarOpen || sidebarHovered ? 240 : 60;


  const handleDetection = useCallback((detections: any[]) => {
    console.log(`Detections: ${detections.length} objects`);
  }, []);

  const handleTracking = useCallback((results: any) => {
    console.log(`Tracking: ${Object.keys(results.tracked_objects || {}).length} objects`);
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    console.error('Tracking error:', errorMessage);
  }, []);

  const renderCameraGrid = () => {
    const columns = getGridColumns();
    const maxCameras = getMaxCameras();
    const displayCameras = cameras.slice(0, maxCameras);
    const emptySlotsCount = maxCameras - displayCameras.length;
    const emptySlots = Array(emptySlotsCount).fill(null);

    return (
      <Box sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        backgroundColor: darkMode ? '#000' : '#f0f0f0',
      }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 1,
            height: '100%',
            aspectRatio: '1',
            maxHeight: 'calc(100vh - 160px)',
          }}
        >
          {displayCameras.map((camera, index) => (
            <EnhancedCamera wsUrl={process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'}
                            onDetection={handleDetection}
                            onTracking={handleTracking}
                            onError={handleError}
                            models={config.models}
                            trackingConfig={config.trackingConfig}
                            visualizationConfig={visualConfig}
                            enableDebugLogs={true} />
            // <Box
            //   key={camera.id}
            //   sx={{
            //     position: 'relative',
            //     backgroundColor: darkMode ? '#1a1a1a' : '#000',
            //     border: '2px solid',
            //     borderColor: darkMode ? '#333' : '#666',
            //     borderRadius: 1,
            //     overflow: 'hidden',
            //     cursor: 'pointer',
            //     transition: 'all 0.2s ease',
            //     '&:hover': {
            //       borderColor: 'primary.main',
            //       transform: 'scale(1.02)',
            //     },
            //   }}
            //   onClick={() => handleCameraClick(camera)}
            // >
            //   <Box
            //     sx={{
            //       position: 'absolute',
            //       top: 4,
            //       left: 4,
            //       backgroundColor: 'rgba(0, 0, 0, 0.8)',
            //       color: 'white',
            //       px: 1,
            //       py: 0.5,
            //       borderRadius: 0.5,
            //       fontSize: '0.75rem',
            //       fontWeight: 'bold',
            //       zIndex: 2,
            //     }}
            //   >
            //     CH{index + 1}
            //   </Box>
            //
            //   <Box
            //     sx={{
            //       position: 'absolute',
            //       top: 4,
            //       right: 4,
            //       width: 12,
            //       height: 12,
            //       borderRadius: '50%',
            //       backgroundColor:
            //         camera.status === 'online' ? '#4caf50' :
            //           camera.status === 'recording' ? '#ff9800' : '#f44336',
            //       zIndex: 2,
            //       ...(camera.status === 'recording' && {
            //         animation: 'pulse 2s infinite',
            //         '@keyframes pulse': {
            //           '0%': { opacity: 1 },
            //           '50%': { opacity: 0.5 },
            //           '100%': { opacity: 1 },
            //         },
            //       }),
            //     }}
            //   />
            //
            //   <Box
            //     sx={{
            //       width: '100%',
            //       height: '100%',
            //       display: 'flex',
            //       alignItems: 'center',
            //       justifyContent: 'center',
            //       backgroundColor: camera.status === 'offline' ? '#333' : '#1a1a1a',
            //     }}
            //   >
            //     {camera.status === 'offline' ? (
            //       <Box sx={{ textAlign: 'center', color: '#666' }}>
            //         <Videocam sx={{ fontSize: 40, mb: 1 }} />
            //         <Typography variant="caption" display="block">
            //           NO SIGNAL
            //         </Typography>
            //       </Box>
            //     ) : (
            //       <Box sx={{ textAlign: 'center', color: '#888' }}>
            //         <Videocam sx={{ fontSize: 40 }} />
            //       </Box>
            //     )}
            //   </Box>
            //
            //   <Box
            //     sx={{
            //       position: 'absolute',
            //       bottom: 0,
            //       left: 0,
            //       right: 0,
            //       backgroundColor: 'rgba(0, 0, 0, 0.8)',
            //       color: 'white',
            //       p: 1,
            //       transform: 'translateY(100%)',
            //       transition: 'transform 0.2s ease',
            //       '&:hover': {
            //         transform: 'translateY(0)',
            //       },
            //     }}
            //   >
            //     <Typography variant="caption" display="block" fontWeight="bold">
            //       {camera.name}
            //     </Typography>
            //     <Typography variant="caption" color="#ccc">
            //       {camera.location}
            //     </Typography>
            //   </Box>
            // </Box>
          ))}

          {emptySlots.map((_, index) => (
            <Box
              key={`empty-${index}`}
              sx={{
                backgroundColor: darkMode ? '#0a0a0a' : '#e0e0e0',
                border: '2px dashed',
                borderColor: darkMode ? '#333' : '#999',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: darkMode ? '#1a1a1a' : '#f5f5f5',
                },
              }}
              onClick={() => setAddCameraOpen(true)}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Add sx={{ fontSize: 30, mb: 1 }} />
                <Typography variant="caption">
                  Add Camera
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderContent = () => {
    if (fullScreenCamera && activeTab === 'cameras') {
      return (
        <FullScreenCameraView
          camera={fullScreenCamera}
          onBack={handleExitFullscreen}
          darkMode={darkMode}
          channelNumber={cameras.findIndex(c => c.id === fullScreenCamera.id) + 1}
        />
      );
    }

    switch (activeTab) {
      case 'cameras':
        return renderCameraGrid();
      case 'recordings':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Recordings</Typography>
            <Typography variant="body1">Recording management interface will be here</Typography>
          </Box>
        );
      case 'alerts':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Alerts & Notifications</Typography>
            <Typography variant="body1">Alert management interface will be here</Typography>
          </Box>
        );
      case 'analytics':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Analytics Dashboard</Typography>
            <Typography variant="body1">Analytics and insights will be here</Typography>
          </Box>
        );
      case 'settings':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Settings</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
              }
              label="Dark Mode"
            />
          </Box>
        );
      case 'services':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Services</Typography>
            <Typography variant="body1">Service management interface will be here</Typography>
          </Box>
        );
      default:
        return renderCameraGrid();
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <Drawer
          variant="permanent"
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            transition: 'width 0.3s ease',
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              transition: 'width 0.3s ease',
              overflow: 'hidden',
              backgroundColor: darkMode ? '#1a1a1a' : '#fafafa',
              borderRight: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
            },
          }}
        >
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              minHeight: 64,
            }}
          >
            <IconButton
              onClick={() => setSidebarOpen(!sidebarOpen)}
              sx={{ mr: sidebarOpen || sidebarHovered ? 1 : 0 }}
            >
              <Menu />
            </IconButton>
            {(sidebarOpen || sidebarHovered) && (
              <Typography variant="h6" fontWeight="bold" color="primary">
                SeeDeep
              </Typography>
            )}
          </Box>

          <Divider />

          <List sx={{ flexGrow: 1, pt: 1 }}>
            {sidebarItems.map((item) => (
              <ListItem key={item.id} disablePadding>
                <ListItemButton
                  selected={activeTab === item.id}
                  onClick={() => setActiveTab(item.id)}
                  sx={{
                    minHeight: 48,
                    justifyContent: sidebarOpen || sidebarHovered ? 'initial' : 'center',
                    px: 2.5,
                    '&.Mui-selected': {
                      backgroundColor: darkMode ? 'rgba(46, 125, 50, 0.16)' : 'rgba(46, 125, 50, 0.12)',
                      '&:hover': {
                        backgroundColor: darkMode ? 'rgba(46, 125, 50, 0.24)' : 'rgba(46, 125, 50, 0.16)',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: sidebarOpen || sidebarHovered ? 3 : 'auto',
                      justifyContent: 'center',
                      color: activeTab === item.id ? 'primary.main' : 'inherit',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {(sidebarOpen || sidebarHovered) && (
                    <ListItemText
                      primary={item.label}
                      sx={{
                        opacity: sidebarOpen || sidebarHovered ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Box sx={{ p: 2 }}>
            <ListItemButton
              onClick={() => setDarkMode(!darkMode)}
              sx={{
                minHeight: 48,
                justifyContent: sidebarOpen || sidebarHovered ? 'initial' : 'center',
                borderRadius: 1,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: sidebarOpen || sidebarHovered ? 3 : 'auto',
                  justifyContent: 'center',
                }}
              >
                {darkMode ? <Brightness7 /> : <Brightness4 />}
              </ListItemIcon>
              {(sidebarOpen || sidebarHovered) && (
                <ListItemText
                  primary="Toggle Theme"
                  sx={{
                    opacity: sidebarOpen || sidebarHovered ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                  }}
                />
              )}
            </ListItemButton>
          </Box>
        </Drawer>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            height: '100vh',
            overflow: 'auto',
            backgroundColor: 'background.default',
            marginRight: rightSidebarOpen ? '320px' : 0,
            transition: 'margin-right 0.3s ease',
          }}
        >
          {!fullScreenCamera && (
            <Paper
              elevation={1}
              sx={{
                p: 2,
                mb: 0,
                borderRadius: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="h5" fontWeight="bold">
                {sidebarItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
              </Typography>

              {activeTab === 'cameras' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setAddCameraOpen(true)}
                    sx={{
                      backgroundColor: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    }}
                  >add camera
                  </Button>

                  <Divider orientation="vertical" flexItem />

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GridView sx={{ fontSize: 20 }} />
                    <ToggleButtonGroup
                      value={gridSize}
                      exclusive
                      onChange={(e, newGridSize) => newGridSize && setGridSize(newGridSize)}
                      size="small"
                    >
                      <ToggleButton value="2x2">2×2</ToggleButton>
                      <ToggleButton value="3x3">3×3</ToggleButton>
                      <ToggleButton value="4x4">4×4</ToggleButton>
                      <ToggleButton value="5x5">5×5</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>

                  <Divider orientation="vertical" flexItem />

                  <Chip
                    label={`${cameras.filter(c => c.status === 'online').length} Online`}
                    color="success"
                    size="small"
                  />
                  <Chip
                    label={`${cameras.filter(c => c.status === 'recording').length} Recording`}
                    sx={{
                      backgroundColor: '#ff9800',
                      color: 'white',
                      '&:hover': { backgroundColor: '#f57c00' }
                    }}
                    size="small"
                  />
                  <Chip
                    label={`${cameras.filter(c => c.status === 'offline').length} Offline`}
                    color="error"
                    size="small"
                  />
                </Box>
              )}
            </Paper>
          )}

          <Box sx={{ height: fullScreenCamera ? '100vh' : 'calc(100vh - 80px)', overflow: 'auto' }}>
            {renderContent()}
          </Box>
        </Box>
      </Box>

      <ModelsSidebar
        open={rightSidebarOpen}
        onClose={() => setRightSidebarOpen(false)}
        selectedCamera={selectedCamera}
        cameras={cameras}
        darkMode={darkMode}
        onDetectionModelChange={handleDetectionModelChange}
      />

      <Dialog
        open={addCameraOpen}
        onClose={() => setAddCameraOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '80vh',
            maxHeight: '90vh',
          }
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <AddCamera onClose={() => setAddCameraOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MainWindow;