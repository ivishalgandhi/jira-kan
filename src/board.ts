export type Card = {
  key: string;
  summary: string;
  priority?: string;
  assignee?: string;
  dueDate?: string;
  type?: string;
  parent?: string;
};

export type Column = {
  id: string;
  title: string;
  cards: Card[];
};

export type Board = {
  columns: Column[];
  epics: Card[];
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

function parentKey(fields: RawIssue["fields"]): string | undefined {
  return typeof fields?.parent?.key === "string" ? fields.parent.key : undefined;
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
  const parent = parentKey(issue.fields);
  return {
    key,
    summary,
    ...(priority ? { priority } : {}),
    ...(assignee ? { assignee } : {}),
    ...(dueDate ? { dueDate } : {}),
    ...(type ? { type } : {}),
    ...(parent ? { parent } : {}),
  };
}

export function issuesToBoard(raw: unknown): Board {
  if (!Array.isArray(raw)) {
    throw new Error("jira-cli --raw payload must be a JSON array");
  }

  const columns: Column[] = [];
  const byStatus = new Map<string, Column>();
  const epics: Card[] = [];
  const epicByKey = new Map<string, Card>();

  function rememberEpic(card: Card) {
    const existing = epicByKey.get(card.key);
    if (!existing) {
      epicByKey.set(card.key, card);
      epics.push(card);
      return;
    }
    if (!existing.summary && card.summary) {
      Object.assign(existing, card);
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
      rememberEpic(card);
      continue;
    }

    if (card.parent) {
      rememberEpic({ key: card.parent, summary: card.parent });
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
