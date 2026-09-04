import { issuesToBoard, type Board } from "./board.ts";
import { createStoreCli, type Cli } from "./cli.ts";
import { DEFAULT_FLAGS } from "./flags.ts";
import { IssueStore } from "./store.ts";

export type App = {
  flags: string;
  hydrate(raw: unknown): Board;
  refresh(flags?: string): Promise<Board>;
  children(epic: string): Promise<Board>;
  board(): Board;
  move(
    key: string,
    status: string,
  ): Promise<{ ok: boolean; noop?: boolean; error?: string; board: Board }>;
  open(key: string): Promise<string>;
};

export function createApp(opts: { store: IssueStore; cli?: Cli }): App {
  const cli = opts.cli ?? createStoreCli(opts.store);
  let flags = DEFAULT_FLAGS;
  let payload: unknown[] = [];

  const app: App = {
    get flags() {
      return flags;
    },
    board() {
      return issuesToBoard(payload);
    },
    hydrate(raw) {
      payload = Array.isArray(raw) ? raw : [];
      return app.board();
    },
    async refresh(next) {
      if (next !== undefined) flags = next;
      payload = JSON.parse(await cli.list(flags));
      return app.board();
    },
    async children(epic) {
      const board = issuesToBoard(JSON.parse(await cli.listEpic(epic)));
      for (const column of board.columns) {
        for (const card of column.cards) {
          if (!card.epic) card.epic = epic;
        }
      }
      return board;
    },
    async move(key, status) {
      const current = (payload as { key?: string; fields?: { status?: { name?: string } } }[])
        .find((issue) => issue.key === key)?.fields?.status?.name;
      if (current === status) {
        return { ok: true, noop: true, board: app.board() };
      }
      const result = await cli.move(key, status);
      if (!result.ok) {
        return { ok: false, error: result.error, board: app.board() };
      }
      await app.refresh();
      return { ok: true, board: app.board() };
    },
    async open(key) {
      return cli.open(key);
    },
  };
  return app;
}
