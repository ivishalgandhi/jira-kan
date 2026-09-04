# jira-kan

A local Kanban view of Jira issues, fed by jira-cli. The first release changes Jira only by running jira-cli.

## Language

**Issue**:
A Jira work item identified by its key.
_Avoid_: ticket, item, task (when meaning the Jira record)

**Card**:
The Board representation of one Issue. It shows the Issue key and summary, and when the payload has them, priority, assignee, and due date.
_Avoid_: tile, chip

**Column**:
A Board lane named by an Issue status present in the payload. Statuses with no Issues are hidden.
_Avoid_: lane, list

**Board**:
The Kanban view of a set of Issues, grouped into Columns.
_Avoid_: dashboard, Jira board (that is Atlassian's saved board)

**Project**:
A Jira project identified by its key. The Board shows one Project at a time.
_Avoid_: repo, codebase (those are this tool)

**Epic**:
An Issue of type Epic. It lives in the left pane. Its children appear on the Board as Cards when the Scope includes them. Clicking an Epic shows only its children.
_Avoid_: parent (jira-cli's `-P` flag name)

**Scope**:
The jira-cli list invocation that fills the Board. The default Scope is the current jira-cli Project.
_Avoid_: filter, view, query (when meaning this)

**Pipe**:
stdin carrying `jira issue list --raw` JSON into the app.
_Avoid_: stream, feed

**Refresh**:
Re-running jira-cli from the UI to replace the Issues on the Board.
_Avoid_: sync, reload (when meaning that action)

**Move**:
Changing an Issue's status from the Board by running `jira issue move`. The only Write-back in the first release. A drop on the same Column does nothing.
_Avoid_: transition, drag (the gesture), update

**Open**:
Showing an Issue's Jira URL in the side pane. `jira open KEY` still resolves that URL.
_Avoid_: view, browse (when meaning this)

**Write-back**:
Changing Jira from the Board, only by running jira-cli. Never a direct Jira API call from this app.
_Avoid_: sync, persist, save (when meaning a Jira mutation)

**Fixture**:
Checked-in fake `jira issue list --raw` JSON that seeds the Board and the Fake Jira when no Pipe is given.
_Avoid_: mock, stub, sample (when meaning this file)

**Fake Jira**:
A local HTTP stand-in for Jira's REST API so jira-cli can be tested without a real site.
_Avoid_: mock Jira, stub API
