import { mobileConfig } from "@/lib/mobile/server";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(mobileConfig(), { headers: { "Cache-Control": "no-store" } });
}
