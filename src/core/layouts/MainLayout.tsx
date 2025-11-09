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
import { Box, Alert, CircularProgress, Modal, Paper, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';

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
    if (expandedCamera?.id === camera.id) {
      // Clicking the same camera - collapse it
      setExpandedCamera(null);
      setRightSidebarOpen(false);
    } else {
      // Clicking a different camera - expand it
      setExpandedCamera(camera);
      setSelectedCamera(camera);
      setRightSidebarOpen(true);
    }
  }, [expandedCamera, setSelectedCamera]);

  const handleCloseSidebar = useCallback(() => {
    setRightSidebarOpen(false);
    setTimeout(() => setExpandedCamera(null), 300);
  }, []);

  const handleUpdate = useCallback(async (cameraId: string, updates: any) => {
    // Preserve active_models when updating
    const currentCamera = cameras.find(c => c.id === cameraId);

    const updatePayload = {
      ...updates,
      // Preserve active_models if not explicitly being updated
      active_models: updates.active_models || currentCamera?.detectionModels
        ? Object.entries(currentCamera?.detectionModels || {})
        .filter(([_, enabled]) => enabled)
        .map(([key]) => {
          // Convert frontend keys to backend model names
          const modelMap: Record<string, string> = {
            'ppeDetection': 'ppe_detection',
            'personDetection': 'person_detection',
            'generalDetection': 'general_detection',
            'fireDetection': 'fire_detection',
            'weaponDetection': 'weapon_detection'
          };
          return modelMap[key] || key;
        })
        : []
    };

    await window.electronAPI.camera.update(cameraId, updatePayload);
  }, [cameras]);

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
          {/* Camera Grid Container - FIXED: Proper sizing */}
          <Box sx={{
            width: expandedCamera ? 'calc(100% - 450px)' : '100%',
            height: '100%',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            zIndex: 1 // FIXED: Below sidebar
          }}>
            <CameraGrid
              renderCamera={(camera, index) => {
                // Hide non-expanded cameras when one is expanded
                const isExpanded = expandedCamera?.id === camera.id;
                const shouldHide = expandedCamera && !isExpanded;

                return (
                  <Paper
                    elevation={isExpanded ? 8 : 2}
                    sx={{
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: shouldHide ? 0 : 1,
                      visibility: shouldHide ? 'hidden' : 'visible',
                      transform: isExpanded ? 'scale(1)' : 'scale(1)',
                      zIndex: isExpanded ? 100 : 1,
                      border: isExpanded ? 2 : 1,
                      borderColor: isExpanded ? 'primary.main' : 'divider',
                      '&:hover': {
                        transform: expandedCamera ? 'scale(1)' : 'scale(1.02)',
                        borderColor: 'primary.main'
                      }
                    }}
                    onClick={() => handleCameraClick(camera)}
                  >
                    {/* FIXED: Always render feed, control visibility via isVisible prop */}
                    <CameraFeed
                      cameraId={camera.id}
                      targetFPS={20} // FIXED: Increased FPS
                      isVisible={!shouldHide} // FIXED: Feed updates when visible
                      renderDetections={isExpanded}
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
                      backdropFilter: 'blur(4px)',
                      pointerEvents: 'none' // FIXED: Don't block clicks
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
                      fontWeight: 'bold',
                      pointerEvents: 'none' // FIXED: Don't block clicks
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
                      boxShadow: '0 0 8px currentColor',
                      pointerEvents: 'none' // FIXED: Don't block clicks
                    }} />

                    {/* Close button when expanded - FIXED: Higher z-index */}
                    {isExpanded && (
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCameraClick(camera);
                        }}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 40,
                          bgcolor: 'rgba(0, 0, 0, 0.7)',
                          color: 'white',
                          zIndex: 1000, // FIXED: Above everything
                          '&:hover': {
                            bgcolor: 'rgba(0, 0, 0, 0.9)'
                          }
                        }}
                      >
                        <Close />
                      </IconButton>
                    )}
                  </Paper>
                );
              }}
              cameras={cameras}
              gridSize={expandedCamera ? '1x1' : gridSize}
              darkMode={darkMode}
              expandedCamera={expandedCamera}
              onCameraClick={handleCameraClick}
              handleOpenFeatureConfig={() => {}}
              onAddCamera={() => setAddCameraOpen(true)}
            />
          </Box>

          {/* FIXED: Sidebar as overlay, not flex item */}
          {expandedCamera && rightSidebarOpen && (
            <Box sx={{
              position: 'fixed', // FIXED: Position fixed instead of flex
              right: 0,
              top: 80, // Below header
              width: 450,
              height: 'calc(100vh - 80px)',
              borderLeft: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: '-4px 0 12px rgba(0,0,0,0.15)',
              zIndex: 1200, // FIXED: Above camera grid
              transform: rightSidebarOpen ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden'
            }}>
              {/* Close button */}
              <IconButton
                onClick={handleCloseSidebar}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 1,
                  bgcolor: 'background.paper',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                <Close />
              </IconButton>

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

              {/* Details content */}
              <Box sx={{ height: 'calc(60% - 88px)', overflow: 'auto' }}>
                <CameraDetailSidebar
                  open={true}
                  camera={expandedCamera}
                  onClose={handleCloseSidebar}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onCalibrate={handleCalibrate}
                  embedded={true} // New prop to render without drawer
                />
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
        showCameraControls={!expandedCamera} // FIXED: Hide controls when expanded
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
      {memoryStatus.isCritical && (
        <Alert severity="error" sx={{ position: 'fixed', top: 60, right: 16, zIndex: 9999 }}>
          {memoryStatus.recommendedAction}
        </Alert>
      )}
    </Box>
  );
};

export default MainLayout;