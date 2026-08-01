import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { calculateScrollbarMetrics } from "../../src/site/pageScrollbar";

describe("site page scrollbar", () => {
  it("maps the document scroll range onto the inset track", () => {
    expect(
      calculateScrollbarMetrics({
        scrollTop: 2_250,
        scrollHeight: 5_500,
        viewportHeight: 1_000,
        trackHeight: 800
      })
    ).toEqual({
      maxScrollTop: 4_500,
      thumbHeight: 800 * (1_000 / 5_500),
      thumbOffset: (800 - 800 * (1_000 / 5_500)) / 2
    });
  });

  it("clamps the thumb to a usable minimum size and to both ends", () => {
    const atStart = calculateScrollbarMetrics({
      scrollTop: -100,
      scrollHeight: 20_000,
      viewportHeight: 800,
      trackHeight: 600
    });
    const atEnd = calculateScrollbarMetrics({
      scrollTop: 30_000,
      scrollHeight: 20_000,
      viewportHeight: 800,
      trackHeight: 600
    });

    expect(atStart).toMatchObject({ thumbHeight: 48, thumbOffset: 0 });
    expect(atEnd).toMatchObject({ thumbHeight: 48, thumbOffset: 552 });
  });

  it("delays a scrollbar-only pulse until the visitor needs a scroll cue", () => {
    const source = readFileSync(join(process.cwd(), "src/site/pageScrollbar.ts"), "utf8");
    const styles = readFileSync(join(process.cwd(), "src/site/site.css"), "utf8");

    expect(source).toContain("const SCROLL_CUE_DELAY_MS = 3_000;");
    expect(source).toContain('window.addEventListener("scroll"');
    expect(styles).toContain("right: 2px;");
    expect(styles).toContain("width: 6px;");
    expect(styles).toContain("animation: delta-site-scroll-thumb 1.7s ease-in-out infinite;");
    expect(styles).not.toContain("delta-site-scroll-glow");
    expect(styles).not.toContain(".delta-site__page-scrollbar::before");
  });
});
