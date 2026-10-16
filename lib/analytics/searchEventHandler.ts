import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimitByIp, rateLimitGuardResponse, type RateLimitResult } from "@/lib/rateLimit";

const MAX_BODY_BYTES = 4_096;
const SEARCH_EVENT_RATE_LIMIT = { limit: 30, windowSeconds: 60 } as const;

export type SearchEventBody = {
  anonymous_session_id?: string | null;
  source: string;
  category?: string | null;
  subject?: string | null;
  format?: string | null;
  city?: string | null;
  region?: string | null;
  country_code?: string | null;
  timezone?: string | null;
  filters: Record<string, unknown>;
  result_count?: number | null;
  clicked_teacher_id?: string | null;
  booked_teacher_id?: string | null;
};

type SearchEventRow = SearchEventBody & {
  user_id: string | null;
};

type ParseResult =
  | { ok: true; data: SearchEventBody }
  | { ok: false; status: 400 | 413 };

type SearchEventHandlerDeps = {
  getUserId?: (request: Request) => Promise<string | null>;
  insert?: (row: SearchEventRow) => void;
  rateLimit?: (request: Request, keyPrefix: string, options: typeof SEARCH_EVENT_RATE_LIMIT) => Promise<RateLimitResult>;
  rateLimitGuard?: (rl: RateLimitResult) => NextResponse | null;
};

const FIELD_LIMITS = {
  anonymous_session_id: 128,
  source: 64,
  category: 100,
  subject: 100,
  format: 40,
  city: 120,
  region: 80,
  country_code: 10,
  timezone: 80,
  clicked_teacher_id: 80,
  booked_teacher_id: 80,
} as const satisfies Record<keyof Omit<SearchEventBody, "filters" | "result_count">, number>;

type ParsedStringFields = {
  [K in keyof typeof FIELD_LIMITS]: { ok: true; value: string | null };
};

function safeError(status: 400 | 413) {
  return NextResponse.json({ ok: false }, { status });
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function parseContentLength(request: Request): number | null {
  const raw = request.headers.get("content-length");
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseStringField<K extends keyof typeof FIELD_LIMITS>(
  raw: Record<string, unknown>,
  key: K,
  required = false,
): { ok: true; value: string | null } | { ok: false } {
  const value = raw[key];
  if (value == null) return required ? { ok: false } : { ok: true, value: null };
  if (typeof value !== "string") return { ok: false };
  const trimmed = value.trim();
  if (!trimmed) return required ? { ok: false } : { ok: true, value: null };
  if (trimmed.length > FIELD_LIMITS[key]) return { ok: false };
  return { ok: true, value: trimmed };
}

function sanitizeFilterValue(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return value.trim().slice(0, 160);
  if (Array.isArray(value)) return depth >= 2 ? [] : value.slice(0, 20).map((item) => sanitizeFilterValue(item, depth + 1));
  if (typeof value === "object") {
    if (depth >= 2) return {};
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value).slice(0, 20)) {
      const safeKey = key.trim().slice(0, 80);
      if (safeKey) out[safeKey] = sanitizeFilterValue(item, depth + 1);
    }
    return out;
  }
  return null;
}

function parseFilters(value: unknown): { ok: true; value: Record<string, unknown> } | { ok: false } {
  if (value == null) return { ok: true, value: {} };
  if (typeof value !== "object" || Array.isArray(value)) return { ok: false };
  const sanitized = sanitizeFilterValue(value);
  if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) return { ok: false };
  const serialized = JSON.stringify(sanitized);
  if (byteLength(serialized) > 1_024) return { ok: false };
  return { ok: true, value: sanitized as Record<string, unknown> };
}

function parseResultCount(value: unknown): { ok: true; value: number | null } | { ok: false } {
  if (value == null) return { ok: true, value: null };
  if (typeof value !== "number" || !Number.isFinite(value)) return { ok: false };
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > 10_000) return { ok: false };
  return { ok: true, value: rounded };
}

export function parseSearchEventPayload(raw: unknown): ParseResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, status: 400 };
  const input = raw as Record<string, unknown>;

  const fields = {
    anonymous_session_id: parseStringField(input, "anonymous_session_id"),
    source: parseStringField(input, "source", true),
    category: parseStringField(input, "category"),
    subject: parseStringField(input, "subject"),
    format: parseStringField(input, "format"),
    city: parseStringField(input, "city"),
    region: parseStringField(input, "region"),
    country_code: parseStringField(input, "country_code"),
    timezone: parseStringField(input, "timezone"),
    clicked_teacher_id: parseStringField(input, "clicked_teacher_id"),
    booked_teacher_id: parseStringField(input, "booked_teacher_id"),
  };

  for (const field of Object.values(fields)) {
    if (!field.ok) return { ok: false, status: 400 };
  }

  const parsedFields = fields as ParsedStringFields;

  const filters = parseFilters(input.filters);
  if (!filters.ok) return { ok: false, status: 400 };
  const resultCount = parseResultCount(input.result_count);
  if (!resultCount.ok) return { ok: false, status: 400 };
  const source = parsedFields.source.value;
  if (!source) return { ok: false, status: 400 };

  return {
    ok: true,
    data: {
      anonymous_session_id: parsedFields.anonymous_session_id.value,
      source,
      category: parsedFields.category.value,
      subject: parsedFields.subject.value,
      format: parsedFields.format.value,
      city: parsedFields.city.value,
      region: parsedFields.region.value,
      country_code: parsedFields.country_code.value,
      timezone: parsedFields.timezone.value,
      filters: filters.value,
      result_count: resultCount.value,
      clicked_teacher_id: parsedFields.clicked_teacher_id.value,
      booked_teacher_id: parsedFields.booked_teacher_id.value,
    },
  };
}

async function readSearchEventJson(request: Request): Promise<ParseResult> {
  const contentLength = parseContentLength(request);
  if (contentLength != null && contentLength > MAX_BODY_BYTES) return { ok: false, status: 413 };

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) return { ok: false, status: 400 };

  let text = "";
  try {
    text = await request.text();
  } catch {
    return { ok: false, status: 400 };
  }
  if (!text.trim()) return { ok: false, status: 400 };
  if (byteLength(text) > MAX_BODY_BYTES) return { ok: false, status: 413 };

  try {
    return parseSearchEventPayload(JSON.parse(text) as unknown);
  } catch {
    return { ok: false, status: 400 };
  }
}

async function getUserIdFromBearer(request: Request): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function tryAdminInsert(row: SearchEventRow) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  void admin.from("search_events").insert(row).then(({ error }) => {
    if (error) console.error("[search_events] insert failed", { code: (error as { code?: string }).code });
  });
}

export async function handleSearchEventPost(request: Request, deps: SearchEventHandlerDeps = {}) {
  const rl = await (deps.rateLimit ?? rateLimitByIp)(request, "search-analytics", SEARCH_EVENT_RATE_LIMIT);
  const rateLimited = (deps.rateLimitGuard ?? rateLimitGuardResponse)(rl);
  if (rateLimited) return rateLimited;

  const parsed = await readSearchEventJson(request);
  if (!parsed.ok) return safeError(parsed.status);

  try {
    const userId = await (deps.getUserId ?? getUserIdFromBearer)(request).catch(() => null);
    const row: SearchEventRow = {
      user_id: userId,
      ...parsed.data,
    };
    try {
      (deps.insert ?? tryAdminInsert)(row);
    } catch {
      console.error("[search-event] insert dispatch failed");
    }
  } catch {
    console.error("[search-event] unexpected handler failure");
  }

  return NextResponse.json({ ok: true });
}

