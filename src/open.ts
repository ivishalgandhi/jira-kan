export function frameSrc(url: string, origin: string): string | null {
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url, origin);
    return parsed.origin === new URL(origin).origin ? parsed.toString() : null;
  } catch {
    return null;
  }
}
