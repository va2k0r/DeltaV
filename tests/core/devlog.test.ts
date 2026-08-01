import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { devlogEntries } from "../../src/site/devlogEntries";

describe("public devlog", () => {
  it("publishes a dated, evidence-led development record without timestamp noise", () => {
    expect(devlogEntries).toHaveLength(13);
    expect(new Set(devlogEntries.map((entry) => entry.slug)).size).toBe(devlogEntries.length);
    expect(devlogEntries.every((entry) => entry.body.length >= 5)).toBe(true);
    expect(devlogEntries.every((entry) => /^\d{4}-\d{2}-\d{2}$/u.test(entry.date))).toBe(true);
    expect(devlogEntries.map((entry) => entry.date)).toEqual(
      [...devlogEntries.map((entry) => entry.date)].sort((left, right) => right.localeCompare(left))
    );

    const publicCopy = devlogEntries
      .flatMap((entry) => [
        entry.category,
        entry.title,
        entry.deck,
        ...entry.body,
        ...(entry.references ?? []).flatMap((reference) => [reference.label]),
        ...(entry.figures ?? []).flatMap((figure) => [figure.alt, figure.caption])
      ])
      .join(" ");
    expect(publicCopy).not.toMatch(
      /(?:\b\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\b|\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b)/iu
    );
    expect(publicCopy).not.toMatch(/\b\d{1,2}:\d{2}(?::\d{2})?\b/u);
    expect(publicCopy).not.toMatch(/\b(?:screenshot|triangle)s?\b/iu);
    expect(publicCopy).not.toMatch(/\b(?:I|me|my)\b/u);
    expect(publicCopy).not.toContain("familiar strategy-game mistake");
    expect(publicCopy).not.toContain("The first casualty was");
    expect(publicCopy).not.toContain("borrowed the usual verbs");
    expect(publicCopy.toLowerCase()).not.toContain(["inter", "cept"].join(""));
  });

  it("turns the FIRE benchmark into a strategic conclusion instead of a statistics dump", () => {
    const fireEntry = devlogEntries.find((entry) => entry.slug === "what-a-missile-is-for");
    const copy = fireEntry?.body.join(" ") ?? "";

    expect(fireEntry?.title).toBe("What a Missile Is Actually For");
    expect(copy).toContain("clear majority of decisive matches");
    expect(copy).toContain("WORK schedule and projected reserve");
    expect(copy).not.toMatch(/\b(?:confidence interval|permutation test|p=)\b/iu);
    expect(copy).not.toMatch(/\b\d{3,}(?:,\d{3})*\b/u);
  });

  it("opens with strategy and keeps the AI article grounded in observed capabilities", () => {
    expect(devlogEntries[0]?.title).toBe("How to Wage War in Space");
    const aiEntry = devlogEntries.find((entry) => entry.slug === "what-the-machine-was-good-for");
    if (aiEntry === undefined) {
      throw new Error("Expected the AI development entry.");
    }
    const copy = [aiEntry.deck, ...aiEntry.body].join(" ");

    expect(copy).toContain("No list of model names is needed");
    expect(copy).toContain("complete browser files");
    expect(copy).toContain("controlled matches");
    expect(copy).not.toMatch(/\bGPT[- ]?\d/iu);
  });

  it("explains the hard-science-fiction premise through the disassembled-hull solution", () => {
    const plausibilityEntry = devlogEntries.find(
      (entry) => entry.slug === "plausibility-sells-the-fantasy"
    );
    const copy = plausibilityEntry?.body.join(" ") ?? "";

    expect(plausibilityEntry?.title).toBe("Plausibility Sells the Fantasy");
    expect(copy).toContain(
      "an exposed crewed installation that cannot move is strategically dead in the water"
    );
    expect(copy).toContain("store disassembled hulls");
    expect(copy).toContain("a reserve complement transfers across");
    expect(copy).toContain("Mandatory launch converts the logistics into a game rule");
    expect(copy).toContain("the uncertainty belongs in simultaneous intent");
  });

  it("describes the in-game planner as simultaneous, auditable and solvent", () => {
    const aiEntry = devlogEntries.find((entry) => entry.slug === "how-the-ai-thinks-in-orbits");
    const copy = aiEntry?.body.join(" ") ?? "";

    expect(copy).toContain("rule-based planner using the same public information");
    expect(copy).toContain("frozen copy of the state at the start of the turn");
    expect(copy).toContain("repeats that check after all orders have been chosen");
    expect(copy).toContain("last active tritium worker receives special protection");
  });

  it("publishes the no-stealth article with the requested source and open-information take", () => {
    const stealthEntry = devlogEntries.find(
      (entry) => entry.slug === "there-is-no-stealth-in-space"
    );
    const copy = stealthEntry?.body.join(" ") ?? "";

    expect(stealthEntry?.title).toBe("There Is No Stealth in Space");
    expect(stealthEntry?.references).toContainEqual({
      label: "Stealth in Space — Children of a Dead Earth",
      href: "https://childrenofadeadearth.wordpress.com/2016/07/12/stealth-in-space/"
    });
    expect(copy).toContain("Every ship, transfer and missile is visible");
    expect(copy).toContain("faction tritium reserves are also public");
    expect(copy).toContain("A telescope would not read a propellant gauge");
  });

  it("keeps every devlog article free of photos and animation", () => {
    expect(devlogEntries.every((entry) => entry.figures === undefined)).toBe(true);
  });

  it("starts with the articles and keeps product destinations after the archive", () => {
    const source = readFileSync(join(process.cwd(), "src/site/index.ts"), "utf8");
    const steamIndex = source.indexOf('id="steam"');
    const devlogIndex = source.indexOf('id="devlog"');
    const footerIndex = source.indexOf('<footer class="delta-site__footer">');

    expect(source).not.toContain("SYSTEM BRIEF");
    expect(source).not.toContain("System Brief");
    expect(source).toContain('aria-label="Devlog"');
    expect(source).toContain('<details class="delta-site__brief-details" open>');
    expect(source).toContain('<time datetime="${escapeHtml(entry.date)}">');
    expect(source).not.toContain("WORDS");
    expect(source).not.toContain("RELEASE DATE");
    expect(source).toContain('class="delta-site__brief-references"');
    expect(source).not.toContain("INDEX OF ENTRIES");
    expect(source).not.toContain("WAR HAS NO GRID");
    expect(source).not.toContain("A planetarium you can command");
    expect(source).not.toContain("Learn by commanding");
    expect(source).not.toContain("Captured in the engine");
    expect(devlogIndex).toBeGreaterThan(0);
    expect(steamIndex).toBeGreaterThan(0);
    expect(steamIndex).toBeGreaterThan(devlogIndex);
    expect(footerIndex).toBeGreaterThan(steamIndex);
  });

  it("keeps the main-menu framing while the devlog overlaps the planetarium", () => {
    const cssSource = readFileSync(join(process.cwd(), "src/site/site.css"), "utf8");
    const siteSource = readFileSync(join(process.cwd(), "src/site/index.ts"), "utf8");
    const mainSource = readFileSync(join(process.cwd(), "src/main.ts"), "utf8");
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );

    expect(cssSource).toContain("--site-map-overlap: clamp(250px, 29vh, 340px);");
    expect(cssSource).toContain("--site-map-extension: 0px;");
    expect(cssSource).toContain("height: calc(100vh + var(--site-map-extension));");
    expect(cssSource).toContain("min-height: calc(100svh + var(--site-map-extension));");
    expect(cssSource).toContain(".deltav-runtime-host.is-site-background .canvas-frame");
    expect(cssSource).toContain(
      "margin-top: calc(-1 * (var(--site-map-extension) + var(--site-map-overlap)));"
    );
    expect(cssSource).toContain(
      ".deltav-runtime-host.is-site-background .game-menu {\n  position: absolute;"
    );
    expect(cssSource).not.toContain("--site-map-continuation");
    expect(cssSource).not.toContain("position: sticky;");
    expect(cssSource).not.toContain(".delta-site::before");
    expect(cssSource).toContain(
      ".delta-site__brief {\n  padding-top: 0;\n  padding-bottom: clamp(110px, 15vw, 230px);\n  border-top: 0;"
    );
    expect(cssSource).toContain(
      ".delta-site__brief-entry:first-child {\n  padding-top: clamp(44px, 6vw, 76px);\n  border-top: 0;"
    );
    expect(siteSource).not.toContain("syncOpeningSpan");
    expect(siteSource).not.toContain("openingResizeObserver");
    expect(mainSource.indexOf('"deltav-runtime-host is-site-background"')).toBeLessThan(
      mainSource.indexOf("await createDeltaVApp(gameHost)")
    );
    expect(rendererSource).toContain("private syncSitePlanetariumExtent()");
    expect(rendererSource).toContain("private getSitePlanetariumProjectedBottom(");
    expect(rendererSource).toContain(
      'document.documentElement.style.setProperty("--site-map-extension"'
    );
    expect(rendererSource).toContain("this.camera.setViewOffset(");
    expect(rendererSource).toContain("if (this.isRootInViewport)");
  });
});
