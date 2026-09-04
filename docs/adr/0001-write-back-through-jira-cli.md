# Write-back goes through jira-cli

The Board must change Jira in the first release. We already depend on jira-cli for listing, auth, and config. Talking to Jira's REST API ourselves would duplicate that and own tokens we do not want. Drop a Card on a Column runs `jira issue move KEY "Status"`. jira-cli already fetches legal transitions and rejects the rest. Intra-column rank is not a jira-cli write, so it is not persisted.
