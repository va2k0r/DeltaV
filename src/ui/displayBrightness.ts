export const defaultDisplayBrightness = 1;
export const minimumDisplayBrightness = 0.6;
export const maximumDisplayBrightness = 1.4;
export const displayBrightnessStep = 0.05;

export function normalizeDisplayBrightness(value: number): number {
  if (!Number.isFinite(value)) {
    return defaultDisplayBrightness;
  }

  const clamped = Math.min(maximumDisplayBrightness, Math.max(minimumDisplayBrightness, value));
  return Number((Math.round(clamped / displayBrightnessStep) * displayBrightnessStep).toFixed(2));
}

export function parseStoredDisplayBrightness(value: string | null): number {
  if (value === null || value.trim() === "") {
    return defaultDisplayBrightness;
  }

  return normalizeDisplayBrightness(Number(value));
}

export function formatDisplayBrightnessLabel(value: number): string {
  return `LUMINANCE ${Math.round(normalizeDisplayBrightness(value) * 100)}%`;
}
