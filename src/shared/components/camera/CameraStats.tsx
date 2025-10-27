import { Camera } from '@shared/types';
import React, { memo, useMemo } from 'react';
import { Chip } from '@mui/material';

interface CameraStatsProps {
  cameras: Camera[];
}

export const CameraStats = memo<CameraStatsProps>(({ cameras }) => {
  const stats = useMemo(() => {
    const online = cameras.filter(c => c.status === 'online').length;
    const recording = cameras.filter(c => c.status === 'recording').length;
    const offline = cameras.filter(c => c.status === 'offline').length;

    return { online, recording, offline };
  }, [cameras]);

  return (
    <>
      <Chip
        label={`${stats.online} Online`}
        color="success"
        size="small"
      />
      <Chip
        label={`${stats.recording} Recording`}
        sx={{
          backgroundColor: '#ff9800',
          color: 'white',
          '&:hover': { backgroundColor: '#f57c00' }
        }}
        size="small"
      />
      <Chip
        label={`${stats.offline} Offline`}
        color="error"
        size="small"
      />
    </>
  );
});

CameraStats.displayName = 'CameraStats';
