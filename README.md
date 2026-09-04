# jira-kan

Local shadcn Kanban for [jira-cli](https://github.com/ankitpokhrel/jira-cli) JSON.

```sh
bun install
bun run dev
```

Opens `http://127.0.0.1:5173` with the Fixture. Drop a Card on a Column to Move. Click a Card to Open.

```sh
cat fixtures/issues.json | bun run dev
```

Pipe is the first Board. Refresh runs the Scope flags through the store (or `jira` if you point it at the Fake Jira).

Fake Jira lives on the same origin (`/rest/api/2/search`, `/rest/api/2/myself`, `/rest/api/2/issue/{key}/transitions`). `fixtures/jira.config.yml` is written on boot for:

```sh
JIRA_CONFIG_FILE=./fixtures/jira.config.yml JIRA_API_TOKEN=fake jira issue list -a user@test.com -s~Done --raw
```
