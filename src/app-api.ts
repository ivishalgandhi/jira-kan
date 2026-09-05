import type { IncomingMessage, ServerResponse } from "node:http";

import type { App } from "./app.ts";

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk as Buffer));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function pathOf(req: IncomingMessage): URL {
  return new URL(req.url ?? "/", "http://127.0.0.1");
}

export function handleAppApi(
  req: IncomingMessage,
  res: ServerResponse,
  app: App,
): boolean {
  const url = pathOf(req);
  const method = (req.method ?? "GET").toUpperCase();

  if (url.pathname === "/api/board" && method === "GET") {
    json(res, 200, { ...app.board(), flags: app.flags });
    return true;
  }

  if (url.pathname === "/api/refresh" && method === "POST") {
    void readBody(req).then(async (text) => {
      const body = text ? JSON.parse(text) : {};
      const board = await app.refresh(body.flags);
      json(res, 200, board);
    });
    return true;
  }

  if (url.pathname === "/api/move" && method === "POST") {
    void readBody(req).then(async (text) => {
      const body = text ? JSON.parse(text) : {};
      const result = await app.move(String(body.key ?? ""), String(body.status ?? ""));
      json(res, result.ok ? 200 : 409, result);
    });
    return true;
  }

  if (url.pathname === "/api/epic" && method === "POST") {
    void readBody(req).then(async (text) => {
      const body = text ? JSON.parse(text) : {};
      json(res, 200, await app.children(String(body.key ?? "")));
    });
    return true;
  }

  if (url.pathname === "/api/open" && method === "POST") {
    void readBody(req).then(async (text) => {
      const body = text ? JSON.parse(text) : {};
      json(res, 200, await app.open(String(body.key ?? "")));
    });
    return true;
  }

  return false;
}
