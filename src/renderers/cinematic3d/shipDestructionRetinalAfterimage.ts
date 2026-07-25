export const shipDestructionRetinalAfterimageDurationSeconds = 3.6;

export type ShipDestructionRetinalAfterimageFrame = Readonly<{
  opacity: number;
  scale: number;
  haloOpacity: number;
}>;

export type ShipDestructionBloomProfile = Readonly<{
  glareSizeScale: number;
  glareOpacityScale: number;
  coreSizeScale: number;
  coreOpacityScale: number;
  retinalSizeScale: number;
  retinalOpacityScale: number;
  whiteoutOpacityScale: number;
}>;

const highShipDestructionBloomProfile: ShipDestructionBloomProfile = {
  glareSizeScale: 1,
  glareOpacityScale: 1,
  coreSizeScale: 1,
  coreOpacityScale: 1,
  retinalSizeScale: 1,
  retinalOpacityScale: 1,
  whiteoutOpacityScale: 1
};

const lowShipDestructionBloomProfile: ShipDestructionBloomProfile = {
  glareSizeScale: 0.62,
  glareOpacityScale: 0.42,
  coreSizeScale: 0.84,
  coreOpacityScale: 0.76,
  retinalSizeScale: 0.78,
  retinalOpacityScale: 0.38,
  whiteoutOpacityScale: 0.55
};

export function getShipDestructionBloomProfile(
  lowBloomProfileEnabled: boolean
): ShipDestructionBloomProfile {
  return lowBloomProfileEnabled ? lowShipDestructionBloomProfile : highShipDestructionBloomProfile;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smootherStep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) {
    return value < edge0 ? 0 : 1;
  }

  const progress = clamp01((value - edge0) / (edge1 - edge0));
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
}

export function getShipDestructionRetinalAfterimageFrame(
  ageSeconds: number
): ShipDestructionRetinalAfterimageFrame | null {
  if (ageSeconds < 0 || ageSeconds >= shipDestructionRetinalAfterimageDurationSeconds) {
    return null;
  }

  const onset = smootherStep(0, 0.025, ageSeconds);
  const fade = 1 - smootherStep(0.08, shipDestructionRetinalAfterimageDurationSeconds, ageSeconds);
  const lifetimeProgress = clamp01(ageSeconds / shipDestructionRetinalAfterimageDurationSeconds);

  return {
    opacity: onset * fade * 0.72,
    scale: 0.84 + smootherStep(0, 1, lifetimeProgress) * 0.24,
    haloOpacity: onset * fade * (1 - smootherStep(0.02, 0.72, lifetimeProgress)) * 0.78
  };
}
