import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, expectTypeOf, test } from "vitest";

import { cardAge, issuesToBoard, mergeEpics, type Board, type Card, type Epic, type RawIssue } from "./board.ts";

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
  expect(board.epics.map((epic) => epic.key)).toEqual(["DEMO-1", "DEMO-7", "DEMO-8"]);
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
    status: "In Progress",
    priority: "High",
    assignee: "Person A",
    dueDate: "Sep 10, 2026",
    labels: ["kanban"],
  });
  expect(board.columns[1].cards[0]).toEqual({
    key: "DEMO-3",
    summary: "Drag a Card to Move",
    epic: "DEMO-1",
    type: "Story",
    priority: "High",
    assignee: "Person A",
    dueDate: "Aug 25, 2026",
    created: "2026-09-01T11:00:00.000+0000",
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

test("Epics keep labels the same way Cards do", () => {
  const board = issuesToBoard([
    {
      key: "DEMO-1",
      fields: {
        summary: "Ship",
        status: { name: "In Progress" },
        issuetype: { name: "Epic" },
        labels: ["kanban", "scope"],
      },
    },
    {
      key: "DEMO-8",
      fields: {
        summary: "Bare",
        status: { name: "Done" },
        issuetype: { name: "Epic" },
        labels: [],
      },
    },
    {
      key: "DEMO-9",
      fields: {
        summary: "Components only",
        status: { name: "To Do" },
        issuetype: { name: "Epic" },
        components: [{ name: "parser" }, { name: "cli" }],
      },
    },
  ]);
  expect(board.epics[0].labels).toEqual(["kanban", "scope"]);
  expect(board.epics[1].labels).toBeUndefined();
  expect(board.epics[2].labels).toEqual(["parser", "cli"]);
});

test("Cards keep assignee from displayName, name, or string", () => {
  const board = issuesToBoard([
    {
      key: "DEMO-2",
      fields: {
        summary: "Display",
        status: { name: "To Do" },
        assignee: { displayName: "Person A" },
      },
    },
    {
      key: "DEMO-4",
      fields: {
        summary: "Name only",
        status: { name: "To Do" },
        assignee: { name: "jdoe" },
      },
    },
    {
      key: "DEMO-7",
      fields: {
        summary: "String",
        status: { name: "To Do" },
        assignee: "Person C",
      },
    },
    {
      key: "DEMO-8",
      fields: {
        summary: "Empty",
        status: { name: "To Do" },
        assignee: { displayName: "" },
      },
    },
    {
      key: "DEMO-9",
      fields: {
        summary: "Missing",
        status: { name: "To Do" },
      },
    },
  ]);
  expect(board.columns[0].cards.map((card) => card.assignee)).toEqual([
    "Person A",
    "jdoe",
    "Person C",
    undefined,
    undefined,
  ]);
});

test("Card age is days since created", () => {
  const now = Date.parse("2026-09-04T12:00:00.000Z");
  expect(cardAge("2026-07-20T09:00:00.000+0000", now)).toBe("46d");
  expect(cardAge("2026-07-11T00:00:00.000Z", now)).toBe("55d");
  expect(cardAge(undefined, now)).toBeUndefined();
  expect(cardAge("not-a-date", now)).toBeUndefined();
});

test("Cards keep created from the payload", () => {
  const board = issuesToBoard([
    {
      key: "DEMO-2",
      fields: {
        summary: "Aged",
        status: { name: "To Do" },
        created: "2026-07-20T09:00:00.000+0000",
      },
    },
  ]);
  expect(board.columns[0].cards[0].created).toBe("2026-07-20T09:00:00.000+0000");
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

test("Cards keep an Epic key from Epic Link", () => {
  const board = issuesToBoard([
    {
      key: "DEMO-2",
      fields: {
        summary: "Linked",
        status: { name: "To Do" },
        "Epic Link": "DEMO-1",
      },
    },
  ]);
  expect(board.columns[0].cards[0].epic).toBe("DEMO-1");
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

test("Epics keep status from the payload", () => {
  const board = issuesToBoard([
    {
      key: "DEMO-8",
      fields: {
        summary: "Done work",
        status: { name: "Completed" },
        issuetype: { name: "Epic" },
      },
    },
  ]);
  expect(board.epics[0].status).toBe("Completed");
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
