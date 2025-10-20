
import { useState, useEffect, useCallback } from 'react';
import { cameraApi } from '@/services/api/cameraApi';
import { BackendHealthResponse } from '@/types/backend';

interface BackendHealthState {
  isHealthy: boolean;
  isChecking: boolean;
  error: string | null;
  healthData: BackendHealthResponse | null;
  lastCheck: Date | null;
}

export const useBackendHealth = (checkInterval: number = 30000) => {
  const [state, setState] = useState<BackendHealthState>({
    isHealthy: false,
    isChecking: false,
    error: null,
    healthData: null,
    lastCheck: null
  });

  const checkHealth = useCallback(async () => {
    setState(prev => ({ ...prev, isChecking: true }));

    try {
      const response = await cameraApi.healthCheck();

      if (response.error) {
        setState(prev => ({
          ...prev,
          isHealthy: false,
          error: response.error || 'Health check failed',
          isChecking: false,
          lastCheck: new Date()
        }));
      } else if (response.data) {
        setState(prev => ({
          ...prev,
          isHealthy: true,
          error: null,
          healthData: response.data,
          isChecking: false,
          lastCheck: new Date()
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Health check failed',
        isChecking: false,
        lastCheck: new Date()
      }));
    }
  }, []);

  // Initial check and periodic checks
  useEffect(() => {
    checkHealth();

    const interval = setInterval(checkHealth, checkInterval);

    return () => clearInterval(interval);
  }, [checkHealth, checkInterval]);

  return {
    ...state,
    checkHealth
  };
};
