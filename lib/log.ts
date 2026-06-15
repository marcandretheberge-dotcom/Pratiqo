const MAX_STRING = 500;
const MAX_DEPTH = 6;

const SENSITIVE_KEY_FRAGMENTS = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "key",
] as const;

function shouldRedactKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((frag) => lower.includes(frag));
}

function truncateString(s: string): string {
  if (s.length <= MAX_STRING) return s;
  return `${s.slice(0, MAX_STRING)}...\[truncated\]`;
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return "[max-depth]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return truncateString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Error) {
    return {
      type: "Error",
      name: value.name,
      message: truncateString(value.message || ""),
    };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    let i = 0;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (i++ > 80) {
        out["_truncated"] = "object too large";
        break;
      }
      if (shouldRedactKey(k)) {
        out[k] = "[redacted]";
      } else {
        out[k] = sanitizeValue(v, depth + 1);
      }
    }
    return out;
  }
  return truncateString(String(value));
}

function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta || typeof meta !== "object") return undefined;
  try {
    return sanitizeValue(meta, 0) as Record<string, unknown>;
  } catch {
    return { _sanitize: "failed" };
  }
}

function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

function infoLoggingEnabled(): boolean {
  return isDevelopment() || process.env.PRATIQO_LOG_INFO === "1";
}

function formatLine(level: "INFO" | "WARN" | "ERROR", message: string, meta?: Record<string, unknown>): string {
  const safe = sanitizeMeta(meta);
  const suffix =
    safe && Object.keys(safe).length > 0 ? ` ${JSON.stringify(safe)}` : "";
  return `[pratiqo] ${level} ${message}${suffix}`;
}

function emit(level: "INFO" | "WARN" | "ERROR", message: string, meta?: Record<string, unknown>): void {
  try {
    const line = formatLine(level, message, meta);
    if (level === "ERROR") {
      console.error(line);
      return;
    }
    if (level === "WARN") {
      console.warn(line);
      return;
    }
    if (!infoLoggingEnabled()) return;
    console.log(line);
  } catch {
    /* never throw */
  }
}

export function logError(message: string, meta?: Record<string, unknown>): void {
  emit("ERROR", message, meta);
  // Best-effort Sentry forward when DSN is configured. The Sentry shim
  // no-ops silently otherwise. We never throw from here — analytics and
  // monitoring must never affect product behavior.
  try {
    // Lazy import keeps the module dependency-free in environments that
    // don't load the monitoring layer (tests, scripts, etc.).
    void import("@/lib/monitoring/sentry").then(({ captureMonitoringError }) => {
      captureMonitoringError(message, { extra: meta }, "error");
    }).catch(() => { /* best-effort */ });
  } catch {
    /* never throw */
  }
}

export function logWarn(message: string, meta?: Record<string, unknown>): void {
  emit("WARN", message, meta);
}

export function logInfo(message: string, meta?: Record<string, unknown>): void {
  emit("INFO", message, meta);
}

