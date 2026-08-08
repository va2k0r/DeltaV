import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { hasQueuedPlayerMandatoryLaunchBurn } from "../../src/ui/mandatoryLaunchExecute";

describe("mandatory launch execute readiness", () => {
  const launch = { id: "launch:player:phobos:T20:0" };

  it("keeps EXECUTE disabled until the required launch BURN is queued", () => {
    expect(hasQueuedPlayerMandatoryLaunchBurn(launch, [])).toBe(false);
    expect(
      hasQueuedPlayerMandatoryLaunchBurn(launch, [
        {
          factionId: "player",
          mandatoryLaunchId: "launch:player:other:T20:0"
        }
      ])
    ).toBe(false);
    expect(
      hasQueuedPlayerMandatoryLaunchBurn(launch, [
        {
          factionId: "player",
          mandatoryLaunchId: launch.id
        }
      ])
    ).toBe(true);
  });

  it("ignores another faction's matching launch id", () => {
    expect(
      hasQueuedPlayerMandatoryLaunchBurn(launch, [
        {
          factionId: "opponent",
          mandatoryLaunchId: launch.id
        }
      ])
    ).toBe(false);
  });

  it("does not report readiness when no launch is active", () => {
    expect(hasQueuedPlayerMandatoryLaunchBurn(undefined, [])).toBe(false);
  });

  it("wires mandatory launch readiness into the manual EXECUTE disabled state", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const disabledStateStart = uiSource.indexOf("function isManualExecutePromptDisabled()");
    const attentionStateStart = uiSource.indexOf(
      "function syncExecutePromptAttentionState",
      disabledStateStart
    );
    const disabledStateSource = uiSource.slice(disabledStateStart, attentionStateStart);

    expect(uiSource).toContain(
      "!hasQueuedPlayerMandatoryLaunchBurn(mandatoryLaunch, state.pendingBurnOrders)"
    );
    expect(disabledStateStart).toBeGreaterThanOrEqual(0);
    expect(attentionStateStart).toBeGreaterThan(disabledStateStart);
    expect(disabledStateSource).toContain("isMandatoryLaunchOrderMissing ||");
  });
});
