import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeLocale, type Locale } from "@/lib/i18n/types";

export type EmailLocale = Locale;

export const EMAIL_FALLBACK_LOCALE: EmailLocale = "fr";

export type ResolveEmailLocaleInput = {
  profileLocale?: string | null;
  profileLanguage?: string | null;
  preferredLocale?: string | null;
  bookingLocale?: string | null;
  authUserLocale?: string | null;
  countryCode?: string | null;
  region?: string | null;
};

export function normalizeEmailLocale(value: string | null | undefined): EmailLocale | null {
  if (!value?.trim()) return null;
  return normalizeLocale(value);
}

export function inferEmailLocaleFromRegion(input: {
  countryCode?: string | null;
  region?: string | null;
}): EmailLocale | null {
  const country = String(input.countryCode ?? "")
    .trim()
    .toUpperCase();
  const regionRaw = String(input.region ?? "").trim();
  const region = regionRaw.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

  if (country === "UY") return "es";

  if (
    region === "qc" ||
    region === "quebec" ||
    region.includes("quebec")
  ) {
    return "fr";
  }

  if (region === "on" || region === "ontario") return "en";

  if (country === "CA") return "en";

  return null;
}

export function resolveEmailLocale(input: ResolveEmailLocaleInput = {}): EmailLocale {
  const explicit =
    normalizeEmailLocale(input.profileLocale) ??
    normalizeEmailLocale(input.preferredLocale) ??
    normalizeEmailLocale(input.profileLanguage) ??
    normalizeEmailLocale(input.authUserLocale) ??
    normalizeEmailLocale(input.bookingLocale);

  if (explicit) return explicit;

  const inferred = inferEmailLocaleFromRegion({
    countryCode: input.countryCode,
    region: input.region,
  });
  if (inferred) return inferred;

  return EMAIL_FALLBACK_LOCALE;
}

export function resolveEmailLocaleFromOptional(locale?: EmailLocale): EmailLocale {
  if (locale) return locale;
  return EMAIL_FALLBACK_LOCALE;
}

function readAuthUserLocale(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) return null;
  const keys = ["locale", "preferred_locale", "language", "preferred_language", "user_locale"] as const;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export async function resolveEmailLocaleForUser(
  admin: SupabaseClient,
  userId: string,
): Promise<EmailLocale> {
  const { data: profile } = await admin
    .from("profiles")
    .select("country_code, region")
    .eq("id", userId)
    .maybeSingle();

  let authUserLocale: string | null = null;
  try {
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    authUserLocale = readAuthUserLocale(
      (authUser?.user?.user_metadata ?? {}) as Record<string, unknown>,
    );
  } catch {
    authUserLocale = null;
  }

  return resolveEmailLocale({
    authUserLocale,
    countryCode: (profile as { country_code?: string | null } | null)?.country_code,
    region: (profile as { region?: string | null } | null)?.region,
  });
}
