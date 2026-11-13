import { cafeCommunityHandlers } from "@/lib/cafe/communityServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ callId: string }> }) {
  const { callId } = await context.params;
  return cafeCommunityHandlers.callStatus(request, callId);
}

const unsupported = (request: Request) => cafeCommunityHandlers.methodResponse(request, "GET, HEAD, OPTIONS");
export const POST = unsupported;
export const PUT = unsupported;
export const PATCH = unsupported;
export const DELETE = unsupported;
export const OPTIONS = unsupported;
