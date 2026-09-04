import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ME } from "./store.ts";

export function writeJiraConfig(dir: string, server: string): string {
  mkdirSync(dir, { recursive: true });
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
