import { RANKING_LANGUAGES, type RankingAnswer, type RankingAttempt, type RankingAward, type RankingFriend, type RankingFriendAction, type RankingLanguage, type RankingPeriod, type RankingRow, type RankingScope, type RankingSnapshot } from "./contract";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
export function rankingLanguage(value: unknown): value is RankingLanguage { return typeof value === "string" && (RANKING_LANGUAGES as readonly string[]).includes(value); }

export function parseRankingQuery(url: string): { scope: RankingScope; period: RankingPeriod; language: RankingLanguage | "all" } | null {
  const params = new URL(url).searchParams;
  if (["scope", "period", "language"].some(key => params.getAll(key).length > 1)) return null;
  const scope = params.get("scope") ?? "everyone", period = params.get("period") ?? "week", language = params.get("language") ?? "all";
  return (scope === "everyone" || scope === "friends") && (period === "week" || period === "all") && (language === "all" || rankingLanguage(language))
    ? { scope, period, language } : null;
}

export function rankingAlias(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.normalize("NFC").trim();
  // A chosen alias, not an imported legal name/contact address. Reject controls,
  // directional formatting, markup and contact syntax, even when invisible.
  if (name.length > 48 || [...name].length < 2 || [...name].length > 24 || !/\p{L}/u.test(name)
    || !/^[\p{L}\p{N}][\p{L}\p{M}\p{N} _'’-]*$/u.test(name)) return null;
  return name;
}

export function parseRankingProfile(value: unknown): { displayName: string | null; participating: boolean } | null {
  if (!record(value) || !exact(value, ["displayName", "participating"]) || typeof value.participating !== "boolean") return null;
  const displayName = rankingAlias(value.displayName);
  // Leaving the board must never be blocked by an unfinished alias edit.
  return value.participating && !displayName ? null : { displayName, participating: value.participating };
}

export function parseRankingFriend(value: unknown): RankingFriendAction | null {
  if (!record(value)) return null;
  if (value.action === "request" && exact(value, ["action", "code"]) && typeof value.code === "string") {
    const code = value.code.trim().toUpperCase();
    return /^[A-F0-9]{16}$/.test(code) ? { action: "request", code } : null;
  }
  if (["accept", "decline", "remove", "block", "unblock"].includes(String(value.action)) && exact(value, ["action", "id"])
    && typeof value.id === "string" && UUID.test(value.id)) return value as unknown as RankingFriendAction;
  return null;
}

export function parseRankingAttempt(value: unknown): RankingAttempt | null {
  if (!record(value) || !exact(value, ["language", "itemId", "answer"]) || !rankingLanguage(value.language)
    || typeof value.itemId !== "string" || value.itemId.length > 240 || !/^course:[A-Za-z0-9:_-]+$/.test(value.itemId)) return null;
  const text = (part: unknown): part is string => typeof part === "string" && part.length <= 1024 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(part);
  const answer = value.answer;
  const valid = text(answer) || (Array.isArray(answer) && answer.length <= 64 && answer.every(text))
    || (record(answer) && Object.keys(answer).length <= 64 && Object.entries(answer).every(([key, val]) =>
      key.length > 0 && key.length <= 120 && !["__proto__", "constructor", "prototype"].includes(key) && text(val)));
  return valid ? { language: value.language, itemId: value.itemId, answer: answer as RankingAnswer } : null;
}

/** Bound actual bytes, not only the untrusted Content-Length header. */
export async function readRankingBody(req: Request): Promise<unknown> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
  if (Number(req.headers.get("content-length")) > 16384 || !req.body) return null;
  const reader = req.body.getReader(), chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > 16384) { await reader.cancel(); return null; }
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch { return null; }
  finally { reader.releaseLock(); }
}

const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
function publicFriend(value: unknown): RankingFriend {
  if (!record(value) || typeof value.id !== "string" || !UUID.test(value.id) || typeof value.name !== "string" || [...value.name].length > 24) throw new Error("Invalid ranking projection");
  return { id: value.id, name: value.name };
}
function publicRow(value: unknown): RankingRow {
  const friend = publicFriend(value);
  if (!record(value) || !count(value.xp) || !count(value.rank) || value.rank < 1 || typeof value.isYou !== "boolean" || typeof value.friend !== "boolean") throw new Error("Invalid ranking projection");
  return { ...friend, xp: value.xp, rank: value.rank, isYou: value.isYou, friend: value.friend };
}
function list<T>(value: unknown, max: number, project: (value: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > max) throw new Error("Invalid ranking projection");
  return value.map(project);
}
/** Explicit response allow-list prevents future SQL columns leaking to clients. */
export function projectRankingSnapshot(value: unknown): RankingSnapshot | null {
  try {
    if (!record(value) || !record(value.profile) || !record(value.friends)) return null;
    const p = value.profile;
    if (typeof p.id !== "string" || (p.id !== "" && !UUID.test(p.id)) || typeof p.displayName !== "string" || [...p.displayName].length > 24
      || typeof p.participating !== "boolean" || typeof p.friendCode !== "string" || (p.friendCode !== "" && !/^[A-F0-9]{16}$/.test(p.friendCode))
      || !count(p.totalXp) || !count(p.weekXp) || p.weekXp > p.totalXp || !count(value.totalParticipants)
      || typeof value.weekStartsAt !== "string" || !Number.isFinite(Date.parse(value.weekStartsAt))
      || !["everyone", "friends"].includes(String(value.scope)) || !["week", "all"].includes(String(value.period))
      || !(value.language === "all" || rankingLanguage(value.language))) return null;
    return {
      profile: { id: p.id, displayName: p.displayName, participating: p.participating, friendCode: p.friendCode, totalXp: p.totalXp, weekXp: p.weekXp },
      scope: value.scope as RankingScope, period: value.period as RankingPeriod, language: value.language,
      weekStartsAt: value.weekStartsAt, totalParticipants: value.totalParticipants,
      rows: list(value.rows, 20, publicRow), nearby: list(value.nearby, 5, publicRow), me: value.me === null ? null : publicRow(value.me),
      friends: { incoming: list(value.friends.incoming, 50, publicFriend), outgoing: list(value.friends.outgoing, 20, publicFriend),
        accepted: list(value.friends.accepted, 100, publicFriend), blocked: list(value.friends.blocked, 500, publicFriend) },
    };
  } catch { return null; }
}
export function projectRankingAward(value: unknown): RankingAward | null {
  if (!record(value) || !count(value.totalXp) || !count(value.weekXp) || value.weekXp > value.totalXp
    || (value.awarded !== undefined && value.awarded !== 0 && value.awarded !== 10)
    || (typeof value.awarded === "number" && (value.totalXp < value.awarded || value.weekXp < value.awarded))) return null;
  return { awarded: (value.awarded as number | undefined) ?? 0, totalXp: value.totalXp, weekXp: value.weekXp };
}
