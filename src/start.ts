import { runServer } from "./server.ts";
import { packageRoot } from "./ui.ts";

const root = packageRoot();

async function main() {
  const { createServer: createVite } = await import("vite");
  const vite = await createVite({
    root,
    server: { middlewareMode: true, allowedHosts: true },
    appType: "spa",
  });
  await runServer({
    root,
    fallback: (req, res) => vite.middlewares(req, res),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
