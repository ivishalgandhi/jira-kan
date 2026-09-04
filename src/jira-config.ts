import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { ME } from "./store.ts";

export function writeJiraConfig(dir: string, server: string): string {
  const path = join(dir, "jira.config.yml");
  writeFileSync(
    path,
    [
      "installation: Cloud",
      `server: ${server}`,
      `login: ${ME.emailAddress}`,
      "auth_type: basic",
      "project:",
      "  key: DEMO",
      "  type: classic",
      'board: ""',
      "",
    ].join("\n"),
  );
  return path;
}
