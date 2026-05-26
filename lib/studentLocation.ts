import { haversineDistance } from "@/lib/geo";

export type StudentSavedLocation = {
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
};

export type StudentLocationPayload =
  | { clear: true; location?: unknown; userId?: unknown }
  | { clear?: false; location?: unknown; userId?: unknown };

const MAX_TEXT_LENGTH = 240;

function cleanText(value: unknown, maxLength = MAX_TEXT_LENGTH): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

function cleanCoordinate(value: unknown, min: number, max: number, label: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
    throw new Error(`Invalid ${label}.`);
  }
  return numeric;
}

export function normalizeStudentLocation(input: unknown): StudentSavedLocation {
  const raw = input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
  const lat = cleanCoordinate(raw.lat, -90, 90, "latitude");
  const lng = cleanCoordinate(raw.lng, -180, 180, "longitude");

  if ((lat === null) !== (lng === null)) {
    throw new Error("Latitude and longitude must be provided together.");
  }

  const location: StudentSavedLocation = {
    address: cleanText(raw.address),
    city: cleanText(raw.city, 120),
    region: cleanText(raw.region, 120),
    country: cleanText(raw.country, 120),
    lat,
    lng,
    place_id: cleanText(raw.place_id, 180),
  };

  if (!location.address && !location.city && !location.region && location.lat === null) {
    throw new Error("A location label or coordinates are required.");
  }

  return location;
}

export function parseStoredStudentLocation(input: unknown): StudentSavedLocation | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  try {
    return normalizeStudentLocation(input);
  } catch {
    return null;
  }
}

export function studentLocationHasCoordinates(location: StudentSavedLocation | null | undefined): location is StudentSavedLocation & {
  lat: number;
  lng: number;
} {
  return (
    Boolean(location) &&
    typeof location?.lat === "number" &&
    typeof location?.lng === "number" &&
    Number.isFinite(location.lat) &&
    Number.isFinite(location.lng)
  );
}

export function studentLocationSummary(location: StudentSavedLocation | null | undefined): string {
  if (!location) return "";
  return location.city || location.address || [location.region, location.country].filter(Boolean).join(", ") || "";
}

export function studentLocationToBookingAddress(location: StudentSavedLocation | null | undefined): string {
  if (!location) return "";
  return location.address || [location.city, location.region, location.country].filter(Boolean).join(", ");
}

export function approximateDistanceKm(
  from: StudentSavedLocation | { lat: number | null; lng: number | null } | null | undefined,
  to: { lat?: number | null; lng?: number | null } | null | undefined,
): number | null {
  if (
    !from ||
    !to ||
    typeof from.lat !== "number" ||
    typeof from.lng !== "number" ||
    typeof to.lat !== "number" ||
    typeof to.lng !== "number"
  ) {
    return null;
  }
  return haversineDistance(from.lat, from.lng, to.lat, to.lng);
}

export function formatApproxDistanceKm(distanceKm: number): string {
  if (!Number.isFinite(distanceKm)) return "";
  if (distanceKm < 10) return `${Math.max(0.1, distanceKm).toFixed(1)} km`;
  return `${Math.round(distanceKm)} km`;
}
