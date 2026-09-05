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

test("bindListen rejects when the port is taken", async () => {
  const { createServer } = await import("node:http");
  const { bindListen } = await import("./listen.ts");
  const held = createServer();
  await bindListen(held, "127.0.0.1", 0);
  const addr = held.address();
  if (!addr || typeof addr === "string") throw new Error("no port");
  const other = createServer();
  await expect(bindListen(other, "127.0.0.1", addr.port)).rejects.toMatchObject({
    code: "EADDRINUSE",
  });
  held.close();
  other.close();
});

