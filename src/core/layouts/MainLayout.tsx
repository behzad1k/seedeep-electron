import { CameraGrid } from '@components/camera/CameraGrid.tsx';
import { AppHeader } from '@components/layout/AppHeader.tsx';
import { AppSidebar } from '@components/layout/AppSidebar.tsx';
import { BackendHealthIndicator } from '@components/layout/BackendHealthIndicator.tsx';
import { CameraDetailSidebar } from '@features/camera-management/components/CameraDetailSidebar.tsx';
import AddCamera from '@features/camera-management/components/AddCamera.tsx';
import { CameraFeed } from '@features/camera-management/components/CameraFeed.tsx';
import { useCameraManager } from '@features/camera-management/hooks/useCameraManager.ts';
import { useMemoryOptimization } from '@hooks/useMemoryOptimization.ts';
import { useTheme } from '@/contexts/ThemeContext';
import { BackendCamera } from '@shared/types';
import React, { useState, useCallback } from 'react';
import { Box, Alert, CircularProgress, Modal, Paper } from '@mui/material';

const MainLayout: React.FC = () => {
  const { darkMode, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('cameras');
  const [gridSize, setGridSize] = useState<'2x2' | '3x3' | '4x4' | '5x5'>('3x3');
  const [addCameraOpen, setAddCameraOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [expandedCamera, setExpandedCamera] = useState<BackendCamera | null>(null);

  const {
    cameras,
    selectedCamera,
    loading,
    error,
    setSelectedCamera,
    createCamera,
    deleteCamera
  } = useCameraManager();

  const memoryStatus = useMemoryOptimization(() => {
    if (gridSize === '5x5') setGridSize('4x4');
    else if (gridSize === '4x4') setGridSize('3x3');
    else if (gridSize === '3x3') setGridSize('2x2');
  });

  const handleCameraClick = useCallback((camera: any) => {
    setExpandedCamera(camera);
    setSelectedCamera(camera);
    setRightSidebarOpen(true);
  }, [setSelectedCamera]);

  const handleCloseSidebar = useCallback(() => {
    setRightSidebarOpen(false);
    setTimeout(() => setExpandedCamera(null), 300);
  }, []);

  const handleUpdate = useCallback(async (cameraId: string, updates: any) => {
    await window.electronAPI.camera.update(cameraId, updates);
  }, []);

  const handleDelete = useCallback(async (cameraId: string) => {
    await deleteCamera(cameraId);
  }, [deleteCamera]);

  const handleCalibrate = useCallback(async (cameraId: string, data: any) => {
    await window.electronAPI.camera.calibrate(cameraId, data);
  }, []);

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
          <Alert severity="error" onClose={() => window.location.reload()}>{error}</Alert>
        </Box>
      );
    }

    if (activeTab === 'cameras') {
      return (
        <Box sx={{
          display: 'flex',
          height: 'calc(100vh - 80px)',
          position: 'relative'
        }}>
          {/* Camera Grid Container */}
          <Box sx={{
            flex: expandedCamera ? '0 0 calc(100% - 450px)' : '1',
            transition: 'flex 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <CameraGrid
              renderCamera={(camera, index) => (
                <Paper
                  elevation={expandedCamera?.id === camera.id ? 8 : 2}
                  sx={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: expandedCamera?.id === camera.id ? 'scale(1.03)' : 'scale(1)',
                    zIndex: expandedCamera?.id === camera.id ? 100 : 1,
                    border: expandedCamera?.id === camera.id ? 2 : 1,
                    borderColor: expandedCamera?.id === camera.id ? 'primary.main' : 'divider',
                    '&:hover': {
                      transform: 'scale(1.02)',
                      borderColor: 'primary.main'
                    }
                  }}
                  onClick={() => handleCameraClick(camera)}
                >
                  <CameraFeed
                    cameraId={camera.id}
                    targetFPS={15}
                    isVisible={true}
                  />

                  {/* Camera Label */}
                  <Box sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    p: 1,
                    backdropFilter: 'blur(4px)'
                  }}>
                    <Box sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
                      {camera.name}
                    </Box>
                    <Box sx={{ fontSize: '0.75rem', opacity: 0.8 }}>
                      {camera.location}
                    </Box>
                  </Box>

                  {/* Channel Number */}
                  <Box sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    CH{index + 1}
                  </Box>

                  {/* Status Indicator */}
                  <Box sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: camera.status === 'online' ? '#4caf50' : '#f44336',
                    boxShadow: '0 0 8px currentColor'
                  }} />
                </Paper>
              )}
              cameras={cameras}
              gridSize={gridSize}
              darkMode={darkMode}
              expandedCamera={expandedCamera}
              onCameraClick={handleCameraClick}
              handleOpenFeatureConfig={() => {}}
              onAddCamera={() => setAddCameraOpen(true)}
            />
          </Box>

          {/* Expanded Camera View (Large on Right) */}
          {expandedCamera && (
            <Box sx={{
              flex: '0 0 450px',
              display: rightSidebarOpen ? 'block' : 'none',
              borderLeft: 1,
              borderColor: 'divider',
              overflow: 'hidden',
              bgcolor: 'background.default',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              <Box sx={{ height: '50%', borderBottom: 1, borderColor: 'divider' }}>
                <CameraFeed
                  cameraId={expandedCamera.id}
                  targetFPS={15}
                  isVisible={true}
                  renderDetections={true}
                />
              </Box>

              {/* Camera Info Bar */}
              <Box sx={{
                p: 2,
                bgcolor: 'background.paper',
                borderBottom: 1,
                borderColor: 'divider'
              }}>
                <Box sx={{ fontSize: '1rem', fontWeight: 'bold', mb: 0.5 }}>
                  {expandedCamera.name}
                </Box>
                <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                  {expandedCamera.location}
                </Box>
              </Box>

              {/* Placeholder for future content */}
              <Box sx={{ height: 'calc(50% - 88px)', overflow: 'auto' }}>
                {/* Additional camera info can go here */}
              </Box>
            </Box>
          )}
        </Box>
      );
    }

    return <Box sx={{ p: 3 }}>Content for {activeTab}</Box>;
  };

  return (
    <Box sx={{ paddingLeft: 7, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Modal open={addCameraOpen} onClose={() => setAddCameraOpen(false)}>
        <AddCamera onClose={() => setAddCameraOpen(false)} onSubmit={createCamera} />
      </Modal>

      <AppHeader
        title={'SeeDeep'}
        cameras={[]}
        gridSize={gridSize}
        onGridSizeChange={setGridSize}
        onAddCamera={() => setAddCameraOpen(true)}
        showCameraControls={true}
      />

      {renderContent()}

      <AppSidebar
        open={false}
        hovered={false}
        activeTab={activeTab}
        items={[]}
        onToggle={() => {}}
        onMouseEnter={() => {}}
        onMouseLeave={() => {}}
        onTabChange={setActiveTab}
      />

      <CameraDetailSidebar
        open={rightSidebarOpen}
        camera={expandedCamera}
        onClose={handleCloseSidebar}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onCalibrate={handleCalibrate}
      />

      <BackendHealthIndicator position="top-right" />

      {memoryStatus.isCritical && (
        <Alert severity="error" sx={{ position: 'fixed', top: 60, right: 16, zIndex: 9999 }}>
          {memoryStatus.recommendedAction}
        </Alert>
      )}
    </Box>
  );
};

export default MainLayout;