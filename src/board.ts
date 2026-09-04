export type Epic = {
  key: string;
  summary: string;
  priority?: string;
  assignee?: string;
  dueDate?: string;
};

export type Card = {
  key: string;
  summary: string;
  priority?: string;
  assignee?: string;
  dueDate?: string;
  type?: string;
  epic?: string;
  labels?: string[];
};

export type Column = {
  id: string;
  title: string;
  cards: Card[];
};

export type Board = {
  columns: Column[];
  epics: Epic[];
};

export type RawIssue = {
  key?: unknown;
  fields?: {
    summary?: unknown;
    status?: { name?: unknown };
    priority?: { name?: unknown };
    assignee?: { displayName?: unknown };
    duedate?: unknown;
    issuetype?: { name?: unknown };
    issueType?: { name?: unknown };
    parent?: { key?: unknown };
    labels?: unknown;
  };
};

function formatDueDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const day = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = day
    ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function issueType(fields: RawIssue["fields"]): string | undefined {
  const name = fields?.issuetype?.name ?? fields?.issueType?.name;
  return typeof name === "string" ? name : undefined;
}

function epicKey(fields: RawIssue["fields"]): string | undefined {
  return typeof fields?.parent?.key === "string" ? fields.parent.key : undefined;
}

function issueLabels(fields: RawIssue["fields"]): string[] | undefined {
  const raw = fields?.labels;
  if (!Array.isArray(raw)) return undefined;
  const labels = raw.filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );
  return labels.length > 0 ? labels : undefined;
}

function toEpic(face: {
  key: string;
  summary: string;
  priority?: string;
  assignee?: string;
  dueDate?: string;
}): Epic {
  return {
    key: face.key,
    summary: face.summary,
    ...(face.priority ? { priority: face.priority } : {}),
    ...(face.assignee ? { assignee: face.assignee } : {}),
    ...(face.dueDate ? { dueDate: face.dueDate } : {}),
  };
}

function toCard(issue: RawIssue, key: string): Card {
  const summary =
    typeof issue.fields?.summary === "string" ? issue.fields.summary : "";
  const priority =
    typeof issue.fields?.priority?.name === "string"
      ? issue.fields.priority.name
      : undefined;
  const assignee =
    typeof issue.fields?.assignee?.displayName === "string"
      ? issue.fields.assignee.displayName
      : undefined;
  const dueDate = formatDueDate(issue.fields?.duedate);
  const type = issueType(issue.fields);
  const epic = epicKey(issue.fields);
  const labels = issueLabels(issue.fields);
  return {
    key,
    summary,
    ...(priority ? { priority } : {}),
    ...(assignee ? { assignee } : {}),
    ...(dueDate ? { dueDate } : {}),
    ...(type ? { type } : {}),
    ...(epic ? { epic } : {}),
    ...(labels ? { labels } : {}),
  };
}

export function issuesToBoard(raw: unknown): Board {
  if (!Array.isArray(raw)) {
    throw new Error("jira-cli --raw payload must be a JSON array");
  }

  const columns: Column[] = [];
  const byStatus = new Map<string, Column>();
  const epics: Epic[] = [];
  const epicByKey = new Map<string, Epic>();

  function rememberEpic(epic: Epic) {
    const existing = epicByKey.get(epic.key);
    if (!existing) {
      epicByKey.set(epic.key, epic);
      epics.push(epic);
      return;
    }
    if (!existing.summary && epic.summary) {
      Object.assign(existing, epic);
    }
  }

  for (const issue of raw as RawIssue[]) {
    const key = typeof issue?.key === "string" ? issue.key : "";
    const status =
      typeof issue?.fields?.status?.name === "string"
        ? issue.fields.status.name
        : "";
    if (!key || !status) continue;

    const card = toCard(issue, key);
    if ((card.type ?? "").toLowerCase() === "epic") {
      rememberEpic(toEpic(card));
      continue;
    }

    if (card.epic) {
      rememberEpic({ key: card.epic, summary: card.epic });
    }

    let column = byStatus.get(status);
    if (!column) {
      column = { id: status, title: status, cards: [] };
      byStatus.set(status, column);
      columns.push(column);
    }
    column.cards.push(card);
  }

  return { columns, epics };
}

export function mergeEpics(listed: Epic[], fromBoard: Epic[]): Epic[] {
  const byKey = new Map<string, Epic>();
  for (const epic of listed) byKey.set(epic.key, { ...epic });
  for (const epic of fromBoard) {
    const existing = byKey.get(epic.key);
    if (!existing) {
      byKey.set(epic.key, { ...epic });
      continue;
    }
    if (!existing.summary && epic.summary) Object.assign(existing, epic);
  }
  return [...byKey.values()];
}
