import type { TeacherBookKind } from "@/components/TeacherProfile";

export type MarketplaceResumeSource = "landing" | "search";

export type MarketplaceResumeIntent = {
  teacherId: string;
  bookKind?: TeacherBookKind;
  source: MarketplaceResumeSource;
  createdAt: number;
  expiresAt: number;
};

/** Guest book intent TTL — matches post-login redirect window. */
export const MARKETPLACE_RESUME_INTENT_TTL_MS = 30 * 60 * 1000;

const STORAGE_KEY = "pratiqo.marketplace.resumeBook";

export type GuestBookResumePlan =
  | { status: "noop" }
  | { status: "wait" }
  | { status: "discard" }
  | { status: "ready"; intent: MarketplaceResumeIntent };

function canUseSessionStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = "__pratiqo_ss_probe__";
    window.sessionStorage.setItem(probe, "1");
    window.sessionStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function isValidIntent(value: unknown): value is MarketplaceResumeIntent {
  if (!value || typeof value !== "object") return false;
  const v = value as MarketplaceResumeIntent;
  if (typeof v.teacherId !== "string" || !v.teacherId.trim()) return false;
  if (v.source !== "landing" && v.source !== "search") return false;
  if (typeof v.createdAt !== "number" || !Number.isFinite(v.createdAt)) return false;
  if (typeof v.expiresAt !== "number" || !Number.isFinite(v.expiresAt)) return false;
  if (v.bookKind !== undefined && v.bookKind !== "standard" && v.bookKind !== "home") return false;
  return true;
}

export function isMarketplaceResumeIntentExpired(
  intent: MarketplaceResumeIntent,
  now = Date.now(),
): boolean {
  return now >= intent.expiresAt;
}

/** Persist guest book intent before redirecting to login. */
export function setMarketplaceResumeIntent(intent: {
  teacherId: string;
  bookKind?: TeacherBookKind;
  source: MarketplaceResumeSource;
}): void {
  if (!canUseSessionStorage()) return;
  const createdAt = Date.now();
  const payload: MarketplaceResumeIntent = {
    teacherId: intent.teacherId,
    bookKind: intent.bookKind,
    source: intent.source,
    createdAt,
    expiresAt: createdAt + MARKETPLACE_RESUME_INTENT_TTL_MS,
  };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / privacy mode */
  }
}

/**
 * Read intent without clearing. Clears storage only when payload is invalid or expired.
 */
export function peekMarketplaceResumeIntent(): MarketplaceResumeIntent | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidIntent(parsed)) {
      clearMarketplaceResumeIntent();
      return null;
    }
    if (isMarketplaceResumeIntentExpired(parsed)) {
      clearMarketplaceResumeIntent();
      return null;
    }
    return parsed;
  } catch {
    clearMarketplaceResumeIntent();
    return null;
  }
}

/** Read and remove guest book intent — call only after a successful resume. */
export function consumeMarketplaceResumeIntent(): MarketplaceResumeIntent | null {
  const intent = peekMarketplaceResumeIntent();
  if (!intent) return null;
  clearMarketplaceResumeIntent();
  return intent;
}

export function clearMarketplaceResumeIntent(): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Decide whether to wait, discard, or apply a stored guest book intent.
 * Uses peek only — does not clear until discard/ready (ready → caller must consume).
 */
export function planGuestBookResume(params: {
  loadingTeachers: boolean;
  teacherIds: string[];
}): GuestBookResumePlan {
  const intent = peekMarketplaceResumeIntent();
  if (!intent) return { status: "noop" };
  if (params.loadingTeachers || params.teacherIds.length === 0) {
    return { status: "wait" };
  }
  if (!params.teacherIds.includes(intent.teacherId)) {
    return { status: "discard" };
  }
  return { status: "ready", intent };
}
