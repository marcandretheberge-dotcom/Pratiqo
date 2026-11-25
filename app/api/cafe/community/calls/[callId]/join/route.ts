import { cafeCommunityHandlers } from "@/lib/cafe/communityServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ callId: string }> }) {
  const { callId } = await context.params;
  return cafeCommunityHandlers.callJoin(request, callId);
}

const unsupported = (request: Request) => cafeCommunityHandlers.methodResponse(request, "POST, OPTIONS", true);
export const GET = unsupported;
export const HEAD = unsupported;
export const PUT = unsupported;
export const PATCH = unsupported;
export const DELETE = unsupported;
export const OPTIONS = unsupported;
