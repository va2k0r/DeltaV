import { defineConfig } from "vitest/config";
import type { IncomingMessage, ServerResponse } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const matchLogRoute = "/__deltav/match-log";
const maxMatchLogPayloadBytes = 4 * 1024 * 1024;

type MatchLogRequestPayload = Readonly<{
  gameMode?: unknown;
  turn?: unknown;
  seed?: unknown;
  terminationReason?: unknown;
  text?: unknown;
}>;

function installMatchLogWriter(
  middlewares: Readonly<{
    use: (handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void;
  }>
): void {
  middlewares.use((req, res, next) => {
    if ((req.url ?? "").split("?")[0] !== matchLogRoute) {
      next();
      return;
    }

    void handleMatchLogRequest(req, res);
  });
}

async function handleMatchLogRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const payload = JSON.parse(await readRequestBody(req)) as MatchLogRequestPayload;

    if (typeof payload.text !== "string" || payload.text.trim().length === 0) {
      sendJson(res, 400, { ok: false, error: "Missing match log text" });
      return;
    }

    const matchLogDir = join(process.cwd(), "match-logs");
    const fileName = createMatchLogFileName(payload);
    const filePath = join(matchLogDir, fileName);

    await mkdir(matchLogDir, { recursive: true });
    await writeFile(filePath, payload.text, "utf8");
    sendJson(res, 200, { ok: true, path: filePath });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

function createMatchLogFileName(payload: MatchLogRequestPayload): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const gameMode = sanitizeFileSegment(payload.gameMode, "ai");
  const turn = sanitizeFileSegment(payload.turn, "T");
  const seed = sanitizeFileSegment(payload.seed, "no-seed");
  const terminationReason = sanitizeFileSegment(payload.terminationReason, "compact");
  return `DeltaV_${gameMode}_T${turn}_${seed}_${terminationReason}_${timestamp}.log`;
}

function sanitizeFileSegment(value: unknown, fallback: string): string {
  const rawSegment =
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : fallback;
  const segment = rawSegment
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return segment.length > 0 ? segment : fallback;
}

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    req.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;

      if (totalBytes > maxMatchLogPayloadBytes) {
        reject(new Error("Match log payload is too large"));
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: Readonly<Record<string, unknown>>
): void {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(payload));
}

export default defineConfig({
  base: process.env.VITE_PUBLIC_BASE ?? "/",
  server: {
    watch: {
      ignored: ["**/release/**", "**/match-logs/**"]
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string): string | undefined {
          if (id.includes("/node_modules/three/")) {
            return "vendor-three";
          }

          if (id.includes("/node_modules/zod/")) {
            return "vendor-zod";
          }

          return undefined;
        }
      }
    }
  },
  plugins: [
    {
      name: "deltav-match-log-writer",
      configureServer(server) {
        installMatchLogWriter(server.middlewares);
      },
      configurePreviewServer(server) {
        installMatchLogWriter(server.middlewares);
      }
    }
  ],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
