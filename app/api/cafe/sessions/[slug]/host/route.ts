import { handleCafeRoomJoin } from "@/lib/cafe/joinService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  return handleCafeRoomJoin(req, slug ?? "", "host");
}
