import type {
  CafeInvitationCandidate,
  CafeMissionThemeId,
} from "@/lib/cafe/practiceInvitation";
import type { CafePublicSession } from "@/lib/cafe/publicTypes";

/**
 * Explicit, verified slug → theme associations for real Café sessions.
 *
 * `GET /api/cafe/sessions` does **not** return themeId. Invitation matching
 * must never infer theme from title/slug wording. Ops/Codex may only invite
 * after joining public sessions with this Café-maintained map (or an
 * equivalent verified source reviewed with the session publish flow).
 *
 * Entries here are allowlisted slugs only. An unknown slug stays untagged.
 */
export const CAFE_VERIFIED_THEME_BY_SLUG: Readonly<Partial<Record<string, CafeMissionThemeId>>> = {
  // Curated publish-time associations land here (or via a future admin field).
  // Preview DEMO fixtures carry themeId inline and do not rely on this map.
};

export function lookupVerifiedCafeThemeId(
  slug: string,
  verifiedBySlug: Readonly<Partial<Record<string, CafeMissionThemeId>>> = CAFE_VERIFIED_THEME_BY_SLUG,
): CafeMissionThemeId | null {
  const themeId = verifiedBySlug[slug];
  return themeId === "introductions" ? themeId : null;
}

/** Attach an explicit verified themeId to a public session row. */
export function attachVerifiedCafeTheme(
  session: CafePublicSession,
  verifiedBySlug: Readonly<Partial<Record<string, CafeMissionThemeId>>> = CAFE_VERIFIED_THEME_BY_SLUG,
): CafeInvitationCandidate {
  return {
    ...session,
    themeId: lookupVerifiedCafeThemeId(session.slug, verifiedBySlug),
  };
}

export function attachVerifiedCafeThemes(
  sessions: CafePublicSession[],
  verifiedBySlug: Readonly<Partial<Record<string, CafeMissionThemeId>>> = CAFE_VERIFIED_THEME_BY_SLUG,
): CafeInvitationCandidate[] {
  return sessions.map((session) => attachVerifiedCafeTheme(session, verifiedBySlug));
}
