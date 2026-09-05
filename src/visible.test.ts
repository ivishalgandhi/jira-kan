import { expect, test } from "vitest";

import type { Card, Epic } from "./board.ts";
import {
  addFolder,
  favouriteGroup,
  filterEpics,
  filterValue,
  groupEpics,
  listedFavourites,
  mergeValue,
  moveFavourite,
  removeFolder,
  renameFolder,
  rollbackColumns,
  stampEpic,
  toggleFavourite,
} from "./visible.ts";

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

test("left pane keeps In Progress, Completed, and Cancelled Epics", () => {
  const open: Epic = { key: "DEMO-1", summary: "Open", status: "To Do" };
  const progress: Epic = { key: "DEMO-8", summary: "Busy", status: "In Progress" };
  const done: Epic = { key: "DEMO-9", summary: "Finished", status: "Completed" };
  const cancelled: Epic = { key: "DEMO-10", summary: "Dropped", status: "Cancelled" };
  const unknown: Epic = { key: "DEMO-11", summary: "Parent only" };
  expect(filterEpics([open, progress, done, cancelled, unknown], [], "")).toEqual([
    open,
    progress,
    done,
    cancelled,
    unknown,
  ]);
});

test("Epics group by first-seen status", () => {
  const open: Epic = { key: "DEMO-1", summary: "Open", status: "To Do" };
  const progress: Epic = { key: "DEMO-8", summary: "Busy", status: "In Progress" };
  const done: Epic = { key: "DEMO-9", summary: "Finished", status: "Completed" };
  const alsoOpen: Epic = { key: "DEMO-12", summary: "More", status: "To Do" };
  const unknown: Epic = { key: "DEMO-11", summary: "Parent only" };
  expect(groupEpics([open, progress, done, alsoOpen, unknown])).toEqual([
    { status: "To Do", epics: [open, alsoOpen] },
    { status: "In Progress", epics: [progress] },
    { status: "Completed", epics: [done] },
    { status: "", epics: [unknown] },
  ]);
});

const high: Card = {
  key: "DEMO-2",
  summary: "high work",
  epic: "DEMO-1",
  priority: "High",
  assignee: "Person A",
  created: "2026-08-01T00:00:00.000Z",
  dueDate: "Sep 20, 2026",
};
const medium: Card = {
  key: "DEMO-3",
  summary: "medium work",
  epic: "DEMO-1",
  priority: "P3",
  created: "2026-07-01T00:00:00.000Z",
  dueDate: "Sep 10, 2026",
};
const critical: Card = {
  key: "DEMO-4",
  summary: "critical work",
  priority: "Critical",
  assignee: "Person B",
  created: "2026-09-01T00:00:00.000Z",
};
const columns = {
  "To Do": [high, medium],
  "In Progress": [critical],
};

test("Filter by priority keeps matching Cards", () => {
  expect(
    filterValue(columns, null, "", { filter: { priorities: ["High", "Critical"] } }),
  ).toEqual({
    "To Do": [high],
    "In Progress": [critical],
  });
});

test("Filter Unassigned keeps Cards with no person", () => {
  expect(
    filterValue(columns, null, "", { filter: { assignees: ["Unassigned"] } }),
  ).toEqual({ "To Do": [medium] });
});

test("Filter ANDs with Search and the selected Epic", () => {
  expect(
    filterValue(columns, "DEMO-1", "high", { filter: { priorities: ["High"] } }),
  ).toEqual({ "To Do": [high] });
});

test("Filter omits a Column with no remaining Cards", () => {
  expect(
    filterValue(columns, null, "", { filter: { assignees: ["Person B"] } }),
  ).toEqual({ "In Progress": [critical] });
});

test("Sort by priority uses the shared rank and missing last", () => {
  const missing: Card = { key: "DEMO-9", summary: "none" };
  const low: Card = { key: "DEMO-8", summary: "low", priority: "Low" };
  expect(
    filterValue(
      { "To Do": [medium, missing, critical, low, high] },
      null,
      "",
      { sort: "priority" },
    )["To Do"]?.map((card) => card.key),
  ).toEqual(["DEMO-4", "DEMO-2", "DEMO-3", "DEMO-8", "DEMO-9"]);
});

test("Sort by age is oldest first and due is soonest first", () => {
  expect(
    filterValue(columns, null, "", { sort: "age" })["To Do"]?.map((card) => card.key),
  ).toEqual(["DEMO-3", "DEMO-2"]);
  expect(
    filterValue(columns, null, "", { sort: "due" })["To Do"]?.map((card) => card.key),
  ).toEqual(["DEMO-3", "DEMO-2"]);
});

test("Sort by key is A-Z and missing Sort field is last", () => {
  expect(
    filterValue(columns, null, "", { sort: "key" })["To Do"]?.map((card) => card.key),
  ).toEqual(["DEMO-2", "DEMO-3"]);
  expect(
    filterValue(
      { "To Do": [high, critical] },
      null,
      "",
      { sort: "due" },
    )["To Do"]?.map((card) => card.key),
  ).toEqual(["DEMO-2", "DEMO-4"]);
});

test("Hide omits a Column while Cards remain in the input", () => {
  const input = { "To Do": [high], "In Progress": [critical] };
  expect(filterValue(input, null, "", { hide: ["In Progress"] })).toEqual({
    "To Do": [high],
  });
  expect(input["In Progress"]).toEqual([critical]);
});

test("a Hidden Column is not a drop target", () => {
  expect(
    Object.keys(filterValue(columns, null, "", { hide: ["To Do"] })),
  ).toEqual(["In Progress"]);
});

test("merge under Filter keeps hidden Cards", () => {
  expect(
    mergeValue(
      { "In Progress": [critical] },
      columns,
      null,
      "",
      { filter: { assignees: ["Person B"] } },
    ),
  ).toEqual(columns);
});

test("merge under Hide keeps the Hidden Column", () => {
  expect(
    mergeValue(
      { "To Do": [high, medium] },
      columns,
      null,
      "",
      { hide: ["In Progress"] },
    ),
  ).toEqual(columns);
});

test("Favourites order by priority rank then Issue key", () => {
  const p1: Epic = { key: "DEMO-8", summary: "Later", priority: "Highest" };
  const p1b: Epic = { key: "DEMO-2", summary: "First", priority: "P1" };
  const p3: Epic = { key: "DEMO-3", summary: "Mid", priority: "Medium" };
  const none: Epic = { key: "DEMO-9", summary: "None" };
  expect(
    favouriteGroup([p3, none, p1, p1b], ["DEMO-9", "DEMO-3", "DEMO-8", "DEMO-2"]).map(
      (epic) => epic.key,
    ),
  ).toEqual(["DEMO-2", "DEMO-8", "DEMO-3", "DEMO-9"]);
});

test("Favourites hide when empty and ignore stale keys", () => {
  const listed: Epic = { key: "DEMO-1", summary: "Ship", priority: "High" };
  expect(favouriteGroup([listed], [])).toEqual([]);
  expect(favouriteGroup([listed], ["DEMO-1", "DEMO-99"])).toEqual([listed]);
});

test("Search omits a Favourite that does not match", () => {
  const listed: Epic = { key: "DEMO-1", summary: "Ship a local kanban" };
  const otherFav: Epic = { key: "DEMO-9", summary: "Other" };
  expect(favouriteGroup([listed, otherFav], ["DEMO-1", "DEMO-9"], "ship")).toEqual([
    listed,
  ]);
});

test("Search keeps a Favourite that has a matching Card", () => {
  const listed: Epic = { key: "DEMO-1", summary: "Ship a local kanban" };
  const child: Card = { key: "DEMO-2", summary: "Parse jira-cli", epic: "DEMO-1" };
  expect(favouriteGroup([listed], ["DEMO-1"], "parse", [child])).toEqual([listed]);
});

test("Folders keep one home and unfile on delete", () => {
  let state = { keys: ["DEMO-1", "DEMO-2"], folders: [] as { name: string; keys: string[] }[] };
  const created = addFolder(state, "Now");
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  state = moveFavourite(created.state, "DEMO-1", "Now");
  expect(listedFavourites(
    [
      { key: "DEMO-1", summary: "Ship", priority: "High" },
      { key: "DEMO-2", summary: "Parse", priority: "Medium" },
    ],
    state,
  )).toEqual({
    unfiled: [{ key: "DEMO-2", summary: "Parse", priority: "Medium" }],
    folders: [
      {
        name: "Now",
        epics: [{ key: "DEMO-1", summary: "Ship", priority: "High" }],
      },
    ],
  });
  state = removeFolder(state, "Now");
  expect(state.folders).toEqual([]);
  expect(state.keys).toEqual(["DEMO-1", "DEMO-2"]);
});

test("Folder name collision is rejected and Search omits a miss", () => {
  const created = addFolder({ keys: ["DEMO-1"], folders: [] }, "Now");
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  expect(addFolder(created.state, "now").ok).toBe(false);
  expect(renameFolder(created.state, "Now", "NOW").ok).toBe(false);
  const empty = addFolder(created.state, "Later");
  expect(empty.ok).toBe(true);
  if (!empty.ok) return;
  const epics: Epic[] = [{ key: "DEMO-1", summary: "Ship" }];
  expect(listedFavourites(epics, empty.state, "later")).toEqual({
    unfiled: [],
    folders: [{ name: "Later", epics: [] }],
  });
  expect(listedFavourites(epics, empty.state, "missing")).toEqual({
    unfiled: [],
    folders: [],
  });
});

test("unfiled Favourites paint before Folders", () => {
  const created = addFolder({ keys: ["DEMO-2", "DEMO-1"], folders: [] }, "Alpha");
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  const state = moveFavourite(created.state, "DEMO-1", "Alpha");
  expect(
    listedFavourites(
      [
        { key: "DEMO-1", summary: "Ship", priority: "High" },
        { key: "DEMO-2", summary: "Parse", priority: "Low" },
      ],
      state,
    ).unfiled.map((epic) => epic.key),
  ).toEqual(["DEMO-2"]);
  expect(
    listedFavourites(
      [
        { key: "DEMO-1", summary: "Ship", priority: "High" },
        { key: "DEMO-2", summary: "Parse", priority: "Low" },
      ],
      state,
    ).folders.map((folder) => folder.name),
  ).toEqual(["Alpha"]);
});

test("toggleFavourite does not invent a Folder home", () => {
  expect(toggleFavourite({ keys: [], folders: [] }, "DEMO-1")).toEqual({
    keys: ["DEMO-1"],
    folders: [],
  });
  expect(
    toggleFavourite({ keys: ["DEMO-1"], folders: [{ name: "Now", keys: ["DEMO-1"] }] }, "DEMO-1"),
  ).toEqual({ keys: [], folders: [{ name: "Now", keys: [] }] });
});
