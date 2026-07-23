import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8"));
const version = packageJson.version;

if (typeof version !== "string" || version.trim().length === 0) {
  throw new Error("package.json must define a release version.");
}

const distDirectory = resolve(projectRoot, "dist");
const releaseDirectory = resolve(projectRoot, "release", `DeltaV-${version}-portable`);
const appDirectory = resolve(releaseDirectory, "app");
const indexStats = await stat(resolve(distDirectory, "index.html")).catch(() => null);

if (indexStats === null || !indexStats.isFile()) {
  throw new Error("dist/index.html is missing. Run npm run build before packaging.");
}

await rm(releaseDirectory, { force: true, recursive: true });
await mkdir(releaseDirectory, { recursive: true });
await cp(distDirectory, appDirectory, { recursive: true });
await cp(
  resolve(projectRoot, "scripts", "portable-server.mjs"),
  resolve(releaseDirectory, "server.mjs")
);

await writeFile(
  resolve(releaseDirectory, "DeltaV.command"),
  `#!/bin/sh\ncd "$(dirname "$0")"\nexec node server.mjs app\n`,
  { encoding: "utf8", mode: 0o755 }
);
await writeFile(
  resolve(releaseDirectory, "DeltaV.sh"),
  `#!/bin/sh\ncd "$(dirname "$0")"\nexec node server.mjs app\n`,
  { encoding: "utf8", mode: 0o755 }
);
await writeFile(
  resolve(releaseDirectory, "DeltaV.cmd"),
  `@echo off\ncd /d "%~dp0"\nnode server.mjs app\n`,
  "utf8"
);
await writeFile(
  resolve(releaseDirectory, "README.txt"),
  [
    `DeltaV ${version} portable alpha`,
    "",
    "Requirements: Node.js 20 or newer.",
    "macOS: double-click DeltaV.command.",
    "Windows: double-click DeltaV.cmd.",
    "Linux: run ./DeltaV.sh.",
    "",
    "The launcher serves the bundled app only on 127.0.0.1 and opens the default browser.",
    "Close the terminal window or press Ctrl+C to stop DeltaV.",
    "This is a portable web alpha, not yet a signed native desktop application."
  ].join("\n"),
  "utf8"
);

console.log(`Portable alpha created at ${releaseDirectory}`);
