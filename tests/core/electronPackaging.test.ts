import { readFileSync } from "node:fs";
import { join, win32 } from "node:path";
import { describe, expect, it } from "vitest";

describe("Electron packaging", () => {
  it("keeps renderer path containment checks valid on Windows", () => {
    const source = readFileSync(join(process.cwd(), "scripts/electron-main.mjs"), "utf8");
    const rendererRoot = win32.resolve("C:\\Program Files\\DeltaV\\resources\\app.asar\\dist");
    const indexPath = win32.resolve(rendererRoot, "index.html");
    const outsidePath = win32.resolve(rendererRoot, "..", "outside.html");

    expect(win32.relative(rendererRoot, indexPath)).toBe("index.html");
    expect(win32.relative(rendererRoot, outsidePath)).toBe("..\\outside.html");
    expect(source).toContain("const relativePath = relative(rendererRoot, filePath);");
    expect(source).toContain("relativePath.startsWith(`..${sep}`)");
    expect(source).toContain("isAbsolute(relativePath)");
    expect(source).not.toContain("filePath.startsWith(`${rendererRoot}/`)");
  });

  it("packages extraction instructions and a GPU compatibility launcher", () => {
    const source = readFileSync(join(process.cwd(), "scripts/package-windows.mjs"), "utf8");

    expect(source).toContain('resolve(appPath, "LEGGIMI-WINDOWS.txt")');
    expect(source).toContain('resolve(appPath, "AVVIA-DELTA-V.cmd")');
    expect(source).toContain('resolve(appPath, "AVVIA-DELTA-V-MODALITA-SICURA.cmd")');
    expect(source).toContain('"--deltav-safe-mode"');
    expect(source).toContain('"--deltav-log-file=%~dp0DeltaV-startup-safe.log"');
    expect(source).toContain('"--log-file=%~dp0DeltaV-chromium-safe.log"');
    expect(source).not.toContain('"%~dp0DeltaV.exe" --disable-gpu');
  });

  it("packages only the built renderer and the Electron entry point", () => {
    const source = readFileSync(join(process.cwd(), "scripts/package-windows.mjs"), "utf8");

    expect(source).toContain('await cp(distDirectory, resolve(stagingApp, "dist")');
    expect(source).toContain('resolve(stagingApp, "electron-main.mjs")');
    expect(source).toContain("dir: stagingApp");
    expect(source).not.toContain("dir: projectRoot");
    expect(source).toContain("Canonical Windows archive created");
    expect(source).toContain("CHECKSUMS-SHA256.txt");
    expect(source).toContain('`${checksumLines.join("\\n")}\\n`');
    expect(source).not.toContain('checksumLines.join("\\r\\n")');
  });

  it("logs native startup failures and reveals a stalled Windows window", () => {
    const source = readFileSync(join(process.cwd(), "scripts/electron-main.mjs"), "utf8");

    expect(source).toContain('process.argv.includes("--deltav-safe-mode")');
    expect(source).toContain('app.commandLine.appendSwitch("use-angle", "swiftshader-webgl")');
    expect(source).toContain('app.commandLine.appendSwitch("enable-unsafe-swiftshader")');
    expect(source).toContain('mainWindow.webContents.once("did-finish-load"');
    expect(source).toMatch(/mainWindow\.webContents\.on\(\s*"did-fail-load"/);
    expect(source).toContain('mainWindow.webContents.on("render-process-gone"');
    expect(source).toContain('appendStartupLog("startup-watchdog-expired")');
    expect(source).toContain('fullscreen: process.platform === "darwin" && !safeMode');
  });

  it("renders startup failures instead of leaving a black screen", () => {
    const source = readFileSync(join(process.cwd(), "src/main.ts"), "utf8");

    expect(source).toContain("function showStartupFailure(");
    expect(source).toContain('window.addEventListener("error"');
    expect(source).toContain('window.addEventListener("unhandledrejection"');
    expect(source).toContain("await createDeltaVApp(gameHost);");
    expect(source).toContain("void startDeltaV().catch(showStartupFailure);");
    expect(source).toContain("AVVIA-DELTA-V-MODALITA-SICURA.cmd");
  });
});
