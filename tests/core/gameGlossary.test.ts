import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { astronomicalGlossaryEntries } from "../../src/ui/astronomicalGlossary";
import {
  gameGlossaryEntries,
  getGameGlossaryEntry,
  tokenizeGameGlossaryText,
  type GameGlossaryEntry
} from "../../src/ui/gameGlossary";
import {
  advanceTutorialLogbookIntroduction,
  tutorialLogbookExpandInstruction,
  tutorialLogbookHoverInstruction,
  tutorialLogbookLabel,
  tutorialLogbookReturnInstruction,
  type TutorialLogbookIntroductionStep
} from "../../src/ui/gameGlossaryController";
import { worldLoreGlossaryEntries } from "../../src/ui/worldLoreGlossary";

function getGlossaryAdvice(entry: GameGlossaryEntry): readonly string[] {
  return entry.advice ?? [];
}

describe("game glossary", () => {
  it("guides the tutorial through the three-step Logbook introduction", () => {
    let step: TutorialLogbookIntroductionStep = "inactive";
    const sequence: TutorialLogbookIntroductionStep[] = [];

    for (let index = 0; index < 4; index += 1) {
      step = advanceTutorialLogbookIntroduction(step);
      sequence.push(step);
    }

    expect(sequence).toEqual(["hover-prompt", "expand-prompt", "return-prompt", "inactive"]);
    expect([
      tutorialLogbookLabel,
      tutorialLogbookHoverInstruction,
      tutorialLogbookExpandInstruction,
      tutorialLogbookReturnInstruction
    ]).toEqual([
      "Logbook",
      "Left-click any word in the logbook to open its explanation.",
      "Left-click the selected term to expand it.",
      "Left-click the title to return to the previous explanation."
    ]);

    const controllerSource = readFileSync(
      join(process.cwd(), "src/ui/gameGlossaryController.ts"),
      "utf8"
    );
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const styles = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");

    expect(controllerSource).toContain("handleTutorialLogbookTokenActivation(event, token)");
    expect(controllerSource).toContain("renderTutorialLogbookDetailPrompt();");
    expect(controllerSource).toContain("detailLabel.textContent = tutorialLogbookLabel;");
    expect(controllerSource).toContain(
      'detailLabel.classList.add("can-go-back", "is-tutorial-logbook-attention");'
    );
    expect(uiSource).toContain("commandGlossaryController.beginTutorialLogbookIntroduction();");
    expect(uiSource).toContain("commandGlossaryController.endTutorialLogbookIntroduction();");
    expect(styles).toContain(".command-glossary-hover.is-tutorial-logbook-attention,");
    expect(styles).toContain(".command-glossary-detail__line.is-tutorial-logbook-attention,");
    expect(styles).toContain(".command-glossary-detail__label.is-tutorial-logbook-attention {");
  });

  it("reserves the first activation for context and closes it before the log action", () => {
    const controllerSource = readFileSync(
      join(process.cwd(), "src/ui/gameGlossaryController.ts"),
      "utf8"
    );
    const styles = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    const clickStart = controllerSource.indexOf("  function handleGlossaryClick");
    const clickEnd = controllerSource.indexOf("  function handleGlossaryKeydown", clickStart);
    const clickSource = controllerSource.slice(clickStart, clickEnd);
    const keydownStart = clickEnd;
    const keydownEnd = controllerSource.indexOf("  function scheduleHover", keydownStart);
    const keydownSource = controllerSource.slice(keydownStart, keydownEnd);

    expect(clickSource).toContain("if (isDetailOpenForToken(glossaryId, token)) {");
    expect(clickSource).toContain("if (shouldPassTutorialReplayCueActivationThrough(token)) {");
    expect(clickSource.indexOf("if (isDetailOpenForToken(glossaryId, token)) {")).toBeLessThan(
      clickSource.indexOf("event.stopImmediatePropagation();")
    );
    expect(keydownSource).toContain("if (isDetailOpenForToken(glossaryId, token)) {");
    expect(keydownSource).toContain("if (shouldPassTutorialReplayCueActivationThrough(token)) {");
    expect(keydownSource.indexOf("if (isDetailOpenForToken(glossaryId, token)) {")).toBeLessThan(
      keydownSource.indexOf("event.stopImmediatePropagation();")
    );
    expect(controllerSource).toContain("detailSourceToken === token");
    expect(controllerSource).toContain(
      'cueLine.classList.contains("is-command-scrollback-review-target")'
    );
    expect(controllerSource).toContain("const handledActivationEvents = new WeakSet<Event>();");
    expect(clickSource).toContain("handledActivationEvents.has(event)");
    expect(clickSource).toContain("handledActivationEvents.add(event);");
    expect(keydownSource).toContain("handledActivationEvents.has(event)");
    expect(keydownSource).toContain("handledActivationEvents.add(event);");
    expect(controllerSource).toContain('detailPanel.dataset["sourceLineKey"] === sourceLineKey');
    expect(controllerSource).toContain(
      'detailPanel.dataset["sourceLineKey"] = detailSourceLineKey;'
    );
    expect(controllerSource).toContain('detailPanel.removeAttribute("data-source-line-key");');
    expect(controllerSource).toContain("return `row:${rowKey}`;");
    expect(controllerSource).toContain('detailPanel.classList.contains("is-visible")');
    expect(clickSource).toContain("closeAll();");
    expect(keydownSource).toContain("closeAll();");
    expect(styles).toContain(
      ".command-console__line--linked-event.is-command-scrollback-review-target > span"
    );
    expect(styles).toContain(
      ".command-console__line--tutorial-replay-cue.is-command-scrollback-review-target"
    );
    expect(styles).toContain("animation: none;");
  });

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

  it("names the victory dependency tritium access without viability jargon or added caps", () => {
    const access = getGameGlossaryEntry("tritium-access");
    const playerFacingCopy = gameGlossaryEntries
      .flatMap((entry) => [entry.label, entry.short, ...entry.detail, ...getGlossaryAdvice(entry)])
      .join(" ");

    expect(access?.label).toBe("tritium access");
    expect(access?.short).toContain("produce TRITIUM");
    expect(playerFacingCopy).not.toMatch(/\bTRITIUM (?:ACCESS|COLLAPSE)\b/u);
    expect(playerFacingCopy).not.toMatch(/\b(?:faction viability|tritium-viable)\b/iu);
  });

  it("does not expose ARRIVAL as a billboard, log or detail label", () => {
    const playerFacingCopy = gameGlossaryEntries
      .flatMap((entry) => [
        entry.label,
        ...entry.aliases,
        entry.short,
        ...entry.detail,
        ...getGlossaryAdvice(entry)
      ])
      .join(" ");
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const lessonSource = readFileSync(join(process.cwd(), "src/ui/tutorial/lessonRows.ts"), "utf8");
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );

    expect(playerFacingCopy).not.toMatch(/\bARRIVAL\b/u);
    expect(uiSource).not.toContain('"ARRIVAL"');
    expect(lessonSource).not.toMatch(/\bARRIVAL\b/u);
    expect(rendererSource).not.toContain("`ARRIVAL T+");
  });

  it("tones down uppercase glossary terms inside the detail column", () => {
    const controllerSource = readFileSync(
      join(process.cwd(), "src/ui/gameGlossaryController.ts"),
      "utf8"
    );
    const styles = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");

    expect(controllerSource).toContain("applyGlossaryDetailTokenTone(span, text);");
    expect(controllerSource).toContain(
      'span.classList.add("command-glossary-token--detail-uppercase");'
    );
    expect(styles).toContain(".command-glossary-detail .command-glossary-token--detail-uppercase");
    expect(styles).toContain("color: rgba(142, 194, 207, 0.78);");
  });

  it("preserves the selected term's original casing in hover and detail labels", () => {
    const controllerSource = readFileSync(
      join(process.cwd(), "src/ui/gameGlossaryController.ts"),
      "utf8"
    );
    const styles = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    const labelStylesStart = styles.indexOf(
      ".command-glossary-hover__label,\n.command-glossary-detail__label {"
    );
    const labelStylesEnd = styles.indexOf("}", labelStylesStart);
    const labelStyles = styles.slice(labelStylesStart, labelStylesEnd);

    expect(controllerSource).toContain("getGlossaryTokenLabel(token, entry.label)");
    expect(controllerSource).toContain(
      "const label = getGlossaryTokenLabel(sourceToken, entry.label);"
    );
    expect(controllerSource).toContain('span.dataset["glossaryLabel"] = label;');
    expect(controllerSource).toContain("detailLabel.textContent = label;");
    expect(controllerSource).not.toContain("detailLabel.textContent = entry.label;");
    expect(labelStylesStart).toBeGreaterThanOrEqual(0);
    expect(labelStylesEnd).toBeGreaterThan(labelStylesStart);
    expect(labelStyles).not.toContain("text-transform");
  });

  it("dismisses and protects the detail column with the agreed pointer grammar", () => {
    const controllerSource = readFileSync(
      join(process.cwd(), "src/ui/gameGlossaryController.ts"),
      "utf8"
    );
    const styles = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");

    expect(controllerSource).toContain(
      'document.addEventListener("pointerdown", handleDocumentPointerDown, true);'
    );
    expect(controllerSource).toContain(
      'detailPanel.addEventListener("contextmenu", handleDetailPanelContextMenu, true);'
    );
    expect(controllerSource).toContain(
      'detailPanel.addEventListener("selectstart", preventDetailPanelSelection, true);'
    );
    expect(controllerSource).toContain("event.button !== 0");
    expect(controllerSource).toContain("event.button !== 2");
    expect(controllerSource).toContain("isInsideInteractiveRoot(event.target)");
    expect(controllerSource).toContain("detailHistory.pop();");
    expect(controllerSource).toContain(
      "renderDetail(restoredEntry, previousHistoryEntry.label, false);"
    );
    expect(styles).toContain(".command-glossary-detail * {\n  user-select: none;");
    expect(styles).toContain("-webkit-touch-callout: none;");
  });

  it("separates gameplay rules from unheaded consequence bullets while leaving lore continuous", () => {
    const controllerSource = readFileSync(
      join(process.cwd(), "src/ui/gameGlossaryController.ts"),
      "utf8"
    );
    const styles = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    const adviceCopy = gameGlossaryEntries.flatMap(getGlossaryAdvice);

    expect(getGameGlossaryEntry("burn")?.advice?.length).toBeGreaterThanOrEqual(2);
    expect(getGameGlossaryEntry("delta-v")?.advice?.join(" ")).toMatch(
      /queued BURN.*upkeep.*EVADE/iu
    );
    expect(controllerSource).toContain(
      'return [...entry.detail, "", ...entry.advice.map((line) => `• ${line}`)];'
    );
    expect(styles).toContain(".command-glossary-detail__line--spacer");
    expect(styles).toContain(".command-glossary-detail__line--advice");
    expect(adviceCopy.join(" ")).not.toMatch(/\b(?:AI|planner|score|weight)\b/iu);
    expect(adviceCopy).not.toContain("STRATEGY");
    expect(worldLoreGlossaryEntries.every((entry) => !("advice" in entry))).toBe(true);
    expect(astronomicalGlossaryEntries.every((entry) => !("advice" in entry))).toBe(true);
  });

  it("grounds selected ΔV, BURN and progress explanations in the clicked log line", () => {
    const controllerSource = readFileSync(
      join(process.cwd(), "src/ui/gameGlossaryController.ts"),
      "utf8"
    );
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");

    expect(controllerSource).toContain(
      "On this line, ${telemetryContext.factionLabel} has ${telemetryContext.currentDv} ΔV now."
    );
    expect(controllerSource).toContain(
      "The next-turn forecast is ${telemetryContext.nextTurnDv} ΔV."
    );
    expect(controllerSource).toContain(
      "This BURN runs from ${burn.origin} to ${burn.destination}, takes ${burn.etaTurns} turns and costs ${burn.cost} ΔV."
    );
    expect(controllerSource).toContain(
      'Its ΔV was removed when the departure resolved on TURN ${String(sourceTurn).padStart(2, "0")}, ${elapsedCopy}.'
    );
    expect(controllerSource).toContain(
      "This yard is at ${progress}/5. It needs ${remaining} more eligible WORK"
    );
    expect(uiSource).toContain('line.dataset["glossaryContext"] = JSON.stringify');
    expect(uiSource).toContain("nextTurnDv: recovery.projectedDvByTurn[0] ?? projectedDv");
    expect(uiSource).toContain("pendingBurnCost: Math.max(0, currentDv - recovery.currentDv)");
  });

  it("keeps atomic commands mechanical while routing physical phrases into lore", () => {
    const burn = getGameGlossaryEntry("burn");
    const burnCopy = [burn?.short, ...(burn?.detail ?? [])].join(" ");
    const doctrineIds = tokenizeGameGlossaryText(
      "Fusion torch drives burn tritium under continuous acceleration. Hard-kill kinetic point defense."
    ).flatMap((token) =>
      token.glossaryId === undefined || token.glossaryId.startsWith("word:")
        ? []
        : [token.glossaryId]
    );

    expect(burnCopy).not.toMatch(/crew|corporation|fusion|tritium/iu);
    expect(doctrineIds).toEqual([
      "fusion-torch",
      "burn",
      "tritium",
      "continuous-acceleration",
      "hard-kill",
      "kinetic",
      "point-defense"
    ]);
  });

  it("records manned ship, missile and contested-orbit doctrine", () => {
    expect(getGameGlossaryEntry("crew")?.detail.join(" ")).toMatch(/twelve.*48/iu);
    expect(getGameGlossaryEntry("ship")?.detail.join(" ")).toMatch(
      /active complement.*reserve crews/iu
    );
    expect(getGameGlossaryEntry("missile")?.detail.join(" ")).toMatch(
      /ten to twelve.*blind angle/iu
    );
    expect(getGameGlossaryEntry("point-defense")?.detail.join(" ")).toMatch(
      /spiral-zeroing.*1 ΔV.*Two coordinated missiles/iu
    );
    expect(getGameGlossaryEntry("contested")?.detail.join(" ")).toMatch(
      /circle.*support ship.*second attack vector/iu
    );
  });

  it("covers the fusion, compute and delayed-enforcement setting", () => {
    expect(getGameGlossaryEntry("nuclear")?.detail.join(" ")).toMatch(
      /Fusion stations.*server farms.*Earth-Moon/iu
    );
    expect(getGameGlossaryEntry("artificial-intelligence")?.detail.join(" ")).toMatch(
      /materials.*compute.*eighty-minute/iu
    );
    expect(getGameGlossaryEntry("tritium")?.detail.join(" ")).toMatch(/lithium-6.*12.3-year/iu);
    expect(getGameGlossaryEntry("jurisdiction")?.detail.join(" ")).toMatch(
      /Murder near Saturn.*prosecutable.*marshal/iu
    );
  });

  it("does not assign a canonical duration to the first armed conflict", () => {
    const playerCopy = gameGlossaryEntries
      .flatMap((entry) => [entry.label, entry.short, ...entry.detail, ...getGlossaryAdvice(entry)])
      .join(" ");
    const inventoryCopy = [
      ...(getGameGlossaryEntry("ship")?.detail ?? []),
      ...(getGameGlossaryEntry("tritium")?.detail ?? [])
    ].join(" ");

    expect(playerCopy).not.toMatch(/\b150[- ]days?\b/iu);
    expect(inventoryCopy).not.toMatch(
      /\b(?:the game exposes|simulation tracks|local inventory)\b/iu
    );
    expect(inventoryCopy).toContain("no separate reserve for each hull");
    expect(playerCopy).not.toContain(
      "Their law reaches every registered ship; their force does not."
    );
  });

  it("names tritium infrastructure plainly before introducing the technical component", () => {
    const plant = getGameGlossaryEntry("tritium-breeding");
    const playerCopy = gameGlossaryEntries
      .flatMap((entry) => [entry.label, entry.short, ...entry.detail, ...getGlossaryAdvice(entry)])
      .join(" ");

    expect(plant?.label).toBe("TRITIUM PLANT");
    expect(plant?.short).toContain("manufactures tritium");
    expect(plant?.detail.join(" ")).toMatch(/Inside the plant, a breeder blanket/iu);
    expect(playerCopy).not.toMatch(/breeder banks?/iu);
  });

  it("hides a sparse, linked chronology inside relevant lore", () => {
    const milestoneYears = ["2043", "2058", "2069", "2076"];

    for (const year of milestoneYears) {
      const token = tokenizeGameGlossaryText(year)[0];
      const entry =
        token?.glossaryId === undefined ? undefined : getGameGlossaryEntry(token.glossaryId);

      expect(token?.glossaryId).toBe(`year-${year}`);
      expect(entry?.detail.join(" ")).toContain("2079");
      expect(entry?.detail.length).toBe(3);
    }

    expect(getGameGlossaryEntry("artificial-intelligence")?.detail.join(" ")).toContain("2043");
    expect(getGameGlossaryEntry("fusion")?.detail.join(" ")).toContain("2058");
    expect(getGameGlossaryEntry("server-farm")?.detail.join(" ")).toContain("2069");
    expect(getGameGlossaryEntry("automated-mining")?.detail.join(" ")).toContain("2076");
  });

  it("keeps lore pages concise, readable and deliberately varied", () => {
    const lineCounts = new Set<number>();

    for (const entry of worldLoreGlossaryEntries) {
      lineCounts.add(entry.detail.length);
      expect(entry.detail.length).toBeGreaterThanOrEqual(2);
      expect(entry.detail.length).toBeLessThanOrEqual(5);
      expect(Math.max(...entry.detail.map((line) => line.length))).toBeLessThanOrEqual(160);
      expect(entry.detail.reduce((sum, line) => sum + line.length, 0)).toBeLessThanOrEqual(650);
    }

    expect(lineCounts.size).toBeGreaterThanOrEqual(3);
  });

  it("adapts dense copy to the fixed, non-scrolling lore column", () => {
    const controllerSource = readFileSync(
      join(process.cwd(), "src/ui/gameGlossaryController.ts"),
      "utf8"
    );
    const styles = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    const detailStyleStart = styles.indexOf(".command-glossary-detail {\n  top:");
    const detailStyleEnd = styles.indexOf("}", detailStyleStart);
    const detailStyle = styles.slice(detailStyleStart, detailStyleEnd);

    expect(controllerSource).toContain('detailPanel.dataset["density"]');
    expect(styles).toContain('.command-glossary-detail[data-density="dense"]');
    expect(detailStyle).toContain("overflow-y: hidden;");
    expect(detailStyle).not.toContain("overflow-y: auto;");
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

  it("gives every active astronomical name a dossier without assigning procedural roles", () => {
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
    const astronomicalCopy = astronomicalGlossaryEntries
      .flatMap((entry) => [entry.short, ...entry.detail])
      .join(" ");

    expect(moon?.detail).toHaveLength(5);
    expect(moon?.detail.join(" ")).toContain("registries");
    expect(astronomicalCopy).not.toMatch(
      /\b(?:canonical|v10|node|shipyard|barren|work output|gravity modifier)\b/iu
    );
    expect(
      astronomicalGlossaryEntries.every(
        (entry) =>
          entry.detail.length >= 4 &&
          entry.detail.length <= 5 &&
          entry.detail.every((line) => line.length <= 160)
      )
    ).toBe(true);
  });

  it("keeps expanded world lore intradiegetic", () => {
    const year = getGameGlossaryEntry("year-2079");
    const worldCopy = [
      ...worldLoreGlossaryEntries.flatMap((entry) => [entry.short, ...entry.detail]),
      year?.short ?? "",
      ...(year?.detail ?? [])
    ].join(" ");

    expect(worldCopy).not.toMatch(
      /\b(?:the game|gameplay|renderer|scenario|v10|canonical map|simulation state|one match)\b/iu
    );
  });

  it("never invents slash headers inside player-facing glossary copy", () => {
    const copy = gameGlossaryEntries.flatMap((entry) => [
      entry.label,
      entry.short,
      ...entry.detail,
      ...getGlossaryAdvice(entry)
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
