export type ParsedGooglePlace = {
  streetNumber: string | null;
  route: string | null;
  city: string | null;
  region: string | null;
  countryCode: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  formattedAddress: string | null;
};

function readComponent(
  comps: google.maps.GeocoderAddressComponent[] | undefined,
  type: string,
  format: "long" | "short" = "long",
): string | null {
  const c = comps?.find((x) => Array.isArray(x.types) && x.types.includes(type));
  const raw = format === "short" ? c?.short_name || c?.long_name : c?.long_name || c?.short_name;
  const v = (raw || "").trim();
  return v ? v : null;
}

export function parseGooglePlace(place: google.maps.places.PlaceResult | null | undefined): ParsedGooglePlace {
  const comps = place?.address_components;
  const streetNumber = readComponent(comps, "street_number");
  const route = readComponent(comps, "route");
  const city =
    readComponent(comps, "locality") ||
    readComponent(comps, "postal_town") ||
    readComponent(comps, "sublocality") ||
    readComponent(comps, "sublocality_level_1");
  const region = readComponent(comps, "administrative_area_level_1");
  const countryCode = readComponent(comps, "country", "short");
  const postalCode = readComponent(comps, "postal_code");

  const lat = place?.geometry?.location?.lat?.();
  const lng = place?.geometry?.location?.lng?.();
  const latitude = typeof lat === "number" && Number.isFinite(lat) ? lat : null;
  const longitude = typeof lng === "number" && Number.isFinite(lng) ? lng : null;

  const formattedAddress = (place?.formatted_address || "").trim() || null;

  return {
    streetNumber,
    route,
    city,
    region,
    countryCode: countryCode ? countryCode.toUpperCase() : null,
    postalCode,
    latitude,
    longitude,
    formattedAddress,
  };
}

