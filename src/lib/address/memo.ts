const entries = new Map<string, { at: number; value: Promise<unknown> }>();

/**
 * Runs `load` once per `key` within `ttlMs`, and shares what it returns, also with callers that
 * come in while it is still running. Kept in memory of this server instance only. A failed load
 * is forgotten at once, so the next caller tries again. Unlike `'use cache'`, an error passes
 * straight through, still the error it was (production hides the details of an error that
 * crosses a cache boundary).
 */
export function briefly<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  for (const [other, entry] of entries) if (now - entry.at >= ttlMs) entries.delete(other);

  const hit = entries.get(key);
  if (hit) return hit.value as Promise<T>;

  const value = load();
  entries.set(key, { at: now, value });
  value.catch(() => {
    if (entries.get(key)?.value === value) entries.delete(key);
  });
  return value;
}
