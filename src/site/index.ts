import { deltaVExternalLinks } from "./externalLinks";
import { devlogEntries, type DevlogEntry } from "./devlogEntries";
import { installSitePageScrollbar } from "./pageScrollbar";
import "./site.css";

type SiteSectionId = "steam" | "player-vs-player";

type SiteNavigateDetail = Readonly<{
  target: SiteSectionId;
}>;

export function createDeltaVSite(root: HTMLElement, gameHost: HTMLElement): void {
  document.body.classList.add("is-deltav-site");

  const site = document.createElement("div");
  site.className = "delta-site";
  site.innerHTML = `
    <a class="delta-site__skip" href="#${escapeHtml(devlogEntries[0]?.slug ?? "devlog")}">
      Skip to the devlog
    </a>
    <main class="delta-site__main" id="site-main" tabindex="-1">
      <section
        class="delta-site__section delta-site__brief"
        id="devlog"
        aria-label="Devlog"
      >
        <div class="delta-site__brief-entries">
          ${devlogEntries.map(renderDevlogEntry).join("")}
        </div>
      </section>

      <section class="delta-site__section delta-site__release" aria-label="Release status">
        <div class="delta-site__release-row" id="player-vs-player">
          <span>2VS + 3VS</span>
          <strong>FUTURE EXPANSION / NOT ANNOUNCED</strong>
        </div>
        <div class="delta-site__release-row" id="steam">
          <span>STEAM</span>
          <div>
            <p data-steam-status>OFFICIAL PAGE NOT YET CONFIGURED</p>
            <div data-steam-action></div>
          </div>
        </div>
      </section>

      <footer class="delta-site__footer">
        <span>DELTAV — ORBITAL STRATEGY</span>
        <button type="button" data-return-top>RETURN TO SYSTEM ↑</button>
      </footer>
    </main>
  `;

  root.append(site);
  installSteamAction(site);
  const pageScrollbar = installSitePageScrollbar(site);

  const enterGame = (): void => {
    window.scrollTo({ top: 0, behavior: "auto" });
    site.hidden = true;
    document.body.classList.remove("is-deltav-site");
    pageScrollbar.setActive(false);
    gameHost.classList.remove("is-site-background");
  };

  const restoreSite = (): void => {
    site.hidden = false;
    document.body.classList.add("is-deltav-site");
    pageScrollbar.setActive(true);
    gameHost.classList.add("is-site-background");
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  site.querySelector<HTMLElement>("[data-return-top]")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  });

  window.addEventListener("deltav:gameplay-entered", enterGame);
  window.addEventListener("deltav:game-menu-opened", restoreSite);
  window.addEventListener("deltav:site-navigate", (event) => {
    const detail = (event as CustomEvent<SiteNavigateDetail>).detail;
    const target = detail?.target === undefined ? null : document.getElementById(detail.target);
    target?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
  });
}

function installSteamAction(site: HTMLElement): void {
  const container = site.querySelector<HTMLElement>("[data-steam-action]");
  const status = site.querySelector<HTMLElement>("[data-steam-status]");
  if (container === null || status === null || deltaVExternalLinks.steamWishlist === null) {
    const unavailable = document.createElement("span");
    unavailable.className = "delta-site__unavailable-action";
    unavailable.textContent = "WISHLIST URL NOT CONFIGURED";
    unavailable.setAttribute("aria-label", "Steam wishlist URL is not configured yet");
    container?.append(unavailable);
    return;
  }

  status.textContent = "Wishlist DeltaV on its official Steam page.";
  const link = document.createElement("a");
  link.className = "delta-site__primary-action";
  link.href = deltaVExternalLinks.steamWishlist;
  link.rel = "noreferrer";
  link.target = "_blank";
  link.textContent = "WISHLIST ON STEAM";
  container.append(link);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function formatDevlogDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(date);
  if (match === null) {
    return date;
  }

  const monthNames: Readonly<Record<string, string>> = {
    "01": "JAN",
    "02": "FEB",
    "03": "MAR",
    "04": "APR",
    "05": "MAY",
    "06": "JUN",
    "07": "JUL",
    "08": "AUG",
    "09": "SEP",
    "10": "OCT",
    "11": "NOV",
    "12": "DEC"
  };
  const [, year, month, day] = match;
  const monthName = month === undefined ? undefined : monthNames[month];
  if (year === undefined || day === undefined || monthName === undefined) {
    return date;
  }

  return `${day} ${monthName} ${year}`;
}

function renderDevlogEntry(entry: DevlogEntry): string {
  return `
    <article class="delta-site__brief-entry" id="${escapeHtml(entry.slug)}">
      <div class="delta-site__brief-entry-meta">
        <span>${escapeHtml(entry.category)}</span>
        <time datetime="${escapeHtml(entry.date)}">${escapeHtml(formatDevlogDate(entry.date))}</time>
      </div>
      <div class="delta-site__brief-entry-copy">
        <h3><a href="#${escapeHtml(entry.slug)}">${escapeHtml(entry.title)}</a></h3>
        <p class="delta-site__brief-deck">${escapeHtml(entry.deck)}</p>
        ${renderDevlogReferences(entry.references)}
        <details class="delta-site__brief-details" open>
          <summary>
            <span class="delta-site__brief-open-label">READ ENTRY</span>
            <span class="delta-site__brief-close-label">COLLAPSE ENTRY</span>
            <span aria-hidden="true">+</span>
          </summary>
          <div class="delta-site__brief-body">
            ${entry.body
              .map(
                (paragraph, paragraphIndex) => `
                  <p>${escapeHtml(paragraph)}</p>
                  ${(entry.figures ?? [])
                    .filter((figure) => figure.afterParagraph === paragraphIndex)
                    .map(
                      (figure) => `
                        <figure>
                          <picture>
                            ${
                              figure.reducedMotionSrc === undefined
                                ? ""
                                : `<source media="(prefers-reduced-motion: reduce)" srcset="${escapeHtml(figure.reducedMotionSrc)}" />`
                            }
                          <img
                            src="${escapeHtml(figure.src)}"
                            alt="${escapeHtml(figure.alt)}"
                            loading="lazy"
                            decoding="async"
                          />
                          </picture>
                          <figcaption>${escapeHtml(figure.caption)}</figcaption>
                        </figure>
                      `
                    )
                    .join("")}
                `
              )
              .join("")}
          </div>
        </details>
      </div>
    </article>
  `;
}

function renderDevlogReferences(references: DevlogEntry["references"]): string {
  if (references === undefined || references.length === 0) {
    return "";
  }

  return `
    <div class="delta-site__brief-references" aria-label="Further reading">
      ${references
        .map(
          (reference) => `
            <a href="${escapeHtml(reference.href)}" target="_blank" rel="noreferrer">
              ${escapeHtml(reference.label)} <span aria-hidden="true">↗</span>
            </a>
          `
        )
        .join("")}
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
