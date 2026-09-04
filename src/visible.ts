import type { Card } from "./board.ts";

export function filterValue(
  columns: Record<string, Card[]>,
  epic: string | null,
): Record<string, Card[]> {
  if (!epic) return columns;
  return Object.fromEntries(
    Object.entries(columns).map(([title, cards]) => [
      title,
      cards.filter((card) => card.parent === epic),
    ]),
  );
}

export function mergeValue(
  next: Record<string, Card[]>,
  previous: Record<string, Card[]>,
  epic: string | null,
): Record<string, Card[]> {
  if (!epic) return next;
  const hidden = Object.fromEntries(
    Object.entries(previous).map(([title, cards]) => [
      title,
      cards.filter((card) => card.parent !== epic),
    ]),
  );
  const titles = new Set([...Object.keys(hidden), ...Object.keys(next)]);
  return Object.fromEntries(
    [...titles].map((title) => [
      title,
      [...(hidden[title] ?? []), ...(next[title] ?? [])],
    ]),
  );
}

export function rollbackColumns(
  previousValue: Record<string, Card[]>,
  current: Record<string, Card[]>,
  epic: string | null,
) {
  return mergeValue(previousValue, current, epic);
}
