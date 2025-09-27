export interface Detection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  class: number;
  label: string;
}

export interface Model {
  id: string;
  name: string;
  color: string;
}

export interface Stats {
  fps: number;
  latency: number;
}

export interface Camera {
  title: string;
  slug: string;
  icon: string;
}

export interface ModelRequest {
  name: string;
  classFilter: string[];
}

export interface ModelInfo {
  name: string;
  loaded: boolean;
  available_classes: string[] | null;
  path: string;
}

export interface DetectionResult {
  detections: Detection[];
  count: number;
  model: string;
  error: string | null;
}

export interface Detection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  class_id: number;
  label: string;
}


export interface ModelClass {
  id: number;
  name: string;
}

export interface ModelInfo {
  name: string;
  loaded: boolean;
  available_classes: string[] | null;
  path: string;
}

export interface UseModelsReturn {
  models: ModelInfo[];
  loading: boolean;
  error: string | null;
  loadModel: (modelName: string) => Promise<boolean>;
  getModelClasses: (modelName: string) => Promise<string[] | null>;
  refreshModels: () => Promise<void>;
}