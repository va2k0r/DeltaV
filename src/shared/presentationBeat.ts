export type PresentationBeatPulse = Readonly<{
  phase: number;
  intensity: number;
  pulseIndex?: number;
  secondsPerPulse: number;
}>;

export const presentationCycleBeatGridSubdivisions = 32;
export const presentationCycleMaxNudgeRatio = 0.12;

export type BeatSynchronizedCycle = Readonly<{
  cycleSeconds: number;
  phase: number;
  synchronized: boolean;
}>;

export function getBeatSynchronizedCycle(
  elapsedSeconds: number,
  baseCycleSeconds: number,
  pulse: PresentationBeatPulse | null,
  subdivisions = presentationCycleBeatGridSubdivisions,
  maxNudgeRatio = presentationCycleMaxNudgeRatio
): BeatSynchronizedCycle {
  const safeCycleSeconds = Math.max(0.001, baseCycleSeconds);

  if (pulse === null || pulse.secondsPerPulse <= 0 || subdivisions <= 0) {
    return {
      cycleSeconds: safeCycleSeconds,
      phase: positiveModulo(elapsedSeconds, safeCycleSeconds) / safeCycleSeconds,
      synchronized: false
    };
  }

  const gridSeconds = pulse.secondsPerPulse / subdivisions;
  const gridSteps = Math.max(1, Math.round(safeCycleSeconds / gridSeconds));
  const synchronizedCycleSeconds = gridSteps * gridSeconds;
  const nudgeRatio =
    Math.abs(synchronizedCycleSeconds - safeCycleSeconds) / Math.max(0.001, safeCycleSeconds);

  if (nudgeRatio > maxNudgeRatio) {
    return {
      cycleSeconds: safeCycleSeconds,
      phase: positiveModulo(elapsedSeconds, safeCycleSeconds) / safeCycleSeconds,
      synchronized: false
    };
  }

  const beatElapsedSeconds = getBeatElapsedSeconds(elapsedSeconds, pulse);
  return {
    cycleSeconds: synchronizedCycleSeconds,
    phase: positiveModulo(beatElapsedSeconds, synchronizedCycleSeconds) / synchronizedCycleSeconds,
    synchronized: true
  };
}

export function getBeatSynchronizedCycleAngle(
  elapsedSeconds: number,
  angularFrequency: number,
  pulse: PresentationBeatPulse | null,
  subdivisions = presentationCycleBeatGridSubdivisions,
  maxNudgeRatio = presentationCycleMaxNudgeRatio
): number {
  if (!Number.isFinite(angularFrequency) || Math.abs(angularFrequency) <= 0.000001) {
    return 0;
  }

  const direction = Math.sign(angularFrequency);
  const baseCycleSeconds = (Math.PI * 2) / Math.abs(angularFrequency);
  const cycle = getBeatSynchronizedCycle(
    elapsedSeconds,
    baseCycleSeconds,
    pulse,
    subdivisions,
    maxNudgeRatio
  );

  if (!cycle.synchronized || pulse === null) {
    return elapsedSeconds * angularFrequency;
  }

  const beatElapsedSeconds = getBeatElapsedSeconds(elapsedSeconds, pulse);
  return (beatElapsedSeconds / cycle.cycleSeconds) * Math.PI * 2 * direction;
}

function getBeatElapsedSeconds(elapsedSeconds: number, pulse: PresentationBeatPulse): number {
  const beatSeconds = Math.max(0.001, pulse.secondsPerPulse);
  const phase = clamp01(pulse.phase);

  if (typeof pulse.pulseIndex === "number" && Number.isFinite(pulse.pulseIndex)) {
    return (pulse.pulseIndex + phase) * beatSeconds;
  }

  const elapsedBeatIndex = Math.floor(elapsedSeconds / beatSeconds);
  return (elapsedBeatIndex + phase) * beatSeconds;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
