import { cafeCommunityHandlers } from "@/lib/cafe/communityServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  return cafeCommunityHandlers.snapshot(request);
}

export async function POST(request: Request) {
  return cafeCommunityHandlers.command(request);
}

const unsupported = (request: Request) => cafeCommunityHandlers.methodResponse(request, "GET, HEAD, POST, OPTIONS");
export const PUT = unsupported;
export const PATCH = unsupported;
export const DELETE = unsupported;
export const OPTIONS = unsupported;
