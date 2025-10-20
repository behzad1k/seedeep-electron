import { MemoryInfo } from '@/types';

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private warningThreshold = 0.8; // 80% of available memory
  private criticalThreshold = 0.9; // 90% of available memory
  private onWarning?: (usage: number) => void;
  private onCritical?: (usage: number) => void;
  private checkInterval?: NodeJS.Timeout;
  private hasMemoryAPI: boolean;

  // Fallback: Track number of active resources for estimation
  private activeResources = {
    cameras: 0,
    connections: 0,
    canvases: 0,
    lastUpdate: Date.now()
  };

  private constructor() {
    // Check if performance.memory is available (Chrome only)
    this.hasMemoryAPI = 'memory' in performance;

    if (!this.hasMemoryAPI) {
      console.warn('[MemoryMonitor] performance.memory API not available. Using estimation mode.');
    }
  }

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  /**
   * Update resource counts for memory estimation (when performance.memory unavailable)
   */
  updateResourceCounts(resources: Partial<typeof this.activeResources>): void {
    this.activeResources = {
      ...this.activeResources,
      ...resources,
      lastUpdate: Date.now()
    };
  }

  startMonitoring(
    intervalMs: number = 5000,
    onWarning?: (usage: number) => void,
    onCritical?: (usage: number) => void
  ): void {
    this.onWarning = onWarning;
    this.onCritical = onCritical;

    this.checkInterval = setInterval(() => {
      this.checkMemory();
    }, intervalMs);

    // Initial check
    this.checkMemory();
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  private checkMemory(): void {
    const memoryInfo = this.getMemoryInfo();

    if (!memoryInfo) {
      console.warn('[MemoryMonitor] Unable to get memory information');
      return;
    }

    const usageRatio = memoryInfo.usagePercent / 100;

    console.log(
      `[MemoryMonitor] Memory usage: ${memoryInfo.usagePercent.toFixed(2)}%`,
      memoryInfo.isEstimate ? '(estimated)' : ''
    );

    if (usageRatio >= this.criticalThreshold) {
      console.error('[MemoryMonitor] CRITICAL memory usage!');
      this.onCritical?.(usageRatio);
    } else if (usageRatio >= this.warningThreshold) {
      console.warn('[MemoryMonitor] High memory usage');
      this.onWarning?.(usageRatio);
    }
  }

  getMemoryInfo(): MemoryInfo | null {
    if (this.hasMemoryAPI) {
      return this.getActualMemoryInfo();
    } else {
      return this.getEstimatedMemoryInfo();
    }
  }

  private getActualMemoryInfo(): MemoryInfo | null {
    try {
      const perf = performance as PerformanceWithMemory;
      const memory = perf.memory;

      if (!memory) {
        return null;
      }

      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        isEstimate: false
      };
    } catch (error) {
      console.error('[MemoryMonitor] Error reading memory:', error);
      return null;
    }
  }

  /**
   * Estimate memory usage based on active resources
   * This is a rough estimate when performance.memory is unavailable
   */
  private getEstimatedMemoryInfo(): MemoryInfo | null {
    try {
      // Rough estimates (in bytes):
      const CAMERA_MEMORY = 15 * 1024 * 1024;      // ~15MB per camera
      const CONNECTION_MEMORY = 1 * 1024 * 1024;   // ~1MB per connection
      const CANVAS_MEMORY = 5 * 1024 * 1024;       // ~5MB per canvas
      const BASE_MEMORY = 100 * 1024 * 1024;       // ~100MB base app

      const estimatedUsed =
        BASE_MEMORY +
        (this.activeResources.cameras * CAMERA_MEMORY) +
        (this.activeResources.connections * CONNECTION_MEMORY) +
        (this.activeResources.canvases * CANVAS_MEMORY);

      // Assume 2GB limit for estimation (conservative)
      const estimatedLimit = 2 * 1024 * 1024 * 1024;

      return {
        used: estimatedUsed,
        total: estimatedUsed,
        limit: estimatedLimit,
        usagePercent: (estimatedUsed / estimatedLimit) * 100,
        isEstimate: true
      };
    } catch (error) {
      console.error('[MemoryMonitor] Error estimating memory:', error);
      return null;
    }
  }

  /**
   * Check if memory API is available
   */
  isMemoryAPIAvailable(): boolean {
    return this.hasMemoryAPI;
  }

  /**
   * Get current resource counts
   */
  getResourceCounts() {
    return { ...this.activeResources };
  }
}