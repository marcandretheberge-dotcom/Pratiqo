import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { authenticateSrsRequest } from "@/lib/yo/srs/srsRouteAuth";
import {
  buildSrsItemRow,
  parseSrsImportPayload,
} from "@/lib/yo/srs/srsPersistence";

export const runtime = "nodejs";

/** Import validated aggregate progress once; existing server state wins ties. */
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateSrsRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = parseSrsImportPayload(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.reason }, { status: 400 });
  const { records, dropped } = parsed.value;
  const { data, error } = await getSupabaseAdmin().rpc("yo_srs_import_records", {
    p_user_id: auth.user.id,
    p_rows: Object.entries(records).map(([id, record]) => buildSrsItemRow(auth.user.id, id, record)),
    p_dropped: dropped,
  });
  if (error || typeof data !== "number") {
    return NextResponse.json({ error: "Failed to import progress" }, { status: 500 });
  }
  if (data === -1) {
    return NextResponse.json({ error: "Progress already imported" }, { status: 409 });
  }
  return NextResponse.json({ imported: data, dropped });
}
