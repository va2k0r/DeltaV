import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { devlogEntries } from "../../src/site/devlogEntries";

function entryCopy(slug: string): string {
  const entry = devlogEntries.find((candidate) => candidate.slug === slug);
  if (entry === undefined) {
    throw new Error(`Expected field-manual article ${slug}.`);
  }
  return [entry.deck, ...entry.body, entry.playToWin].join(" ");
}

describe("public field manual", () => {
  it("publishes a concise, curated learning path instead of a chronological devlog", () => {
    expect(devlogEntries).toHaveLength(21);
    expect(devlogEntries[0]?.slug).toBe("how-to-wage-war-in-space");
    expect(devlogEntries.at(-1)?.slug).toBe("how-the-lore-became-part-of-the-rules");
    expect(new Set(devlogEntries.map((entry) => entry.slug)).size).toBe(devlogEntries.length);

    for (const entry of devlogEntries) {
      const wordCount = [entry.deck, ...entry.body, entry.playToWin].join(" ").split(/\s+/u).length;
      expect(entry.body.length).toBeGreaterThanOrEqual(3);
      expect(entry.body.length).toBeLessThanOrEqual(4);
      expect(wordCount).toBeLessThanOrEqual(360);
      expect(entry.playToWin.length).toBeGreaterThan(40);
      expect(entry.figures).toHaveLength(1);
    }

    const slugs = devlogEntries.map((entry) => entry.slug);
    expect(slugs).not.toContain("playing-past-the-tutorial");
    expect(slugs).not.toContain("simulation-that-can-disagree");
    expect(slugs).not.toContain("what-the-machine-was-good-for");
    expect(slugs).not.toContain("replay-led-debugging-became-the-workflow");
  });

  it("keeps every sentence short enough to scan", () => {
    for (const entry of devlogEntries) {
      const sentences = [entry.deck, ...entry.body, entry.playToWin].flatMap((paragraph) =>
        paragraph.split(/(?<=[.!?])\s+/u)
      );

      for (const sentence of sentences) {
        const plainSentence = sentence.replace(/\[([^\]]+)\]\(#[^)]+\)/gu, "$1");
        expect(plainSentence.trim().split(/\s+/u).length).toBeLessThanOrEqual(30);
      }
    }
  });

  it("links concepts to other articles using only valid internal targets", () => {
    const slugs = new Set<string>(devlogEntries.map((entry) => entry.slug));
    const links = devlogEntries.flatMap((entry) =>
      [...entry.body, entry.playToWin].flatMap((paragraph) =>
        [...paragraph.matchAll(/\[([^\]]+)\]\(#([a-z0-9-]+)\)/gu)].map((match) => ({
          label: match[1],
          slug: match[2]
        }))
      )
    );

    expect(links.length).toBeGreaterThanOrEqual(devlogEntries.length);
    for (const link of links) {
      expect(link.label).toBeTruthy();
      expect(slugs.has(link.slug ?? "")).toBe(true);
    }

    for (const entry of devlogEntries) {
      expect([...entry.body, entry.playToWin].join(" ")).toMatch(/\[[^\]]+\]\(#[a-z0-9-]+\)/u);
    }
  });

  it("gives every article a real, captioned animated gif", () => {
    for (const entry of devlogEntries) {
      const figure = entry.figures[0];
      expect(figure?.src).toBeTruthy();
      expect(figure?.alt.length).toBeGreaterThan(30);
      expect(figure?.caption.length).toBeGreaterThan(40);
      expect(figure?.afterParagraph).toBeGreaterThanOrEqual(0);
      expect(figure?.afterParagraph).toBeLessThan(entry.body.length);
    }

    const sources = devlogEntries.map((entry) => entry.figures[0]?.src ?? "");
    expect(sources.every((source) => source.endsWith(".gif"))).toBe(true);
  });

  it("teaches the long game with direct questions about future tritium access", () => {
    const strategy = entryCopy("how-to-wage-war-in-space");
    const victory = entryCopy("fuel-access-decides-the-war");

    expect(strategy).toContain("You do not need to destroy every enemy ship");
    expect(strategy).toContain("make sure you can earn fuel again");
    expect(strategy).toContain("Keep two different ways to reach tritium");
    expect(victory).toContain("Ship count does not decide the match");
    expect(victory).toContain("Count how many separate routes each faction has");
    expect(victory).toContain("Protect your second route");
  });

  it("states the current economy and timing rules exactly", () => {
    const work = entryCopy("why-productive-ships-often-receive-no-order");
    const burn = entryCopy("a-burn-is-a-budget-not-a-destination");
    const evade = entryCopy("evasion-became-automatic");
    const contested = entryCopy("when-enemies-share-an-orbit");
    const shipyard = entryCopy("why-building-a-ship-makes-another-leave");

    expect(work).toContain("One turn of WORK at tritium gives your faction 2 ΔV");
    expect(work).toContain("One turn of WORK at a shipyard adds 1/5");
    expect(burn).toContain("wait one more turn before it can WORK");
    expect(evade).toContain("When one missile hits a ship, the faction pays 1 ΔV");
    expect(evade).toContain("Other missiles aimed at the same ship stay active");
    expect(contested).toContain("At the start of every turn, each faction pays 2 ΔV");
    expect(shipyard).toContain("the new ship remains at the shipyard");
    expect(shipyard).toContain("The old ship must choose a legal BURN destination");
  });

  it("explains the real cost of FIRE with concrete numbers", () => {
    const fire = entryCopy("why-firing-a-missile-costs-no-fuel");
    const stackedFire = entryCopy("when-another-missile-is-worth-firing");

    expect(fire).toContain("FIRE costs 0 ΔV");
    expect(fire).toContain("FIRE from tritium gives up 2 ΔV of income");
    expect(fire).toContain("FIRE from a barren orbit gives up no production");
    expect(stackedFire).toContain("200 matched test games");
    expect(stackedFire).toContain("69.1%");
    expect(stackedFire).toContain("the target cannot pay EVADE");
    expect(stackedFire).not.toMatch(/\b(?:confidence interval|permutation test|p=)\b/iu);
  });

  it("explains simultaneous orders without game-theory jargon", () => {
    const secrecy = entryCopy("secrecy-is-about-timing");

    expect(secrecy).toContain("choose orders at the same time and reveal them together");
    expect(secrecy).toContain("List the moves it can actually pay for");
    expect(secrecy).toContain("safe against the worst one");
    expect(secrecy).not.toMatch(/\b(?:maximin|maximize your minimum|plausible orders)\b/iu);
  });

  it("keeps the requested color articles grounded in game rules", () => {
    const stealth = devlogEntries.find((entry) => entry.slug === "there-is-no-stealth-in-space");
    const weapons = entryCopy("why-deltav-begins-with-missiles");
    const industry = entryCopy("plausibility-sells-the-fantasy");
    const lore = entryCopy("how-the-lore-became-part-of-the-rules");

    expect(stealth?.references).toContainEqual({
      label: "Stealth in Space — Children of a Dead Earth",
      href: "https://childrenofadeadearth.wordpress.com/2016/07/12/stealth-in-space/"
    });
    expect(entryCopy("there-is-no-stealth-in-space")).toContain("Power creates waste heat");
    expect(weapons).toContain("see it coming");
    expect(industry).toContain("forced BURN");
    expect(lore).toContain("2079 [Saturn incident]");
    expect(lore).toContain("no WORK and no CONTESTED battle");
  });

  it("avoids diary language, implementation jargon and obsolete map terminology", () => {
    const copy = devlogEntries
      .flatMap((entry) => [
        entry.category,
        entry.title,
        entry.deck,
        ...entry.body,
        entry.playToWin,
        ...entry.figures.flatMap((figure) => [figure.alt, figure.caption])
      ])
      .join(" ");

    expect(copy).not.toMatch(/\b(?:I|me|my)\b/u);
    expect(copy).not.toMatch(
      /\b(?:GameState|formatter|snapshot hash|legality gate|headless matches|TypeScript|renderer|debugging|regression)\b/iu
    );
    expect(copy).not.toMatch(/\bnode\b/iu);
    expect(copy).not.toMatch(
      /\b(?:delayed economic threats?|ammunition purchases?|fleet reserve|opportunity cost|strategically insolvent|operational window|solvent branches?|net future options|maximize your minimum result|strongest worst case|threshold-crossing)\b/iu
    );
    expect(copy).not.toContain("consumes the ship's action");
    expect(copy).not.toContain("22 playable places");
    expect(copy).not.toContain("Completing a Hull Forces a Departure");
  });

  it("renders the archive as a field manual with safe inline links and a strategy callout", () => {
    const source = readFileSync(join(process.cwd(), "src/site/index.ts"), "utf8");
    const cssSource = readFileSync(join(process.cwd(), "src/site/site.css"), "utf8");

    expect(source).toContain("Skip to the field manual");
    expect(source).toContain('aria-label="Field manual"');
    expect(source).toContain("READ ARTICLE");
    expect(source).toContain("HIDE ARTICLE");
    expect(source).toContain("HOW TO USE THIS TO WIN");
    expect(source).toContain("function renderManualRichText");
    expect(source).toContain("internalLinkPattern");
    expect(source).not.toContain("formatDevlogDate");
    expect(source).not.toContain('<time datetime="${escapeHtml(entry.date)}">');
    expect(cssSource).toContain(".delta-site__brief-play-to-win");
  });

  it("keeps the main-menu framing while the manual overlaps the planetarium", () => {
    const cssSource = readFileSync(join(process.cwd(), "src/site/site.css"), "utf8");
    const mainSource = readFileSync(join(process.cwd(), "src/main.ts"), "utf8");
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );

    expect(cssSource).toContain("--site-map-overlap: clamp(250px, 29vh, 340px);");
    expect(cssSource).toContain("height: calc(100vh + var(--site-map-extension));");
    expect(cssSource).toContain(
      "margin-top: calc(-1 * (var(--site-map-extension) + var(--site-map-overlap)));"
    );
    expect(mainSource.indexOf('"deltav-runtime-host is-site-background"')).toBeLessThan(
      mainSource.indexOf("await createDeltaVApp(gameHost)")
    );
    expect(rendererSource).toContain("private syncSitePlanetariumExtent()");
    expect(rendererSource).toContain(
      'document.documentElement.style.setProperty("--site-map-extension"'
    );
  });
});
