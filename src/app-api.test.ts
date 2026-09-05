import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, test } from "vitest";

import { createApp } from "./app.ts";
import { handleAppApi } from "./app-api.ts";
import type { RawIssue } from "./board.ts";
import type { Cli } from "./cli.ts";
import { IssueStore } from "./store.ts";

const fixture = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../fixtures/issues.json"),
    "utf8",
  ),
) as RawIssue[];

const servers: { close(): void }[] = [];

afterEach(() => {
  while (servers.length) servers.pop()?.close();
});

async function listen(store = IssueStore.fromRaw(fixture), cli?: Cli) {
  const app = createApp({ store, cli });
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

test("default Board is the Project", async () => {
  const { base } = await listen();
  const board = await (await fetch(`${base}/api/board`)).json();
  expect(board.columns.map((c: { title: string }) => c.title)).toEqual([
    "To Do",
    "In Progress",
    "Done",
  ]);
  expect(
    board.columns.flatMap((c: { cards: { key: string }[] }) =>
      c.cards.map((card) => card.key),
    ),
  ).toEqual(["DEMO-2", "DEMO-4", "DEMO-6", "DEMO-3", "DEMO-5"]);
  expect(board.epics.map((epic: { key: string }) => epic.key)).toEqual([
    "DEMO-1",
  ]);
});

test("successful Move Refresh-es and keeps Done", async () => {
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
  ).toEqual(["DEMO-2", "DEMO-4", "DEMO-6", "DEMO-3", "DEMO-5"]);
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

test("Open returns the browse URL and flattened fields", async () => {
  const { base } = await listen();
  const res = await fetch(`${base}/api/open`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: "DEMO-2" }),
  });
  const body = await res.json();
  expect(body.url).toBe("/browse/DEMO-2");
  expect(body.fields[0]).toEqual({ label: "Key", value: "DEMO-2" });
  expect(body.fields.find((field: { label: string }) => field.label === "Summary")?.value).toBe(
    "Parse jira-cli --raw JSON",
  );
  expect(body.fields.find((field: { label: string }) => field.label === "Description")?.value).toBe(
    "Turn the payload into Columns.",
  );
  expect(body.fields.some((field: { label: string }) => /comment/i.test(field.label))).toBe(false);
});

test("Open keeps the URL and an error when view fails", async () => {
  const store = IssueStore.fromRaw(fixture);
  const { base } = await listen(store, {
    list: async () => JSON.stringify(fixture),
    listEpics: async () => "[]",
    listEpic: async () => "[]",
    move: async () => ({ ok: true }),
    open: async (key) => `/browse/${key}`,
    view: async () => {
      throw new Error("jira issue view failed");
    },
  });
  const res = await fetch(`${base}/api/open`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: "DEMO-2" }),
  });
  const body = await res.json();
  expect(body.url).toBe("/browse/DEMO-2");
  expect(body.fields).toEqual([]);
  expect(body.error).toBe("jira issue view failed");
});

test("Epic children keep the Epic key", async () => {
  const { base } = await listen();
  const res = await fetch(`${base}/api/epic`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: "DEMO-1" }),
  });
  const body = await res.json();
  expect(
    body.columns.flatMap((c: { cards: { key: string; epic?: string }[] }) =>
      c.cards.map((card) => [card.key, card.epic]),
    ),
  ).toEqual([
    ["DEMO-2", "DEMO-1"],
    ["DEMO-4", "DEMO-1"],
    ["DEMO-3", "DEMO-1"],
    ["DEMO-5", "DEMO-1"],
  ]);
});

test("Board.epics come from the Epic list, not only Scope", async () => {
  const cli: Cli = {
    async list() {
      return JSON.stringify([
        {
          key: "SQLJIRA-2",
          fields: {
            summary: "Story",
            status: { name: "Proposed" },
            issuetype: { name: "Story" },
          },
        },
      ]);
    },
    async listEpics() {
      return JSON.stringify([
        {
          key: "SQLJIRA-1",
          fields: {
            summary: "One",
            status: { name: "In Development" },
            issuetype: { name: "Epic" },
          },
        },
        {
          key: "SQLJIRA-9",
          fields: {
            summary: "Nine",
            status: { name: "Proposed" },
            issuetype: { name: "Epic" },
          },
        },
      ]);
    },
    async listEpic() {
      return "[]";
    },
    async move() {
      return { ok: true };
    },
    async open() {
      return "/browse/X";
    },
    async view() {
      return JSON.stringify({ key: "X", fields: {} });
    },
  };
  const { base } = await listen(IssueStore.fromRaw(fixture), cli);
  const board = await (await fetch(`${base}/api/board`)).json();
  expect(board.epics.map((epic: { key: string }) => epic.key)).toEqual([
    "SQLJIRA-1",
    "SQLJIRA-9",
  ]);
});
