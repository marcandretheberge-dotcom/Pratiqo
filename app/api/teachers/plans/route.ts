import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function normalizePlan(p: string | null | undefined): string {
  const raw = String(p || "free").toLowerCase();
  if (raw === "enterprise") return "enterprise";
  if (raw === "pro") return "pro";
  return "free";
}

type TeacherMetadataRow = {
  id: string;
  user_id?: string | null;
  is_public?: boolean | null;
  is_demo?: boolean | null;
  deactivated_at?: string | null;
  deleted_at?: string | null;
};

type ProfileMetadataRow = {
  id: string;
  plan?: string | null;
  photo_url?: string | null;
  is_active?: boolean | null;
  deactivated_at?: string | null;
  deleted_at?: string | null;
  anonymized_at?: string | null;
};

/** Batch lookup of safe public teacher metadata. Used by marketplace cards. */
export async function GET(req: Request) {
  const idsParam = new URL(req.url).searchParams.get("ids");
  const ids = idsParam?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  if (!ids.length) {
    return NextResponse.json({
      plans: {} as Record<string, string>,
      photos: {} as Record<string, string | null>,
      eligibleTeacherIds: [] as string[],
    });
  }

  const admin = getSupabaseAdmin();
  const { data: teachers, error } = await admin
    .from("teachers")
    .select("id, user_id, is_public, is_demo, deactivated_at, deleted_at")
    .in("id", ids);
  if (error || !teachers?.length) {
    return NextResponse.json({
      plans: Object.fromEntries(ids.map((id) => [id, "free"])),
      photos: {} as Record<string, string | null>,
      eligibleTeacherIds: [] as string[],
    }, { status: error ? 500 : 200 });
  }

  const teacherRows = teachers as TeacherMetadataRow[];
  const userIds = [...new Set(teacherRows.map((t) => t.user_id).filter(Boolean))] as string[];
  const planByUserId: Record<string, string> = {};
  const photoByUserId: Record<string, string | null> = {};
  const activeProfileIds = new Set<string>();

  if (userIds.length) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, plan, photo_url, is_active, deactivated_at, deleted_at, anonymized_at")
      .in("id", userIds);
    for (const row of (profiles ?? []) as ProfileMetadataRow[]) {
      const active =
        row.is_active !== false &&
        !row.deactivated_at &&
        !row.deleted_at &&
        !row.anonymized_at;
      if (!active) continue;
      activeProfileIds.add(row.id);
      planByUserId[row.id] = normalizePlan(row.plan);
      photoByUserId[row.id] = typeof row.photo_url === "string" && row.photo_url.trim() ? row.photo_url.trim() : null;
    }
  }

  const plans: Record<string, string> = {};
  const photos: Record<string, string | null> = {};
  const eligibleTeacherIds: string[] = [];
  for (const id of ids) {
    plans[id] = "free";
  }
  for (const row of teacherRows) {
    const uid = row.user_id;
    plans[row.id] = uid ? (planByUserId[uid] ?? "free") : "free";
    photos[row.id] = uid ? (photoByUserId[uid] ?? null) : null;
    if (
      uid &&
      activeProfileIds.has(uid) &&
      row.is_public !== false &&
      row.is_demo !== true &&
      !row.deactivated_at &&
      !row.deleted_at
    ) {
      eligibleTeacherIds.push(row.id);
    }
  }

  return NextResponse.json({ plans, photos, eligibleTeacherIds });
}
