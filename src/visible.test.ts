import { expect, test } from "vitest";

import type { Card } from "./board.ts";
import { mergeValue, rollbackColumns } from "./visible.ts";

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
