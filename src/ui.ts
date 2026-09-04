import { createReadStream, existsSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const types: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export function packageRoot(from = import.meta.url) {
  return resolve(dirname(fileURLToPath(from)), "..");
}

export function uiDir(root: string) {
  return join(root, "dist", "ui");
}

function inside(root: string, file: string) {
  const base = resolve(root);
  const target = resolve(file);
  return target === base || target.startsWith(base + sep);
}

export function sendUi(
  root: string,
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  const ui = uiDir(root);
  const index = join(ui, "index.html");
  if (!existsSync(index)) return false;
  const path = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
  const wanted = resolve(ui, `.${decodeURIComponent(path)}`);
  const file =
    inside(ui, wanted) && existsSync(wanted) && statSync(wanted).isFile()
      ? wanted
      : index;
  res.setHeader("content-type", types[extname(file)] ?? "application/octet-stream");
  createReadStream(file).pipe(res);
  return true;
}
