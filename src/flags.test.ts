import { expect, test } from "vitest";

import { DEFAULT_FLAGS, flagsToJql } from "./flags.ts";

test("default Scope has no assignee and no Done hide", () => {
  expect(DEFAULT_FLAGS).toBe("");
  expect(flagsToJql("")).toBe('project="DEMO"');
});

test("Scope flags still add assignee and status", () => {
  expect(flagsToJql("-a user@test.com -s~Done")).toBe(
    'project="DEMO" AND assignee="user@test.com" AND status!="Done"',
  );
});
