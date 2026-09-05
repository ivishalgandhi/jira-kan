import type { Card, Epic } from "./board.ts";

export type BoardFilter = {
  priorities?: string[];
  assignees?: string[];
};

export type BoardSort = "payload" | "priority" | "age" | "due" | "key";

export type VisibleOpts = {
  filter?: BoardFilter;
  sort?: BoardSort;
  hide?: string[];
};

export type FavouriteFolder = {
  name: string;
  keys: string[];
};

export type FavouriteState = {
  keys: string[];
  folders: FavouriteFolder[];
};

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

export function priorityRank(priority?: string): number {
  const value = (priority ?? "").trim().toLowerCase();
  if (!value) return 4;
  if (value === "p1" || value === "highest" || value === "critical") return 0;
  if (value === "p2" || value === "high") return 1;
  if (value === "p3" || value === "medium") return 2;
  return 3;
}

function hasFilter(filter?: BoardFilter) {
  return Boolean(filter?.priorities?.length || filter?.assignees?.length);
}

function cardMatchesFilter(card: Card, filter?: BoardFilter) {
  if (!hasFilter(filter)) return true;
  if (filter?.priorities?.length && !filter.priorities.includes(card.priority ?? "")) {
    return false;
  }
  if (filter?.assignees?.length) {
    return filter.assignees.includes(card.assignee ?? "Unassigned");
  }
  return true;
}

function omitted(card: Card, epic: string | null, query: string, filter?: BoardFilter) {
  if (epic && !ofEpic(card, epic)) return true;
  return !cardMatches(card, query) || !cardMatchesFilter(card, filter);
}

function parseTime(value?: string) {
  if (!value) return Number.NaN;
  return Date.parse(value);
}

function compareMissing(a: number, b: number) {
  const aMissing = Number.isNaN(a);
  const bMissing = Number.isNaN(b);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return a - b;
}

function byPriorityThenKey(
  a: { key: string; priority?: string },
  b: { key: string; priority?: string },
) {
  const rank = priorityRank(a.priority) - priorityRank(b.priority);
  return rank !== 0 ? rank : a.key.localeCompare(b.key);
}

function sortCards(cards: Card[], sort?: BoardSort) {
  if (!sort || sort === "payload") return cards;
  return [...cards].sort((a, b) => {
    let cmp = 0;
    if (sort === "priority") cmp = byPriorityThenKey(a, b);
    else if (sort === "age") cmp = compareMissing(parseTime(a.created), parseTime(b.created));
    else if (sort === "due") cmp = compareMissing(parseTime(a.dueDate), parseTime(b.dueDate));
    else if (sort === "key") cmp = a.key.localeCompare(b.key);
    return cmp !== 0 ? cmp : a.key.localeCompare(b.key);
  });
}

export function filterValue(
  columns: Record<string, Card[]>,
  epic: string | null,
  query = "",
  opts?: VisibleOpts,
): Record<string, Card[]> {
  const hide = new Set(opts?.hide ?? []);
  const next = Object.fromEntries(
    Object.entries(columns)
      .filter(([title]) => !hide.has(title))
      .map(([title, cards]) => [
        title,
        sortCards(
          cards.filter((card) => !omitted(card, epic, query, opts?.filter)),
          opts?.sort,
        ),
      ]),
  );
  if (!needle(query) && !hasFilter(opts?.filter)) return next;
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
  opts?: VisibleOpts,
): Record<string, Card[]> {
  const hide = opts?.hide ?? [];
  if (!epic && !needle(query) && !hasFilter(opts?.filter) && hide.length === 0) {
    return next;
  }
  const hiddenCards = Object.fromEntries(
    Object.entries(previous).map(([title, cards]) => [
      title,
      hide.includes(title)
        ? cards
        : cards.filter((card) => omitted(card, epic, query, opts?.filter)),
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
  opts?: VisibleOpts,
) {
  return mergeValue(previousValue, current, epic, query, opts);
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

function folderOf(name: string, folders: FavouriteFolder[]) {
  return folders.find((folder) => folder.name.toLowerCase() === name.trim().toLowerCase());
}

function favouriteVisible(epic: Epic, query: string, cards: Card[]) {
  return (
    epicMatches(epic, query) ||
    cards.some((card) => card.epic === epic.key && cardMatches(card, query))
  );
}

export function listedFavourites(
  epics: Epic[],
  state: FavouriteState,
  query = "",
  cards: Card[] = [],
): { unfiled: Epic[]; folders: { name: string; epics: Epic[] }[] } {
  const filed = new Set(state.folders.flatMap((folder) => folder.keys));
  const byKey = new Map(epics.map((epic) => [epic.key, epic]));
  const unfiled = state.keys
    .map((key) => byKey.get(key))
    .filter((epic): epic is Epic => !!epic && !filed.has(epic.key) && favouriteVisible(epic, query, cards))
    .sort(byPriorityThenKey);
  const folders = [...state.folders]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((folder) => ({
      name: folder.name,
      epics: folder.keys
        .map((key) => byKey.get(key))
        .filter((epic): epic is Epic => !!epic && favouriteVisible(epic, query, cards))
        .sort(byPriorityThenKey),
    }))
    .filter((folder) => !needle(query) || epicMatches({ key: "", summary: folder.name }, query) || folder.epics.length > 0);
  return { unfiled, folders };
}

export function favouriteGroup(epics: Epic[], keys: string[], query = "", cards: Card[] = []) {
  return listedFavourites(epics, { keys, folders: [] }, query, cards).unfiled;
}

export function toggleFavourite(state: FavouriteState, key: string): FavouriteState {
  if (state.keys.includes(key)) {
    return {
      keys: state.keys.filter((item) => item !== key),
      folders: state.folders.map((folder) => ({
        ...folder,
        keys: folder.keys.filter((item) => item !== key),
      })),
    };
  }
  return { ...state, keys: [...state.keys, key] };
}

export function addFolder(
  state: FavouriteState,
  name: string,
): { ok: true; state: FavouriteState } | { ok: false } {
  const trimmed = name.trim();
  if (!trimmed || folderOf(trimmed, state.folders)) return { ok: false };
  return { ok: true, state: { ...state, folders: [...state.folders, { name: trimmed, keys: [] }] } };
}

export function renameFolder(
  state: FavouriteState,
  from: string,
  to: string,
): { ok: true; state: FavouriteState } | { ok: false } {
  const trimmed = to.trim();
  const current = folderOf(from, state.folders);
  if (!trimmed || !current) return { ok: false };
  const clash = folderOf(trimmed, state.folders);
  if (clash && clash !== current) return { ok: false };
  if (clash === current) return { ok: false };
  return {
    ok: true,
    state: {
      ...state,
      folders: state.folders.map((folder) =>
        folder === current ? { ...folder, name: trimmed } : folder,
      ),
    },
  };
}

export function removeFolder(state: FavouriteState, name: string): FavouriteState {
  return {
    ...state,
    folders: state.folders.filter((folder) => folder.name.toLowerCase() !== name.trim().toLowerCase()),
  };
}

export function moveFavourite(
  state: FavouriteState,
  key: string,
  folder: string | null,
): FavouriteState {
  const keys = state.keys.includes(key) ? state.keys : [...state.keys, key];
  const folders = state.folders.map((item) => ({
    ...item,
    keys: item.keys.filter((itemKey) => itemKey !== key),
  }));
  if (folder) {
    const home = folderOf(folder, folders);
    if (home) home.keys.push(key);
  }
  return { keys, folders };
}
