# Open details come from jira issue view

The list payload stays thin so the Board stays cheap. Open runs `jira issue view KEY --raw` (the raw GET `/issue/{key}` body) for description and custom fields, plus `jira open KEY` for the URL. Remote Jira still refuses frames (ADR-0004); the pane is fields and a link, with an iframe only for same-origin Fake Jira.
