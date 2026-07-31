import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { gameGlossaryEntries, getGameGlossaryEntry } from "../../src/ui/gameGlossary";

describe("player-facing orbit terminology", () => {
  it("retires node and keeps orbit lowercase", () => {
    const playerFacingCopy = gameGlossaryEntries
      .flatMap((entry) => [entry.label, ...entry.aliases, entry.short, ...entry.detail])
      .join(" ");
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const loreSource = readFileSync(join(process.cwd(), "src/ui/worldLoreGlossary.ts"), "utf8");
    const reportSource = readFileSync(join(process.cwd(), "src/ui/postMatchReport.ts"), "utf8");
    const orbit = getGameGlossaryEntry("orbit");

    expect(getGameGlossaryEntry("node")).toBeUndefined();
    expect(orbit?.label).toBe("orbit");
    expect(orbit?.aliases).toEqual(["orbit", "orbits", "orbital"]);
    expect(playerFacingCopy).not.toMatch(/\bnodes?\b/iu);
    expect(playerFacingCopy).not.toMatch(/\bproduction orbit\b/iu);
    expect(uiSource).toContain('"orbit CONTESTED"');
    expect(uiSource).not.toContain('"ORBIT CONTESTED"');
    expect(uiSource).not.toContain('"NODE CONTESTED"');
    expect(uiSource).not.toContain("active nodes");
    expect(loreSource).not.toMatch(/\bTRITIUM nodes\b/iu);
    expect(reportSource).not.toContain("` node ${threat.nodeId}`");
  });
});
