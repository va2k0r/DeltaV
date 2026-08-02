import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { devlogEntries } from "../../src/site/devlogEntries";

describe("public devlog", () => {
  it("publishes a dated, evidence-led development record without timestamp noise", () => {
    expect(devlogEntries).toHaveLength(27);
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
    expect(publicCopy).not.toContain("It makes the project harder to contradict");
    expect(publicCopy).not.toContain("That boundary is a form of creative safety");
    expect(publicCopy.toLowerCase()).not.toContain(["inter", "cept"].join(""));
  });

  it("turns the FIRE benchmark into a strategic conclusion instead of a statistics dump", () => {
    const fireEntry = devlogEntries.find((entry) => entry.slug === "what-a-missile-is-for");
    const copy = fireEntry?.body.join(" ") ?? "";

    expect(fireEntry?.title).toBe("What Missiles Do to Production");
    expect(copy).toContain("tested in two hundred matched games");
    expect(copy).toContain("69.1 percent");
    expect(copy).toContain("The firing ship sacrificed its own work as well");
    expect(copy).toContain("no firing side won without at least one actual impact");
    expect(copy).toContain("checks what a missile will change on arrival");
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

    expect(copy).toContain("real-time lander");
    expect(copy).toContain("Orbital Maneuver AI");
    expect(copy).toContain("openly vibe-coded");
    expect(copy).toContain("follows fixed priorities");
    expect(copy).toContain("can repeat its mistakes");
    expect(copy).not.toMatch(/\bGPT[- ]?\d/iu);
  });

  it("explains the hard-science-fiction premise through the disassembled-hull solution", () => {
    const plausibilityEntry = devlogEntries.find(
      (entry) => entry.slug === "plausibility-sells-the-fantasy"
    );
    const copy = plausibilityEntry?.body.join(" ") ?? "";

    expect(plausibilityEntry?.title).toBe("Plausibility Sells the Fantasy");
    expect(copy).toContain("A crewed station needs power");
    expect(copy).toContain("protected stocks of hull sections");
    expect(copy).toContain("the ship that worked there must depart");
    expect(copy).toContain("If a yard changes hands halfway through a hull");
    expect(copy).toContain("keep those simplifications consistent");
  });

  it("describes the in-game planner as simultaneous, auditable and solvent", () => {
    const aiEntry = devlogEntries.find((entry) => entry.slug === "how-the-ai-thinks-in-orbits");
    const copy = aiEntry?.body.join(" ") ?? "";

    expect(aiEntry?.title).toBe("How the Computer Opponent Chooses an Order");
    expect(copy).toContain("same public information");
    expect(copy).toContain("Every side plans from the same opening position");
    expect(copy).toContain("Two attractive moves can be rejected together");
    expect(copy).toContain("The last working tritium ship receives special care");
    expect(copy).toContain("order currently being chosen");
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
    expect(copy).toContain("Ships are visible");
    expect(copy).toContain("shared fuel reserves are public");
    expect(copy).toContain("a patient player could reconstruct the same total in a notebook");
  });

  it("documents procedural-map rejection as a transfer audit rather than random placement", () => {
    const mapEntry = devlogEntries.find(
      (entry) => entry.slug === "auditing-procedural-maps-before-turn-one"
    );
    const copy = mapEntry?.body.join(" ") ?? "";

    expect(mapEntry?.title).toBe("How Generated Maps Are Checked");
    expect(copy).toContain("Every proposed opening is judged by real journeys");
    expect(copy).toContain("Does a three-sided start leave one fleet exposed");
    expect(copy).toContain("different random starts produce the same map");
    expect(copy).toContain("fixed map that has already passed the checks");
  });

  it("introduces game vocabulary after the plain-language concept", () => {
    const strategyEntry = devlogEntries.find((entry) => entry.slug === "how-to-wage-war-in-space");
    const strategyCopy = [strategyEntry?.deck ?? "", ...(strategyEntry?.body ?? [])].join(" ");
    const publicCopy = devlogEntries
      .flatMap((entry) => [entry.title, entry.deck, ...entry.body])
      .join(" ");

    expect(strategyCopy.indexOf("amount of change in speed")).toBeLessThan(
      strategyCopy.indexOf("WORK")
    );
    expect(strategyCopy.indexOf("interface calls this WORK")).toBeGreaterThan(0);
    expect(strategyCopy.indexOf("interface calls a movement order a BURN")).toBeGreaterThan(0);
    expect(publicCopy).not.toMatch(
      /\b(?:GameState|formatter|normalized resolution event|immutable shared snapshot|reachability matrix|gameplay hash|legality gate|headless matches)\b/iu
    );
  });

  it("avoids the rejected trailer cadence and unsupported development mythology", () => {
    const paragraphs = devlogEntries.flatMap((entry) => [entry.deck, ...entry.body]);
    const copy = paragraphs.join(" ");

    expect(copy).not.toMatch(/(?:^|[.!?]\s+)(?:But|Wrong|Think again|Not quite)[.!,:\s]/u);
    expect(copy).not.toMatch(
      /\b(?:the real battlefield|the real weapon|orbital mechanics are king)\b/iu
    );
    expect(copy).not.toMatch(/\bappears? to be\b[^.!?]*\b(?:actually|instead)\b/iu);
    expect(copy).not.toContain("started with squares");
    expect(copy).not.toContain("started with territory");
    expect(copy).not.toContain("first casualty");
    expect(copy).not.toMatch(
      /\b(?:the cleaner answer|deliberately uncomfortable|the surprising part|the romantic version|creative safety|harder to contradict)\b/iu
    );
  });

  it("uses historical images only where they are discussed", () => {
    const visualEntry = devlogEntries.find(
      (entry) => entry.slug === "from-hard-scifi-to-cartoon-space-and-back"
    );

    expect(visualEntry?.figures).toHaveLength(4);
    expect(
      devlogEntries
        .filter((entry) => entry.slug !== "from-hard-scifi-to-cartoon-space-and-back")
        .every((entry) => entry.figures === undefined)
    ).toBe(true);
  });

  it("describes the current runtime map as twenty-two playable places", () => {
    const mapEntry = devlogEntries.find(
      (entry) => entry.slug === "why-the-solar-system-got-smaller"
    );
    const copy = [mapEntry?.deck ?? "", ...(mapEntry?.body ?? [])].join(" ");

    expect(copy).toContain("22 playable places");
    expect(copy).toContain("Phobos");
    expect(copy).toContain("Ganymede");
    expect(copy).toContain("Titania");
    expect(copy).toContain("Pluto and Charon");
    expect(devlogEntries.flatMap((entry) => [entry.deck, ...entry.body]).join(" ")).not.toMatch(
      /\b(?:18|eighteen)\b/iu
    );
  });

  it("explains which design problems the lore resolves", () => {
    const loreEntry = devlogEntries.find(
      (entry) => entry.slug === "how-the-lore-became-part-of-the-rules"
    );
    const copy = loreEntry?.body.join(" ") ?? "";

    expect(copy).toContain("Tritium first needed to explain");
    expect(copy).toContain("Corporate fleets provided a reason");
    expect(copy).toContain("Earth and the Moon");
    expect(copy).toContain("The 2079 Saturn incident");
    expect(copy).toContain("No fixed duration is assigned");
  });

  it("makes the replaceable parts of the game concrete", () => {
    const structureEntry = devlogEntries.find(
      (entry) => entry.slug === "schema-first-content-and-vanilla-pack"
    );
    const copy = structureEntry?.body.join(" ") ?? "";

    expect(copy).toContain("This is what headless means here");
    expect(copy).toContain("The renderer draws");
    expect(copy).toContain("The interface handles clicks");
    expect(copy).toContain("The content describes");
    expect(copy).toContain("The player's click first becomes a command");
    expect(copy).toContain("produces a snapshot");
    expect(copy).toContain("The renderer reads the snapshot");
  });

  it("documents the visual detour and the opening alignment", () => {
    const visualEntry = devlogEntries.find(
      (entry) => entry.slug === "from-hard-scifi-to-cartoon-space-and-back"
    );
    const copy = visualEntry?.body.join(" ") ?? "";

    expect(copy).toContain("DeltaV Arcade v4");
    expect(copy).toContain("Orbital Maneuver AI");
    expect(copy).toContain("more cartoonish direction");
    expect(copy).toContain("some in conjunction and others in opposition");
    expect(copy).toContain("The first reason is simply that it looks good");
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
    expect(mainSource).toContain('window.history.scrollRestoration = "manual";');
    expect(mainSource).toContain('window.scrollTo({ top: 0, behavior: "auto" });');
    expect(mainSource).toContain('navigationEntry?.type !== "reload"');
    expect(mainSource).toContain("window.history.replaceState(");
    expect(mainSource).toContain("clearSiteHashOnReload();");
    expect(mainSource.match(/resetSiteScrollPosition\(\);/gu)).toHaveLength(2);
    expect(rendererSource).toContain("private syncSitePlanetariumExtent()");
    expect(rendererSource).toContain("private getSitePlanetariumProjectedBottom(");
    expect(rendererSource).toContain(
      'document.documentElement.style.setProperty("--site-map-extension"'
    );
    expect(rendererSource).toContain("this.camera.setViewOffset(");
    expect(rendererSource).toContain("if (this.isRootInViewport)");
  });
});
