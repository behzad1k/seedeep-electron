import { useState, useEffect, useCallback } from 'react';
import { MODEL_DEFINITIONS, ModelDefinition } from '@/utils/modelDefinitions';
import { apiService } from '@/services/apiService';

interface ModelInfo extends ModelDefinition {
  status: 'loaded' | 'unloaded' | 'loading' | 'error';
  isAvailable: boolean;
}

export const useModels = () => {
  const [models, setModels] = useState<Record<string, ModelInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeModels = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get available models from backend
      const response = await apiService.getModels();

      // Initialize all models with their definitions
      const initializedModels: Record<string, ModelInfo> = {};
      Object.entries(MODEL_DEFINITIONS).forEach(([modelName, definition]) => {
        initializedModels[modelName] = {
          ...definition,
          status: 'unloaded',
          isAvailable: false
        };
      });
      // Update with backend status
      if (!response.error && response.data) {
        const backendModels = response.data.models || response.data;

        Object.entries(backendModels).forEach(([modelName, modelInfo]: [string, any]) => {
          if (initializedModels[modelInfo.name]) {
            initializedModels[modelInfo.name] = {
              ...initializedModels[modelInfo.name],
              status: modelInfo.status || 'unloaded',
              isAvailable: true
            };
          } else {
            // Handle unknown models from backend
            console.warn(`Unknown model from backend: ${modelInfo.name}`);
            initializedModels[modelInfo.name] = {
              name: modelInfo.name,
              classes: modelInfo.classes || [],
              description: `Unknown model: ${modelName}`,
              category: 'detection' as const,
              modelSize: 'nano' as const,
              estimatedRAM: 'Unknown',
              status: modelInfo.status || 'unloaded',
              isAvailable: true
            };
          }
        });
      }

      setModels(initializedModels);
      console.log('Initialized models:', initializedModels);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch models';
      console.error('Error initializing models:', err);
      setError(errorMessage);

      // Fallback to definitions only
      const fallbackModels: Record<string, ModelInfo> = {};
      Object.entries(MODEL_DEFINITIONS).forEach(([modelName, definition]) => {
        fallbackModels[modelName] = {
          ...definition,
          status: 'unloaded',
          isAvailable: false
        };
      });
      setModels(fallbackModels);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadModel = useCallback(async (modelName: string) => {
    if (!models[modelName]?.isAvailable) {
      console.warn(`Model ${modelName} is not available on backend`);
      return false;
    }

    setModels(prev => ({
      ...prev,
      [modelName]: { ...prev[modelName], status: 'loading' }
    }));

    try {
      const response = await apiService.loadModel(modelName);
      if (!response.error) {
        setModels(prev => ({
          ...prev,
          [modelName]: { ...prev[modelName], status: 'loaded' }
        }));
        return true;
      } else {
        setModels(prev => ({
          ...prev,
          [modelName]: { ...prev[modelName], status: 'error' }
        }));
        return false;
      }
    } catch (err) {
      console.error('Error loading model:', err);
      setModels(prev => ({
        ...prev,
        [modelName]: { ...prev[modelName], status: 'error' }
      }));
      return false;
    }
  }, [models]);

  const unloadModel = useCallback(async (modelName: string) => {
    try {
      const response = await apiService.unloadModel(modelName);
      if (!response.error) {
        setModels(prev => ({
          ...prev,
          [modelName]: { ...prev[modelName], status: 'unloaded' }
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error unloading model:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    initializeModels();
  }, [initializeModels]);

  return {
    models,
    loading,
    error,
    refetch: initializeModels,
    loadModel,
    unloadModel,
    availableModels: Object.values(models).filter(m => m.isAvailable),
    loadedModels: Object.values(models).filter(m => m.status === 'loaded')
  };
};
