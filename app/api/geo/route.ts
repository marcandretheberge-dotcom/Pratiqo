import { NextResponse } from "next/server";
import { getGeoConfig } from "@/lib/geoLocale";

export async function GET(request: Request) {
  // Vercel provides country in headers; Cloudflare uses cf-ipcountry.
  const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || "CA";
  const config = getGeoConfig(country);

  return NextResponse.json({
    country,
    locale: config.locale,
    currency: config.currency,
    currencySymbol: config.currencySymbol,
  });
}

