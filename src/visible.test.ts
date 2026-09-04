import { expect, test } from "vitest";

import type { Card } from "./board.ts";
import { mergeValue, rollbackColumns, stampEpic } from "./visible.ts";

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
