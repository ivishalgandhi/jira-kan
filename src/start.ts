import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createBoardApp, refreshFromJira } from "./boot.ts";
import { resolveJiraBin } from "./cli.ts";
import { handleRequest } from "./http.ts";
import { writeJiraConfig } from "./jira-config.ts";
import { resolveListen } from "./listen.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = join(root, "fixtures/issues.json");

async function readPipe(): Promise<unknown | null> {
  if (process.stdin.isTTY) return null;
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? JSON.parse(text) : null;
}

async function main() {
  const piped = await readPipe();
  const raw = piped ?? JSON.parse(readFileSync(fixturePath, "utf8"));
  const { app, store, kind } = await createBoardApp({
    raw,
    piped: Boolean(piped),
  });

  const { createServer: createVite } = await import("vite");
  const vite = await createVite({
    root,
    server: { middlewareMode: true, allowedHosts: true },
    appType: "spa",
  });

  const server = createServer((req, res) => {
    if (handleRequest(req, res, { app, store })) return;
    vite.middlewares(req, res);
  });

  const { host, port } = resolveListen();
  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  const origin = `http://127.0.0.1:${port}`;
  const fakeConfig = writeJiraConfig(join(root, "fixtures"), origin);

  if (kind === "jira") {
    try {
      await refreshFromJira(app, kind);
    } catch (err) {
      console.error("jira Refresh failed; keeping Fixture Board");
      console.error(err);
    }
  }

  console.log(`jira-kan http://${host}:${port}`);
  console.log(`cli ${kind === "jira" ? resolveJiraBin() : "store"}`);
  console.log(`Fake Jira ${origin}/rest/api/2/search`);
  console.log(`Fake Jira config ${fakeConfig}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
