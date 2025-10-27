import React, { memo } from 'react';
import { Box, Typography } from '@mui/material';
import { Add } from '@mui/icons-material';

interface EmptySlotProps {
  darkMode: boolean;
  onAddCamera: () => void;
}

export const EmptySlot = memo<EmptySlotProps>(({ darkMode, onAddCamera }) => (
  <Box
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
    onClick={onAddCamera}
  >
    <Box sx={{ textAlign: 'center' }}>
      <Add sx={{ fontSize: 30, mb: 1 }} />
      <Typography variant="caption">
        Add Camera
      </Typography>
    </Box>
  </Box>
));

EmptySlot.displayName = 'EmptySlot';
