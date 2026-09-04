# jira-kan

A local Kanban view of Jira issues, fed by jira-cli. The first release does not change Jira.

## Language

**Issue**:
A Jira work item identified by its key.
_Avoid_: ticket, item, task (when meaning the Jira record)

**Card**:
The Board representation of one Issue.
_Avoid_: tile, chip

**Column**:
A Board lane named by an Issue status present in the payload.
_Avoid_: lane, list

**Board**:
The Kanban view of a set of Issues, grouped into Columns.
_Avoid_: dashboard, Jira board (that is Atlassian's saved board)

**Pipe**:
stdin carrying `jira issue list --raw` JSON into the app.
_Avoid_: stream, feed

**Refresh**:
Re-running jira-cli from the UI to replace the Issues on the Board.
_Avoid_: sync, reload (when meaning that action)

**Write-back**:
Changing Jira from the Board. Out of the first release.
_Avoid_: sync, persist, save (when meaning a Jira mutation)
