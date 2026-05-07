import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Deprecated route. Use /api/stripe/pro/checkout for Pro subscriptions and /api/stripe/portal for subscription management." },
    { status: 410 },
  );
}
