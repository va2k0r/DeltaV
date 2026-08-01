import { describe, expect, it } from "vitest";
import {
  pickNodeOrbitZone,
  resolveNodeOrbitPickZones
} from "../../src/renderers/cinematic3d/nodeOrbitPicker";

describe("cinematic node orbit picker", () => {
  it("adds a generous screen-space margin around an isolated orbit", () => {
    const [zone] = resolveNodeOrbitPickZones([
      { targetKey: "node:moon", center: { x: 100, y: 100 }, orbitRadius: 40 }
    ]);

    expect(zone?.pickRadius).toBe(60);
    expect(pickNodeOrbitZone({ x: 158, y: 100 }, [zone!])).toBe("node:moon");
  });

  it("reduces neighbouring margins until their pick zones no longer overlap", () => {
    const zones = resolveNodeOrbitPickZones([
      { targetKey: "node:moon", center: { x: 0, y: 0 }, orbitRadius: 40 },
      { targetKey: "node:earth", center: { x: 100, y: 0 }, orbitRadius: 40 }
    ]);
    const [moon, earth] = zones;

    expect(moon?.pickRadius).toBe(47);
    expect(earth?.pickRadius).toBe(47);
    expect(moon!.pickRadius + earth!.pickRadius).toBeLessThan(100);
    expect(pickNodeOrbitZone({ x: 46, y: 0 }, zones)).toBe("node:moon");
    expect(pickNodeOrbitZone({ x: 50, y: 0 }, zones)).toBeNull();
    expect(pickNodeOrbitZone({ x: 54, y: 0 }, zones)).toBe("node:earth");
  });

  it("preserves the visible orbit even when no extra margin is available", () => {
    const zones = resolveNodeOrbitPickZones([
      { targetKey: "node:a", center: { x: 0, y: 0 }, orbitRadius: 30 },
      { targetKey: "node:b", center: { x: 60, y: 0 }, orbitRadius: 30 }
    ]);

    expect(zones.map((zone) => zone.pickRadius)).toEqual([30, 30]);
  });
});
