import { CLASS_TO_MODEL_MAP, MODEL_DEFINITIONS } from '@/utils/modelDefinitions';

export class ClassModelMapper {
  static getClassModel(className: string): string {
    return CLASS_TO_MODEL_MAP[className] || 'unknown';
  }

  static getRequiredModels(selectedClasses: string[]): Array<{name: string, classFilter: string[]}> {
    const modelClassMap: Record<string, string[]> = {};

    selectedClasses.forEach(className => {
      const modelName = CLASS_TO_MODEL_MAP[className];
      if (modelName) {
        if (!modelClassMap[modelName]) {
          modelClassMap[modelName] = [];
        }
        modelClassMap[modelName].push(className);
      }
    });

    return Object.entries(modelClassMap).map(([modelName, classes]) => ({
      name: modelName,
      classFilter: classes
    }));
  }

  static validateClasses(selectedClasses: string[]): {
    valid: string[];
    invalid: string[];
    warnings: string[];
  } {
    const valid: string[] = [];
    const invalid: string[] = [];
    const warnings: string[] = [];

    selectedClasses.forEach(className => {
      if (CLASS_TO_MODEL_MAP[className]) {
        valid.push(className);
      } else {
        invalid.push(className);
      }
    });

    // Check for potential conflicts or redundancies
    const grouped = this.groupClassesByModel(valid);
    Object.entries(grouped).forEach(([modelName, classes]) => {
      const modelDef = MODEL_DEFINITIONS[modelName];
      if (modelDef && classes.length === modelDef.classes.length) {
        warnings.push(`You've selected all classes from ${modelName} model - consider using no filter for better performance`);
      }
    });

    return { valid, invalid, warnings };
  }

  static groupClassesByModel(selectedClasses: string[]): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};

    selectedClasses.forEach(className => {
      const modelName = CLASS_TO_MODEL_MAP[className];
      if (modelName) {
        if (!grouped[modelName]) {
          grouped[modelName] = [];
        }
        grouped[modelName].push(className);
      }
    });

    return grouped;
  }

  static getModelInfo(selectedClasses: string[]) {
    const requiredModels = this.getRequiredModels(selectedClasses);

    return requiredModels.map(({ name, classFilter }) => ({
      modelName: name,
      classes: classFilter,
      description: MODEL_DEFINITIONS[name]?.description || 'Unknown model',
      estimatedRAM: MODEL_DEFINITIONS[name]?.estimatedRAM || 'Unknown',
      category: MODEL_DEFINITIONS[name]?.category || 'detection'
    }));
  }
}