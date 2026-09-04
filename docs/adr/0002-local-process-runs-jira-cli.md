# Local process runs jira-cli

The Board is a browser UI. A browser cannot exec `jira`, and Write-back is a Jira mutation, so a local process must own those calls. A tiny localhost server serves the Board and shells `jira` for Refresh, Move, and Open. Electron would wrap the same idea in a heavier runtime. A hosted app would need its own auth. Pipe still works: stdin JSON is the first Board load.
