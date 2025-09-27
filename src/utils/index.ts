export function getCategoryColor(category: string): string {
  const colors = {
    safety: '#4caf50',
    detection: '#2196f3',
    recognition: '#9c27b0',
    vehicle: '#ff9800',
    security: '#f44336'
  };
  return colors[category as keyof typeof colors] || '#757575';
}