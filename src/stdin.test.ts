import { Readable } from "node:stream";
import { expect, test } from "vitest";

import { readOptionalStdin } from "./stdin.ts";

function hanging(isTTY: boolean) {
  return {
    isTTY,
    async *[Symbol.asyncIterator]() {
      throw new Error("should not read stdin");
    },
  };
}

test("a TTY is not a Pipe", async () => {
  expect(await readOptionalStdin(hanging(true), { isFile: false, isFIFO: false })).toBeNull();
});

test("a console that is not a TTY is not a Pipe", async () => {
  expect(await readOptionalStdin(hanging(false), { isFile: false, isFIFO: false })).toBeNull();
});

test("a redirected file is a Pipe", async () => {
  const stdin = Readable.from([
    Buffer.from('[{"key":"WORK-1","fields":{"summary":"piped","status":{"name":"To Do"}}}]'),
  ]);
  expect(await readOptionalStdin(stdin, { isFile: true, isFIFO: false })).toEqual([
    { key: "WORK-1", fields: { summary: "piped", status: { name: "To Do" } } },
  ]);
});

test("an empty FIFO is not a Pipe", async () => {
  expect(await readOptionalStdin(Readable.from([]), { isFile: false, isFIFO: true })).toBeNull();
});

test("a FIFO with Issues is a Pipe", async () => {
  const stdin = Readable.from([
    Buffer.from('[{"key":"WORK-1","fields":{"summary":"piped","status":{"name":"To Do"}}}]'),
  ]);
  expect(await readOptionalStdin(stdin, { isFile: false, isFIFO: true })).toEqual([
    { key: "WORK-1", fields: { summary: "piped", status: { name: "To Do" } } },
  ]);
});

