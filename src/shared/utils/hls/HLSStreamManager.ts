/**
 * HLS Stream Manager
 * Manages HLS stream conversions for cameras
 */

interface StreamInfo {
  streamId: string;
  rtspUrl: string;
  hlsUrl: string;
  status: 'starting' | 'active' | 'stopped' | 'error';
  startTime: number;
  error?: string;
}

class HLSStreamManager {
  private static instance: HLSStreamManager;
  private converterUrl: string;
  private activeStreams: Map<string, StreamInfo> = new Map();

  private constructor(converterUrl: string = 'http://localhost:8081') {
    this.converterUrl = converterUrl;
  }

  static getInstance(converterUrl?: string): HLSStreamManager {
    if (!HLSStreamManager.instance) {
      HLSStreamManager.instance = new HLSStreamManager(converterUrl);
    }
    return HLSStreamManager.instance;
  }

  /**
   * Start HLS conversion for a camera
   */
  async startStream(cameraId: string, rtspUrl: string): Promise<string | null> {
    // Check if stream already exists
    const existing = this.activeStreams.get(cameraId);
    if (existing && existing.status === 'active') {
      console.log(`[HLSStreamManager] Stream ${cameraId} already active`);
      return existing.hlsUrl;
    }

    try {
      // Mark as starting
      this.activeStreams.set(cameraId, {
        streamId: cameraId,
        rtspUrl,
        hlsUrl: '',
        status: 'starting',
        startTime: Date.now()
      });

      console.log(`[HLSStreamManager] Starting stream for ${cameraId}...`);

      const response = await fetch(`${this.converterUrl}/api/streams/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rtspUrl,
          streamId: cameraId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Update stream info
      this.activeStreams.set(cameraId, {
        streamId: cameraId,
        rtspUrl,
        hlsUrl: data.fullUrl,
        status: 'active',
        startTime: Date.now()
      });

      console.log(`[HLSStreamManager] ✅ Stream ${cameraId} started: ${data.fullUrl}`);
      return data.fullUrl;

    } catch (error: any) {
      console.error(`[HLSStreamManager] ❌ Failed to start stream ${cameraId}:`, error);

      this.activeStreams.set(cameraId, {
        streamId: cameraId,
        rtspUrl,
        hlsUrl: '',
        status: 'error',
        startTime: Date.now(),
        error: error.message
      });

      return null;
    }
  }

  /**
   * Stop HLS conversion for a camera
   */
  async stopStream(cameraId: string): Promise<boolean> {
    const stream = this.activeStreams.get(cameraId);
    if (!stream) {
      console.warn(`[HLSStreamManager] Stream ${cameraId} not found`);
      return false;
    }

    try {
      console.log(`[HLSStreamManager] Stopping stream ${cameraId}...`);

      const response = await fetch(`${this.converterUrl}/api/streams/${cameraId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.activeStreams.delete(cameraId);
      console.log(`[HLSStreamManager] ✅ Stream ${cameraId} stopped`);
      return true;

    } catch (error: any) {
      console.error(`[HLSStreamManager] ❌ Failed to stop stream ${cameraId}:`, error);
      return false;
    }
  }

  /**
   * Get stream info
   */
  getStream(cameraId: string): StreamInfo | null {
    return this.activeStreams.get(cameraId) || null;
  }

  /**
   * Get HLS URL for a camera
   */
  getHLSUrl(cameraId: string): string | null {
    const stream = this.activeStreams.get(cameraId);
    return stream?.hlsUrl || null;
  }

  /**
   * Check if stream is active
   */
  isStreamActive(cameraId: string): boolean {
    const stream = this.activeStreams.get(cameraId);
    return stream?.status === 'active';
  }

  /**
   * Get all active streams
   */
  getActiveStreams(): StreamInfo[] {
    return Array.from(this.activeStreams.values());
  }

  /**
   * Stop all streams
   */
  async stopAllStreams(): Promise<void> {
    console.log(`[HLSStreamManager] Stopping all streams...`);

    const promises = Array.from(this.activeStreams.keys()).map(cameraId =>
      this.stopStream(cameraId)
    );

    await Promise.allSettled(promises);
    console.log(`[HLSStreamManager] All streams stopped`);
  }

  /**
   * Health check
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.converterUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default HLSStreamManager;