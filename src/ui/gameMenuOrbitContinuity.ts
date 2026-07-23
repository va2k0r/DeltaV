import type { SolarSystemData } from "../data";

const fullOrbitDegrees = 360;

/**
 * Re-bases a fresh menu match onto the orbital phase reached by the previous one.
 * Match-relative turns can restart at zero while every body keeps its world-space position.
 */
export function shiftSolarSystemOrbitPhase(
  content: SolarSystemData,
  elapsedTurns: number
): SolarSystemData {
  if (elapsedTurns === 0) {
    return content;
  }

  return {
    ...content,
    bodies: content.bodies.map((body) => {
      if (body.orbitPeriodTurns === 0) {
        return body;
      }

      return {
        ...body,
        initialAngle: normalizeDegrees(
          body.initialAngle + (elapsedTurns / body.orbitPeriodTurns) * fullOrbitDegrees
        )
      };
    })
  };
}

function normalizeDegrees(angle: number): number {
  return ((angle % fullOrbitDegrees) + fullOrbitDegrees) % fullOrbitDegrees;
}
