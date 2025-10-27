
// types/tracking.ts
export interface TrackingConfig {
  tracker_type: 'centroid' | 'kalman' | 'deep_sort' | 'byte_track';
  tracker_params: {
    max_disappeared?: number;
    max_distance?: number;
    use_kalman?: boolean;
  };
  speed_config?: {
    fps: number;
    pixel_to_meter_ratio: number;
  };
}

export interface ModelConfig {
  name: string;
  classFilter?: string[];
}

export interface DetectionResult {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  class_id: number;
  label: string;
}

export interface TrackedObjectData {
  track_id: string;
  class_name: string;
  class_id: number;
  bbox: [number, number, number, number];
  centroid: [number, number];
  confidence: number;
  age: number;
  hits: number;
  time_since_update: number;
  velocity: [number, number];
  speed_info?: {
    speed_px_per_sec: number;
    speed_m_per_sec: number;
    direction: number;
    avg_speed_px_per_sec: number;
    avg_speed_m_per_sec: number;
  };
  trajectory_length: number;
}

export interface TrackingResults {
  tracked_objects: Record<string, TrackedObjectData>;
  zone_occupancy: Record<string, string[]>;
  speed_analysis: Record<string, any>;
  summary: {
    total_tracks: number;
    active_tracks: number;
    class_counts: Record<string, number>;
  };
}