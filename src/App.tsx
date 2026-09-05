import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ChevronDownIcon,
  GripVerticalIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
  XIcon,
} from "lucide-react";

import { cardAge, type Board, type Card, type Column, type Epic } from "./board.ts";
import { frameSrc } from "./open.ts";
import { cardMatches, filterEpics, filterValue, groupEpics, mergeValue, rollbackColumns, stampEpic } from "./visible.ts";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card as UiCard, CardContent, CardHeader } from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
  type KanbanCommitMeta,
} from "~/components/ui/kanban";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { cn } from "~/lib/utils";
import { useDefaultLayout } from "react-resizable-panels";

const COLLAPSED_KEY = "collapsed-columns";
const COLLAPSED_EPIC_STATUS_KEY = "collapsed-epic-statuses";
const DEFAULT_COLLAPSED_EPIC_STATUS = [
  "In Progress",
  "Completed",
  "Cancelled",
  "Canceled",
];

function readCollapsed(key = COLLAPSED_KEY, fallback: string[] = []): Set<string> {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return new Set(fallback);
    const raw = JSON.parse(stored);
    return new Set(
      Array.isArray(raw) ? raw.filter((item) => typeof item === "string") : fallback,
    );
  } catch {
    return new Set(fallback);
  }
}

function writeCollapsed(next: Set<string>, key = COLLAPSED_KEY) {
  localStorage.setItem(key, JSON.stringify([...next]));
}

function hasStatus(collapsed: Set<string>, status: string) {
  const needle = status.toLowerCase();
  return [...collapsed].some((item) => item.toLowerCase() === needle);
}

type BoardPayload = Board & { flags?: string };
type Theme = "light" | "dark";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  return res.json() as Promise<T>;
}

function toValue(columns: Column[]): Record<string, Card[]> {
  return Object.fromEntries(columns.map((column) => [column.title, column.cards]));
}

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}

function priorityVariant(priority?: string) {
  const value = (priority ?? "").toLowerCase();
  if (value === "high" || value === "highest" || value === "critical") {
    return "destructive-light" as const;
  }
  if (value === "medium") return "primary-light" as const;
  return "warning-light" as const;
}

function IssueCard({
  card,
  asHandle,
  isOverlay,
  disabled,
  onOpen,
}: {
  card: Card;
  asHandle?: boolean;
  isOverlay?: boolean;
  disabled?: boolean;
  onOpen?: () => void;
}) {
  const age = cardAge(card.created);
  const body = (
    <UiCard className="gap-3 py-3 shadow-sm">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground text-xs font-medium tabular-nums">
            {card.key}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            {card.priority ? (
              <Badge
                variant={priorityVariant(card.priority)}
                className="pointer-events-none h-5 rounded-full px-2 text-xs capitalize"
              >
                {card.priority}
              </Badge>
            ) : null}
            {age ? (
              <span className="text-muted-foreground text-xs font-medium tabular-nums">
                {age}
              </span>
            ) : null}
          </div>
        </div>
        <p className="text-sm leading-5 font-medium text-pretty">{card.summary}</p>
        {card.labels?.length ? (
          <div className="flex flex-wrap gap-1">
            {card.labels.map((label) => (
              <Badge
                key={label}
                variant="primary-light"
                className="pointer-events-none h-5 rounded-full px-2 text-xs"
              >
                {label}
              </Badge>
            ))}
          </div>
        ) : null}
        <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            {card.assignee ? (
              <>
                <Avatar className="size-5 text-[10px]">
                  <AvatarFallback>{card.assignee.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{card.assignee}</span>
              </>
            ) : null}
          </div>
          {card.dueDate ? (
            <time className="shrink-0 whitespace-nowrap tabular-nums">
              {card.dueDate}
            </time>
          ) : null}
        </div>
      </CardContent>
    </UiCard>
  );

  return (
    <KanbanItem value={card.key} disabled={disabled}>
      {asHandle && !isOverlay ? (
        <KanbanItemHandle onClick={onOpen}>{body}</KanbanItemHandle>
      ) : (
        body
      )}
    </KanbanItem>
  );
}

function StatusColumn({
  title,
  cards,
  isOverlay,
  disabled,
  onOpen,
}: {
  title: string;
  cards: Card[];
  isOverlay?: boolean;
  disabled?: boolean;
  onOpen?: (key: string) => void;
}) {
  const [open, setOpen] = useState(
    () => isOverlay || !readCollapsed().has(title),
  );
  function changeOpen(next: boolean) {
    setOpen(next);
    if (isOverlay) return;
    const collapsed = readCollapsed();
    if (next) collapsed.delete(title);
    else collapsed.add(title);
    writeCollapsed(collapsed);
  }
  return (
    <KanbanColumn value={title} className="h-full min-h-0">
      <Collapsible
        open={open}
        onOpenChange={changeOpen}
        className={cn("flex h-full min-h-0 flex-col", !open && "h-auto")}
      >
        <UiCard
          className={cn(
            "mb-2.5 flex flex-col",
            open ? "h-full min-h-0" : "h-auto",
          )}
        >
          <CardHeader className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 items-center gap-2.5 text-left"
              >
                <ChevronDownIcon
                  className={cn(
                    "size-4 shrink-0 transition-transform",
                    !open && "-rotate-90",
                  )}
                />
                <span className="truncate text-sm font-semibold">{title}</span>
                <Badge variant="outline">{cards.length}</Badge>
              </button>
            </CollapsibleTrigger>
            <KanbanColumnHandle className="opacity-100">
              <Button size="icon-xs" variant="ghost" tabIndex={-1} type="button">
                <GripVerticalIcon />
              </Button>
            </KanbanColumnHandle>
          </CardHeader>
          <CollapsibleContent className="min-h-0 flex-1 overflow-hidden">
            <CardContent className="h-full overflow-auto">
              <KanbanColumnContent
                value={title}
                className="flex flex-col gap-2.5 pb-1"
              >
                {cards.map((card) => (
                  <IssueCard
                    key={card.key}
                    card={card}
                    asHandle={!isOverlay}
                    isOverlay={isOverlay}
                    disabled={disabled}
                    onOpen={() => onOpen?.(card.key)}
                  />
                ))}
              </KanbanColumnContent>
            </CardContent>
          </CollapsibleContent>
        </UiCard>
      </Collapsible>
    </KanbanColumn>
  );
}

function EpicButton({
  epic,
  selected,
  count,
  onSelect,
}: {
  epic: Epic;
  selected: boolean;
  count: number;
  onSelect: (key: string | null) => void;
}) {
  return (
    <button
      type="button"
      className={`rounded-md px-3 py-2 text-left ${
        selected ? "bg-accent text-accent-foreground" : "hover:bg-muted"
      }`}
      onClick={() => void onSelect(epic.key)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tabular-nums">{epic.key}</span>
        <Badge variant="outline">{count}</Badge>
      </div>
      <span className="mt-1 line-clamp-2 text-sm">{epic.summary}</span>
    </button>
  );
}

function EpicStatusGroup({
  status,
  epics,
  selectedEpic,
  childCount,
  onSelect,
}: {
  status: string;
  epics: Epic[];
  selectedEpic: string | null;
  childCount: (key: string) => number;
  onSelect: (key: string | null) => void;
}) {
  const [open, setOpen] = useState(
    () => !hasStatus(readCollapsed(COLLAPSED_EPIC_STATUS_KEY, DEFAULT_COLLAPSED_EPIC_STATUS), status),
  );
  function changeOpen(next: boolean) {
    setOpen(next);
    const collapsed = readCollapsed(COLLAPSED_EPIC_STATUS_KEY, DEFAULT_COLLAPSED_EPIC_STATUS);
    if (next) {
      for (const item of [...collapsed]) {
        if (item.toLowerCase() === status.toLowerCase()) collapsed.delete(item);
      }
    } else {
      collapsed.add(status);
    }
    writeCollapsed(collapsed, COLLAPSED_EPIC_STATUS_KEY);
  }
  return (
    <Collapsible open={open} onOpenChange={changeOpen} className="flex flex-col">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="hover:bg-muted flex items-center gap-2 rounded-md px-3 py-2 text-left"
        >
          <ChevronDownIcon
            className={cn(
              "size-4 shrink-0 transition-transform",
              !open && "-rotate-90",
            )}
          />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{status}</span>
          <Badge variant="outline">{epics.length}</Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-1">
        {epics.map((epic) => (
          <EpicButton
            key={epic.key}
            epic={epic}
            selected={selectedEpic === epic.key}
            count={childCount(epic.key)}
            onSelect={onSelect}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function App() {
  const [columns, setColumns] = useState<Record<string, Card[]>>({});
  const [epics, setEpics] = useState<Epic[]>([]);
  const [selectedEpic, setSelectedEpic] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const [flags, setFlags] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<Theme>(readTheme);

  const visible = useMemo(
    () => filterValue(columns, selectedEpic, search),
    [columns, selectedEpic, search],
  );
  const visibleEpics = useMemo(
    () => filterEpics(epics, Object.values(columns).flat(), search),
    [epics, columns, search],
  );
  const epicGroups = useMemo(() => groupEpics(visibleEpics), [visibleEpics]);
  const columnIds = Object.keys(visible);
  const shellIds = openUrl ? ["epics", "board", "open"] : ["epics", "board"];
  const shellLayout = useDefaultLayout({
    id: "shell",
    panelIds: shellIds,
    onlySaveAfterUserInteractions: true,
  });
  const columnLayout = useDefaultLayout({
    id: "columns",
    panelIds: columnIds,
    onlySaveAfterUserInteractions: true,
  });
  const embed = openUrl
    ? frameSrc(openUrl, window.location.origin)
    : null;

  function applyBoard(next: Board) {
    setColumns(toValue(next.columns));
    setEpics(next.epics ?? []);
    setSelectedEpic((current) =>
      current && (next.epics ?? []).some((epic) => epic.key === current)
        ? current
        : null,
    );
  }

  async function load() {
    const data = await api<BoardPayload>("/api/board");
    applyBoard(data);
    if (data.flags) setFlags(data.flags);
  }

  useEffect(() => {
    void load();
  }, []);

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const data = await api<BoardPayload>("/api/refresh", {
        method: "POST",
        body: JSON.stringify({ flags }),
      });
      applyBoard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  async function move(key: string, status: string) {
    setBusy(true);
    setError("");
    try {
      const data = await api<{
        ok: boolean;
        error?: string;
        board: Board;
      }>("/api/move", {
        method: "POST",
        body: JSON.stringify({ key, status }),
      });
      applyBoard(data.board);
      if (!data.ok) setError(data.error ?? "Move failed");
    } finally {
      setBusy(false);
    }
  }

  async function open(key: string) {
    const data = await api<{ url: string }>("/api/open", {
      method: "POST",
      body: JSON.stringify({ key }),
    });
    setOpenKey(key);
    setOpenUrl(data.url);
  }

  function commit(_next: Record<string, Card[]>, meta: KanbanCommitMeta<Card>) {
    if (meta.kind === "column" || meta.activeContainer === meta.overContainer) {
      setColumns((current) => rollbackColumns(meta.previousValue, current, selectedEpic, search));
      return;
    }
    void move(String(meta.event.active.id), meta.overContainer);
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  function childCount(key: string) {
    return Object.values(columns)
      .flat()
      .filter((card) => card.epic === key && cardMatches(card, search)).length;
  }

  async function selectEpic(key: string | null) {
    setSelectedEpic(key);
    if (!key) return;
    if (childCount(key) > 0) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<Board>("/api/epic", {
        method: "POST",
        body: JSON.stringify({ key }),
      });
      setColumns((current) => stampEpic(current, toValue(data.columns), key));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Epic list failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-muted/40 flex h-screen flex-col">
      <header className="bg-background flex flex-wrap items-center gap-2 border-b px-6 py-3">
        <strong className="mr-2 text-sm">pipe-kan</strong>
        <InputGroup className="min-w-48 flex-1">
          <InputGroupInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Epics and Cards"
            aria-label="Search"
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          {search ? (
            <InputGroupAddon align="inline-end">
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
              >
                <XIcon className="size-4" />
              </button>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
        <input
          className="border-input bg-background h-9 min-w-48 flex-1 rounded-md border px-3 text-sm shadow-xs"
          value={flags}
          onChange={(event) => setFlags(event.target.value)}
          spellCheck={false}
          aria-label="Scope flags"
        />
        <Button variant="outline" onClick={() => void refresh()} disabled={busy}>
          Refresh
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </Button>
        {error ? (
          <p className="text-destructive w-full text-sm whitespace-pre-wrap">
            {error}
          </p>
        ) : null}
      </header>
      <ResizablePanelGroup
        id="shell"
        orientation="horizontal"
        className="min-h-0 flex-1"
        defaultLayout={shellLayout.defaultLayout}
        onLayoutChanged={shellLayout.onLayoutChanged}
      >
        <ResizablePanel
          id="epics"
          defaultSize="20%"
          minSize="12rem"
          maxSize="40%"
          className="min-h-0"
        >
          <aside className="bg-background flex h-full min-h-0 flex-col border-r">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold">Epics</span>
              <Badge variant="outline">{visibleEpics.length}</Badge>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-auto px-2 pb-3">
              <button
                type="button"
                className={`rounded-md px-3 py-2 text-left text-sm ${
                  selectedEpic === null
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => void selectEpic(null)}
              >
                All stories
              </button>
              {epicGroups.map((group) =>
                group.status ? (
                  <EpicStatusGroup
                    key={group.status}
                    status={group.status}
                    epics={group.epics}
                    selectedEpic={selectedEpic}
                    childCount={childCount}
                    onSelect={selectEpic}
                  />
                ) : (
                  group.epics.map((epic) => (
                    <EpicButton
                      key={epic.key}
                      epic={epic}
                      selected={selectedEpic === epic.key}
                      count={childCount(epic.key)}
                      onSelect={selectEpic}
                    />
                  ))
                ),
              )}
            </nav>
          </aside>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          id="board"
          defaultSize={openUrl ? "50%" : "80%"}
          minSize="24rem"
          className="min-h-0"
        >
          <main className="h-full min-h-0 min-w-0 overflow-auto p-6">
            <Kanban
              className="h-full min-h-0"
              value={visible}
              onValueChange={(next) =>
                setColumns((previous) => mergeValue(next, previous, selectedEpic, search))
              }
              getItemValue={(card) => card.key}
              restoreOnCancel
              onValueCommit={commit}
            >
              <KanbanBoard className="grid h-full min-h-0 grid-cols-1 auto-rows-fr">
                {columnIds.length ? (
                <ResizablePanelGroup
                  id="columns"
                  orientation="horizontal"
                  className="min-h-0"
                  defaultLayout={columnLayout.defaultLayout}
                  onLayoutChanged={columnLayout.onLayoutChanged}
                >
                  {Object.entries(visible).map(([title, cards], index, all) => (
                    <Fragment key={title}>
                      {index > 0 ? <ResizableHandle withHandle /> : null}
                      <ResizablePanel
                        id={title}
                        defaultSize={`${100 / Math.max(all.length, 1)}%`}
                        minSize="16rem"
                        className="min-h-0 min-w-0"
                      >
                        <StatusColumn
                          title={title}
                          cards={cards}
                          disabled={busy}
                          onOpen={(key) => void open(key)}
                        />
                      </ResizablePanel>
                    </Fragment>
                  ))}
                </ResizablePanelGroup>
                ) : null}
              </KanbanBoard>
              <KanbanOverlay>
                {({ value, variant }) => {
                  if (variant === "column") {
                    return (
                      <StatusColumn
                        title={String(value)}
                        cards={visible[String(value)] ?? []}
                        isOverlay
                      />
                    );
                  }
                  const card = Object.values(visible)
                    .flat()
                    .find((item) => item.key === value);
                  if (!card) return null;
                  return <IssueCard card={card} isOverlay />;
                }}
              </KanbanOverlay>
            </Kanban>
          </main>
        </ResizablePanel>
        {openUrl ? (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              id="open"
              defaultSize="30%"
              minSize="16rem"
              className="min-h-0"
            >
              <aside className="bg-background flex h-full min-h-0 flex-col border-l">
                <div className="flex items-center gap-2 border-b px-3 py-2">
                  <a
                    className="min-w-0 flex-1 truncate text-sm font-medium underline-offset-4 hover:underline"
                    href={openUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {openKey ?? openUrl}
                  </a>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Close issue"
                    onClick={() => {
                      setOpenKey(null);
                      setOpenUrl(null);
                    }}
                  >
                    <XIcon />
                  </Button>
                </div>
                {embed ? (
                  <iframe
                    title={openKey ?? "Issue"}
                    src={embed}
                    className="min-h-0 w-full flex-1 border-0 bg-background"
                  />
                ) : (
                  <div className="text-muted-foreground flex flex-1 flex-col items-start gap-3 p-6 text-sm">
                    <p>Jira refuses to embed this page.</p>
                    <a
                      className="text-foreground font-medium underline-offset-4 hover:underline"
                      href={openUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open {openKey ?? "issue"} in Jira
                    </a>
                  </div>
                )}
              </aside>
            </ResizablePanel>
          </>
        ) : null}
      </ResizablePanelGroup>
    </div>
  );
}
