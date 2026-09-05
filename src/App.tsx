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
import { Button } from "~/components/ui/button";
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

const STATUS_CIRCLE = {
  done: "green",
  complete: "green",
  completed: "green",
  closed: "green",
  resolved: "green",
  progress: "yellow",
  review: "yellow",
  doing: "yellow",
  cancelled: "gray",
  canceled: "gray",
} as const;

function statusCircle(title?: string) {
  if (!title) return "var(--primary)";
  const value = title.toLowerCase();
  const match = (Object.keys(STATUS_CIRCLE) as (keyof typeof STATUS_CIRCLE)[]).find(
    (name) => value.includes(name),
  );
  return `var(--kanban-board-circle-${match ? STATUS_CIRCLE[match] : "gray"})`;
}

function priorityClass(priority?: string) {
  const value = (priority ?? "").toLowerCase();
  if (value === "high" || value === "highest" || value === "critical") {
    return "text-red-500";
  }
  if (value === "medium") return "text-orange-400";
  return "text-yellow-500";
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
    <div className="bg-card hover:bg-foreground/5 rounded-[9px] border px-3 pt-2 pb-3">
      <div className="flex h-[22px] items-center justify-between gap-2">
        <span className="text-muted-foreground text-[12px] font-medium tabular-nums">
          {card.key}
        </span>
        {age ? (
          <span className="text-muted-foreground text-[11px] tabular-nums">
            {age}
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 truncate text-[13px] leading-[18px]">{card.summary}</p>
      {card.priority || card.labels?.length || card.assignee || card.dueDate ? (
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          {card.priority ? (
            <span
              className={cn(
                "inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-[12px] font-medium capitalize",
                priorityClass(card.priority),
              )}
            >
              {card.priority}
            </span>
          ) : null}
          {card.labels?.map((label) => (
            <span
              key={label}
              className="text-muted-foreground inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-[12px]"
            >
              {label}
            </span>
          ))}
          <span className="flex-1" />
          {card.dueDate ? (
            <time className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
              {card.dueDate}
            </time>
          ) : null}
          {card.assignee ? (
            <Avatar title={card.assignee}>
              <AvatarFallback>{card.assignee.charAt(0)}</AvatarFallback>
            </Avatar>
          ) : null}
        </div>
      ) : null}
    </div>
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
    <KanbanColumn value={title} className="group h-full min-h-0">
      <Collapsible
        open={open}
        onOpenChange={changeOpen}
        className={cn("flex h-full min-h-0 flex-col", !open && "h-auto")}
      >
        <div className={cn("flex flex-col", open ? "h-full min-h-0" : "h-auto")}>
          <div className="flex items-center gap-2 px-3 pt-[13px] pb-5">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span
                  className="size-3.5 shrink-0 rounded-full"
                  style={{ backgroundColor: statusCircle(title) }}
                />
                <span className="truncate text-[13px] font-medium">{title}</span>
                <span className="text-muted-foreground text-[12px] tabular-nums">
                  {cards.length}
                </span>
                <ChevronDownIcon
                  className={cn(
                    "text-muted-foreground size-3.5 shrink-0 transition-transform",
                    !open && "-rotate-90",
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <KanbanColumnHandle className="opacity-0 transition-opacity group-hover:opacity-60">
              <Button size="icon-xs" variant="ghost" tabIndex={-1} type="button">
                <GripVerticalIcon />
              </Button>
            </KanbanColumnHandle>
          </div>
          <CollapsibleContent className="min-h-0 flex-1 overflow-hidden">
            <KanbanColumnContent
              value={title}
              className="flex h-full flex-col gap-2 overflow-auto px-2 pb-2"
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
          </CollapsibleContent>
        </div>
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
      className={cn(
        "flex h-14 w-full items-center gap-3 rounded-lg px-3 text-left",
        selected
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "hover:bg-foreground/5",
      )}
      onClick={() => void onSelect(epic.key)}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: statusCircle(epic.status) }}
      />
      <span className="min-w-0 flex-1 truncate text-[13px] leading-[18px]">
        {epic.summary}
      </span>
      <span className="text-muted-foreground text-[11px] font-medium tabular-nums">
        {epic.key}
      </span>
      <span className="text-muted-foreground text-[11px] tabular-nums">{count}</span>
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
          className="text-muted-foreground hover:text-foreground flex h-7 items-center gap-1.5 px-3 text-left"
        >
          <ChevronDownIcon
            className={cn(
              "size-3.5 shrink-0 transition-transform",
              !open && "-rotate-90",
            )}
          />
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
            {status}
          </span>
          <span className="text-[11px] tabular-nums">{epics.length}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-0.5">
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
  const boardOpenIds = openUrl ? ["cards", "open"] : ["cards"];
  const shellLayout = useDefaultLayout({
    id: "shell",
    panelIds: ["epics", "board"],
    onlySaveAfterUserInteractions: true,
  });
  const boardOpenLayout = useDefaultLayout({
    id: "board-open",
    panelIds: boardOpenIds,
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
    <div className="bg-sidebar flex h-screen">
      <ResizablePanelGroup
        id="shell"
        orientation="horizontal"
        className="min-h-0 flex-1"
        defaultLayout={shellLayout.defaultLayout}
        onLayoutChanged={shellLayout.onLayoutChanged}
      >
        <ResizablePanel
          id="epics"
          defaultSize="244px"
          minSize="12rem"
          maxSize="40%"
          className="min-h-0"
        >
          <aside className="text-sidebar-foreground flex h-full min-h-0 flex-col">
            <div className="flex h-10 items-center justify-between px-4">
              <span className="text-[13px] font-medium">pipe-kan</span>
              <span className="text-muted-foreground text-[12px] tabular-nums">
                {visibleEpics.length}
              </span>
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 overflow-auto px-2 pb-2">
              <button
                type="button"
                className={cn(
                  "h-8 rounded-lg px-3 text-left text-[13px]",
                  selectedEpic === null
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-foreground/5",
                )}
                onClick={() => void selectEpic(null)}
              >
                All stories
              </button>
              <div className="text-muted-foreground px-3 pt-3 pb-1 text-[11px] font-medium">
                Epics
              </div>
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
        <ResizableHandle />
        <ResizablePanel id="board" defaultSize="80%" minSize="24rem" className="min-h-0">
          <div className="flex h-full min-h-0 flex-col p-2 pl-0">
            <div className="bg-background flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
              <header className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 px-3">
                <strong className="text-[13px] font-medium">Board</strong>
                <InputGroup className="h-7 max-w-72 min-w-40 flex-1 border-transparent bg-muted shadow-none">
                  <InputGroupAddon>
                    <SearchIcon className="size-3.5" />
                  </InputGroupAddon>
                  <InputGroupInput
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search Epics and Cards"
                    aria-label="Search"
                    className="h-7 text-[13px]"
                  />
                  {search ? (
                    <InputGroupAddon align="inline-end">
                      <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => setSearch("")}
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    </InputGroupAddon>
                  ) : null}
                </InputGroup>
                <input
                  className="placeholder:text-muted-foreground h-7 min-w-40 flex-1 rounded-md bg-muted px-2.5 text-[13px] outline-none"
                  value={flags}
                  onChange={(event) => setFlags(event.target.value)}
                  spellCheck={false}
                  aria-label="Scope flags"
                />
                <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={busy}>
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={toggleTheme}
                  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                </Button>
                {error ? (
                  <p className="text-destructive w-full text-[13px] whitespace-pre-wrap">
                    {error}
                  </p>
                ) : null}
              </header>
              <ResizablePanelGroup
                id="board-open"
                orientation="horizontal"
                className="min-h-0 flex-1"
                defaultLayout={boardOpenLayout.defaultLayout}
                onLayoutChanged={boardOpenLayout.onLayoutChanged}
              >
                <ResizablePanel
                  id="cards"
                  defaultSize={openUrl ? "70%" : "100%"}
                  minSize="16rem"
                  className="min-h-0"
                >
                  <main className="h-full min-h-0 min-w-0 overflow-auto px-2 pb-2">
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
                      <KanbanBoard className="grid h-full min-h-0 grid-cols-1 auto-rows-fr gap-3">
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
                              {index > 0 ? <ResizableHandle /> : null}
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
                    <ResizableHandle />
                    <ResizablePanel
                      id="open"
                      defaultSize="30%"
                      minSize="16rem"
                      className="min-h-0"
                    >
                      <aside className="flex h-full min-h-0 flex-col border-l">
                        <div className="flex h-10 items-center gap-2 px-3">
                          <a
                            className="min-w-0 flex-1 truncate text-[13px] font-medium underline-offset-4 hover:underline"
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
                          <div className="text-muted-foreground flex flex-1 flex-col items-start gap-3 p-6 text-[13px]">
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
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
