import { expect, test } from "vitest";

import { frameSrc } from "./open.ts";

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
