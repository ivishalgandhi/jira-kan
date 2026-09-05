import { fstatSync } from "node:fs";

export type StdinStat = {
  isFile: boolean;
  isFIFO: boolean;
};

export async function readOptionalStdin(
  stdin: AsyncIterable<unknown> & { isTTY?: boolean } = process.stdin,
  stat: StdinStat = stdinStat(),
): Promise<unknown | null> {
  if (stdin.isTTY || (!stat.isFile && !stat.isFIFO)) return null;
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) chunks.push(Buffer.from(chunk as Uint8Array));
  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? JSON.parse(text) : null;
}

function stdinStat(): StdinStat {
  try {
    const info = fstatSync(0);
    return { isFile: info.isFile(), isFIFO: info.isFIFO() };
  } catch {
    return { isFile: false, isFIFO: false };
  }
}
