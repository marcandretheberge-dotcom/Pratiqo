import type { TeacherBookKind } from "@/components/TeacherProfile";

export type MarketplaceResumeSource = "landing" | "search";

export type MarketplaceResumeIntent = {
  teacherId: string;
  bookKind?: TeacherBookKind;
  source: MarketplaceResumeSource;
  createdAt: number;
};

const STORAGE_KEY = "pratiqo.marketplace.resumeBook";

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
  if (v.bookKind !== undefined && v.bookKind !== "standard" && v.bookKind !== "home") return false;
  return true;
}

/** Persist guest book intent before redirecting to login. */
export function setMarketplaceResumeIntent(intent: {
  teacherId: string;
  bookKind?: TeacherBookKind;
  source: MarketplaceResumeSource;
}): void {
  if (!canUseSessionStorage()) return;
  const payload: MarketplaceResumeIntent = {
    teacherId: intent.teacherId,
    bookKind: intent.bookKind,
    source: intent.source,
    createdAt: Date.now(),
  };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / privacy mode */
  }
}

/** Read intent without clearing (e.g. diagnostics). */
export function peekMarketplaceResumeIntent(): MarketplaceResumeIntent | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidIntent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Read and remove guest book intent (call after successful resume). */
export function consumeMarketplaceResumeIntent(): MarketplaceResumeIntent | null {
  const intent = peekMarketplaceResumeIntent();
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
