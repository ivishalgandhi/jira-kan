import { useEffect, useState } from "react";

import type { Board } from "./board.ts";
import { Button } from "~/components/ui/button";
import {
  KanbanBoard,
  KanbanBoardCard,
  KanbanBoardCardDescription,
  KanbanBoardColumn,
  KanbanBoardColumnHeader,
  KanbanBoardColumnList,
  KanbanBoardColumnListItem,
  KanbanBoardColumnTitle,
  KanbanBoardProvider,
  KanbanColorCircle,
} from "~/components/ui/kanban";

type BoardPayload = Board & { flags?: string };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  return res.json() as Promise<T>;
}

export function App() {
  const [board, setBoard] = useState<Board>({ columns: [] });
  const [flags, setFlags] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api<BoardPayload>("/api/board");
    setBoard(data);
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
      setBoard(data);
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
      setBoard(data.board);
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
    window.open(data.url, "_blank", "noopener");
  }

  const columns = board.columns.some((column) => column.title === "Done")
    ? board.columns
    : [...board.columns, { id: "Done", title: "Done", cards: [] }];

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <strong className="mr-2">jira-kan</strong>
        <input
          className="border-input h-9 min-w-64 flex-1 rounded-md border bg-transparent px-3 text-sm"
          value={flags}
          onChange={(event) => setFlags(event.target.value)}
          spellCheck={false}
          aria-label="Scope flags"
        />
        <Button onClick={() => void refresh()} disabled={busy}>
          Refresh
        </Button>
        {error ? (
          <p className="text-destructive w-full text-sm whitespace-pre-wrap">{error}</p>
        ) : null}
      </header>
      <main className="min-h-0 flex-1 overflow-x-auto p-4">
        <KanbanBoardProvider>
          <KanbanBoard>
            {columns.map((column, index) => (
              <KanbanBoardColumn
                key={column.id}
                columnId={column.id}
                onDropOverColumn={(data) => {
                  const card = JSON.parse(data) as { id: string };
                  void move(card.id, column.title);
                }}
              >
                <KanbanBoardColumnHeader>
                  <KanbanBoardColumnTitle columnId={column.id}>
                    <KanbanColorCircle
                      color={
                        (
                          [
                            "primary",
                            "blue",
                            "green",
                            "yellow",
                            "red",
                          ] as const
                        )[index % 5]
                      }
                    />
                    {column.title}
                  </KanbanBoardColumnTitle>
                </KanbanBoardColumnHeader>
                <KanbanBoardColumnList>
                  {column.cards.map((card) => (
                    <KanbanBoardColumnListItem
                      key={card.key}
                      cardId={card.key}
                      onDropOverListItem={(data) => {
                        const dropped = JSON.parse(data) as { id: string };
                        void move(dropped.id, column.title);
                      }}
                    >
                      <KanbanBoardCard
                        data={{ id: card.key }}
                        onClick={() => void open(card.key)}
                      >
                        <KanbanBoardCardDescription>
                          {card.key}
                        </KanbanBoardCardDescription>
                        {card.summary}
                      </KanbanBoardCard>
                    </KanbanBoardColumnListItem>
                  ))}
                </KanbanBoardColumnList>
              </KanbanBoardColumn>
            ))}
          </KanbanBoard>
        </KanbanBoardProvider>
      </main>
    </div>
  );
}
