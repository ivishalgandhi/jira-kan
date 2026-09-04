# Start from a Fixture and a Fake Jira

There is no work Jira in this repo and jira-cli is not required to paint the first Board. A Fixture of `jira issue list --raw` JSON is the first payload. A Fake Jira in the same localhost process speaks the search, myself, and transition routes jira-cli already calls, so Refresh and Move can run real `jira` against it. The app still never calls Jira REST for Write-back; it shells jira-cli, or a store adapter that applies the same rules when `jira` is missing.
