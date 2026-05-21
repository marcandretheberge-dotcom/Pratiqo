/**
 * Client-safe redirect-path sanitization helpers.
 *
 * Kept in their own module (with zero server-only imports) so that client
 * components — e.g. the `/login` page — can sanitize an untrusted `next`
 * query param before forwarding it through Google OAuth.
 *
 * The server `lib/auth/admin.ts` re-exports these to preserve a single
 * source of truth for redirect safety rules.
 */

/**
 * Accept only same-origin relative paths (single leading slash, no
 * protocol-relative URLs, no embedded `://`).
 */
export function sanitizeRelativeRedirectPath(path: string | null | undefined): string | null {
  if (path == null) return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.includes("://")) return null;
  return trimmed;
}

/** Admin post-login `next` param must stay under `/admin`. */
export function sanitizeAdminRedirectPath(path: string | null | undefined): string | null {
  const safe = sanitizeRelativeRedirectPath(path);
  if (!safe) return null;
  if (safe === "/admin" || safe.startsWith("/admin/")) return safe;
  return null;
}
