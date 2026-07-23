import { access, copyFile, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { packager } from "@electron/packager";

const executeFile = promisify(execFile);

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8"));
const version = packageJson.version;
const distDirectory = resolve(projectRoot, "dist");
const iconPath = resolve(projectRoot, "resources", "DeltaV.icns");
const outputDirectory = resolve(projectRoot, "release", `DeltaV-${version}-macOS`);

if (typeof version !== "string" || version.trim().length === 0) {
  throw new Error("package.json must define a release version.");
}

await access(resolve(distDirectory, "index.html"));
await access(iconPath);

const appPaths = await packager({
  appBundleId: "com.deltav.game",
  appCategoryType: "public.app-category.games",
  appVersion: version,
  arch: "arm64",
  asar: true,
  darwinDarkModeSupport: true,
  dir: projectRoot,
  electronVersion: packageJson.devDependencies.electron.replace(/^[^\d]*/, ""),
  executableName: "DeltaV",
  extendInfo: {
    NSHighResolutionCapable: true
  },
  icon: iconPath,
  ignore: [
    /[/\\]docs([/\\]|$)/,
    /[/\\]match-logs([/\\]|$)/,
    /[/\\]model-viewer([/\\]|$)/,
    /[/\\]node_modules([/\\]|$)/,
    /[/\\]release([/\\]|$)/,
    /[/\\]src([/\\]|$)/,
    /[/\\]tests([/\\]|$)/
  ],
  junk: true,
  name: "DeltaV",
  out: outputDirectory,
  overwrite: true,
  platform: "darwin",
  prune: true
});

for (const appPath of appPaths) {
  const appBundlePath = resolve(appPath, "DeltaV.app");
  await access(resolve(appBundlePath, "Contents", "Info.plist"));
  await copyFile(iconPath, resolve(appBundlePath, "Contents", "Resources", "DeltaV.icns"));
  await executeFile("plutil", [
    "-replace",
    "CFBundleIconFile",
    "-string",
    "DeltaV.icns",
    resolve(appBundlePath, "Contents", "Info.plist")
  ]);
  console.log(`macOS app created at ${appBundlePath}`);
}
