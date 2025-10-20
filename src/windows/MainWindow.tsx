import React, { useState, useCallback, useEffect } from 'react';
import { Box, Alert, CircularProgress } from '@mui/material';
import { BackendHealthIndicator, VirtualizedCameraGrid, FullScreenCameraView, CameraGrid } from '../components';
import { useCameraManager, useMemoryOptimization } from '../hooks';

const MainWindow: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState('cameras');
  const [gridSize, setGridSize] = useState<'2x2' | '3x3' | '4x4' | '5x5'>('3x3');
  const [addCameraOpen, setAddCameraOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Backend integration
  const {
    cameras,
    selectedCamera,
    fullScreenCamera,
    loading,
    error,
    setSelectedCamera,
    setFullScreenCamera,
    updateCameraModel,
    createCamera,
    fetchCameras
  } = useCameraManager();

  // Memory optimization
  const memoryStatus = useMemoryOptimization(() => {
    // Auto-reduce grid on high memory
    if (gridSize === '5x5') setGridSize('4x4');
    else if (gridSize === '4x4') setGridSize('3x3');
    else if (gridSize === '3x3') setGridSize('2x2');
  });

  // Handlers
  const handleCameraClick = useCallback((camera: any) => {
    setSelectedCamera(camera);
    setRightSidebarOpen(true);
    setFullScreenCamera(camera);
  }, [setSelectedCamera, setFullScreenCamera]);

  const handleAddCamera = useCallback(async (cameraData: any) => {
    const result = await createCamera(cameraData);
    if (result) {
      setAddCameraOpen(false);
    }
  }, [createCamera]);

  // Refresh cameras periodically
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCameras();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchCameras]);

  // Render content
  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error" onClose={() => window.location.reload()}>
            {error}
          </Alert>
        </Box>
      );
    }

    if (fullScreenCamera && activeTab === 'cameras') {
      return (
        <FullScreenCameraView
          camera={fullScreenCamera}
          onBack={() => setFullScreenCamera(null)}
          darkMode={darkMode}
          channelNumber={cameras.findIndex(c => c.id === fullScreenCamera.id) + 1}
        />
      );
    }

    if (activeTab === 'cameras') {
      const GridComponent = cameras.length > 16 ? VirtualizedCameraGrid : CameraGrid;

      return (
        <GridComponent
          cameras={cameras}
          gridSize={gridSize}
          darkMode={darkMode}
          onCameraClick={handleCameraClick}
          onAddCamera={() => setAddCameraOpen(true)}
        />
      );
    }

    return <Box sx={{ p: 3 }}>Content for {activeTab}</Box>;
  };

  return (
    <>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        {/* Sidebar, Header, Content... */}
        {renderContent()}
      </Box>

      {/* Backend Health Indicator */}
      <BackendHealthIndicator position="top-right" />

      {/* Performance Monitor */}
      {/* <PerformanceMonitor visible={true} /> */}

      {/* Memory Warning */}
      {memoryStatus.isCritical && (
        <Alert severity="error" sx={{ position: 'fixed', top: 60, right: 16, zIndex: 9999 }}>
          {memoryStatus.recommendedAction}
        </Alert>
      )}
    </>
  );
};

export default MainWindow;