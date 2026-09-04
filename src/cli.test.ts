import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

import type { RawIssue } from "./board.ts";
import { createBoardApp, refreshFromJira } from "./boot.ts";
import { createJiraCli, resolveJiraBin } from "./cli.ts";

const fixture = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../fixtures/issues.json"),
    "utf8",
  ),
) as RawIssue[];

function fakeJira() {
  const dir = mkdtempSync(join(tmpdir(), "jira-kan-"));
  const bin = join(dir, "jira");
  const log = join(dir, "calls.jsonl");
  writeFileSync(
    bin,
    `#!/usr/bin/env bun
import { appendFileSync } from "node:fs";
appendFileSync(${JSON.stringify(log)}, JSON.stringify({
  args: process.argv.slice(2),
  config: process.env.JIRA_CONFIG_FILE ?? null,
  token: process.env.JIRA_API_TOKEN ?? null,
}) + "\\n");
const [cmd, sub, key, status] = process.argv.slice(2);
if (cmd === "issue" && sub === "list") {
  console.log(JSON.stringify([{
    key: "DEMO-1",
    fields: { summary: "from jira", status: { name: "To Do" } },
  }]));
  process.exit(0);
}
if (cmd === "issue" && sub === "move") {
  if (key === "DEMO-4" && status === "Done") {
    console.error("✗ invalid transition state \\"Done\\"");
    process.exit(1);
  }
  process.exit(0);
}
if (cmd === "open") {
  console.log("opening...");
  console.log("http://127.0.0.1:5173/browse/" + sub);
  process.exit(0);
}
process.exit(1);
`,
  );
  chmodSync(bin, 0o755);
  return {
    bin,
    calls() {
      try {
        return readFileSync(log, "utf8")
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line) as {
            args: string[];
            config: string | null;
            token: string | null;
          });
      } catch {
        return [];
      }
    },
  };
}

test("resolveJiraBin finds an explicit path and misses a missing name", () => {
  const { bin } = fakeJira();
  expect(resolveJiraBin(bin)).toBe(bin);
  expect(resolveJiraBin("no-such-jira-bin", "/tmp")).toBeUndefined();
});

test("createJiraCli lists with flags and --raw", async () => {
  const { bin, calls } = fakeJira();
  const cli = createJiraCli({ bin });
  const raw = await cli.list("-a user@test.com -s~Done");
  expect(JSON.parse(raw)[0].key).toBe("DEMO-1");
  expect(calls()[0].args).toEqual([
    "issue",
    "list",
    "-a",
    "user@test.com",
    "-s~Done",
    "--raw",
  ]);
});

test("createJiraCli does not force Fake Jira config or token", async () => {
  const { bin, calls } = fakeJira();
  const prevConfig = process.env.JIRA_CONFIG_FILE;
  const prevToken = process.env.JIRA_API_TOKEN;
  delete process.env.JIRA_CONFIG_FILE;
  delete process.env.JIRA_API_TOKEN;
  try {
    const cli = createJiraCli({ bin });
    await cli.list("");
    expect(calls()[0].config).toBeNull();
    expect(calls()[0].token).toBeNull();
  } finally {
    if (prevConfig === undefined) delete process.env.JIRA_CONFIG_FILE;
    else process.env.JIRA_CONFIG_FILE = prevConfig;
    if (prevToken === undefined) delete process.env.JIRA_API_TOKEN;
    else process.env.JIRA_API_TOKEN = prevToken;
  }
});

test("createJiraCli passes config and token when given", async () => {
  const { bin, calls } = fakeJira();
  const cli = createJiraCli({
    bin,
    configPath: "/tmp/jira.config.yml",
    token: "fake",
  });
  await cli.list("");
  expect(calls()[0].config).toBe("/tmp/jira.config.yml");
  expect(calls()[0].token).toBe("fake");
});

test("createJiraCli move and open shell jira-cli", async () => {
  const { bin, calls } = fakeJira();
  const cli = createJiraCli({ bin });
  expect(await cli.move("DEMO-3", "Done")).toEqual({ ok: true });
  expect(await cli.move("DEMO-4", "Done")).toEqual({
    ok: false,
    error: '✗ invalid transition state "Done"',
  });
  expect(await cli.open("DEMO-1")).toBe("http://127.0.0.1:5173/browse/DEMO-1");
  expect(calls().map((call) => call.args)).toEqual([
    ["issue", "move", "DEMO-3", "Done"],
    ["issue", "move", "DEMO-4", "Done"],
    ["open", "DEMO-1", "--no-browser"],
  ]);
});

test("boot without jira uses the store", async () => {
  const { kind, app } = await createBoardApp({
    raw: fixture,
    env: { PATH: "/tmp", JIRA_BIN: "jira" },
  });
  expect(kind).toBe("store");
  expect(
    app.board().columns.flatMap((column) => column.cards.map((card) => card.key)),
  ).toEqual(["DEMO-2", "DEMO-4", "DEMO-3"]);
});

test("boot with jira first-paints from the store then Refresh shells jira", async () => {
  const { bin } = fakeJira();
  const { kind, app } = await createBoardApp({
    raw: fixture,
    env: { PATH: "/tmp", JIRA_BIN: bin },
  });
  expect(kind).toBe("jira");
  expect(
    app.board().columns.flatMap((column) => column.cards.map((card) => card.key)),
  ).toEqual(["DEMO-2", "DEMO-4", "DEMO-3"]);

  await refreshFromJira(app, kind);
  expect(
    app.board().columns.flatMap((column) =>
      column.cards.map((card) => ({ key: card.key, summary: card.summary })),
    ),
  ).toEqual([{ key: "DEMO-1", summary: "from jira" }]);
});

test("boot with Pipe and jira keeps the Pipe Board until Refresh", async () => {
  const { bin, calls } = fakeJira();
  const piped = [
    {
      key: "WORK-9",
      fields: { summary: "piped", status: { name: "To Do" } },
    },
  ];
  const { kind, app } = await createBoardApp({
    raw: piped,
    piped: true,
    env: { PATH: "/tmp", JIRA_BIN: bin },
  });
  expect(kind).toBe("jira");
  expect(app.board().columns[0]?.cards.map((card) => card.key)).toEqual(["WORK-9"]);

  await refreshFromJira(app, kind, { piped: true });
  expect(app.board().columns[0]?.cards.map((card) => card.key)).toEqual(["WORK-9"]);
  expect(calls().filter((call) => call.args[1] === "list")).toEqual([]);

  await refreshFromJira(app, kind);
  expect(app.board().columns[0]?.cards[0]).toMatchObject({
    key: "DEMO-1",
    summary: "from jira",
  });
});
