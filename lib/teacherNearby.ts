/**
 * Client helper for the PostGIS-backed nearby-teachers lookup.
 *
 * Falls back to `null` when the server can't satisfy the request (RPC not
 * deployed yet, no geo, network error). Callers should treat `null` as
 * "use the existing client-side haversine path" so the app keeps working
 * between deploy and migration application.
 */

export type NearbyTeacher = { id: string; distanceKm: number };

const NEARBY_UNAVAILABLE = Symbol("nearby_teachers_unavailable");

/**
 * Module-level flag that records whether the server returned a 503 with
 * `nearby_teachers_unavailable`. We stop probing for the rest of the
 * session once that happens — saves a round-trip on every radius click.
 */
let serverRpcDisabled: typeof NEARBY_UNAVAILABLE | null = null;

export async function fetchNearbyTeachers(params: {
  lat: number;
  lng: number;
  radiusKm: number;
  limit?: number;
  signal?: AbortSignal;
}): Promise<NearbyTeacher[] | null> {
  if (serverRpcDisabled) return null;
  if (
    !Number.isFinite(params.lat) ||
    !Number.isFinite(params.lng) ||
    !Number.isFinite(params.radiusKm) ||
    params.radiusKm <= 0
  ) {
    return null;
  }

  const url = new URL("/api/teachers/nearby", typeof window === "undefined" ? "http://localhost" : window.location.origin);
  url.searchParams.set("lat", String(params.lat));
  url.searchParams.set("lng", String(params.lng));
  url.searchParams.set("radiusKm", String(params.radiusKm));
  if (params.limit) url.searchParams.set("limit", String(params.limit));

  try {
    const res = await fetch(url.toString(), { signal: params.signal });
    if (res.status === 503) {
      // Migration not applied yet — stop trying for this session.
      serverRpcDisabled = NEARBY_UNAVAILABLE;
      return null;
    }
    if (!res.ok) return null;
    const body = (await res.json()) as { teachers?: NearbyTeacher[] };
    if (!Array.isArray(body.teachers)) return null;
    return body.teachers;
  } catch {
    return null;
  }
}

/** Test helper — re-enables the probe after `nearby_teachers_unavailable`. */
export function _resetNearbyFallbackForTests(): void {
  serverRpcDisabled = null;
}
