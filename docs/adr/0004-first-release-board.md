# First-release Board layout

Epics are not Cards. They live in the left pane. Clicking a Card Opens its Jira URL in the right pane; `jira open` still resolves that URL. The process binds `127.0.0.1:5173`. `HOST=0.0.0.0` is the LAN override. Fake Jira always advertises `http://127.0.0.1:${port}` so jira-cli can reach it.
