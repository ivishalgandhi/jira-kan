# pipe-kan

A local Kanban view of Jira issues, fed by jira-cli. The first release changes Jira only by running jira-cli.

## Language

**Issue**:
A Jira work item identified by its key.
_Avoid_: ticket, item, task (when meaning the Jira record)

**Card**:
The Board representation of one Issue. It shows the Issue key and summary, and when the payload has them, priority, assignee, due date, labels, and age since created.
_Avoid_: tile, chip

**Column**:
A Board lane named by an Issue status present in the payload. Statuses with no Issues are omitted.
_Avoid_: lane, list

**Board**:
The Kanban view of a set of Issues, grouped into Columns.
_Avoid_: dashboard, Jira board (that is Atlassian's saved board)

**Project**:
A Jira project identified by its key. The Board shows one Project at a time.
_Avoid_: repo, codebase (those are this tool)

**Epic**:
An Issue of type Epic. It lives in the left pane, listed from `jira issue list -tEpic` (not only Scope), grouped by status, and can carry labels, assignee, and priority. The row number is every non-Epic child, including those outside Scope; children appear on the Board only when Scope includes them, and clicking the Epic shows only those children.
_Avoid_: parent (jira-cli's `-P` flag name)

**Favourite**:
A user-curated Epic in a collapsible group between All stories and Presets. Clicking it still shows only its children. Local only; not Scope, Filter, Hide, or Preset.
_Avoid_: pin, bookmark, star (the control)

**Folder**:
A named, one-level group of Favourites in the left pane. Local only; not Scope, Filter, Hide, Preset, or an Epic status group.
_Avoid_: directory, collection, project (when meaning this)

**Scope**:
The jira-cli list invocation that fills the Board. The default Scope is the current jira-cli Project.
_Avoid_: filter, view, query (when meaning this)

**Search**:
Typing in the header that hides Epics and Cards that do not match. An Epic matches on key, summary, and labels, or when a child matches. It does not change Scope or Refresh Jira.
_Avoid_: filter, query (when meaning this)

**Filter**:
Persisted Board controls that hide Cards without changing Scope or Refresh. An Epic row stays when the Epic's own field matches or a remaining child matches; it hides when neither does.
_Avoid_: Search, Scope, Sort, Preset, query

**Sort**:
Persisted order of Cards inside each Column.
_Avoid_: Filter, Search, Preset, order-by (jira-cli's list flag)

**Hide**:
User action that removes a Column from the Board until they put it back. Distinct from collapse (thin the Column) and from omitting a status that has no Issues.
_Avoid_: collapse, remove (when meaning this)

**Preset**:
A named, local snapshot of Filter, Sort, and Hide. Listed in a collapsible group after Favourites. Apply copies it into last-used chrome; Save names the current last-used chrome. Not Scope, Search, Favourite, or Open.
_Avoid_: view, layout, saved filter

**Pipe**:
stdin carrying `jira issue list --raw` JSON into the app.
_Avoid_: stream, feed

**Refresh**:
Re-running jira-cli from the UI to replace the Issues on the Board.
_Avoid_: sync, reload (when meaning that action)

**Move**:
Changing an Issue's status by running `jira issue move`. A Card is Moved by dropping it on a Column; an Epic is Moved from its row menu. The only Write-back in the first release. Dropping a Card on the same Column, or picking the Epic's current status, does nothing.
_Avoid_: transition, drag (the gesture), update, file (putting a Favourite in a Folder)

**Open**:
Showing an Issue's details and Jira URL in the side pane. A Card Opens on click; an Epic Opens from its row menu. `jira open KEY` still resolves that URL. Same-origin pages embed; remote Jira is a link because it refuses frames.
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
