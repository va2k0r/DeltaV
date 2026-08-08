import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const buildVersionPath = join(process.cwd(), "src/buildVersion.ts");
const buildVersionSource = await readFile(buildVersionPath, "utf8");
const buildNumberPattern = /export const DELTAV_BUILD_NUMBER = (\d+);/u;
const match = buildVersionSource.match(buildNumberPattern);

if (match === null) {
  throw new Error(`Could not find DELTAV_BUILD_NUMBER in ${buildVersionPath}`);
}

const currentBuildNumber = Number.parseInt(match[1], 10);
const nextBuildNumber = currentBuildNumber + 1;

if (!Number.isSafeInteger(nextBuildNumber) || nextBuildNumber > 999) {
  throw new Error(`Build number ${nextBuildNumber} cannot be represented with three digits.`);
}

await writeFile(
  buildVersionPath,
  buildVersionSource.replace(
    buildNumberPattern,
    `export const DELTAV_BUILD_NUMBER = ${nextBuildNumber};`
  ),
  "utf8"
);

console.log(String(nextBuildNumber).padStart(3, "0"));
