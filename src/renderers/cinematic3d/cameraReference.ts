export type CinematicCameraReferenceMode = "inertial" | "sun-relative";

function normalizeRadians(angle: number): number {
  let normalized = angle;

  while (normalized <= -Math.PI) {
    normalized += Math.PI * 2;
  }

  while (normalized > Math.PI) {
    normalized -= Math.PI * 2;
  }

  return normalized;
}

/**
 * Keeps the camera's angular relationship with the Sun while its tracked focus moves around it.
 * The wrapped delta prevents a full-revolution snap when the bearing crosses ±π.
 */
export function advanceSunRelativeCameraYaw(
  currentYaw: number,
  previousSunBearing: number,
  nextSunBearing: number
): number {
  return currentYaw + normalizeRadians(nextSunBearing - previousSunBearing);
}
