import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const executeFile = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceIcon = resolve(projectRoot, "resources", "DeltaV-ship-icon.png");
const iconsetDirectory = resolve(projectRoot, "resources", "DeltaV.iconset");
const macOutputIcon = resolve(projectRoot, "resources", "DeltaV.icns");
const windowsOutputIcon = resolve(projectRoot, "resources", "DeltaV.ico");
const iconSizes = [
  ["icon_16x16.png", 16],
  ["icon_16x16@2x.png", 32],
  ["icon_32x32.png", 32],
  ["icon_32x32@2x.png", 64],
  ["icon_128x128.png", 128],
  ["icon_128x128@2x.png", 256],
  ["icon_256x256.png", 256],
  ["icon_256x256@2x.png", 512],
  ["icon_512x512.png", 512],
  ["icon_512x512@2x.png", 1024]
];

await rm(iconsetDirectory, { force: true, recursive: true });
await mkdir(iconsetDirectory, { recursive: true });

for (const [fileName, size] of iconSizes) {
  await executeFile("sips", [
    "--resampleHeightWidth",
    String(size),
    String(size),
    sourceIcon,
    "--out",
    resolve(iconsetDirectory, fileName)
  ]);
}

await executeFile("iconutil", ["--convert", "icns", "--output", macOutputIcon, iconsetDirectory]);

const windowsIconImages = await Promise.all(
  [
    [16, "icon_16x16.png"],
    [32, "icon_32x32.png"],
    [64, "icon_32x32@2x.png"],
    [128, "icon_128x128.png"],
    [256, "icon_256x256.png"]
  ].map(async ([size, fileName]) => ({
    png: await readFile(resolve(iconsetDirectory, fileName)),
    size
  }))
);

await writeFile(windowsOutputIcon, createWindowsIcon(windowsIconImages));
console.log(`macOS icon created at ${macOutputIcon}`);
console.log(`Windows icon created at ${windowsOutputIcon}`);

function createWindowsIcon(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(images.length * 16);
  let imageOffset = header.length + directory.length;

  images.forEach((image, index) => {
    const entryOffset = index * 16;
    directory.writeUInt8(image.size >= 256 ? 0 : image.size, entryOffset);
    directory.writeUInt8(image.size >= 256 ? 0 : image.size, entryOffset + 1);
    directory.writeUInt8(0, entryOffset + 2);
    directory.writeUInt8(0, entryOffset + 3);
    directory.writeUInt16LE(1, entryOffset + 4);
    directory.writeUInt16LE(32, entryOffset + 6);
    directory.writeUInt32LE(image.png.length, entryOffset + 8);
    directory.writeUInt32LE(imageOffset, entryOffset + 12);
    imageOffset += image.png.length;
  });

  return Buffer.concat([header, directory, ...images.map((image) => image.png)]);
}
