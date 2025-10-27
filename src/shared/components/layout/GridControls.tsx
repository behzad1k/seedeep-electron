import React, { memo } from 'react';
import { Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { GridView } from '@mui/icons-material';

interface GridControlsProps {
  gridSize: '2x2' | '3x3' | '4x4' | '5x5';
  onGridSizeChange: (size: '2x2' | '3x3' | '4x4' | '5x5') => void;
}

export const GridControls = memo<GridControlsProps>(({
                                                       gridSize,
                                                       onGridSizeChange
                                                     }) => {
  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newGridSize: '2x2' | '3x3' | '4x4' | '5x5' | null
  ) => {
    if (newGridSize) {
      onGridSizeChange(newGridSize);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
  <GridView sx={{ fontSize: 20 }} />
  <ToggleButtonGroup
  value={gridSize}
  exclusive
  onChange={handleChange}
  size="small"
  >
  <ToggleButton value="2x2">2×2</ToggleButton>
  <ToggleButton value="3x3">3×3</ToggleButton>
  <ToggleButton value="4x4">4×4</ToggleButton>
  <ToggleButton value="5x5">5×5</ToggleButton>
  </ToggleButtonGroup>
  </Box>
);
});

GridControls.displayName = 'GridControls';
