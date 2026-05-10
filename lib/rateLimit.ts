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

function warnMissingUpstashOnce(): void {
  if (process.env.NODE_ENV !== "development" || missingUpstashLoggedDev) return;
  missingUpstashLoggedDev = true;
  logWarn("[rateLimit] Upstash Redis not configured — rate limiting disabled (fail open).");
}

function throttledUpstashFailureLog(context: string): void {
  const now = Date.now();
  if (now - lastUpstashErrorLogAt < RL_ERROR_LOG_INTERVAL_MS) return;
  lastUpstashErrorLogAt = now;
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
      throttledUpstashFailureLog("invalid-json");
      return null;
    }
    if (!res.ok) {
      throttledUpstashFailureLog(`http-${res.status}`);
      return null;
    }
    if (parsed && typeof parsed === "object" && "error" in parsed) {
      throttledUpstashFailureLog("redis-error-field");
      return null;
    }
    if (parsed && typeof parsed === "object" && "result" in parsed) {
      return (parsed as { result: unknown }).result;
    }
    return null;
  } catch {
    throttledUpstashFailureLog("exception");
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
};

/**
 * Fixed-window counter in Upstash Redis when env is set; otherwise fail open (always allowed).
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
    warnMissingUpstashOnce();
    return { allowed: true, limit, remaining: limit, reset };
  }

  const redisKey = `pratiqo:rl:${safeKeyPart(keyPrefix)}:${subject}:${bucket}`;
  const n = await redisIncr(redisKey);
  if (n === null) {
    throttledUpstashFailureLog("incr");
    return { allowed: true, limit, remaining: limit, reset };
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
