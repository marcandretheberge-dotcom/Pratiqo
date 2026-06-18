import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";

/** Build the Supabase OAuth redirectTo URL (must be allowlisted in Supabase). */
export function buildOAuthCallbackUrl(
  origin: string,
  params: { intent?: string; role?: string; next: string; ref?: string },
): string {
  const qs = new URLSearchParams();
  if (params.intent) qs.set("intent", params.intent);
  if (params.role) qs.set("role", params.role);
  qs.set("next", params.next);
  if (params.ref) qs.set("ref", params.ref);
  const base = origin.replace(/\/$/, "");
  return `${base}/auth/callback?${qs.toString()}`;
}

/** Prefer configured public site URL on production host; else current origin (preview/local). */
export function resolveOAuthRedirectOrigin(): string {
  if (typeof window === "undefined") return "";
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) {
    try {
      const configuredHost = new URL(configured).hostname;
      if (window.location.hostname === configuredHost) {
        return configured;
      }
    } catch {
      /* ignore invalid env */
    }
  }
  return window.location.origin;
}

export function buildLoginUrlWithAuthError(
  origin: string,
  options?: { authError?: string; intent?: string | null; role?: string | null; next?: string | null },
): URL {
  const url = new URL("/login", origin);
  if (options?.authError) url.searchParams.set("auth_error", options.authError);
  const safeNext = sanitizeRelativeRedirectPath(options?.next ?? null);
  if (options?.intent === "learner" || options?.intent === "teacher") {
    url.searchParams.set("intent", options.intent);
  } else if (options?.role === "teacher") {
    url.searchParams.set("intent", "teacher");
  }
  if (safeNext) url.searchParams.set("next", safeNext);
  return url;
}
