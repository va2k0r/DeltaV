import { describe, expect, it } from "vitest";
import { resolveCinematicGameplayClickTarget } from "../../src/renderers/cinematic3d/gameplayClickTarget";

describe("cinematic gameplay click targeting", () => {
  it("prefers an orbit when a missile picker overlaps the node", () => {
    expect(
      resolveCinematicGameplayClickTarget({
        pickedTargetKey: "missile:incoming-mars",
        nodeOrbitTargetKey: "node:mars_node",
        selectedActionMode: "burn",
        activeBurnDestinationTargetKey: null
      })
    ).toBe("node:mars_node");
  });

  it("aims FIRE at the destination of a clicked ship in transit", () => {
    expect(
      resolveCinematicGameplayClickTarget({
        pickedTargetKey: "burn:enemy-to-phobos",
        nodeOrbitTargetKey: null,
        selectedActionMode: "fire",
        activeBurnDestinationTargetKey: "node:phobos_node"
      })
    ).toBe("node:phobos_node");
  });

  it("keeps transient objects inspectable away from gameplay nodes", () => {
    expect(
      resolveCinematicGameplayClickTarget({
        pickedTargetKey: "missile:deep-space",
        nodeOrbitTargetKey: null,
        selectedActionMode: "burn",
        activeBurnDestinationTargetKey: null
      })
    ).toBe("missile:deep-space");
  });
});
