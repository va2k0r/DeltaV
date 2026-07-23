import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

const positionalArguments = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
const root = resolve(positionalArguments[0] ?? "dist");
const shouldOpenBrowser = !process.argv.includes("--no-open");
const requestedPort = Number.parseInt(process.env.PORT ?? "4173", 10);
const port = Number.isInteger(requestedPort) && requestedPort >= 0 ? requestedPort : 4173;
const host = "127.0.0.1";

await assertPortableApp(root);

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }

  try {
    const requestUrl = new URL(request.url ?? "/", `http://${host}`);
    const pathname = decodeURIComponent(requestUrl.pathname);
    const requestedFile = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    let filePath = resolve(root, requestedFile);

    if (!isWithinRoot(root, filePath)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    try {
      const fileStats = await stat(filePath);

      if (fileStats.isDirectory()) {
        filePath = resolve(filePath, "index.html");
      }
    } catch {
      filePath = resolve(root, "index.html");
    }

    const body = await readFile(filePath);
    const contentType =
      mimeTypes.get(extname(filePath).toLowerCase()) ?? "application/octet-stream";
    const cacheControl = filePath.includes(`${sep}assets${sep}`)
      ? "public, max-age=31536000, immutable"
      : "no-cache";

    response.writeHead(200, {
      "Cache-Control": cacheControl,
      "Content-Length": body.byteLength,
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff"
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    response.end(body);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : "Internal server error");
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE" && port !== 0) {
    console.warn(`Port ${port} is occupied; using a free local port instead.`);
    server.listen(0, host);
    return;
  }

  throw error;
});

server.on("listening", () => {
  const address = server.address();

  if (address === null || typeof address === "string") {
    throw new Error("DeltaV portable server did not expose a TCP address.");
  }

  const url = `http://${host}:${address.port}/`;
  console.log(`DeltaV is running at ${url}`);
  console.log("Press Ctrl+C to stop.");

  if (shouldOpenBrowser) {
    openBrowser(url);
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}

server.listen(port, host);

async function assertPortableApp(directory) {
  const indexPath = resolve(directory, "index.html");
  const indexStats = await stat(indexPath).catch(() => null);

  if (indexStats === null || !indexStats.isFile()) {
    throw new Error(`Portable app is incomplete: ${indexPath} is missing.`);
  }
}

function isWithinRoot(directory, candidate) {
  return candidate === directory || candidate.startsWith(`${directory}${sep}`);
}

function openBrowser(url) {
  const commandByPlatform = {
    darwin: ["open", [url]],
    linux: ["xdg-open", [url]],
    win32: ["cmd", ["/c", "start", "", url]]
  };
  const launch = commandByPlatform[process.platform];

  if (launch === undefined) {
    return;
  }

  const child = spawn(launch[0], launch[1], {
    detached: true,
    stdio: "ignore"
  });
  child.unref();
}
