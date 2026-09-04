import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

import { issuesToBoard } from "./board.ts";

const fixture = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../fixtures/issues.json"),
    "utf8",
  ),
);

test("groups Issues into Columns by first-seen status", () => {
  const board = issuesToBoard(fixture);

  expect(board.columns.map((column) => column.title)).toEqual([
    "To Do",
    "In Progress",
    "Done",
  ]);
  expect(board.epics.map((card) => card.key)).toEqual(["DEMO-1"]);
  expect(board.columns[0].cards.map((card) => card.key)).toEqual([
    "DEMO-2",
    "DEMO-4",
    "DEMO-6",
  ]);
  expect(board.columns[1].cards.map((card) => card.key)).toEqual(["DEMO-3"]);
  expect(board.columns[2].cards.map((card) => card.key)).toEqual(["DEMO-5"]);
});

test("Epics leave the Board and keep parent on children", () => {
  const board = issuesToBoard(fixture);
  expect(board.epics[0]).toMatchObject({
    key: "DEMO-1",
    summary: "Ship a local kanban",
    type: "Epic",
  });
  expect(board.columns[1].cards[0]).toMatchObject({
    key: "DEMO-3",
    summary: "Drag a Card to Move",
    parent: "DEMO-1",
    priority: "High",
    assignee: "Person A",
    dueDate: "Aug 25, 2026",
  });
});

test("parent-only payload still names the Epic", () => {
  const board = issuesToBoard([
    {
      key: "DEMO-2",
      fields: {
        summary: "Child",
        status: { name: "To Do" },
        parent: { key: "DEMO-1" },
      },
    },
  ]);
  expect(board.epics.map((card) => card.key)).toEqual(["DEMO-1"]);
  expect(board.columns[0].cards[0].parent).toBe("DEMO-1");
});

test("hides a status that has no Issues", () => {
  const board = issuesToBoard([
    {
      key: "DEMO-2",
      fields: { summary: "Only To Do", status: { name: "To Do" } },
    },
  ]);

  expect(board.columns.map((column) => column.title)).toEqual(["To Do"]);
});
