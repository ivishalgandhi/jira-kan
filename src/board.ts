export type Card = {
  key: string;
  summary: string;
};

export type Column = {
  id: string;
  title: string;
  cards: Card[];
};

export type Board = {
  columns: Column[];
};

export type RawIssue = {
  key?: unknown;
  fields?: {
    summary?: unknown;
    status?: { name?: unknown };
  };
};

export function issuesToBoard(raw: unknown): Board {
  if (!Array.isArray(raw)) {
    throw new Error("jira-cli --raw payload must be a JSON array");
  }

  const columns: Column[] = [];
  const byStatus = new Map<string, Column>();

  for (const issue of raw as RawIssue[]) {
    const key = typeof issue?.key === "string" ? issue.key : "";
    const summary =
      typeof issue?.fields?.summary === "string" ? issue.fields.summary : "";
    const status =
      typeof issue?.fields?.status?.name === "string"
        ? issue.fields.status.name
        : "";
    if (!key || !status) continue;

    let column = byStatus.get(status);
    if (!column) {
      column = { id: status, title: status, cards: [] };
      byStatus.set(status, column);
      columns.push(column);
    }
    column.cards.push({ key, summary });
  }

  return { columns };
}
