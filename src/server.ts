import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createBoardApp, refreshFromJira } from "./boot.ts";
import { resolveJiraBin } from "./cli.ts";
import { handleRequest } from "./http.ts";
import { writeJiraConfig } from "./jira-config.ts";
import { resolveListen } from "./listen.ts";
import { sendUi } from "./ui.ts";

async function readPipe(): Promise<unknown | null> {
  if (process.stdin.isTTY) return null;
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? JSON.parse(text) : null;
}

export async function runServer(opts: {
  root: string;
  fallback?: (req: IncomingMessage, res: ServerResponse) => void;
}) {
  const piped = await readPipe();
  const raw =
    piped ?? JSON.parse(readFileSync(join(opts.root, "fixtures/issues.json"), "utf8"));
  const { app, store, kind } = await createBoardApp({
    raw,
    piped: Boolean(piped),
  });

  const server = createServer((req, res) => {
    if (handleRequest(req, res, { app, store })) return;
    if (opts.fallback) {
      opts.fallback(req, res);
      return;
    }
    if (!sendUi(opts.root, req, res)) {
      res.statusCode = 404;
      res.end("pipe-kan UI is missing. Run bun run build.");
    }
  });

  const { host, port } = resolveListen();
  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  const origin = `http://127.0.0.1:${port}`;
  const fakeConfig = writeJiraConfig(join(tmpdir(), "pipe-kan"), origin);

  if (kind === "jira") {
    try {
      await refreshFromJira(app, kind, { piped: Boolean(piped) });
    } catch (err) {
      console.error("jira Refresh failed; keeping Fixture Board");
      console.error(err);
    }
  }

  console.log(`pipe-kan http://${host}:${port}`);
  console.log(`cli ${kind === "jira" ? resolveJiraBin() : "store"}`);
  console.log(`Fake Jira ${origin}/rest/api/2/search`);
  console.log(`Fake Jira config ${fakeConfig}`);
}
