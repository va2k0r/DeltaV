export const DELTAV_BUILD_SERIES = 7;
export const DELTAV_BUILD_REVISION = 1;

export function formatDeltaVBuildVersion(series: number, revision: number): string {
  if (!Number.isInteger(series) || series < 0 || series > 99) {
    throw new Error(`DeltaV build series ${series} must be a two-digit decimal number.`);
  }

  if (!Number.isInteger(revision) || revision < 1 || revision > 15) {
    throw new Error(`DeltaV build revision ${revision} must be between 1 and F.`);
  }

  return `${String(series).padStart(2, "0")}${revision.toString(16).toUpperCase()}`;
}

export const DELTAV_BUILD_VERSION = formatDeltaVBuildVersion(
  DELTAV_BUILD_SERIES,
  DELTAV_BUILD_REVISION
);
