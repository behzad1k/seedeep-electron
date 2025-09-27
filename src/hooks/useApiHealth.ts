import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';

export const useApiHealth = (checkInterval = 30000) => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const response = await apiService.healthCheck();
      if (response.error) {
        setIsHealthy(false);
        setError(response.error);
      } else {
        setIsHealthy(true);
        setError(null);
      }
    } catch (err) {
      setIsHealthy(false);
      setError('Health check failed');
    }
    setLastCheck(new Date());
  }, []);

  useEffect(() => {
    // Initial check
    checkHealth();

    // Set up interval
    const interval = setInterval(checkHealth, checkInterval);

    return () => clearInterval(interval);
  }, [checkHealth, checkInterval]);

  return {
    isHealthy,
    lastCheck,
    error,
    checkHealth
  };
};
