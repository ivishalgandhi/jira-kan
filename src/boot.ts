import { createApp, type App } from "./app.ts";
import {
  createJiraCli,
  createStoreCli,
  resolveJiraBin,
  type Cli,
} from "./cli.ts";
import { IssueStore } from "./store.ts";

export type Boot = {
  app: App;
  store: IssueStore;
  kind: "jira" | "store";
};

export async function createBoardApp(opts: {
  raw: unknown;
  piped?: boolean;
  env?: NodeJS.ProcessEnv;
}): Promise<Boot> {
  const env = opts.env ?? process.env;
  const store = IssueStore.fromRaw(opts.raw);
  const bin = resolveJiraBin(env.JIRA_BIN ?? "jira", env.PATH ?? "");
  const cli: Cli = bin
    ? createJiraCli({
        bin,
        configPath: env.JIRA_CONFIG_FILE,
        token: env.JIRA_API_TOKEN,
      })
    : createStoreCli(store);
  const app = createApp({ store, cli });
  if (opts.piped) {
    app.hydrate(opts.raw);
  } else {
    const local = createStoreCli(store);
    app.hydrate(JSON.parse(await local.list(app.flags)), { fromStore: true });
  }
  return { app, store, kind: bin ? "jira" : "store" };
}

export async function refreshFromJira(
  app: App,
  kind: Boot["kind"],
  opts: { piped?: boolean } = {},
) {
  if (kind !== "jira" || opts.piped) return;
  await app.refresh();
}
