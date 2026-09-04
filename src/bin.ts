import { runServer } from "./server.ts";
import { packageRoot } from "./ui.ts";

runServer({ root: packageRoot() }).catch((err) => {
  console.error(err);
  process.exit(1);
});
