import { describe, expect, it } from "vitest";

import { createInitialGameState, type FactionIdentity } from "../../src/core";
import { ensureTutorialOpponentFactionState } from "../../src/ui/tutorial/opponentFaction";

const tutorialOpponent: FactionIdentity = {
  id: "opponent",
  displayName: "ENEMY",
  color: "#c982ff",
  accent: "#f3dcff",
  controlType: "human"
};

describe("tutorial opponent faction", () => {
  it("initializes a missing opponent with the tutorial reserve", () => {
    const state = createInitialGameState({ gameMode: "1p" });
    const result = ensureTutorialOpponentFactionState(state, tutorialOpponent, 50);

    expect(result.factions).toContainEqual(tutorialOpponent);
    expect(result.factionDv["opponent"]).toBe(50);
  });

  it("preserves an existing opponent reserve across tutorial phase changes", () => {
    const state = createInitialGameState({
      gameMode: "2p",
      factionDv: { player: 32, opponent: 43 }
    });
    const result = ensureTutorialOpponentFactionState(state, tutorialOpponent, 50);

    expect(result.factionDv["opponent"]).toBe(43);
    expect(result.factions.find((faction) => faction.id === "opponent")).toMatchObject({
      displayName: "ENEMY",
      controlType: "human"
    });
  });
});
