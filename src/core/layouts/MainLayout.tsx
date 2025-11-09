import { CameraGrid } from '@components/camera/CameraGrid.tsx';
import { VirtualizedCameraGrid } from '@components/camera/VirtualizedCameraGrid.tsx';
import { AppHeader } from '@components/layout/AppHeader.tsx';
import { AppSidebar } from '@components/layout/AppSidebar.tsx';
import { BackendHealthIndicator } from '@components/layout/BackendHealthIndicator.tsx';
import AddCamera from '@features/camera-management/components/AddCamera.tsx';
import { CameraFeed } from '@features/camera-management/components/CameraFeed.tsx';
import { FeatureConfigSidebar } from '@features/camera-management/components/FeatureConfigSidebar.tsx';
import FullScreenCameraView from '@features/camera-management/components/FullScreenCameraView.tsx';
import { useCameraManager } from '@features/camera-management/hooks/useCameraManager.ts';
import { useMemoryOptimization } from '@hooks/useMemoryOptimization.ts';
import { BackendCamera } from '@shared/types';
import { MODEL_DEFINITIONS } from '@utils/models/modelDefinitions.ts';
import React, { useState, useCallback, useEffect } from 'react';
import { Box, Alert, CircularProgress, Modal } from '@mui/material';

const MainLayout: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState('cameras');
  const [gridSize, setGridSize] = useState<'2x2' | '3x3' | '4x4' | '5x5'>('3x3');
  const [addCameraOpen, setAddCameraOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [featureConfigOpen, setFeatureConfigOpen] = useState(false);
  const [configCamera, setConfigCamera] = useState<BackendCamera | null>(null);

  // Backend integration
  const {
    cameras,
    selectedCamera,
    fullScreenCamera,
    loading,
    error,
    setSelectedCamera,
    setFullScreenCamera,
    updateCameraFeatures,
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

  const handleOpenFeatureConfig = (camera: BackendCamera) => {
    setConfigCamera(camera);
    setFeatureConfigOpen(true);
  };


  const handleSaveFeatures = async (cameraId: string, features: any) => {
    await updateCameraFeatures(cameraId, features);
  };

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
          renderCamera={(camera) => <CameraFeed
            cameraId={camera.id}
            targetFPS={15}
            isVisible={true}
          />}
          cameras={cameras}
          gridSize={gridSize}
          darkMode={darkMode}
          onCameraClick={handleCameraClick}
          handleOpenFeatureConfig={handleOpenFeatureConfig}
          onAddCamera={() => setAddCameraOpen(true)}
        />
      );
    }

    return <Box sx={{ p: 3 }}>Content for {activeTab}</Box>;
  };

  return (
    <Box sx={{ paddingLeft: 7}}>
      <Modal open={addCameraOpen}
             onClose={() => setAddCameraOpen(false)}>
          <AddCamera onClose={() => setAddCameraOpen(false)} onSubmit={createCamera} availableModels={Object.values(MODEL_DEFINITIONS).map(e => ({ name: e.name, classes: e.classes}))}/>
      </Modal>
      {/* {addCameraOpen && */}
      {/*   <AddCamera onClose={() => setAddCameraOpen(false)} onSubmit={createCamera} availableModels={Object.values(MODEL_DEFINITIONS).map(e => ({ name: e.name, classes: e.classes}))}/> */}
      {/* } */}
      <AppHeader title={'SeeDeep'} cameras={[]} gridSize={'2x2'} onGridSizeChange={(size ) => setGridSize(size)} onAddCamera={() => setAddCameraOpen(true)} showCameraControls={true}/>

      <Box sx={{ display: 'flex', height: '100vh' }}>
        {/* Sidebar, Header, Content... */}

        {renderContent()}

      </Box>
      <AppSidebar open={rightSidebarOpen} hovered={false} activeTab={activeTab} darkMode={darkMode} items={[]} onToggle={() => setRightSidebarOpen(!rightSidebarOpen)} onMouseEnter={() => {} } onMouseLeave={() => {}} onTabChange={() => {}} onThemeToggle={() => setDarkMode(!darkMode) } />
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
      <FeatureConfigSidebar
        open={featureConfigOpen}
        camera={configCamera}
        darkMode={darkMode}
        onClose={() => setFeatureConfigOpen(false)}
        onSave={handleSaveFeatures}
      />
    </Box>
  );
};

export default MainLayout