export function googleMapsEmbedSrc(params: {
  lat?: number;
  lng?: number;
  placeQuery?: string | null;
}): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const { lat, lng, placeQuery } = params;
  if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(`${lat},${lng}`)}`;
  }
  const q = placeQuery?.trim();
  if (q) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}`;
  }
  return null;
}
