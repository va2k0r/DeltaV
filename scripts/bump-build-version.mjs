import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const buildVersionPath = join(process.cwd(), "src/buildVersion.ts");
const buildVersionSource = await readFile(buildVersionPath, "utf8");
const buildSeriesPattern = /export const DELTAV_BUILD_SERIES = (\d+);/u;
const buildRevisionPattern = /export const DELTAV_BUILD_REVISION = (\d+);/u;
const seriesMatch = buildVersionSource.match(buildSeriesPattern);
const revisionMatch = buildVersionSource.match(buildRevisionPattern);

if (seriesMatch === null || revisionMatch === null) {
  throw new Error(`Could not find the DeltaV build components in ${buildVersionPath}`);
}

const currentBuildSeries = Number.parseInt(seriesMatch[1], 10);
const currentBuildRevision = Number.parseInt(revisionMatch[1], 10);
const nextBuildSeries = currentBuildRevision === 15 ? currentBuildSeries + 1 : currentBuildSeries;
const nextBuildRevision = currentBuildRevision === 15 ? 1 : currentBuildRevision + 1;

if (!Number.isSafeInteger(nextBuildSeries) || nextBuildSeries > 99) {
  throw new Error(`Build series ${nextBuildSeries} cannot be represented with two decimal digits.`);
}

await writeFile(
  buildVersionPath,
  buildVersionSource
    .replace(buildSeriesPattern, `export const DELTAV_BUILD_SERIES = ${nextBuildSeries};`)
    .replace(buildRevisionPattern, `export const DELTAV_BUILD_REVISION = ${nextBuildRevision};`),
  "utf8"
);

console.log(
  `${String(nextBuildSeries).padStart(2, "0")}${nextBuildRevision.toString(16).toUpperCase()}`
);
