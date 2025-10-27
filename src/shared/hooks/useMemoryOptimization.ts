import { MemoryInfo } from '@shared/types';
import { MemoryMonitor } from '@utils/performance/MemoryMonitor.ts';
import { useEffect, useState } from 'react';

interface MemoryStatus {
  usage: number;
  isWarning: boolean;
  isCritical: boolean;
  recommendedAction?: string;
  memoryInfo: MemoryInfo | null;
}

/**
 * Hook for monitoring memory and taking action
 */
export const useMemoryOptimization = (onHighMemory?: () => void) => {
  const [memoryStatus, setMemoryStatus] = useState<MemoryStatus>({
    usage: 0,
    isWarning: false,
    isCritical: false,
    memoryInfo: null
  });

  useEffect(() => {
    const monitor = MemoryMonitor.getInstance();

    monitor.startMonitoring(
      5000,
      (usage) => {
        const memInfo = monitor.getMemoryInfo();
        setMemoryStatus({
          usage,
          isWarning: true,
          isCritical: false,
          recommendedAction: 'Consider reducing grid size or disabling some cameras',
          memoryInfo: memInfo
        });
      },
      (usage) => {
        const memInfo = monitor.getMemoryInfo();
        setMemoryStatus({
          usage,
          isWarning: true,
          isCritical: true,
          recommendedAction: 'CRITICAL: Reduce grid size immediately or close some cameras',
          memoryInfo: memInfo
        });
        onHighMemory?.();
      }
    );

    return () => {
      monitor.stopMonitoring();
    };
  }, [onHighMemory]);

  return memoryStatus;
};