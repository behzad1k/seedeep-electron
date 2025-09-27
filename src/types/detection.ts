export interface Detection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  class: number;
  label: string;
}

export interface DetectionResults {
  [modelName: string]: {
    detections: Detection[];
    count: number;
    error?: string;
  };
}

export interface ModelOption {
  id: string;
  name: string;
  label: string;
  color?: string;
}

export interface WebSocketMessage {
  type: 'frame' | 'detections' | 'error';
  image?: string;
  models?: string[];
  timestamp?: number;
  results?: DetectionResults;
  error?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
