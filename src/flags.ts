export const DEFAULT_FLAGS = "";

function tokens(input: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input))) {
    out.push(match[1] ?? match[2] ?? match[3]);
  }
  return out;
}

function takeValue(list: string[], index: number, flag: string): [string, number] {
  const glued = list[index].slice(flag.length);
  if (glued) return [glued, index];
  return [list[index + 1] ?? "", index + 1];
}

export function flagsToJql(flags: string): string {
  const list = tokens(flags.trim() || DEFAULT_FLAGS);
  let assignee = "";
  let epic = "";
  let type = "";
  let raw = "";
  const statusEq: string[] = [];
  const statusNeq: string[] = [];

  for (let i = 0; i < list.length; i++) {
    const token = list[i];
    if (token === "--raw") continue;
    if (token.startsWith("-a")) {
      [assignee, i] = takeValue(list, i, "-a");
      continue;
    }
    if (token.startsWith("-P")) {
      [epic, i] = takeValue(list, i, "-P");
      continue;
    }
    if (token.startsWith("-t")) {
      [type, i] = takeValue(list, i, "-t");
      continue;
    }
    if (token.startsWith("-s")) {
      const [status, next] = takeValue(list, i, "-s");
      i = next;
      if (status.startsWith("~")) statusNeq.push(status.slice(1));
      else statusEq.push(status);
      continue;
    }
    if (token === "-q" || token === "--jql") {
      raw = list[++i] ?? "";
      continue;
    }
    if (token.startsWith("-q")) {
      raw = token.slice(2);
    }
  }

  if (raw) return raw;

  const clauses = ['project="DEMO"'];
  if (assignee) clauses.push(`assignee="${assignee}"`);
  if (type) clauses.push(`type="${type}"`);
  if (epic) clauses.push(`parent="${epic}"`);
  for (const status of statusEq) clauses.push(`status="${status}"`);
  for (const status of statusNeq) clauses.push(`status!="${status}"`);
  return clauses.join(" AND ");
}
