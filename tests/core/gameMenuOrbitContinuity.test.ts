import { describe, expect, it } from "vitest";
import { createInitialGameState, createSolarSystemSnapshot } from "../../src/core";
import { getMapPreset, STRATEGIC_MAP_PRESET_ID } from "../../src/data";
import { createOrbitalTransitionSnapshot } from "../../src/renderers/cinematic3d";
import { shiftSolarSystemOrbitPhase } from "../../src/ui/gameMenuOrbitContinuity";

function getCuratedContent() {
  const content = getMapPreset(STRATEGIC_MAP_PRESET_ID).content;

  if (content === undefined) {
    throw new Error("Expected the curated map preset to contain inline content.");
  }

  return content;
}

describe("game menu orbit continuity", () => {
  it("starts a fresh match at the exact orbital phase where the previous match ended", () => {
    const content = getCuratedContent();
    const completedMatchTurn = 23;
    const previousFinalSnapshot = createSolarSystemSnapshot(content, completedMatchTurn);
    const shiftedContent = shiftSolarSystemOrbitPhase(content, completedMatchTurn);
    const freshState = createInitialGameState({ turn: 0 });
    const freshSnapshot = createSolarSystemSnapshot(shiftedContent, freshState);

    expect(freshSnapshot.turn).toBe(0);
    for (const previousBody of previousFinalSnapshot.bodies) {
      const freshBody = freshSnapshot.bodies.find((body) => body.id === previousBody.id);

      expect(freshBody?.position.x).toBeCloseTo(previousBody.position.x, 8);
      expect(freshBody?.position.y).toBeCloseTo(previousBody.position.y, 8);
    }
  });

  it("continues forward from the preserved phase on the next turn", () => {
    const content = getCuratedContent();
    const completedMatchTurn = 23;
    const shiftedContent = shiftSolarSystemOrbitPhase(content, completedMatchTurn);
    const freshSnapshot = createSolarSystemSnapshot(shiftedContent, 0);
    const nextSnapshot = createSolarSystemSnapshot(shiftedContent, 1);
    const renderedEnd = createOrbitalTransitionSnapshot(freshSnapshot, nextSnapshot, 1);
    const uninterruptedNextSnapshot = createSolarSystemSnapshot(content, completedMatchTurn + 1);

    for (const uninterruptedBody of uninterruptedNextSnapshot.bodies) {
      const renderedBody = renderedEnd.bodies.find((body) => body.id === uninterruptedBody.id);

      expect(renderedBody?.position.x).toBeCloseTo(uninterruptedBody.position.x, 8);
      expect(renderedBody?.position.y).toBeCloseTo(uninterruptedBody.position.y, 8);
    }
  });
});
