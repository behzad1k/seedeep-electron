import { TrackingWebSocketService } from '@features/object-tracking/services/TrackingWebSocketService.ts';
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTrackingOptions {
  wsUrl?: string;
  autoConnect?: boolean;
  autoStart?: boolean;
  trackingConfig?: {
    tracker_type?: 'centroid' | 'kalman' | 'deep_sort' | 'byte_track';
    max_disappeared?: number;
    max_distance?: number;
    use_kalman?: boolean;
    fps?: number;
    pixel_to_meter_ratio?: number;
  };
  models?: Array<{
    name: string;
    classFilter?: string[];
  }>;
}

interface TrackingState {
  isConnected: boolean;
  isTracking: boolean;
  statistics: {
    totalTracks: number;
    activeTracks: number;
    classDistribution: Record<string, number>;
  };
  trackedObjects: Record<string, any>;
  zoneOccupancy: Record<string, string[]>;
  detections: any[];
  error: string | null;
}

export const useTracking = (options: UseTrackingOptions = {}) => {
  const {
    wsUrl = 'ws://localhost:8000/ws',
    autoConnect = true,
    autoStart = false,
    trackingConfig = {},
    models = [{ name: 'general_detection' }]
  } = options;

  const wsServiceRef = useRef<TrackingWebSocketService | null>(null);

  const [state, setState] = useState<TrackingState>({
    isConnected: false,
    isTracking: false,
    statistics: {
      totalTracks: 0,
      activeTracks: 0,
      classDistribution: {}
    },
    trackedObjects: {},
    zoneOccupancy: {},
    detections: [],
    error: null
  });

  // Initialize WebSocket service
  useEffect(() => {
    if (!wsServiceRef.current) {
      wsServiceRef.current = new TrackingWebSocketService(wsUrl);

      // Set up event handlers
      wsServiceRef.current.onConnectionChange = (connected) => {
        setState(prev => ({ ...prev, isConnected: connected, error: connected ? null : prev.error }));
      };

      wsServiceRef.current.onTrackingResults = (results) => {
        setState(prev => ({
          ...prev,
          trackedObjects: results.tracked_objects,
          zoneOccupancy: results.zone_occupancy,
          statistics: {
            totalTracks: results.summary.total_tracks,
            activeTracks: results.summary.active_tracks,
            classDistribution: results.summary.class_counts
          }
        }));
      };

      wsServiceRef.current.onDetectionResults = (detections) => {
        setState(prev => ({ ...prev, detections }));
      };

      wsServiceRef.current.onError = (error) => {
        setState(prev => ({ ...prev, error }));
      };
    }

    if (autoConnect) {
      connect();
    }

    return () => {
      wsServiceRef.current?.disconnect();
    };
  }, [wsUrl, autoConnect]);

  // Auto-start tracking
  useEffect(() => {
    if (autoStart && state.isConnected && !state.isTracking) {
      startTracking();
    }
  }, [autoStart, state.isConnected, state.isTracking]);

  const connect = useCallback(async () => {
    if (!wsServiceRef.current) return false;
    return await wsServiceRef.current.connect();
  }, []);

  const disconnect = useCallback(() => {
    wsServiceRef.current?.disconnect();
  }, []);

  const configure = useCallback(async (config: typeof trackingConfig) => {
    if (!wsServiceRef.current) return;
    await wsServiceRef.current.configureTracking(config);
  }, []);

  const startTracking = useCallback(async () => {
    if (!wsServiceRef.current) return;
    await wsServiceRef.current.startTracking();
    setState(prev => ({ ...prev, isTracking: true }));
  }, []);

  const stopTracking = useCallback(async () => {
    if (!wsServiceRef.current) return;
    await wsServiceRef.current.stopTracking();
    setState(prev => ({ ...prev, isTracking: false }));
  }, []);

  const sendFrame = useCallback(async (imageData: ArrayBuffer) => {
    if (!wsServiceRef.current) return;
    await wsServiceRef.current.sendFrame(imageData, models);
  }, [models]);

  const defineZone = useCallback((zoneId: string, points: [number, number][]) => {
    if (!wsServiceRef.current) return;
    wsServiceRef.current.defineZone(zoneId, points);
  }, []);

  const getStats = useCallback(async () => {
    if (!wsServiceRef.current) return;
    await wsServiceRef.current.getTrackerStats();
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    ...state,

    // Actions
    connect,
    disconnect,
    configure,
    startTracking,
    stopTracking,
    sendFrame,
    defineZone,
    getStats,
    clearError,

    // Service reference for advanced usage
    service: wsServiceRef.current
  };
};