export function resolveListen(env: NodeJS.ProcessEnv = process.env) {
  return {
    host: env.HOST ?? "127.0.0.1",
    port: Number(env.PORT ?? 5173),
  };
}
