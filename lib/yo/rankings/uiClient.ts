import { getSupabaseClient } from "@/lib/supabase";
import { RANKING_LANGUAGES, type RankingSnapshot } from "./contract";

export class RankingClientError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}
export type RankingTransport = (userId: string, path: string, init?: RequestInit) => Promise<unknown>;

/** Every request belongs to the account that opened the screen, never a later session. */
export const rankingRequest: RankingTransport = async (userId, path, init = {}) => {
  const client = getSupabaseClient();
  const { data: { session } } = await client.auth.getSession();
  if (!session?.access_token || session.user.id !== userId) throw new RankingClientError(401, "unauthorized");
  if (init.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const response = await fetch(`/api/yo/rankings${path}`, {
    ...init, cache: "no-store", credentials: "omit",
    headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Bearer ${session.access_token}` },
  });
  const body: unknown = await response.json().catch(() => null);
  const { data: current } = await client.auth.getSession();
  if (current.session?.user.id !== userId) throw new RankingClientError(401, "unauthorized");
  if (!response.ok) {
    const code = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "unavailable";
    throw new RankingClientError(response.status, code);
  }
  return body;
};

/** Invalid/partial responses are an error, never an apparently empty live board. */
export function readRankingSnapshot(value: unknown): RankingSnapshot {
  const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
  const count = (v: unknown) => Number.isSafeInteger(v) && (v as number) >= 0;
  const text = (v: unknown) => typeof v === "string";
  const friend = (v: unknown) => record(v) && text(v.id) && text(v.name);
  const row = (v: unknown) => friend(v) && record(v) && count(v.xp) && count(v.rank) && (v.rank as number) >= 1 && typeof v.isYou === "boolean" && typeof v.friend === "boolean";
  if (!record(value) || !record(value.profile) || !record(value.friends)
    || !text(value.profile.id) || !text(value.profile.displayName) || !text(value.profile.friendCode)
    || typeof value.profile.participating !== "boolean" || !count(value.profile.totalXp) || !count(value.profile.weekXp)
    || !["everyone", "friends"].includes(String(value.scope)) || !["week", "all"].includes(String(value.period))
    || !(value.language === "all" || RANKING_LANGUAGES.some(l => l === value.language))
    || !text(value.weekStartsAt) || !count(value.totalParticipants)
    || !Array.isArray(value.rows) || !value.rows.every(row) || !Array.isArray(value.nearby) || !value.nearby.every(row)
    || !(value.me === null || row(value.me))
    || !["incoming", "outgoing", "accepted", "blocked"].every(k => {
      const list = (value.friends as Record<string, unknown>)[k];
      return Array.isArray(list) && list.every(friend);
    })) {
    throw new RankingClientError(503, "unavailable");
  }
  return value as unknown as RankingSnapshot;
}
