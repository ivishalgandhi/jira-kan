import { useEffect, useMemo, useState } from "react";
import { GripVerticalIcon, MoonIcon, SunIcon, XIcon } from "lucide-react";

import type { Board, Card, Column, Epic } from "./board.ts";
import { filterValue, mergeValue, rollbackColumns } from "./visible.ts";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card as UiCard, CardContent, CardHeader } from "~/components/ui/card";
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

type BoardPayload = Board & { flags?: string };
type Theme = "light" | "dark";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  return res.json() as Promise<T>;
}

function withDone(columns: Column[]): Column[] {
  return columns.some((column) => column.title === "Done")
    ? columns
    : [...columns, { id: "Done", title: "Done", cards: [] }];
}

function toValue(columns: Column[]): Record<string, Card[]> {
  return Object.fromEntries(
    withDone(columns).map((column) => [column.title, column.cards]),
  );
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
  const body = (
    <UiCard className="gap-0 py-4 shadow-sm">
      <CardContent className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="line-clamp-1 text-sm font-medium">{card.summary}</span>
          {card.priority ? (
            <Badge
              variant={priorityVariant(card.priority)}
              className="pointer-events-none h-5 shrink-0 rounded-sm px-1.5 text-xs capitalize"
            >
              {card.priority}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="pointer-events-none h-5 shrink-0 rounded-sm px-1.5 text-xs"
            >
              {card.key}
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 font-medium tabular-nums">{card.key}</span>
            {card.assignee ? (
              <>
                <Avatar>
                  <AvatarFallback>{card.assignee.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="line-clamp-1">{card.assignee}</span>
              </>
            ) : null}
          </div>
          {card.dueDate ? (
            <time className="text-[10px] whitespace-nowrap tabular-nums">
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
  return (
    <KanbanColumn value={title}>
      <UiCard className="mb-2.5 h-full">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold">{title}</span>
            <Badge variant="outline">{cards.length}</Badge>
          </div>
          <KanbanColumnHandle className="opacity-100">
            <Button size="icon-xs" variant="ghost" tabIndex={-1} type="button">
              <GripVerticalIcon />
            </Button>
          </KanbanColumnHandle>
        </CardHeader>
        <CardContent>
          <KanbanColumnContent value={title} className="flex flex-col gap-2.5">
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
      </UiCard>
    </KanbanColumn>
  );
}

export function App() {
  const [columns, setColumns] = useState<Record<string, Card[]>>({});
  const [epics, setEpics] = useState<Epic[]>([]);
  const [selectedEpic, setSelectedEpic] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const [flags, setFlags] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<Theme>(readTheme);

  const visible = useMemo(
    () => filterValue(columns, selectedEpic),
    [columns, selectedEpic],
  );

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
      setColumns((current) => rollbackColumns(meta.previousValue, current, selectedEpic));
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
      .filter((card) => card.epic === key).length;
  }

  return (
    <div className="bg-muted/40 flex h-screen flex-col">
      <header className="bg-background flex flex-wrap items-center gap-2 border-b px-6 py-3">
        <strong className="mr-2 text-sm">jira-kan</strong>
        <input
          className="border-input bg-background h-9 min-w-64 flex-1 rounded-md border px-3 text-sm shadow-xs"
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
      <div className="flex min-h-0 flex-1">
        <aside className="bg-background flex w-72 shrink-0 flex-col border-r">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold">Epics</span>
            <Badge variant="outline">{epics.length}</Badge>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-auto px-2 pb-3">
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-left text-sm ${
                selectedEpic === null
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              }`}
              onClick={() => setSelectedEpic(null)}
            >
              All stories
            </button>
            {epics.map((epic) => (
              <button
                key={epic.key}
                type="button"
                className={`rounded-md px-3 py-2 text-left ${
                  selectedEpic === epic.key
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => {
                  setSelectedEpic(epic.key);
                  void open(epic.key);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium tabular-nums">
                    {epic.key}
                  </span>
                  <Badge variant="outline">{childCount(epic.key)}</Badge>
                </div>
                <span className="mt-1 line-clamp-2 text-sm">{epic.summary}</span>
              </button>
            ))}
          </nav>
        </aside>
        <main className="min-h-0 min-w-0 flex-1 overflow-auto p-6">
          <Kanban
            value={visible}
            onValueChange={(next) =>
              setColumns((previous) => mergeValue(next, previous, selectedEpic))
            }
            getItemValue={(card) => card.key}
            restoreOnCancel
            onValueCommit={commit}
          >
            <KanbanBoard className="grid auto-rows-fr grid-cols-3">
              {Object.entries(visible).map(([title, cards]) => (
                <StatusColumn
                  key={title}
                  title={title}
                  cards={cards}
                  disabled={busy}
                  onOpen={(key) => void open(key)}
                />
              ))}
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
        {openUrl ? (
          <aside className="bg-background flex w-[min(42rem,46vw)] shrink-0 flex-col border-l">
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
            <iframe
              title={openKey ?? "Issue"}
              src={openUrl}
              className="min-h-0 w-full flex-1 border-0 bg-background"
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

