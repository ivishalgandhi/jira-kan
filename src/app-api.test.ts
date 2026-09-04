import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, test } from "vitest";

import { createApp } from "./app.ts";
import { handleAppApi } from "./app-api.ts";
import { IssueStore } from "./store.ts";

const fixture = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../fixtures/issues.json"),
    "utf8",
  ),
);

const servers: { close(): void }[] = [];

afterEach(() => {
  while (servers.length) servers.pop()?.close();
});

async function listen(store = IssueStore.fromRaw(fixture)) {
  const app = createApp({ store });
  await app.refresh();
  const server = createServer((req, res) => {
    if (!handleAppApi(req, res, app)) {
      res.statusCode = 404;
      res.end("no");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  servers.push(server);
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no port");
  return { base: `http://127.0.0.1:${addr.port}`, app };
}

test("default Board is mine and not Done", async () => {
  const { base } = await listen();
  const board = await (await fetch(`${base}/api/board`)).json();
  expect(board.columns.map((c: { title: string }) => c.title)).toEqual([
    "To Do",
    "In Progress",
  ]);
  expect(
    board.columns.flatMap((c: { cards: { key: string }[] }) =>
      c.cards.map((card) => card.key),
    ),
  ).toEqual(["DEMO-2", "DEMO-4", "DEMO-3"]);
  expect(board.epics.map((card: { key: string }) => card.key)).toEqual([
    "DEMO-1",
  ]);
});

test("successful Move Refresh-es and drops Done", async () => {
  const { base } = await listen();
  const res = await fetch(`${base}/api/move`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: "DEMO-3", status: "Done" }),
  });
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(
    body.board.columns.flatMap((c: { cards: { key: string }[] }) =>
      c.cards.map((card) => card.key),
    ),
  ).toEqual(["DEMO-2", "DEMO-4"]);
});

test("illegal Move snaps back with jira-cli stderr", async () => {
  const { base } = await listen();
  const res = await fetch(`${base}/api/move`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: "DEMO-4", status: "Done" }),
  });
  const body = await res.json();
  expect(res.status).toBe(409);
  expect(body.ok).toBe(false);
  expect(body.error).toContain("invalid transition state");
  expect(
    body.board.columns.find((c: { title: string }) => c.title === "To Do").cards
      .map((card: { key: string }) => card.key),
  ).toContain("DEMO-4");
});

test("same-Column drop is a no-op", async () => {
  const { base } = await listen();
  const res = await fetch(`${base}/api/move`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: "DEMO-2", status: "To Do" }),
  });
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.noop).toBe(true);
});

test("Refresh with Epic flag lists Epic children", async () => {
  const { base } = await listen();
  const res = await fetch(`${base}/api/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ flags: "-P DEMO-1" }),
  });
  const body = await res.json();
  expect(body.columns.flatMap((c: { cards: { key: string }[] }) => c.cards.map((card) => card.key))).toEqual([
    "DEMO-2",
    "DEMO-4",
    "DEMO-3",
    "DEMO-5",
  ]);
});

test("Open returns the browse URL", async () => {
  const { base } = await listen();
  const res = await fetch(`${base}/api/open`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: "DEMO-1" }),
  });
  const body = await res.json();
  expect(body.url).toBe("/browse/DEMO-1");
});
