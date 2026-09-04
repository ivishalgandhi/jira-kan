# jira-kan

Local Kanban for [jira-cli](https://github.com/ankitpokhrel/jira-cli). The first release changes Jira only by running jira-cli.

## Run

```sh
bun install
bun run dev
```

Opens `http://127.0.0.1:5173`. First paint is the Fixture. If `jira` is on PATH, the process then Refresh-es from your existing `jira init`. If not, Refresh and Move use the in-process store.

- Left: Epics. Center: Cards. Right: Open URL.
- Drop a Card on a Column to Move (`jira issue move`).
- Same-Column drop and column reorder do nothing.
- Theme is stored in `localStorage`.

LAN: `HOST=0.0.0.0 bun run dev`.

## Work Jira

Use your existing `jira init` config. Do not set `JIRA_CONFIG_FILE` to the Fixture file.

```sh
export JIRA_API_TOKEN=...   # only if jira-cli does not already have it
bun run dev
```

Change the Scope flags from `-a user@test.com -s~Done` to your assignee or project, then Refresh.

## Fake Jira

```sh
JIRA_CONFIG_FILE=./fixtures/jira.config.yml JIRA_API_TOKEN=fake bun run dev
```

`fixtures/jira.config.yml` is written on boot and points at this origin.

## Pipe

```sh
jira issue list -a you@work.com -s~Done --raw | bun run dev
```

Pipe is the first Board. Refresh and Move still go through `jira` when it is on PATH.

## Env

| Var | Default | Role |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | bind address |
| `PORT` | `5173` | bind port |
| `JIRA_BIN` | `jira` | binary name or path |
| `JIRA_CONFIG_FILE` | jira-cli default | set only for Fake Jira |
| `JIRA_API_TOKEN` | jira-cli default | Work Jira token if needed |

## Limits

- Write-back is `jira issue move` only. Intra-column rank is not persisted.
- Never a direct Jira REST Write-back.
- Work Jira needs `jira` on PATH and a token. This repo does not ship one.

## Check

```sh
bun test
bun run typecheck
```
