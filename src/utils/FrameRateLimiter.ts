export class FrameRateLimiter {
  private lastFrameTime = 0;
  private frameInterval: number;

  constructor(targetFPS: number = 15) {
    this.frameInterval = 1000 / targetFPS;
  }

  shouldProcessFrame(): boolean {
    const now = Date.now();
    if (now - this.lastFrameTime >= this.frameInterval) {
      this.lastFrameTime = now;
      return true;
    }
    return false;
  }

  setTargetFPS(fps: number): void {
    this.frameInterval = 1000 / fps;
  }
}