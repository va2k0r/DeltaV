import { describe, expect, it } from "vitest";

import {
  gameGlossaryEntries,
  getGameGlossaryEntry,
  tokenizeGameGlossaryText
} from "../../src/ui/gameGlossary";

describe("game glossary", () => {
  it("keeps identifiers and aliases unique", () => {
    const ids = gameGlossaryEntries.map((entry) => entry.id);
    const aliases = gameGlossaryEntries.flatMap((entry) =>
      entry.aliases.map((alias) => alias.toLocaleUpperCase("en-US"))
    );

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(aliases).size).toBe(aliases.length);
    expect(gameGlossaryEntries.every((entry) => entry.short.length > 0)).toBe(true);
    expect(gameGlossaryEntries.every((entry) => entry.detail.length > 0)).toBe(true);
  });

  it("links repeated tutorial mechanics without changing their rendered text", () => {
    const text =
      "BURN costs ΔV. Every BURN requires time. A ship can either FIRE or WORK, not both.";
    const tokens = tokenizeGameGlossaryText(text);

    expect(tokens.map((token) => token.text).join("")).toBe(text);
    expect(
      tokens.flatMap((token) =>
        token.glossaryId === undefined || token.glossaryId.startsWith("word:")
          ? []
          : [token.glossaryId]
      )
    ).toEqual(["burn", "cost", "delta-v", "burn", "ship", "fire", "work"]);
  });

  it("prefers complete mechanic phrases over their component words", () => {
    const launchTokens = tokenizeGameGlossaryText("MANDATORY LAUNCH requires a BURN OUT.");

    expect(launchTokens.map((token) => token.text).join("")).toBe(
      "MANDATORY LAUNCH requires a BURN OUT."
    );
    expect(
      launchTokens.flatMap((token) =>
        token.glossaryId?.startsWith("word:") === false ? [token.glossaryId] : []
      )
    ).toEqual(["mandatory-launch", "burn-out"]);

    expect(tokenizeGameGlossaryText("FIRING SOLUTION")[0]).toEqual({
      text: "FIRING SOLUTION",
      glossaryId: "firing-solution"
    });
  });

  it("does not match shorter words inside longer unrelated terms", () => {
    const ids = tokenizeGameGlossaryText("SHIPYARDS store disassembled hulls.").flatMap((token) =>
      token.glossaryId === undefined || token.glossaryId.startsWith("word:")
        ? []
        : [token.glossaryId]
    );

    expect(ids).toEqual(["shipyard", "hull"]);
    expect(ids).not.toContain("ship");
  });

  it("covers the four operational outcomes with canonical short explanations", () => {
    expect(getGameGlossaryEntry("work")?.short).toContain("automatic");
    expect(getGameGlossaryEntry("evade")?.short).toContain("1 ΔV");
    expect(getGameGlossaryEntry("burn")?.short).toContain("ETA");
    expect(getGameGlossaryEntry("fire")?.short).toContain("zero ΔV");
    expect(getGameGlossaryEntry("contested")?.detail.join(" ")).toContain("2 ΔV");
  });

  it("links the scenario year, astronomical bodies and contextual telemetry", () => {
    const text = "2079 TURN 01 PLAYER 50 ΔV -> 46 ΔV Moon T+3 1/5 ~3 days";
    const tokens = tokenizeGameGlossaryText(text);

    expect(tokens.map((token) => token.text).join("")).toBe(text);
    expect(
      tokens.flatMap((token) =>
        token.glossaryId === undefined || token.glossaryId.startsWith("word:")
          ? []
          : [token.glossaryId]
      )
    ).toEqual([
      "year-2079",
      "turn",
      "value:turn:01",
      "faction",
      "value:delta-v:50",
      "delta-v",
      "projection-arrow",
      "value:delta-v:46",
      "delta-v",
      "moon",
      "value:eta:T+3",
      "value:progress:1/5",
      "value:days:~3"
    ]);
  });

  it("gives every active astronomical name a dossier and keeps Moon within one fixed column", () => {
    const bodyNames = [
      "Sun",
      "Mercury",
      "Venus",
      "Earth",
      "Moon",
      "Mars",
      "Deimos",
      "Jupiter",
      "Callisto",
      "Saturn",
      "Titan",
      "Iapetus",
      "Uranus",
      "Oberon",
      "Neptune",
      "Triton",
      "Pluto/Charon",
      "Nix",
      "Hydra"
    ];

    for (const bodyName of bodyNames) {
      expect(tokenizeGameGlossaryText(bodyName)[0]?.glossaryId).toBeDefined();
    }

    const moon = getGameGlossaryEntry("moon");
    expect(moon?.detail).toHaveLength(7);
    expect(moon?.detail.join(" ")).toContain("GDP");
    expect(moon?.detail.join(" ")).toContain("TRITIUM");
  });

  it("never invents slash headers inside player-facing glossary copy", () => {
    const copy = gameGlossaryEntries.flatMap((entry) => [
      entry.label,
      entry.short,
      ...entry.detail
    ]);

    expect(copy.every((line) => !line.includes("//"))).toBe(true);
  });

  it("makes every lexical token addressable while leaving punctuation unchanged", () => {
    const tokens = tokenizeGameGlossaryText("Left click to zoom in / out.");
    const plainText = tokens
      .filter((token) => token.glossaryId === undefined)
      .map((token) => token.text)
      .join("");

    expect(tokens.map((token) => token.text).join("")).toBe("Left click to zoom in / out.");
    expect(plainText).not.toMatch(/[\p{L}\p{N}]/u);
    expect(getGameGlossaryEntry("word:to")?.short).toContain("Direction");
  });
});
