/**
 * Soft per-session sprite-generation ceiling (T10). In-memory, best-effort.
 * The key is the localStorage sessionId, which is spoofable by clearing storage —
 * this caps accidental/casual credit drain, NOT a determined abuser. Real abuse
 * prevention needs accounts (out of scope). See TODOS.md.
 */
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 10;

const hits = new Map<string, number[]>();

export function checkRateLimit(sessionId: string): { ok: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const recent = (hits.get(sessionId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    const retryAfterMs = WINDOW_MS - (now - recent[0]);
    return { ok: false, retryAfterMs };
  }
  recent.push(now);
  hits.set(sessionId, recent);
  return { ok: true };
}
