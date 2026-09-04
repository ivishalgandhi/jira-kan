import { spawn } from "node:child_process";

import { DEFAULT_FLAGS, flagsToJql } from "./flags.ts";
import type { IssueStore } from "./store.ts";

export type Cli = {
  list(flags: string): Promise<string>;
  move(key: string, status: string): Promise<{ ok: boolean; error?: string }>;
  open(key: string): Promise<string>;
};

export function createStoreCli(store: IssueStore): Cli {
  return {
    async list(flags) {
      const issues = store.list(flagsToJql(flags || DEFAULT_FLAGS));
      return JSON.stringify(issues, null, 2);
    },
    async move(key, status) {
      return store.move(key, status);
    },
    async open(key) {
      return `/browse/${key}`;
    },
  };
}

export function createJiraCli(opts: {
  bin?: string;
  configPath: string;
  token?: string;
}): Cli {
  const bin = opts.bin ?? "jira";

  function run(args: string[]) {
    return new Promise<{ code: number; stdout: string; stderr: string }>(
      (resolve, reject) => {
        const child = spawn(bin, args, {
          env: {
            ...process.env,
            JIRA_CONFIG_FILE: opts.configPath,
            JIRA_API_TOKEN: opts.token ?? "fake",
          },
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => {
          stdout += chunk;
        });
        child.stderr.on("data", (chunk) => {
          stderr += chunk;
        });
        child.on("error", reject);
        child.on("close", (code) =>
          resolve({ code: code ?? 1, stdout, stderr }),
        );
      },
    );
  }

  return {
    async list(flags) {
      const extra = (flags || DEFAULT_FLAGS).split(/\s+/).filter(Boolean);
      const result = await run(["issue", "list", ...extra, "--raw"]);
      if (result.code !== 0) {
        throw new Error(result.stderr || result.stdout || "jira issue list failed");
      }
      return result.stdout;
    },
    async move(key, status) {
      const result = await run(["issue", "move", key, status]);
      if (result.code !== 0) {
        return {
          ok: false,
          error: (result.stderr || result.stdout).trim(),
        };
      }
      return { ok: true };
    },
    async open(key) {
      const result = await run(["open", key, "--no-browser"]);
      return result.stdout.trim().split("\n").pop() ?? `/browse/${key}`;
    },
  };
}
