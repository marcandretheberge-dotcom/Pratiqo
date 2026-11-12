/**
 * Optional local-only Café sandbox connect-src origin.
 *
 * Set CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN to an exact origin such as
 * http://127.0.0.1:55421 when running the isolated local Auth/API sandbox.
 * Production (VERCEL_ENV=production) must never set this variable; resolve
 * throws if it is present there so misconfiguration fails closed.
 */

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

type EnvLike = Record<string, string | undefined>;

export function resolveCafeLocalSandboxConnectOrigin(
  env: EnvLike = process.env,
): string | null {
  const raw = env.CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN?.trim() ?? "";
  if (!raw) return null;

  if (env.VERCEL_ENV === "production") {
    throw new Error(
      "CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN must not be set when VERCEL_ENV=production",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN must be an absolute origin, got: ${raw}`,
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN must use http: or https:");
  }
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(
      "CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN hostname must be exactly 127.0.0.1 or localhost",
    );
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN must not include credentials or query/hash");
  }
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    throw new Error("CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN must be origin-only (no path)");
  }

  return parsed.origin;
}

/** Extra connect-src tokens for the local sandbox (http + ws upgrade of the same origin). */
export function cafeLocalSandboxConnectSrcExtra(
  env: EnvLike = process.env,
): string {
  const origin = resolveCafeLocalSandboxConnectOrigin(env);
  if (!origin) return "";
  const wsOrigin = origin.replace(/^http/i, "ws");
  return ` ${origin} ${wsOrigin}`;
}
