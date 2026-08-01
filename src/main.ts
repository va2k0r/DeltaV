import { createDeltaVApp } from "./ui";
import { createDeltaVSite } from "./site";
import "./styles.css";

const root = document.querySelector<HTMLElement>("#app");

if (root === null) {
  throw new Error("DeltaV mount point #app was not found.");
}

const appRoot = root;

function showStartupFailure(reason: unknown): void {
  const message = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
  appRoot.replaceChildren();
  appRoot.style.boxSizing = "border-box";
  appRoot.style.minHeight = "100vh";
  appRoot.style.background = "#02050a";
  appRoot.style.color = "#f5f8fc";
  appRoot.style.font = "16px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  appRoot.style.padding = "32px";

  const title = document.createElement("h1");
  title.textContent = "DeltaV could not start";
  const detail = document.createElement("pre");
  detail.style.whiteSpace = "pre-wrap";
  detail.textContent = `${message}\n\nOn Windows, try AVVIA-DELTA-V-MODALITA-SICURA.cmd from the extracted folder.`;
  appRoot.append(title, detail);
}

window.addEventListener("error", (event) => {
  if (event.message.includes("ResizeObserver loop")) {
    event.preventDefault();
    return;
  }

  showStartupFailure(event.error ?? event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  showStartupFailure(event.reason);
});

function shouldOpenDirectlyInGame(searchParams: URLSearchParams): boolean {
  return (
    searchParams.has("game") ||
    searchParams.has("tutorial") ||
    searchParams.has("trailer") ||
    searchParams.has("debug") ||
    searchParams.has("screen") ||
    searchParams.get("mode") === "trailer"
  );
}

async function startDeltaV(): Promise<void> {
  const searchParams = new URLSearchParams(window.location.search);
  const directGameMode = shouldOpenDirectlyInGame(searchParams);
  const gameHost = document.createElement("div");
  gameHost.className = "deltav-runtime-host";
  appRoot.replaceChildren(gameHost);

  await createDeltaVApp(gameHost);
  if (directGameMode) {
    return;
  }

  gameHost.classList.add("is-site-background");
  createDeltaVSite(appRoot, gameHost);
}

void startDeltaV().catch(showStartupFailure);
