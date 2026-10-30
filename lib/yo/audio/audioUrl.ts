/**
 * YoPratiqo — public Supabase Storage URL builder for audio assets.
 *
 * This file is safe to import from BOTH server and client code:
 *   - it reads only `NEXT_PUBLIC_SUPABASE_URL` (already exposed in the
 *     browser bundle by Next.js — same env var the public anon client
 *     uses);
 *   - it never reads `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY`;
 *   - it never imports `lib/supabaseAdmin.ts` or `@supabase/supabase-js`,
 *     so no Supabase JS bundle is forced into client chunks.
 *
 * Storage URL shape (Supabase v1 public bucket convention — stable):
 *
 *     <SUPABASE_URL>/storage/v1/object/public/<bucket>/<storagePath>
 *
 *   e.g. https://xyz.supabase.co/storage/v1/object/public/yopratiqo-audio/yo/es/intro-a1/universal-words/word/hola.mp3
 *
 * The generator script uses Supabase's typed JS SDK (server-side, with
 * the service-role key) to upload to `<bucket>/<storagePath>`; the
 * resulting public read URL matches the one this helper builds.
 */

// Keep URL construction independent of every language's recording registry.
import { YOPRATIQO_AUDIO_BUCKET_DEFAULT } from "@/lib/yo/audio/audioManifest.types-internal";

/** Reserved query string used to bust the browser/CDN cache when audio is regenerated. */
export const YOPRATIQO_AUDIO_VERSION_PARAM = "v" as const;

/** Resolve the Supabase public origin once, lazily. */
function getPublicSupabaseOrigin(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return null;
  // Strip a trailing slash so the joined path is normalised regardless
  // of how the env var was authored.
  return url.replace(/\/+$/, "");
}

export interface BuildAudioUrlOptions {
  /**
   * Override the bucket. Defaults to `YOPRATIQO_AUDIO_BUCKET_DEFAULT`
   * (`"yopratiqo-audio"`). The browser does not need to know the bucket
   * via env — it is not a secret.
   */
  bucket?: string;
  /**
   * Optional cache-bust token. When set, appended as `?v=<token>`.
   * Useful if a manifest entry's text changes and we re-generate audio
   * under the same `storagePath` (we still recommend allocating a new
   * slug instead, but this is a safety valve).
   */
  version?: string;
}

/**
 * Build the public read URL for a manifest item.
 *
 * Returns `null` when `NEXT_PUBLIC_SUPABASE_URL` is missing (e.g. tests
 * running with no `.env.local`). Callers MUST handle the null case —
 * the AudioPlayer renders a disabled fallback rather than a broken
 * `<audio>` element.
 */
export function buildPublicAudioUrl(
  storagePath: string,
  options: BuildAudioUrlOptions = {},
): string | null {
  const origin = getPublicSupabaseOrigin();
  if (!origin) return null;

  const bucket = options.bucket?.trim() || YOPRATIQO_AUDIO_BUCKET_DEFAULT;

  // Defensive: ensure the path does not start with a leading slash
  // (tests already enforce this on the manifest, but client callers
  // could pass a custom path in future).
  const normalisedPath = storagePath.replace(/^\/+/, "");

  const base = `${origin}/storage/v1/object/public/${bucket}/${normalisedPath}`;
  if (options.version) {
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}${YOPRATIQO_AUDIO_VERSION_PARAM}=${encodeURIComponent(
      options.version,
    )}`;
  }
  return base;
}
