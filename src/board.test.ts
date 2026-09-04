import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, expectTypeOf, test } from "vitest";

import { issuesToBoard, mergeEpics, type Board, type Card, type Epic, type RawIssue } from "./board.ts";

const fixture = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../fixtures/issues.json"),
    "utf8",
  ),
) as RawIssue[];

test("Board.epics are Epics; Cards hold an Epic key", () => {
  expectTypeOf<Board["epics"]>().toEqualTypeOf<Epic[]>();
  expectTypeOf<Card>().toHaveProperty("epic");
  expectTypeOf<Epic>().not.toHaveProperty("epic");
});

test("groups Issues into Columns by first-seen status", () => {
  const board = issuesToBoard(fixture);

  expect(board.columns.map((column) => column.title)).toEqual([
    "To Do",
    "In Progress",
    "Done",
  ]);
  expect(board.epics.map((epic) => epic.key)).toEqual(["DEMO-1"]);
  expect(board.columns[0].cards.map((card) => card.key)).toEqual([
    "DEMO-2",
    "DEMO-4",
    "DEMO-6",
  ]);
  expect(board.columns[1].cards.map((card) => card.key)).toEqual(["DEMO-3"]);
  expect(board.columns[2].cards.map((card) => card.key)).toEqual(["DEMO-5"]);
});

test("Epics leave the Board and children keep the Epic key", () => {
  const board = issuesToBoard(fixture);
  expect(board.epics[0]).toEqual({
    key: "DEMO-1",
    summary: "Ship a local kanban",
    priority: "High",
    assignee: "Person A",
    dueDate: "Sep 10, 2026",
  });
  expect(board.columns[1].cards[0]).toEqual({
    key: "DEMO-3",
    summary: "Drag a Card to Move",
    epic: "DEMO-1",
    type: "Story",
    priority: "High",
    assignee: "Person A",
    dueDate: "Aug 25, 2026",
    labels: ["kanban", "write-back"],
  });
});

test("Cards keep labels from the payload", () => {
  const board = issuesToBoard([
    {
      key: "DEMO-2",
      fields: {
        summary: "Labeled",
        status: { name: "To Do" },
        labels: ["kanban", "scope"],
      },
    },
    {
      key: "DEMO-4",
      fields: {
        summary: "Unlabeled",
        status: { name: "To Do" },
        labels: [],
      },
    },
    {
      key: "DEMO-7",
      fields: {
        summary: "Components only",
        status: { name: "To Do" },
        components: [{ name: "parser" }, { name: "cli" }],
      },
    },
  ]);
  expect(board.columns[0].cards[0].labels).toEqual(["kanban", "scope"]);
  expect(board.columns[0].cards[1].labels).toBeUndefined();
  expect(board.columns[0].cards[2].labels).toEqual(["parser", "cli"]);
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
  expect(board.epics.map((epic) => epic.key)).toEqual(["DEMO-1"]);
  expect(board.columns[0].cards[0].epic).toBe("DEMO-1");
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

test("a child without parent has no Epic key", () => {
  const board = issuesToBoard([
    {
      key: "SQLJIRA-2",
      fields: {
        summary: "Work story",
        status: { name: "Proposed" },
        issuetype: { name: "Story" },
      },
    },
    {
      key: "SQLJIRA-1",
      fields: {
        summary: "Work epic",
        status: { name: "In Development" },
        issuetype: { name: "Epic" },
      },
    },
  ]);
  expect(board.epics.map((epic) => epic.key)).toEqual(["SQLJIRA-1"]);
  expect(board.columns[0].cards[0].epic).toBeUndefined();
});

test("mergeEpics keeps listed Epics that Scope missed", () => {
  expect(
    mergeEpics(
      [
        { key: "SQLJIRA-1", summary: "One" },
        { key: "SQLJIRA-9", summary: "Nine" },
      ],
      [{ key: "SQLJIRA-1", summary: "SQLJIRA-1" }],
    ).map((epic) => epic.key),
  ).toEqual(["SQLJIRA-1", "SQLJIRA-9"]);
});
