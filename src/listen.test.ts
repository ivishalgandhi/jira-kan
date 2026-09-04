import { expect, test } from "vitest";

import { resolveListen } from "./listen.ts";

test("listen defaults to localhost", () => {
  expect(resolveListen({})).toEqual({ host: "127.0.0.1", port: 5173 });
});

test("listen honors HOST and PORT", () => {
  expect(resolveListen({ HOST: "0.0.0.0", PORT: "4000" })).toEqual({
    host: "0.0.0.0",
    port: 4000,
  });
});
