import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { createPlayerFacingResolutionEvents, type TurnDebugEvent } from "../../src/core";
import { parseSolarSystemData } from "../../src/data";
import { createPlayerFacingResolutionRows } from "../../src/ui/resolutionCommandRows";

const bodiesJsonUrl = new URL("../../public/content/vanilla/data/bodies.json", import.meta.url);
const content = parseSolarSystemData(JSON.parse(readFileSync(bodiesJsonUrl, "utf8")));

function renderResolutionEvent(event: TurnDebugEvent): string {
  const resolutionEvents = createPlayerFacingResolutionEvents([event]);
  const rows = createPlayerFacingResolutionRows(content, undefined, resolutionEvents);

  return rows[0]?.parts.map((part) => part.text).join("") ?? "";
}

describe("player-facing resolution rows", () => {
  it("labels transferred Shipyard progress as capture instead of duplicate work", () => {
    expect(
      renderResolutionEvent({
        turn: 6,
        type: "SHIPYARD_PROGRESS",
        message: "Saturn Shipyard progress captured from player by opponent",
        nodeId: "saturn_node",
        factionId: "opponent",
        reason: "captured-progress",
        progress: 1
      })
    ).toBe("01  CAPTURE  Saturn  Shipyard 1/5");
  });

  it("keeps a BURN cost and its ΔV unit on the same visual word", () => {
    const rendered = renderResolutionEvent({
      turn: 3,
      type: "BURN_DEPARTED",
      message: "Mercury to Callisto",
      nodeId: "mercury_node",
      destinationNodeId: "callisto_node",
      factionId: "opponent",
      burnCost: 3,
      etaTurns: 4
    });

    expect(rendered).toContain("-3\u00a0ΔV");
    expect(rendered).not.toContain("-3 ΔV");
  });

  it("reports a broken missile solution as a successful escape", () => {
    expect(
      renderResolutionEvent({
        turn: 4,
        type: "MISSILE_SOLUTION_BROKEN",
        message: "Burn away broke the incoming missile solution",
        nodeId: "callisto_node",
        factionId: "player"
      })
    ).toBe("01  MISSILE SOLUTION BROKEN — TARGET ESCAPED at Callisto");
  });

  it("keeps impact lowercase in the command log", () => {
    expect(
      renderResolutionEvent({
        turn: 4,
        type: "MISSILE_IMPACT",
        message: "Missile impact",
        nodeId: "callisto_node",
        factionId: "opponent"
      })
    ).toBe("01  impact  Callisto");
  });

  it("reserves CREW LOST for actual ship destruction", () => {
    expect(
      renderResolutionEvent({
        turn: 4,
        type: "SHIP_DESTROYED",
        message: "Ship destroyed",
        nodeId: "callisto_node",
        factionId: "player"
      })
    ).toBe("01  SIGNAL LOST — CREW LOST at Callisto");
  });
});
