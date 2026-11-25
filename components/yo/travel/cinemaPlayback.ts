const PREFIX = "yo.cinema.playback.v1.";
const memory = new Map<string, { src: string; seconds: number; at: number }>();
const MAX_AGE = 6 * 60 * 60 * 1000;
export function readCinemaPlayback(id: string, src: string, now = Date.now()): number {
  let value: unknown = memory.get(id);
  if (!value) { try { value = JSON.parse(window.sessionStorage.getItem(PREFIX + id) ?? "null"); } catch { /* Optional. */ } }
  if (!value || typeof value !== "object") return 0;
  const item = value as Record<string, unknown>;
  return item.src === src && typeof item.seconds === "number" && Number.isFinite(item.seconds) && item.seconds > 0 && item.seconds < 300
    && typeof item.at === "number" && Number.isFinite(item.at) && item.at <= now && now - item.at < MAX_AGE ? item.seconds : 0;
}
export function saveCinemaPlayback(id: string, src: string, seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds >= 300) return;
  const value = { src, seconds, at: Date.now() };
  memory.set(id, value);
  try { window.sessionStorage.setItem(PREFIX + id, JSON.stringify(value)); } catch { /* Film resume is best effort. */ }
}
export function clearCinemaPlayback(id: string) {
  memory.delete(id);
  try { window.sessionStorage.removeItem(PREFIX + id); } catch { /* Does not affect course progress. */ }
}
