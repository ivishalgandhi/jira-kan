import { issuesToBoard, mergeEpics, type Board } from "./board.ts";
import { createStoreCli, type Cli } from "./cli.ts";
import { DEFAULT_FLAGS } from "./flags.ts";
import { flattenIssue, type OpenField } from "./open.ts";
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
  open(key: string): Promise<{ url: string; fields: OpenField[]; error?: string }>;
};

export function createApp(opts: { store: IssueStore; cli?: Cli }): App {
  const cli = opts.cli ?? createStoreCli(opts.store);
  let flags = DEFAULT_FLAGS;
  let payload: unknown[] = [];
  let epicsPayload: unknown[] = [];

  const app: App = {
    get flags() {
      return flags;
    },
    board() {
      const board = issuesToBoard(payload);
      return {
        columns: board.columns,
        epics: mergeEpics(issuesToBoard(epicsPayload).epics, board.epics),
      };
    },
    hydrate(raw) {
      payload = Array.isArray(raw) ? raw : [];
      epicsPayload = [];
      return app.board();
    },
    async refresh(next) {
      if (next !== undefined) flags = next;
      const [issues, epics] = await Promise.all([
        cli.list(flags),
        cli.listEpics(),
      ]);
      payload = JSON.parse(issues);
      epicsPayload = JSON.parse(epics);
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
      const urlP = cli.open(key);
      try {
        const [url, raw] = await Promise.all([urlP, cli.view(key)]);
        return { url, fields: flattenIssue(JSON.parse(raw), url) };
      } catch (err) {
        return {
          url: await urlP.catch(() => `/browse/${key}`),
          fields: [],
          error: err instanceof Error ? err.message : "jira issue view failed",
        };
      }
    },
  };
  return app;
}
