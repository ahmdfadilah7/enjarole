export interface CameraFilter {
  id: string;
  name: string;
  /** CSS filter value for preview & canvas capture */
  css: string;
}

export const CAMERA_FILTERS: CameraFilter[] = [
  { id: 'normal', name: 'Normal', css: 'none' },
  { id: 'clarendon', name: 'Clarendon', css: 'contrast(1.2) saturate(1.35) brightness(1.1)' },
  { id: 'gingham', name: 'Gingham', css: 'brightness(1.05) hue-rotate(-10deg) sepia(0.12)' },
  { id: 'moon', name: 'Moon', css: 'grayscale(1) contrast(1.1) brightness(1.1)' },
  { id: 'lark', name: 'Lark', css: 'contrast(0.9) brightness(1.15) saturate(0.85)' },
  { id: 'reyes', name: 'Reyes', css: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)' },
  { id: 'juno', name: 'Juno', css: 'sepia(0.35) contrast(1.15) brightness(1.1) saturate(1.4)' },
  { id: 'aden', name: 'Aden', css: 'hue-rotate(-20deg) contrast(0.9) brightness(1.2) saturate(0.85)' },
  { id: 'perpetua', name: 'Perpetua', css: 'contrast(1.1) brightness(1.1) saturate(1.1) sepia(0.05)' },
  { id: 'warm', name: 'Hangat', css: 'sepia(0.28) saturate(1.45) brightness(1.05)' },
  { id: 'cool', name: 'Dingin', css: 'hue-rotate(15deg) saturate(0.85) brightness(1.08) contrast(1.05)' },
  { id: 'vivid', name: 'Vivid', css: 'saturate(1.85) contrast(1.12) brightness(1.05)' },
];

export function getCameraFilterCss(id: string): string {
  return CAMERA_FILTERS.find((f) => f.id === id)?.css ?? 'none';
}
