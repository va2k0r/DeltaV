import { describe, expect, it } from "vitest";
import { getIncomingFireImpactChronology } from "../../src/renderers/cinematic3d";

describe("Cinematic 3D FIRE impact chronology", () => {
  it("orders successive impacts on one target from earliest to latest", () => {
    const chronology = getIncomingFireImpactChronology([
      { id: "late", impactTurn: 9 },
      { id: "early", impactTurn: 6 },
      { id: "middle", impactTurn: 7 }
    ]);

    expect(chronology.map((impact) => impact.id)).toEqual(["early", "middle", "late"]);
  });

  it("collapses missiles arriving on the same turn into one terminal point", () => {
    const chronology = getIncomingFireImpactChronology([
      { id: "same-turn-b", impactTurn: 8 },
      { id: "later", impactTurn: 10 },
      { id: "same-turn-a", impactTurn: 8 }
    ]);

    expect(chronology).toEqual([
      { id: "same-turn-a", impactTurn: 8 },
      { id: "later", impactTurn: 10 }
    ]);
  });
});
