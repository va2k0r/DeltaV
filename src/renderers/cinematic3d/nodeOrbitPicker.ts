import type { Vec2 } from "../../core";

export type NodeOrbitPickZoneInput = Readonly<{
  targetKey: string;
  center: Vec2;
  orbitRadius: number;
}>;

export type NodeOrbitPickZone = NodeOrbitPickZoneInput &
  Readonly<{
    pickRadius: number;
  }>;

const nodeOrbitPickMarginRatio = 0.28;
const nodeOrbitPickMarginMinPixels = 20;
const nodeOrbitPickMarginMaxPixels = 44;
const nodeOrbitPickZoneGapPixels = 6;

export function resolveNodeOrbitPickZones(
  inputs: readonly NodeOrbitPickZoneInput[]
): readonly NodeOrbitPickZone[] {
  return inputs.map((input, inputIndex) => {
    const orbitRadius = Math.max(0, input.orbitRadius);
    let margin = clamp(
      orbitRadius * nodeOrbitPickMarginRatio,
      nodeOrbitPickMarginMinPixels,
      nodeOrbitPickMarginMaxPixels
    );

    for (let otherIndex = 0; otherIndex < inputs.length; otherIndex += 1) {
      if (otherIndex === inputIndex) {
        continue;
      }

      const other = inputs[otherIndex]!;
      const centerDistance = Math.hypot(
        input.center.x - other.center.x,
        input.center.y - other.center.y
      );
      const freeSpace =
        centerDistance - orbitRadius - Math.max(0, other.orbitRadius) - nodeOrbitPickZoneGapPixels;
      margin = Math.min(margin, Math.max(0, freeSpace * 0.5));
    }

    return {
      ...input,
      orbitRadius,
      pickRadius: orbitRadius + margin
    };
  });
}

export function pickNodeOrbitZone(point: Vec2, zones: readonly NodeOrbitPickZone[]): string | null {
  let closestTargetKey: string | null = null;
  let closestNormalizedDistance = Number.POSITIVE_INFINITY;

  for (const zone of zones) {
    const distance = Math.hypot(point.x - zone.center.x, point.y - zone.center.y);

    if (distance > zone.pickRadius) {
      continue;
    }

    const normalizedDistance = distance / Math.max(1, zone.pickRadius);

    if (normalizedDistance < closestNormalizedDistance) {
      closestNormalizedDistance = normalizedDistance;
      closestTargetKey = zone.targetKey;
    }
  }

  return closestTargetKey;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
