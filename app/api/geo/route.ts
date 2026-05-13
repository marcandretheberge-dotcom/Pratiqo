import { NextResponse } from "next/server";
import { getGeoConfig } from "@/lib/geoLocale";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testCountry = searchParams.get("country");

    const country =
      testCountry || request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || null;

    // In development / locally there is usually no country header.
    // Return null so the client falls back to browser language.
    if (!country) {
      return NextResponse.json({ country: null, locale: null });
    }

    const config = getGeoConfig(country);
    return NextResponse.json({
      country,
      locale: config.locale,
      currency: config.currency,
      currencySymbol: config.currencySymbol,
    });
  } catch {
    return NextResponse.json({ country: null, locale: null });
  }
}

