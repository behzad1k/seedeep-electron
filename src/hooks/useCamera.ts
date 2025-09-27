'use client';

import { Camera } from '@/types';
import { useState, useCallback, useEffect } from 'react';

export function useCamera(selectedCamera: Camera) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: selectedCamera.slug },
        audio: false
      });

      setStream(mediaStream);
      setIsStreaming(true);
      setError(null);
      return mediaStream;
    } catch (err) {
      setError('Failed to access camera');
      setIsStreaming(false);
      return null;
    }
  }, [selectedCamera]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsStreaming(false);
  }, []);

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  return { isStreaming, error, stream, startCamera, stopCamera };
}
