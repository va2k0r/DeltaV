import { describe, expect, it } from "vitest";

import {
  createPairedFactionColorSequence,
  factionColorPairings,
  factionColorPalette,
  threeFactionColorSets
} from "../../src/ui/factionColors";

describe("faction color pairing", () => {
  it("keeps the current DeltaV faction color choices unchanged", () => {
    expect(factionColorPalette.map((swatch) => swatch.color)).toEqual([
      "#7fe8ff",
      "#c982ff",
      "#9be65d",
      "#7aa6ff",
      "#ffe066",
      "#36d6b7",
      "#d18bff",
      "#73f2c1"
    ]);
  });

  it("assigns two-player colors from curated warm/cold pairings instead of raw shuffle", () => {
    const allowedPairs = new Set(
      factionColorPairings.map((pair) =>
        pair
          .map((swatch) => swatch.color)
          .sort()
          .join(":")
      )
    );

    for (let index = 0; index < factionColorPairings.length; index += 1) {
      const sequence = createPairedFactionColorSequence(
        "2p",
        createRandomSequence(index / factionColorPairings.length, 0.25)
      );
      const pairKey = sequence
        .map((swatch) => swatch.color)
        .sort()
        .join(":");

      expect(sequence).toHaveLength(2);
      expect(sequence[0]?.color).not.toBe(sequence[1]?.color);
      expect(allowedPairs.has(pairKey)).toBe(true);
    }
  });

  it("keeps player and opponent in a curated contrast pair for three-player starts", () => {
    const allowedOpeningPairs = new Set(
      threeFactionColorSets.map((set) =>
        set
          .slice(0, 2)
          .map((swatch) => swatch.color)
          .sort()
          .join(":")
      )
    );

    for (let index = 0; index < threeFactionColorSets.length; index += 1) {
      const sequence = createPairedFactionColorSequence(
        "3p",
        createRandomSequence(index / threeFactionColorSets.length, 0.25)
      );
      const openingPairKey = sequence
        .slice(0, 2)
        .map((swatch) => swatch.color)
        .sort()
        .join(":");

      expect(sequence).toHaveLength(3);
      expect(new Set(sequence.map((swatch) => swatch.color)).size).toBe(3);
      expect(allowedOpeningPairs.has(openingPairKey)).toBe(true);
    }
  });
});

function createRandomSequence(...values: readonly number[]): () => number {
  let index = 0;

  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}
