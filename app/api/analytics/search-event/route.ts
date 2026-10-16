import { handleSearchEventPost } from "@/lib/analytics/searchEventHandler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleSearchEventPost(request);
}
