import { expect, test } from "vitest";

import { flattenIssue, frameSrc } from "./open.ts";

test("same-origin Open embeds; remote Jira does not", () => {
  expect(frameSrc("/browse/DEMO-1", "http://127.0.0.1:5173")).toBe(
    "/browse/DEMO-1",
  );
  expect(
    frameSrc("http://127.0.0.1:5173/browse/DEMO-1", "http://127.0.0.1:5173"),
  ).toBe("http://127.0.0.1:5173/browse/DEMO-1");
  expect(
    frameSrc("https://jira.dell.com/browse/SQLJIRA-1", "http://127.0.0.1:5173"),
  ).toBeNull();
});

test("flattenIssue orders Card fields then remaining A-Z", () => {
  const fields = flattenIssue(
    {
      key: "DEMO-2",
      fields: {
        summary: "Parse JSON",
        description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "ADF text" }] }] },
        priority: { name: "High" },
        assignee: { displayName: "Person A" },
        duedate: "2026-09-15",
        labels: ["parser", "cli"],
        comment: { comments: [{ body: "skip" }] },
        changelog: { histories: [] },
        status: { name: "To Do" },
        customfield_10020: { name: "Sprint 1" },
        empty: "",
        schema: { type: "string", system: "summary" },
      },
    },
    "/browse/DEMO-2",
  );
  expect(fields.map((field) => field.label)).toEqual([
    "Key",
    "Summary",
    "Jira URL",
    "Priority",
    "Assignee",
    "Due date",
    "Labels",
    "Description",
    "Sprint 1",
    "status",
  ]);
  expect(fields.find((field) => field.label === "Description")?.value).toBe("ADF text");
  expect(fields.find((field) => field.label === "Labels")?.pills).toEqual(["parser", "cli"]);
  expect(fields.some((field) => /comment|changelog|schema|empty/i.test(field.label))).toBe(false);
});

test("flattenIssue extracts wiki text and skips empty custom fields", () => {
  const fields = flattenIssue(
    {
      key: "DEMO-3",
      fields: {
        summary: "Move",
        description: "<p>Wiki <b>body</b></p>",
        customfield_10001: null,
      },
    },
    "https://jira.example/browse/DEMO-3",
  );
  expect(fields.find((field) => field.label === "Description")?.value).toBe("Wiki body");
  expect(fields.find((field) => field.label === "Jira URL")?.value).toBe(
    "https://jira.example/browse/DEMO-3",
  );
  expect(fields.some((field) => field.label === "customfield_10001")).toBe(false);
});
