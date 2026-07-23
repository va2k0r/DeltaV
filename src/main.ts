import { createDeltaVApp } from "./ui";
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
  showStartupFailure(event.error ?? event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  showStartupFailure(event.reason);
});

void createDeltaVApp(appRoot).catch(showStartupFailure);
