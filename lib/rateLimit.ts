import { NextResponse } from "next/server";
import { logWarn } from "@/lib/log";

const RL_ERROR_LOG_INTERVAL_MS = 60_000;
let lastUpstashErrorLogAt = 0;
let missingUpstashLoggedDev = false;

function hasUpstashEnv(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return Boolean(url && token);
}

/** Production and preview deployments must not fail open when Redis is missing or errors. */
export function isRateLimitInfrastructureRequired(): boolean {
  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
  if (vercelEnv) return vercelEnv === "production";
  return process.env.NODE_ENV === "production";
}

/** Local dev and automated tests keep fail-open behavior with warnings. */
export function isRateLimitDevFriendly(): boolean {
  if (process.env.NODE_ENV === "test") return true;
  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
  if (vercelEnv && vercelEnv !== "production") return true;
  return process.env.NODE_ENV === "development";
}

function warnMissingUpstashOnce(): void {
  if (!isRateLimitDevFriendly() || missingUpstashLoggedDev) return;
  missingUpstashLoggedDev = true;
  logWarn("[rateLimit] Upstash Redis not configured — rate limiting disabled (fail open).");
}

function logMissingUpstashInfrastructure(): void {
  console.error(
    "[rateLimit] Upstash Redis is not configured — denying requests (fail closed in production).",
  );
}

function throttledUpstashFailureLog(context: string, failClosed: boolean): void {
  const now = Date.now();
  if (now - lastUpstashErrorLogAt < RL_ERROR_LOG_INTERVAL_MS) return;
  lastUpstashErrorLogAt = now;
  if (failClosed) {
    console.error("[rateLimit] Upstash request failed — denying requests (fail closed in production).", {
      context,
    });
    return;
  }
  logWarn("[rateLimit] Upstash request failed — allowing request (fail open).", { context });
}

function safeKeyPart(raw: string): string {
  const s = raw.trim().slice(0, 200);
  if (!s) return "unknown";
  return s.replace(/[^\w.-]/g, "_");
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 128);
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf.slice(0, 128);
  return "unknown";
}

async function upstashRedisExec(command: (string | number)[]): Promise<unknown | null> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!baseUrl || !token) return null;
  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      throttledUpstashFailureLog("invalid-json", isRateLimitInfrastructureRequired());
      return null;
    }
    if (!res.ok) {
      throttledUpstashFailureLog(`http-${res.status}`, isRateLimitInfrastructureRequired());
      return null;
    }
    if (parsed && typeof parsed === "object" && "error" in parsed) {
      throttledUpstashFailureLog("redis-error-field", isRateLimitInfrastructureRequired());
      return null;
    }
    if (parsed && typeof parsed === "object" && "result" in parsed) {
      return (parsed as { result: unknown }).result;
    }
    return null;
  } catch {
    throttledUpstashFailureLog("exception", isRateLimitInfrastructureRequired());
    return null;
  }
}

async function redisIncr(key: string): Promise<number | null> {
  const r = await upstashRedisExec(["INCR", key]);
  if (typeof r === "number" && Number.isFinite(r)) return r;
  if (typeof r === "string") {
    const n = Number.parseInt(r, 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

async function redisExpire(key: string, seconds: number): Promise<void> {
  await upstashRedisExec(["EXPIRE", key, String(seconds)]);
}

export type RateLimitOptions = {
  limit: number;
  windowSeconds: number;
  /** Defaults to `getClientIp(req)` */
  identifier?: string;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfterSeconds?: number;
  /** True when Redis is missing or errored in a production-required environment. */
  infrastructureUnavailable?: boolean;
};

function infrastructureDeniedResult(limit: number, reset: number): RateLimitResult {
  return {
    allowed: false,
    limit,
    remaining: 0,
    reset,
    infrastructureUnavailable: true,
    retryAfterSeconds: 60,
  };
}

/**
 * Fixed-window counter in Upstash Redis when env is set.
 * In production: missing Redis or backend errors fail closed (503 via rateLimitGuardResponse).
 * In dev/test: fail open with a one-time warning.
 */
export async function rateLimitByIp(
  req: Request,
  keyPrefix: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = options;
  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  const windowMs = windowSeconds * 1000;
  const bucket = Math.floor(nowMs / windowMs);
  const reset = Math.floor(((bucket + 1) * windowMs) / 1000);
  const subject = safeKeyPart(options.identifier ?? getClientIp(req));

  if (!hasUpstashEnv()) {
    if (isRateLimitDevFriendly()) {
      warnMissingUpstashOnce();
      return { allowed: true, limit, remaining: limit, reset };
    }
    logMissingUpstashInfrastructure();
    return infrastructureDeniedResult(limit, reset);
  }

  const redisKey = `pratiqo:rl:${safeKeyPart(keyPrefix)}:${subject}:${bucket}`;
  const n = await redisIncr(redisKey);
  if (n === null) {
    if (isRateLimitDevFriendly()) {
      throttledUpstashFailureLog("incr", false);
      return { allowed: true, limit, remaining: limit, reset };
    }
    throttledUpstashFailureLog("incr", true);
    return infrastructureDeniedResult(limit, reset);
  }

  if (n === 1) {
    void redisExpire(redisKey, windowSeconds);
  }

  if (n > limit) {
    const retryAfterSeconds = Math.max(1, reset - nowSec);
    return {
      allowed: false,
      limit,
      remaining: 0,
      reset,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - n),
    reset,
  };
}

export function rateLimitUnavailableResponse() {
  return NextResponse.json(
    { error: "Service temporarily unavailable. Please try again later." },
    { status: 503 },
  );
}

export function rateLimitResponse(retryAfterSeconds: number, meta: { limit: number; remaining: number; reset: number }) {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil(retryAfterSeconds))),
        "X-RateLimit-Limit": String(meta.limit),
        "X-RateLimit-Remaining": String(Math.max(0, meta.remaining)),
        "X-RateLimit-Reset": String(meta.reset),
      },
    },
  );
}

/** Returns a 503 (infrastructure) or 429 (quota) response, or null when allowed. */
export function rateLimitGuardResponse(rl: RateLimitResult): NextResponse | null {
  if (rl.infrastructureUnavailable) {
    return rateLimitUnavailableResponse();
  }
  if (!rl.allowed && rl.retryAfterSeconds != null) {
    return rateLimitResponse(rl.retryAfterSeconds, {
      limit: rl.limit,
      remaining: rl.remaining,
      reset: rl.reset,
    });
  }
  return null;
}
