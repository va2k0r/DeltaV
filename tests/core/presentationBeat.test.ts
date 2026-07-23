import { describe, expect, it } from "vitest";
import {
  getBeatSynchronizedCycle,
  getBeatSynchronizedCycleAngle,
  presentationCycleMaxNudgeRatio
} from "../../src/shared/presentationBeat";

const secondsPerBeat = 60 / 110;
const pulse = {
  phase: 0.375,
  intensity: 0.8,
  pulseIndex: 14,
  secondsPerPulse: secondsPerBeat
} as const;

describe("presentation beat synchronization", () => {
  it("preserves the original duration and phase when no music pulse is available", () => {
    const elapsedSeconds = 3.71;
    const baseCycleSeconds = 0.72;
    const cycle = getBeatSynchronizedCycle(elapsedSeconds, baseCycleSeconds, null);

    expect(cycle.synchronized).toBe(false);
    expect(cycle.cycleSeconds).toBe(baseCycleSeconds);
    expect(cycle.phase).toBeCloseTo((elapsedSeconds % baseCycleSeconds) / baseCycleSeconds, 12);
    expect(getBeatSynchronizedCycleAngle(elapsedSeconds, 4.7, null)).toBe(elapsedSeconds * 4.7);
  });

  it("nudges a visual cycle onto the 110 BPM subdivision grid within the safety limit", () => {
    const baseCycleSeconds = 0.72;
    const cycle = getBeatSynchronizedCycle(8.2, baseCycleSeconds, pulse);
    const subdivisionSeconds = secondsPerBeat / 32;
    const gridSteps = cycle.cycleSeconds / subdivisionSeconds;
    const nudgeRatio = Math.abs(cycle.cycleSeconds - baseCycleSeconds) / baseCycleSeconds;

    expect(cycle.synchronized).toBe(true);
    expect(gridSteps).toBeCloseTo(Math.round(gridSteps), 12);
    expect(nudgeRatio).toBeLessThanOrEqual(presentationCycleMaxNudgeRatio);
  });

  it("keeps the original cycle when the nearest beat subdivision would change it too much", () => {
    const baseCycleSeconds = 0.002;
    const elapsedSeconds = 0.017;
    const cycle = getBeatSynchronizedCycle(elapsedSeconds, baseCycleSeconds, pulse);

    expect(cycle.synchronized).toBe(false);
    expect(cycle.cycleSeconds).toBe(baseCycleSeconds);
    expect(cycle.phase).toBeCloseTo((elapsedSeconds % baseCycleSeconds) / baseCycleSeconds, 12);
  });

  it("anchors synchronized phases to the music timeline instead of render elapsed time", () => {
    const first = getBeatSynchronizedCycle(1.2, 0.72, pulse);
    const second = getBeatSynchronizedCycle(93.4, 0.72, pulse);

    expect(first.synchronized).toBe(true);
    expect(second.synchronized).toBe(true);
    expect(first.phase).toBeCloseTo(second.phase, 12);
  });

  it("keeps synchronized angles continuous across beat boundaries", () => {
    const beforeBoundary = getBeatSynchronizedCycleAngle(4, 2.55, {
      ...pulse,
      phase: 0.9,
      pulseIndex: 14
    });
    const afterBoundary = getBeatSynchronizedCycleAngle(4.1, 2.55, {
      ...pulse,
      phase: 0.1,
      pulseIndex: 15
    });

    expect(afterBoundary).toBeGreaterThan(beforeBoundary);
  });
});
