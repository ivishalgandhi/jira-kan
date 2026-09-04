import { expect, test } from "vitest";

import type { Card, Epic } from "./board.ts";
import { filterEpics, filterValue, mergeValue, rollbackColumns, stampEpic } from "./visible.ts";

const child: Card = { key: "DEMO-2", summary: "child", epic: "DEMO-1" };
const other: Card = { key: "DEMO-9", summary: "other", epic: "DEMO-8" };

test("rollback under an Epic keeps hidden Cards", () => {
  const current = {
    "To Do": [child, other],
    "In Progress": [],
  };
  const previousVisible = {
    "To Do": [child],
    "In Progress": [],
  };
  expect(rollbackColumns(previousVisible, current, "DEMO-1")).toEqual({
    "To Do": [other, child],
    "In Progress": [],
  });
});

test("rollback with no Epic restores the previous Board", () => {
  const previous = { "To Do": [child], "In Progress": [other] };
  expect(rollbackColumns(previous, { "To Do": [child, other], "In Progress": [] }, null)).toEqual(
    previous,
  );
});

test("merge under an Epic keeps hidden Cards", () => {
  expect(
    mergeValue(
      { "To Do": [], "In Progress": [child] },
      { "To Do": [child, other], "In Progress": [] },
      "DEMO-1",
    ),
  ).toEqual({
    "To Do": [other],
    "In Progress": [child],
  });
});

test("stamp Epic links children that jira-cli --raw dropped", () => {
  const orphan: Card = { key: "SQLJIRA-2", summary: "Work story" };
  expect(
    stampEpic(
      { Proposed: [orphan] },
      { Proposed: [{ key: "SQLJIRA-2", summary: "Work story" }] },
      "SQLJIRA-1",
    ),
  ).toEqual({
    Proposed: [{ key: "SQLJIRA-2", summary: "Work story", epic: "SQLJIRA-1" }],
  });
});

test("stamp Epic adds a child that was missing from Scope", () => {
  expect(
    stampEpic(
      { Proposed: [] },
      { "In Development": [{ key: "SQLJIRA-9", summary: "New" }] },
      "SQLJIRA-1",
    ),
  ).toEqual({
    Proposed: [],
    "In Development": [
      { key: "SQLJIRA-9", summary: "New", epic: "SQLJIRA-1" },
    ],
  });
});

const labeled: Card = {
  key: "DEMO-3",
  summary: "Drag a Card to Move",
  epic: "DEMO-1",
  labels: ["kanban"],
};
const epic: Epic = { key: "DEMO-1", summary: "Ship a local kanban" };
const otherEpic: Epic = { key: "DEMO-9", summary: "Other" };

test("Search hides Cards that do not match", () => {
  expect(
    filterValue(
      { "To Do": [child], "In Progress": [labeled] },
      null,
      "kanban",
    ),
  ).toEqual({ "In Progress": [labeled] });
});

test("Search under an Epic keeps only matching children", () => {
  expect(
    filterValue(
      { "To Do": [child, other], "In Progress": [labeled] },
      "DEMO-1",
      "drag",
    ),
  ).toEqual({ "In Progress": [labeled] });
});

test("merge under Search keeps hidden Cards", () => {
  expect(
    mergeValue(
      { "In Progress": [labeled] },
      { "To Do": [child], "In Progress": [labeled] },
      null,
      "kanban",
    ),
  ).toEqual({
    "To Do": [child],
    "In Progress": [labeled],
  });
});

test("Search keeps an Epic that matches or has a matching Card", () => {
  expect(filterEpics([epic, otherEpic], [child, labeled], "kanban")).toEqual([
    epic,
  ]);
  expect(filterEpics([epic, otherEpic], [child, labeled], "other")).toEqual([
    otherEpic,
  ]);
  expect(filterEpics([epic, otherEpic], [child, labeled], "")).toEqual([
    epic,
    otherEpic,
  ]);
});

test("left pane hides In Progress, Completed, and Cancelled Epics", () => {
  const open: Epic = { key: "DEMO-1", summary: "Open", status: "To Do" };
  const progress: Epic = { key: "DEMO-8", summary: "Busy", status: "In Progress" };
  const done: Epic = { key: "DEMO-9", summary: "Finished", status: "Completed" };
  const cancelled: Epic = { key: "DEMO-10", summary: "Dropped", status: "Cancelled" };
  const unknown: Epic = { key: "DEMO-11", summary: "Parent only" };
  expect(filterEpics([open, progress, done, cancelled, unknown], [], "")).toEqual([
    open,
    unknown,
  ]);
});
