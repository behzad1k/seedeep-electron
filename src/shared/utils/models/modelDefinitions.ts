export interface ModelDefinition {
  name: string;
  classes: string[];
  description: string;
  category: 'safety' | 'detection' | 'recognition';
  modelSize: 'nano' | 'small' | 'medium' | 'large';
  estimatedRAM: string;
}

export const MODEL_DEFINITIONS: Record<string, ModelDefinition> = {
  'ppe_detection': {
    name: 'PPE',
    classes: ['Hardhat', 'Mask', 'NO-Hardhat', 'NO-Mask', 'NO-Safety Vest', 'Person', 'Safety Cone', 'Safety Vest', 'Machinery', 'General'],
    description: 'Personal Protective Equipment detection',
    category: 'safety',
    modelSize: 'nano',
    estimatedRAM: '12MB'
  },
  'face_detection': {
    name: 'Facemask',
    classes: ['no_mask', 'mask'],
    description: 'Face mask detection and compliance',
    category: 'safety',
    modelSize: 'nano',
    estimatedRAM: '8MB'
  },
  'cap_detection': {
    name: 'Cap',
    classes: ['no_cap', 'cap'],
    description: 'Head protection detection',
    category: 'safety',
    modelSize: 'nano',
    estimatedRAM: '10MB'
  },
  'weapon_detection': {
    name: 'Weapon',
    classes: ['pistol', 'knife'],
    description: 'Weapon detection and classification',
    category: 'safety',
    modelSize: 'nano',
    estimatedRAM: '15MB'
  },
  'others_detection': {
    name: 'Person',
    classes: ['person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'],
    description: 'Person detection and basic classification',
    category: 'detection',
    modelSize: 'nano',
    estimatedRAM: '12MB'
  },
  'fire_detection': {
    name: 'Fire_Safety',
    classes: ['smoke', 'fire'],
    description: 'Fire and safety equipment detection',
    category: 'safety',
    modelSize: 'nano',
    estimatedRAM: '14MB'
  },
};

export const CLASS_TO_MODEL_MAP: Record<string, string> = {};
Object.entries(MODEL_DEFINITIONS).forEach(([modelName, definition]) => {
  definition.classes.forEach(className => {
    CLASS_TO_MODEL_MAP[className] = modelName;
  });
});

// Get all unique classes across all models
export const ALL_CLASSES = Object.values(MODEL_DEFINITIONS)
.flatMap(model => model.classes)
.filter((cls, index, arr) => arr.indexOf(cls) === index)
.sort();

// Group classes by category for better organization
export const CLASSES_BY_CATEGORY = Object.values(MODEL_DEFINITIONS)
.reduce((acc, model) => {
  if (!acc[model.category]) {
    acc[model.category] = [];
  }
  acc[model.category].push(...model.classes);
  return acc;
}, {} as Record<string, string[]>);

// Remove duplicates and sort
Object.keys(CLASSES_BY_CATEGORY).forEach(category => {
  CLASSES_BY_CATEGORY[category] = [...new Set(CLASSES_BY_CATEGORY[category])].sort();
});

// Predefined class combinations for quick selection
export const QUICK_SELECTION_PRESETS = {
  'Basic Safety': ['person', 'helmet', 'vest', 'with_mask'],
  'Construction Site': ['person', 'helmet', 'hard_hat', 'vest', 'safety_boots', 'construction_general'],
  'Office Safety': ['person', 'with_mask', 'without_mask', 'fire_extinguisher'],
  'General Monitoring': ['car', 'truck', 'motorcycle', 'bicycle', 'person'],
  'Security Screening': ['person', 'weapon', 'suspicious_object', 'gun', 'knife'],
  'Fire Safety': ['fire', 'smoke', 'fire_extinguisher', 'exit_sign', 'person'],
  'PPE Compliance': ['helmet', 'vest', 'gloves', 'boots', 'safety_glasses', 'with_mask'],
  'Full Detection': ALL_CLASSES.slice() // All classes
};

// Common class groups for quick selection
export const COMMON_CLASS_GROUPS = {
  'All PPE': ['helmet', 'vest', 'gloves', 'boots', 'safety_glasses', 'hard_hat', 'cap'],
  'Basic Safety': ['helmet', 'vest', 'with_mask'],
  'All Generals': ['car', 'truck', 'motorcycle', 'bicycle', 'bus', 'van'],
  'People Only': ['person', 'worker', 'visitor'],
  'Fire Safety': ['fire', 'smoke', 'fire_extinguisher', 'exit_sign']
};