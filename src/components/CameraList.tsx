import { useCameraManager } from '@/hooks';
import { useEffect } from 'react';

function CameraList() {
  const { cameras, loading, error, fetchCameras } = useCameraManager();

  useEffect(() => {
    fetchCameras(); // Fetches from FastAPI backend
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {cameras.map(camera => (
        <li key={camera.id}>{camera.name} - {camera.status}</li>
      ))}
    </ul>
  );
}