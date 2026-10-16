import { NextResponse } from "next/server";
import { validTeacherSetupTimeZone } from "@/lib/teachers/guidedSetup";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { blurCoordinates } from "@/lib/maps";
import { resolveLocationVerificationWrite } from "@/lib/teacherLocationVerification";
import {
  isTeacherMarketSupported,
  marketNotSupportedPayload,
} from "@/lib/config/markets";

export const runtime = "nodejs";

// Fuzz radius applied to all addresses. Unknown area type → 1 km.
// TODO: implement urban/rural classification (0.5 km urban, 1 km rural) once
//       a PostGIS boundary dataset or external classification API is available.
const FUZZ_RADIUS_KM = 1;

type NominatimResult = { lat: string; lon: string };

/**
 * Geocode an address string using OpenStreetMap Nominatim.
 * No API key required. Rate-limited to 1 req/s by OSM policy — acceptable here
 * since this route is called at most once per teacher profile save.
 * Returns null on failure so the caller can degrade gracefully.
 */
async function geocodeNominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({ q: query, format: "json", limit: "1", addressdetails: "0" });
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Pratiqo/1.0 (info@pratiqo.ca)",
        "Accept-Language": "fr,en",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResult[];
    if (!data.length) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

type RequestBody = {
  timezone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country_code?: string;
  lat?: number;
  lng?: number;
  home_lesson_radius_km?: number;
};

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Configuration manquante." }, { status: 500 });
  }

  const supabaseUser = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser(token);
  if (userErr || !user) {
    return NextResponse.json({ error: "Session invalide." }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const city = body.city?.trim() ?? "";
  if (body.timezone !== undefined && !validTeacherSetupTimeZone(body.timezone)) {
    return NextResponse.json({ error: "invalid_timezone" }, { status: 400 });
  }
  const region = body.region?.trim() ?? "";
  const countryCode = body.country_code?.trim().toUpperCase() ?? "";
  const addressLine1 = body.address_line1?.trim() ?? "";
  const addressLine2 = body.address_line2?.trim() ?? "";
  const postalCode = body.postal_code?.trim() ?? "";

  if (!city || !region || !countryCode) {
    return NextResponse.json(
      { error: "Ville, région et code pays sont requis." },
      { status: 400 },
    );
  }
  if (countryCode.length !== 2) {
    return NextResponse.json(
      { error: "Le code pays doit comporter 2 lettres (ex : CA, FR, UY)." },
      { status: 400 },
    );
  }
  if (!isTeacherMarketSupported(countryCode)) {
    return NextResponse.json(marketNotSupportedPayload(countryCode), { status: 403 });
  }

  // ── Resolve teacher — never trust a client-supplied teacher ID ─────────────
  const admin = getSupabaseAdmin();
  const { data: teacher, error: tErr } = await admin
    .from("teachers")
    .select("id, location")
    .eq("user_id", user.id)
    .maybeSingle();

  if (tErr || !teacher) {
    return NextResponse.json({ error: "Profil professeur introuvable." }, { status: 404 });
  }

  const teacherId = (teacher as { id: string }).id;
  const existingLoc: Record<string, unknown> =
    typeof (teacher as { location?: unknown }).location === "object" &&
    (teacher as { location?: unknown }).location !== null
      ? ((teacher as { location: Record<string, unknown> }).location)
      : {};

  const now = new Date().toISOString();

  // ── Build location.private (exact address — never returned to public clients) ─
  const existingPrivate: Record<string, unknown> =
    typeof existingLoc.private === "object" && existingLoc.private !== null
      ? (existingLoc.private as Record<string, unknown>)
      : {};

  const privateBlock: Record<string, unknown> = {
    ...existingPrivate,
    geocoded_at: now,
  };
  if (addressLine1) privateBlock.address_line1 = addressLine1;
  else delete privateBlock.address_line1;
  if (addressLine2) privateBlock.address_line2 = addressLine2;
  else delete privateBlock.address_line2;
  if (postalCode) privateBlock.postal_code = postalCode;
  else delete privateBlock.postal_code;

  // ── Geocode ───────────────────────────────────────────────────────────────
  // Prefer client-supplied lat/lng (from Google Maps Autocomplete on the page).
  // Fall back to Nominatim server-side geocoding if not provided.
  let exactLat: number | null = null;
  let exactLng: number | null = null;

  if (typeof body.lat === "number" && typeof body.lng === "number"
      && Number.isFinite(body.lat) && Number.isFinite(body.lng)) {
    exactLat = body.lat;
    exactLng = body.lng;
  } else {
    const queryParts = [addressLine1, city, region, postalCode, countryCode].filter(Boolean);
    const geocoded = await geocodeNominatim(queryParts.join(", "));
    if (geocoded) {
      exactLat = geocoded.lat;
      exactLng = geocoded.lng;
    }
  }

  const hasCoords = exactLat !== null && exactLng !== null;
  if (hasCoords) {
    privateBlock.lat = exactLat;
    privateBlock.lng = exactLng;
  } else {
    delete privateBlock.lat;
    delete privateBlock.lng;
  }

  // ── Apply fuzzing — exact coords are only stored under location.private ───
  let fuzzedLat: number | undefined;
  let fuzzedLng: number | undefined;
  if (hasCoords) {
    const fuzzed = blurCoordinates(exactLat!, exactLng!, FUZZ_RADIUS_KM);
    fuzzedLat = fuzzed.lat;
    fuzzedLng = fuzzed.lng;
  }

  // ── Build merged location JSONB ───────────────────────────────────────────
  const nextLocation: Record<string, unknown> = { ...existingLoc };

  // Private block — stripped from teachers_public view by `location - 'private'`
  nextLocation.private = privateBlock;

  // Top-level public fields consumed by teacherRowToTeacher (backward compat)
  nextLocation.city = city;
  nextLocation.region = region;
  nextLocation.country = countryCode;
  nextLocation.neighborhood = city; // legacy key used by map components
  nextLocation.fuzz_radius_km = FUZZ_RADIUS_KM;

  if (hasCoords) {
    // Public coords are fuzzed — exact coords only live in location.private
    nextLocation.lat = fuzzedLat;
    nextLocation.lng = fuzzedLng;
    nextLocation.fuzzed_lat = fuzzedLat;
    nextLocation.fuzzed_lng = fuzzedLng;
  } else {
    delete nextLocation.lat;
    delete nextLocation.lng;
    delete nextLocation.fuzzed_lat;
    delete nextLocation.fuzzed_lng;
  }

  // Nested public sub-object (used by some map components)
  const publicBlock: Record<string, unknown> = {
    city,
    region,
    country_code: countryCode,
  };
  if (hasCoords) {
    publicBlock.lat = fuzzedLat;
    publicBlock.lng = fuzzedLng;
  }
  nextLocation.public = publicBlock;

  // ── Determine verification status ─────────────────────────────────────────
  // Status/method must match teachers_location_verification_* CHECK constraints (migration 046).
  const { status: verificationStatus, method: verificationMethod } =
    resolveLocationVerificationWrite(hasCoords);

  // ── Persist ───────────────────────────────────────────────────────────────
  const updates: Record<string, unknown> = {
    ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
    city,
    region,
    country_code: countryCode,
    location: nextLocation,
    location_verification_status: verificationStatus,
    location_verification_method: verificationMethod,
    updated_at: now,
  };
  if (hasCoords) {
    updates.location_verified_at = now;
  }
  const radiusKm =
    typeof body.home_lesson_radius_km === "number" && body.home_lesson_radius_km > 0
      ? Math.round(body.home_lesson_radius_km)
      : null;
  if (radiusKm !== null) {
    updates.home_lesson_radius_km = radiusKm;
  }

  const { error: upErr } = await admin
    .from("teachers")
    .update(updates)
    .eq("id", teacherId);

  if (upErr) {
    console.error("[teacher/location/verify] update error:", upErr);
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  console.log(
    `[teacher/location/verify] teacher=${teacherId} status=${verificationStatus} geocoded=${hasCoords}`,
  );

  // Return only the public summary — never return private coords or address
  return NextResponse.json({
    ok: true,
    status: verificationStatus,
    city,
    region,
    fuzz_radius_km: FUZZ_RADIUS_KM,
    geocoded: hasCoords,
  });
}
