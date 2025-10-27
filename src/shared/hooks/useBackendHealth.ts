import { BackendHealthResponse, IpcResponse } from '@shared/types';
import { useState, useEffect, useCallback } from 'react';

interface BackendHealthState {
  isHealthy: boolean;
  isChecking: boolean;
  error: string | undefined;
  healthData?: BackendHealthResponse;
  lastCheck: Date | undefined;
}

export const useBackendHealth = (checkInterval: number = 30000) => {
  const [state, setState] = useState<BackendHealthState>({
    isHealthy: false,
    isChecking: false,
    error: undefined,
    healthData: undefined,
    lastCheck: undefined
  });

  // Check if Electron API is available
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  const checkHealth = useCallback(async () => {
    if (!isElectron) {
      setState(prev => ({
        ...prev,
        isHealthy: false,
        error: 'Electron API not available',
        isChecking: false,
        lastCheck: new Date()
      }));
      return;
    }

    setState(prev => ({ ...prev, isChecking: true }));

    try {
      // Use system.getInfo or create a dedicated health check IPC
      const response: IpcResponse<BackendHealthResponse> = await window.electronAPI.system.getInfo();
      console.log(response);
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          isHealthy: true,
          error: undefined,
          healthData: response.data,
          isChecking: false,
          lastCheck: new Date()
        }));
      } else {
        setState(prev => ({
          ...prev,
          isHealthy: false,
          error: response.error || 'Health check failed',
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
  }, [isElectron]);

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