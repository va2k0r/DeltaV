import { app, BrowserWindow, dialog, net, protocol } from "electron";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const appScheme = "deltav";
const appHost = "app";
const safeMode = process.argv.includes("--deltav-safe-mode");
const requestedLogPath = getArgumentValue("--deltav-log-file=");
const startupLogPath =
  requestedLogPath === null
    ? resolve(app.getPath("userData"), "logs", "DeltaV-startup.log")
    : isAbsolute(requestedLogPath)
      ? requestedLogPath
      : resolve(app.getPath("userData"), requestedLogPath);

if (safeMode) {
  app.commandLine.appendSwitch("use-gl", "angle");
  app.commandLine.appendSwitch("use-angle", "swiftshader-webgl");
  app.commandLine.appendSwitch("enable-unsafe-swiftshader");
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: appScheme,
    privileges: {
      corsEnabled: true,
      secure: true,
      standard: true,
      stream: true,
      supportFetchAPI: true
    }
  }
]);

let mainWindow = null;
let startupWatchdog = null;

appendStartupLog("process-start", {
  argv: process.argv.filter((argument) => !argument.startsWith("--deltav-log-file=")),
  platform: process.platform,
  safeMode,
  version: app.getVersion()
});

process.on("uncaughtException", (error) => {
  reportFatalStartupError("Errore imprevisto nel processo principale", error);
  app.exit(1);
});

process.on("unhandledRejection", (reason) => {
  appendStartupLog("unhandled-rejection", reason);
});

function getArgumentValue(prefix) {
  const argument = process.argv.find((candidate) => candidate.startsWith(prefix));
  return argument === undefined ? null : argument.slice(prefix.length).trim() || null;
}

function serializeLogDetails(details) {
  if (details instanceof Error) {
    return details.stack ?? `${details.name}: ${details.message}`;
  }

  if (typeof details === "string") {
    return details;
  }

  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

function appendStartupLog(event, details) {
  const suffix = details === undefined ? "" : ` ${serializeLogDetails(details)}`;

  try {
    mkdirSync(dirname(startupLogPath), { recursive: true });
    appendFileSync(startupLogPath, `${new Date().toISOString()} ${event}${suffix}\n`, "utf8");
  } catch {
    // Logging must never become the reason the game cannot start.
  }
}

function reportFatalStartupError(title, error) {
  appendStartupLog("fatal-startup-error", error);
  dialog.showErrorBox(
    `DeltaV - ${title}`,
    [
      serializeLogDetails(error),
      "",
      `Log: ${startupLogPath}`,
      "",
      safeMode
        ? "Invia questo log insieme al file DeltaV-chromium-safe.log."
        : "Riprova con AVVIA-DELTA-V-MODALITA-SICURA.cmd."
    ].join("\n")
  );
}

function getRendererFilePath(requestUrl) {
  const url = new URL(requestUrl);

  if (url.hostname !== appHost) {
    return null;
  }

  const rendererRoot = resolve(app.getAppPath(), "dist");
  const requestedPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const filePath = resolve(rendererRoot, requestedPath === "" ? "index.html" : requestedPath);
  const relativePath = relative(rendererRoot, filePath);

  if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    return null;
  }

  return filePath;
}

function registerAppProtocol() {
  protocol.handle(appScheme, async (request) => {
    try {
      const filePath = getRendererFilePath(request.url);

      if (filePath === null || !existsSync(filePath)) {
        appendStartupLog("renderer-file-not-found", request.url);
        return new globalThis.Response("Not found", { status: 404 });
      }

      return await net.fetch(pathToFileURL(filePath).toString());
    } catch (error) {
      appendStartupLog("renderer-protocol-error", error);
      return new globalThis.Response("Internal error", { status: 500 });
    }
  });
}

function revealMainWindow(reason) {
  if (startupWatchdog !== null) {
    globalThis.clearTimeout(startupWatchdog);
    startupWatchdog = null;
  }

  if (mainWindow === null || mainWindow.isDestroyed()) {
    return;
  }

  if (process.platform === "win32" && !safeMode) {
    mainWindow.maximize();
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  mainWindow.focus();
  appendStartupLog("window-shown", { reason });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    backgroundColor: "#02050a",
    fullscreen: process.platform === "darwin" && !safeMode,
    fullscreenable: true,
    height: safeMode ? 800 : 900,
    minHeight: 640,
    minWidth: 960,
    show: false,
    title: safeMode ? "DeltaV - Modalita sicura" : "DeltaV",
    width: safeMode ? 1280 : 1600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once("ready-to-show", () => {
    revealMainWindow("ready-to-show");
  });
  mainWindow.webContents.once("did-finish-load", () => {
    revealMainWindow("did-finish-load");
  });
  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
      if (!isMainFrame || errorCode === -3) {
        return;
      }

      reportFatalStartupError(
        "Impossibile caricare il gioco",
        new Error(`${errorDescription} (${errorCode}) at ${validatedUrl}`)
      );
      revealMainWindow("did-fail-load");
    }
  );
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    appendStartupLog("render-process-gone", details);
    reportFatalStartupError(
      "Il renderer si e arrestato",
      new Error(`${details.reason}; exit code ${details.exitCode}`)
    );
  });
  mainWindow.on("unresponsive", () => {
    appendStartupLog("window-unresponsive");
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  startupWatchdog = globalThis.setTimeout(() => {
    appendStartupLog("startup-watchdog-expired");
    revealMainWindow("startup-watchdog");
  }, 12_000);

  appendStartupLog("renderer-load-start", `${appScheme}://${appHost}/index.html`);
  void mainWindow.loadURL(`${appScheme}://${appHost}/index.html`).catch((error) => {
    reportFatalStartupError("Impossibile aprire la finestra", error);
    revealMainWindow("load-url-rejected");
  });
}

app.setName("DeltaV");

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  appendStartupLog("second-instance-exit");
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow === null) {
      return;
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    revealMainWindow("second-instance");
  });

  app.on("child-process-gone", (_event, details) => {
    appendStartupLog("child-process-gone", details);
  });

  app
    .whenReady()
    .then(() => {
      appendStartupLog("app-ready", { safeMode });
      registerAppProtocol();
      createMainWindow();

      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createMainWindow();
        }
      });
    })
    .catch((error) => {
      reportFatalStartupError("Avvio non riuscito", error);
      app.exit(1);
    });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
