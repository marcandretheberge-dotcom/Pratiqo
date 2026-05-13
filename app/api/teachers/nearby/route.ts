import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * PostGIS-backed "teachers near me" lookup. Wraps the `nearby_teachers` RPC
 * defined in migration 056_teachers_postgis_search.sql.
 *
 * Returns: `{ teachers: Array<{ id: string; distanceKm: number }> }`
 *
 * Callers should treat a 404/missing-function response as "fall back to the
 * client-side haversine path" so the app keeps working between deploy and
 * migration application.
 *
 * Privacy: no coordinates leave the server — only ids + computed distances.
 */
export const runtime = "edge";

const MAX_RADIUS_KM = 100;
const MAX_LIMIT = 500;

function parseFiniteNumber(raw: string | null, fallback: number | null = null): number | null {
  if (raw == null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = parseFiniteNumber(url.searchParams.get("lat"));
  const lng = parseFiniteNumber(url.searchParams.get("lng"));
  const radiusKm = parseFiniteNumber(url.searchParams.get("radiusKm"), 25);
  const limit = parseFiniteNumber(url.searchParams.get("limit"), 200);

  if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: "Missing or invalid lat/lng" },
      { status: 400 },
    );
  }
  if (radiusKm == null || radiusKm <= 0) {
    return NextResponse.json({ error: "Invalid radiusKm" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const clampedRadius = Math.min(Math.max(radiusKm, 0.1), MAX_RADIUS_KM);
  const clampedLimit = Math.min(Math.max(limit ?? 200, 1), MAX_LIMIT);

  const { data, error } = await supabase.rpc("nearby_teachers", {
    p_lat: lat,
    p_lng: lng,
    p_radius_km: clampedRadius,
    p_limit: clampedLimit,
  });

  if (error) {
    // Migration not yet applied (function missing) or RLS denial — surface
    // a structured error so the client can fall back without retrying.
    // Postgres returns 42883 ("undefined_function") for missing SQL functions;
    // PostgREST returns PGRST202 with "Could not find the function ... in the
    // schema cache" when the OpenAPI cache hasn't picked it up yet.
    const message = error.message ?? "";
    const isMissing =
      error.code === "42883" ||
      error.code === "PGRST202" ||
      /function .*nearby_teachers.* does not exist/i.test(message) ||
      /could not find the function .*nearby_teachers/i.test(message);
    return NextResponse.json(
      {
        error: isMissing ? "nearby_teachers_unavailable" : "rpc_failed",
        message,
      },
      { status: isMissing ? 503 : 500 },
    );
  }

  const rows = Array.isArray(data) ? data : [];
  const teachers = rows.map((r) => ({
    id: String((r as { id?: string }).id ?? ""),
    distanceKm: Number((r as { distance_km?: number }).distance_km ?? 0),
  }));

  return NextResponse.json(
    { teachers },
    {
      headers: {
        // Short cache to absorb burst-clicking on the radius pills without
        // hammering Postgres. Per-IP, per-distance, per-lat/lng triplet.
        "Cache-Control": "private, max-age=30",
      },
    },
  );
}
