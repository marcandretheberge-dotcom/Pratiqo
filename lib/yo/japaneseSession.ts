import { JAPANESE_PROGRESS_KEY } from "./japaneseCourseProgress";

export const JAPANESE_SESSION_KEY = "yopratiqo:japanese-foundations:session:v1";
export type JapaneseLocalStorage = Pick<Storage, "getItem" | "setItem">;
type Session = { version: 1; epoch: string; progressSeen: boolean };

function newEpoch() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * A local reset marker, separate from the unchanged v1 result ledger. Every
 * writer reads the actual storage value; a delayed remove event is not a reset.
 * Removing course progress (or clearing storage) invalidates all open attempts.
 */
export function readJapaneseSession(storage: JapaneseLocalStorage, create = true): { epoch: string; progressRaw: string | null } {
  const progressRaw = storage.getItem(JAPANESE_PROGRESS_KEY);
  const raw = storage.getItem(JAPANESE_SESSION_KEY);
  let session: Session | null = null;
  if (raw && raw.length < 300) try {
    const value = JSON.parse(raw);
    if (value?.version === 1 && typeof value.epoch === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(value.epoch) && typeof value.progressSeen === "boolean") session = value;
  } catch { /* A missing or invalid marker starts a new local generation. */ }
  // Read-only legacy callers need no metadata until a draft-aware player exists.
  if (!session && !create) return { epoch: "", progressRaw };
  if (!session || session.progressSeen && progressRaw === null) session = { version: 1, epoch: newEpoch(), progressSeen: false };
  if (progressRaw !== null && !session.progressSeen) session = { ...session, progressSeen: true };
  const encoded = JSON.stringify(session);
  if (encoded !== raw) storage.setItem(JAPANESE_SESSION_KEY, encoded);
  return { epoch: session.epoch, progressRaw };
}
