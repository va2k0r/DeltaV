export const commandLogWheelDeltaPixelMode = 0;
export const commandLogWheelDeltaLineMode = 1;
export const commandLogWheelDeltaPageMode = 2;

export function normalizeCommandLogWheelDelta(
  deltaY: number,
  deltaMode: number,
  lineHeightPixels: number,
  pageHeightPixels: number
): number {
  if (!Number.isFinite(deltaY)) {
    return 0;
  }

  if (deltaMode === commandLogWheelDeltaLineMode) {
    return deltaY * Math.max(1, lineHeightPixels);
  }

  if (deltaMode === commandLogWheelDeltaPageMode) {
    return deltaY * Math.max(1, pageHeightPixels);
  }

  return deltaY;
}
