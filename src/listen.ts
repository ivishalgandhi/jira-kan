export function resolveListen(env: NodeJS.ProcessEnv = process.env) {
  return {
    host: env.HOST ?? "127.0.0.1",
    port: Number(env.PORT ?? 5173),
  };
}

export function bindListen(
  server: {
    listen(port: number, host: string, cb: () => void): unknown;
    once(event: "error", cb: (err: Error) => void): unknown;
    off(event: "error", cb: (err: Error) => void): unknown;
  },
  host: string,
  port: number,
) {
  return new Promise<void>((resolve, reject) => {
    const onError = (err: Error) => reject(err);
    server.once("error", onError);
    server.listen(port, host, () => {
      server.off("error", onError);
      resolve();
    });
  });
}

