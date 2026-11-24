import { isUuidString } from "@/lib/uuid";
import { buildLoginHrefForProtectedReturn } from "@/lib/auth/preAuthOnboardingIntent";

type Kind = "standard" | "home";
export type GuestBookingChoice = { kind: Kind; offerId: string | null };

export function readBookingChoice(query: URLSearchParams): GuestBookingChoice | null {
  const kind = query.get("book");
  const offerId = query.get("offer");
  if ((kind !== "standard" && kind !== "home") || (offerId !== null && !isUuidString(offerId))) return null;
  return { kind, offerId };
}

export function bookingChoiceSuffix(choice: GuestBookingChoice | null) {
  if (!choice) return "";
  const params = new URLSearchParams({ book: choice.kind });
  if (choice.offerId) params.set("offer", choice.offerId);
  return "?" + params.toString();
}

const STORAGE_KEY = "pratiqo.pendingLesson";
export function guestBookingLogin(teacherId: string, kind: Kind, offerId?: string | null) {
  const path = `/teacher/profile/${encodeURIComponent(teacherId)}${bookingChoiceSuffix({ kind, offerId: offerId ?? null })}`;
  // First-time learners may pass through companion selection and consent before returning.
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ path, expires: Date.now() + 60 * 60 * 1000 }));
  } catch { /* The OAuth return URL also carries the selection. */ }
  return buildLoginHrefForProtectedReturn(path);
}

export function pendingGuestBookingPath(): string | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    if (value?.expires > Date.now() && typeof value.path === "string" &&
        /^\/teacher\/profile\/[\w%-]+\?book=(standard|home)(&offer=[\da-f-]+)?$/i.test(value.path)) return value.path;
  } catch { /* Storage is optional. */ }
  return null;
}

export function clearGuestBooking() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* Storage is optional. */ }
}
