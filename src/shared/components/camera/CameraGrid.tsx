import { BackendCamera, Camera } from "@shared/types";
import React, { memo, useCallback } from "react";
import { Box } from "@mui/material";

interface CameraGridProps {
  cameras: Camera[];
  gridSize: "1x1" | "2x2" | "3x3" | "4x4" | "5x5";
  darkMode: boolean;
  expandedCamera?: BackendCamera | null;
  onCameraClick: (camera: Camera) => void;
  onAddCamera: () => void;
  renderCamera?: (camera: Camera, index: number) => React.ReactNode;
  handleOpenFeatureConfig: (camera: BackendCamera) => void;
}

export const CameraGrid = memo<CameraGridProps>(
  ({
    cameras,
    gridSize,
    darkMode,
    expandedCamera,
    onCameraClick,
    onAddCamera,
    renderCamera,
    handleOpenFeatureConfig,
  }) => {
    const getGridDimensions = useCallback(() => {
      switch (gridSize) {
        case "1x1":
          return { columns: 1, rows: 1 };
        case "2x2":
          return { columns: 2, rows: 2 };
        case "3x3":
          return { columns: 3, rows: 3 };
        case "4x4":
          return { columns: 4, rows: 4 };
        case "5x5":
          return { columns: 5, rows: 5 };
        default:
          return { columns: 3, rows: 3 };
      }
    }, [gridSize]);

    const { columns, rows } = getGridDimensions();
    const totalSlots = columns * rows;

    // When expanded (1x1), only show the expanded camera
    const displayCameras = expandedCamera
      ? ([cameras.find((c) => c.id === expandedCamera.id)].filter(
          Boolean,
        ) as Camera[])
      : cameras;

    // Fill remaining slots with null for proper grid layout (only in non-expanded mode)
    const gridItems = [...displayCameras];
    if (!expandedCamera) {
      while (gridItems.length < totalSlots) {
        gridItems.push(null as any);
      }
    }

    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          p: expandedCamera ? 0 : 2,
          bgcolor: darkMode ? "#000" : "#f0f0f0",
          overflow: "hidden",
          transition: "padding 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gap: expandedCamera ? 0 : 1,
            width: "100%",
            height: "100%",
            maxHeight: "calc(100vh - 100px)",
            transition: "gap 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {gridItems?.map((camera, index) => {
            if (!camera) {
              // Empty slot (only shown in non-expanded mode)
              return (
                <Box
                  key={`empty-${index}`}
                  sx={{
                    bgcolor: darkMode ? "#0a0a0a" : "#e0e0e0",
                    border: "2px dashed",
                    borderColor: darkMode ? "#333" : "#999",
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "text.secondary",
                    fontSize: "0.875rem",
                    opacity: 0.5,
                  }}
                >
                  Empty
                </Box>
              );
            }

            return (
              <Box
                key={camera.id}
                sx={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  minHeight: 0, // Important for grid items
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                {renderCamera ? (
                  renderCamera(camera, index)
                ) : (
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      bgcolor: "background.paper",
                      border: 1,
                      borderColor: "divider",
                      borderRadius: expandedCamera ? 0 : 1,
                      cursor: "pointer",
                      transition:
                        "border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        borderColor: "primary.main",
                      },
                    }}
                    onClick={() => onCameraClick(camera)}
                  >
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ fontWeight: "bold" }}>{camera.name}</Box>
                      <Box
                        sx={{ fontSize: "0.875rem", color: "text.secondary" }}
                      >
                        {camera.location}
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  },
);

CameraGrid.displayName = "CameraGrid";
