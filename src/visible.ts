import type { Card, Epic } from "./board.ts";

function ofEpic(card: Card, epic: string) {
  return card.epic === epic;
}

function needle(query: string) {
  return query.trim().toLowerCase();
}

function haystack(card: Card) {
  return [
    card.key,
    card.summary,
    card.assignee,
    card.priority,
    card.epic,
    ...(card.labels ?? []),
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n")
    .toLowerCase();
}

export function cardMatches(card: Card, query: string) {
  const q = needle(query);
  return !q || haystack(card).includes(q);
}

export function epicMatches(epic: Epic, query: string) {
  const q = needle(query);
  return !q || `${epic.key}\n${epic.summary}`.toLowerCase().includes(q);
}

function hidden(card: Card, epic: string | null, query: string) {
  if (epic && !ofEpic(card, epic)) return true;
  return !cardMatches(card, query);
}

export function filterValue(
  columns: Record<string, Card[]>,
  epic: string | null,
  query = "",
): Record<string, Card[]> {
  const next = Object.fromEntries(
    Object.entries(columns).map(([title, cards]) => [
      title,
      cards.filter((card) => !hidden(card, epic, query)),
    ]),
  );
  if (!needle(query)) return next;
  return Object.fromEntries(
    Object.entries(next).filter(([, cards]) => cards.length > 0),
  );
}

export function filterEpics(epics: Epic[], cards: Card[], query: string) {
  if (!needle(query)) return epics;
  return epics.filter(
    (epic) =>
      epicMatches(epic, query) ||
      cards.some((card) => card.epic === epic.key && cardMatches(card, query)),
  );
}

export function groupEpics(epics: Epic[]): { status: string; epics: Epic[] }[] {
  const groups = new Map<string, Epic[]>();
  const order: string[] = [];
  const none: Epic[] = [];
  for (const epic of epics) {
    const status = epic.status?.trim() ?? "";
    if (!status) {
      none.push(epic);
      continue;
    }
    const list = groups.get(status);
    if (!list) {
      groups.set(status, [epic]);
      order.push(status);
      continue;
    }
    list.push(epic);
  }
  return [
    ...order.map((status) => ({ status, epics: groups.get(status) ?? [] })),
    ...(none.length ? [{ status: "", epics: none }] : []),
  ];
}

export function mergeValue(
  next: Record<string, Card[]>,
  previous: Record<string, Card[]>,
  epic: string | null,
  query = "",
): Record<string, Card[]> {
  if (!epic && !needle(query)) return next;
  const hiddenCards = Object.fromEntries(
    Object.entries(previous).map(([title, cards]) => [
      title,
      cards.filter((card) => hidden(card, epic, query)),
    ]),
  );
  const titles = new Set([...Object.keys(hiddenCards), ...Object.keys(next)]);
  return Object.fromEntries(
    [...titles].map((title) => [
      title,
      [...(hiddenCards[title] ?? []), ...(next[title] ?? [])],
    ]),
  );
}

export function rollbackColumns(
  previousValue: Record<string, Card[]>,
  current: Record<string, Card[]>,
  epic: string | null,
  query = "",
) {
  return mergeValue(previousValue, current, epic, query);
}

export function stampEpic(
  columns: Record<string, Card[]>,
  children: Record<string, Card[]>,
  epic: string,
): Record<string, Card[]> {
  const childKeys = new Set(
    Object.values(children)
      .flat()
      .map((card) => card.key),
  );
  const titles = new Set([...Object.keys(columns), ...Object.keys(children)]);
  return Object.fromEntries(
    [...titles].map((title) => {
      const current = columns[title] ?? [];
      const incoming = children[title] ?? [];
      const have = new Set(current.map((card) => card.key));
      const stamped = current.map((card) =>
        childKeys.has(card.key) ? { ...card, epic: card.epic ?? epic } : card,
      );
      const added = incoming
        .filter((card) => !have.has(card.key))
        .map((card) => ({ ...card, epic: card.epic ?? epic }));
      return [title, [...stamped, ...added]];
    }),
  );
}
