import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { ZipArchive } from "archiver";
import { packager } from "@electron/packager";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8"));
const version = packageJson.version;
const electronVersion = packageJson.devDependencies.electron.replace(/^[^\d]*/, "");
const distDirectory = resolve(projectRoot, "dist");
const iconPath = resolve(projectRoot, "resources", "DeltaV.ico");
const outputDirectory = resolve(projectRoot, "release", `DeltaV-${version}-Windows`);
const archivePath = resolve(projectRoot, "release", `DeltaV-${version}-Windows-x64.zip`);

if (typeof version !== "string" || version.trim().length === 0) {
  throw new Error("package.json must define a release version.");
}

await access(resolve(distDirectory, "index.html"));
await access(resolve(projectRoot, "scripts", "electron-main.mjs"));
await access(iconPath);
await mkdir(resolve(projectRoot, "release"), { recursive: true });

const stagingRoot = await mkdtemp(resolve(tmpdir(), "deltav-windows-package-"));
const stagingApp = resolve(stagingRoot, "app");

try {
  await mkdir(stagingApp, { recursive: true });
  await cp(distDirectory, resolve(stagingApp, "dist"), { recursive: true });
  await cp(
    resolve(projectRoot, "scripts", "electron-main.mjs"),
    resolve(stagingApp, "electron-main.mjs")
  );
  await writeFile(
    resolve(stagingApp, "package.json"),
    `${JSON.stringify(
      {
        name: "deltav",
        productName: "DeltaV",
        version,
        private: true,
        type: "module",
        main: "electron-main.mjs"
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  const appPaths = await packager({
    appVersion: version,
    arch: "x64",
    asar: true,
    dir: stagingApp,
    electronVersion,
    executableName: "DeltaV",
    icon: iconPath,
    junk: true,
    name: "DeltaV",
    out: outputDirectory,
    overwrite: true,
    platform: "win32",
    prune: false,
    win32metadata: {
      CompanyName: "DeltaV",
      FileDescription: "DeltaV hard-sci-fi orbital strategy",
      InternalName: "DeltaV",
      OriginalFilename: "DeltaV.exe",
      ProductName: "DeltaV",
      "requested-execution-level": "asInvoker"
    }
  });

  if (appPaths.length !== 1 || appPaths[0] === undefined) {
    throw new Error(`Expected one Windows x64 app, received ${appPaths.length}.`);
  }

  const appPath = appPaths[0];
  await writeWindowsLaunchers(appPath);
  await verifyPackagedRuntime(appPath);
  await writeBuildManifest(appPath);
  await createZipArchive(appPath, archivePath);

  console.log(`Windows app created at ${appPath}`);
  console.log(`Canonical Windows archive created at ${archivePath}`);
} finally {
  await rm(stagingRoot, { force: true, recursive: true });
}

async function writeWindowsLaunchers(appPath) {
  await writeFile(
    resolve(appPath, "LEGGIMI-WINDOWS.txt"),
    [
      `DeltaV ${version} - Windows 10/11 64 bit`,
      "",
      "AVVIO CONSIGLIATO",
      "",
      '1. Fai clic destro sul file ZIP e scegli "Estrai tutto".',
      "2. Apri la cartella estratta DeltaV-win32-x64.",
      "3. Avvia AVVIA-DELTA-V.cmd.",
      "",
      "IMPORTANTE",
      "",
      "- Non avviare il gioco direttamente dall'interno dello ZIP.",
      "- Non spostare il solo DeltaV.exe: la cartella deve restare completa.",
      "- L'app e' portabile: non richiede Node.js e non necessita di installazione.",
      '- Se SmartScreen la blocca, scegli "Ulteriori informazioni" e poi "Esegui comunque".',
      "",
      "MODALITA' SICURA",
      "",
      "Se non appare alcuna finestra o vedi una schermata nera, chiudi DeltaV e avvia:",
      "AVVIA-DELTA-V-MODALITA-SICURA.cmd",
      "",
      "La modalita' sicura usa il renderer software SwiftShader incluso in Electron e parte in finestra.",
      "Se anche questa modalita' non funziona, invia questi file:",
      "- DeltaV-startup.log oppure DeltaV-startup-safe.log",
      "- DeltaV-chromium.log oppure DeltaV-chromium-safe.log",
      "- BUILD-INFO.json"
    ].join("\r\n"),
    "utf8"
  );
  await writeFile(
    resolve(appPath, "AVVIA-DELTA-V.cmd"),
    [
      "@echo off",
      "setlocal",
      'cd /d "%~dp0"',
      'if not exist "%~dp0resources\\app.asar" (',
      "  echo DeltaV non e' stato estratto correttamente.",
      "  echo Estrai tutto lo ZIP e avvia di nuovo questo file.",
      "  pause",
      "  exit /b 2",
      ")",
      '"%~dp0DeltaV.exe" "--deltav-log-file=%~dp0DeltaV-startup.log" "--enable-logging=file" "--log-file=%~dp0DeltaV-chromium.log"',
      'set "DELTAV_EXIT_CODE=%errorlevel%"',
      'if not "%DELTAV_EXIT_CODE%"=="0" (',
      "  echo.",
      "  echo DeltaV si e' chiuso con codice %DELTAV_EXIT_CODE%.",
      "  echo Prova AVVIA-DELTA-V-MODALITA-SICURA.cmd.",
      "  pause",
      ")",
      "exit /b %DELTAV_EXIT_CODE%",
      ""
    ].join("\r\n"),
    "utf8"
  );
  await writeFile(
    resolve(appPath, "AVVIA-DELTA-V-MODALITA-SICURA.cmd"),
    [
      "@echo off",
      "setlocal",
      'cd /d "%~dp0"',
      '"%~dp0DeltaV.exe" "--deltav-safe-mode" "--deltav-log-file=%~dp0DeltaV-startup-safe.log" "--enable-logging=file" "--log-file=%~dp0DeltaV-chromium-safe.log"',
      'set "DELTAV_EXIT_CODE=%errorlevel%"',
      'if not "%DELTAV_EXIT_CODE%"=="0" (',
      "  echo.",
      "  echo DeltaV modalita' sicura si e' chiuso con codice %DELTAV_EXIT_CODE%.",
      "  echo Invia i file di log presenti in questa cartella.",
      "  pause",
      ")",
      "exit /b %DELTAV_EXIT_CODE%",
      ""
    ].join("\r\n"),
    "utf8"
  );
}

async function verifyPackagedRuntime(appPath) {
  const requiredPaths = [
    "DeltaV.exe",
    "icudtl.dat",
    "libEGL.dll",
    "libGLESv2.dll",
    "resources.pak",
    "resources/app.asar"
  ];

  for (const requiredPath of requiredPaths) {
    const absolutePath = resolve(appPath, requiredPath);
    const fileStats = await stat(absolutePath).catch(() => null);

    if (fileStats === null || !fileStats.isFile() || fileStats.size === 0) {
      throw new Error(`Packaged Windows runtime is missing ${requiredPath}.`);
    }
  }
}

async function listFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, absolutePath)));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files.sort((first, second) => first.localeCompare(second));
}

async function hashFile(filePath) {
  const hash = createHash("sha256");

  await new Promise((resolvePromise, rejectPromise) => {
    const input = createReadStream(filePath);
    input.on("data", (chunk) => hash.update(chunk));
    input.on("error", rejectPromise);
    input.on("end", resolvePromise);
  });

  return hash.digest("hex");
}

async function writeBuildManifest(appPath) {
  const buildInfo = {
    product: "DeltaV",
    version,
    platform: "win32",
    arch: "x64",
    electronVersion,
    builtAt: new Date().toISOString(),
    safeModeLauncher: "AVVIA-DELTA-V-MODALITA-SICURA.cmd"
  };
  await writeFile(
    resolve(appPath, "BUILD-INFO.json"),
    `${JSON.stringify(buildInfo, null, 2)}\n`,
    "utf8"
  );

  const files = (await listFiles(appPath)).filter(
    (filePath) => basename(filePath) !== "CHECKSUMS-SHA256.txt"
  );
  const checksumLines = [];

  for (const filePath of files) {
    const portablePath = relative(appPath, filePath).split(sep).join("/");
    checksumLines.push(`${await hashFile(filePath)}  ${portablePath}`);
  }

  await writeFile(
    resolve(appPath, "CHECKSUMS-SHA256.txt"),
    `${checksumLines.join("\n")}\n`,
    "utf8"
  );
}

async function createZipArchive(appPath, outputPath) {
  await rm(outputPath, { force: true });

  await new Promise((resolvePromise, rejectPromise) => {
    const output = createWriteStream(outputPath);
    const zip = new ZipArchive({ zlib: { level: 9 } });

    output.on("close", resolvePromise);
    output.on("error", rejectPromise);
    zip.on("warning", (error) => {
      if (error.code === "ENOENT") {
        console.warn(error.message);
        return;
      }

      rejectPromise(error);
    });
    zip.on("error", rejectPromise);
    zip.pipe(output);
    zip.directory(appPath, basename(appPath));
    void zip.finalize();
  });
}
