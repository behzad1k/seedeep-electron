import { DetectionResults } from '@/types/detection';

export interface CanvasDrawingOptions {
  lineWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  showConfidence?: boolean;
  confidenceThreshold?: number;
}

export class CanvasDrawer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to get 2D context from canvas');
    }
    this.ctx = ctx;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawVideoFrame(video: HTMLVideoElement): void {
    this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
  }

  drawDetections(
    results: DetectionResults,
    video: HTMLVideoElement,
    options: CanvasDrawingOptions = {}
  ): void {
    const {
      lineWidth = 2,
      fontSize = 14,
      fontFamily = 'Arial',
      showConfidence = true,
      confidenceThreshold = 0.0
    } = options;

    // Clear and draw video frame
    this.clear();
    this.drawVideoFrame(video);

    // Color map for different models
    const colors: { [key: string]: string } = {
      face_detection: '#ff0000',
      cap_detection: '#00ff00',
      person_detection: '#0000ff',
      vehicle_detection: '#ff00ff',
      // Add more colors as needed
    };

    this.ctx.lineWidth = lineWidth;
    this.ctx.font = `${fontSize}px ${fontFamily}`;

    // Draw detections for each model
    Object.entries(results).forEach(([modelName, result]) => {
      const color = colors[modelName] || this.generateRandomColor();
      this.ctx.strokeStyle = color;
      this.ctx.fillStyle = color;

      result.detections
      .filter(detection => detection.confidence >= confidenceThreshold)
      .forEach((detection) => {
        const { x1, y1, x2, y2, confidence, label } = detection;

        // Scale coordinates to canvas size
        const scaleX = this.canvas.width / video.videoWidth;
        const scaleY = this.canvas.height / video.videoHeight;

        const scaledX1 = x1 * scaleX;
        const scaledY1 = y1 * scaleY;
        const scaledX2 = x2 * scaleX;
        const scaledY2 = y2 * scaleY;

        // Draw bounding box
        this.ctx.strokeRect(
          scaledX1,
          scaledY1,
          scaledX2 - scaledX1,
          scaledY2 - scaledY1
        );

        // Draw label
        const text = showConfidence
          ? `${label} (${(confidence * 100).toFixed(1)}%)`
          : label;

        this.drawLabel(text, scaledX1, scaledY1, color);
      });
    });
  }

  private drawLabel(text: string, x: number, y: number, color: string): void {
    const textMetrics = this.ctx.measureText(text);
    const padding = 4;
    const labelHeight = 20;

    // Draw background
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      x,
      y - labelHeight,
      textMetrics.width + padding * 2,
      labelHeight
    );

    // Draw text
    this.ctx.fillStyle = '#000000';
    this.ctx.fillText(text, x + padding, y - padding);
  }

  private generateRandomColor(): string {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];
    return colors[Math.floor(Math.random() * colors.length)] || '';
  }
}
