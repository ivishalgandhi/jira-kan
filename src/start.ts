import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createApp } from "./app.ts";
import { handleRequest } from "./http.ts";
import { writeJiraConfig } from "./jira-config.ts";
import { IssueStore } from "./store.ts";

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
  const store = IssueStore.fromRaw(raw);
  const app = createApp({ store });
  if (piped) app.hydrate(piped);
  else await app.refresh();

  const { createServer: createVite } = await import("vite");
  const vite = await createVite({
    root,
    server: { middlewareMode: true, host: "127.0.0.1" },
    appType: "spa",
  });

  const server = createServer((req, res) => {
    if (handleRequest(req, res, { app, store })) return;
    vite.middlewares(req, res);
  });

  const port = Number(process.env.PORT ?? 5173);
  await new Promise<void>((resolve) =>
    server.listen(port, "127.0.0.1", resolve),
  );
  const origin = `http://127.0.0.1:${port}`;
  writeJiraConfig(join(root, "fixtures"), origin);
  console.log(`jira-kan ${origin}`);
  console.log(`Fake Jira ${origin}/rest/api/2/search`);
  console.log(`jira-cli config ${join(root, "fixtures/jira.config.yml")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
