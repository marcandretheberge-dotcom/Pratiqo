/**
 * Café room-route header helpers (PR3b).
 * Camera/mic may be delegated only to `self` and the configured Daily origin.
 * Screen capture stays disabled.
 */

type EnvLike = Record<string, string | undefined>;

/** Resolve https origin from DAILY_DOMAIN (e.g. pratiqo.daily.co → https://pratiqo.daily.co). */
export function resolveConfiguredDailyOrigin(env: EnvLike = process.env): string | null {
  const raw = env.DAILY_DOMAIN?.trim() ?? "";
  if (!raw) return null;

  let host = raw;
  try {
    if (raw.includes("://")) {
      const parsed = new URL(raw);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
      host = parsed.hostname;
    }
  } catch {
    return null;
  }

  host = host.replace(/\/+$/, "").toLowerCase();
  if (!host || host.includes("/") || host.includes(" ") || host.startsWith(".")) return null;
  // Fail closed on wildcards / non-daily hosts in this allowlist helper.
  if (host.includes("*") || host.includes("?")) return null;
  if (!/^(?:[a-z0-9-]+\.)*daily\.co$/.test(host)) return null;
  return `https://${host}`;
}

export function buildCafeRoomPermissionsPolicy(env: EnvLike = process.env): string {
  const dailyOrigin = resolveConfiguredDailyOrigin(env);
  const cameraAllow = dailyOrigin ? `(self "${dailyOrigin}")` : "(self)";
  const micAllow = dailyOrigin ? `(self "${dailyOrigin}")` : "(self)";
  return [
    `camera=${cameraAllow}`,
    `microphone=${micAllow}`,
    // Screen share remains unavailable for the pilot.
    "display-capture=()",
    "geolocation=()",
    "payment=()",
    "usb=()",
    "magnetometer=()",
    "accelerometer=()",
    "gyroscope=()",
  ].join(", ");
}

export function buildDefaultPermissionsPolicy(): string {
  return [
    "camera=()",
    "microphone=()",
    "geolocation=()",
    "payment=()",
    "usb=()",
    "magnetometer=()",
    "accelerometer=()",
    "gyroscope=()",
  ].join(", ");
}

export type NextHeaderRule = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};

/**
 * Room-specific Permissions-Policy must win over the site-wide deny.
 * Next applies the last matching `source`, so the catch-all comes first
 * and café room routes override it afterward.
 */
export function orderCafeHeaderRules(input: {
  defaultHeaders: Array<{ key: string; value: string }>;
  cafeRoomPermissionsPolicy: string;
}): NextHeaderRule[] {
  const cafeRoomHeaders = input.defaultHeaders.map((header) =>
    header.key === "Permissions-Policy"
      ? { key: header.key, value: input.cafeRoomPermissionsPolicy }
      : header,
  );

  return [
    {
      source: "/:path*",
      headers: input.defaultHeaders,
    },
    {
      source: "/cafe/:slug/salle",
      headers: cafeRoomHeaders,
    },
    {
      source: "/cafe/preview/salle",
      headers: cafeRoomHeaders,
    },
    {
      source: "/cafe/appels/:callId",
      headers: cafeRoomHeaders,
    },
  ];
}
