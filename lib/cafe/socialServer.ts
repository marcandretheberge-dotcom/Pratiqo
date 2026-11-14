import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isCafePracticeLanguageCode } from "@/lib/cafe/practiceLanguages";

export function createCafeSocialUserClient(accessToken: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function parsePracticeLanguage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toLowerCase();
  return isCafePracticeLanguageCode(code) ? code : null;
}

export function sanitizeCafeMessageBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const body = value.replace(/\s+/g, " ").trim();
  if (body.length < 1 || body.length > 500) return null;
  return body;
}
