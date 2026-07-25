export type FusionIgnitionPresentationTiming = Readonly<{
  startProgress: number;
  rampDurationProgress: number;
}>;

const ignitionDelayMinTurns = 0.48;
const ignitionDelayJitterTurns = 0.08;
const ignitionRampDurationTurns = 0.12;

export function computeFusionIgnitionPresentationTiming(
  etaTurns: number,
  seed: number
): FusionIgnitionPresentationTiming {
  const safeEtaTurns = Math.max(1, etaTurns);
  const clampedSeed = clamp(seed, 0, 1);

  return {
    startProgress: (ignitionDelayMinTurns + clampedSeed * ignitionDelayJitterTurns) / safeEtaTurns,
    rampDurationProgress: ignitionRampDurationTurns / safeEtaTurns
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
