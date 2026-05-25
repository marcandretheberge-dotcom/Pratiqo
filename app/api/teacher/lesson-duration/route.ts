import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isValidLessonDurationMinutes,
  normalizeLessonDurationMinutes,
} from "@/lib/pricing/lessonDuration";

export const runtime = "nodejs";

const lessonDurationPatchSchema = z
  .object({
    defaultLessonDurationMinutes: z.coerce.number().int(),
  })
  .strict();

async function getAuthenticatedTeacher(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { error: NextResponse.json({ error: "Missing Authorization bearer token." }, { status: 401 }) };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { error: NextResponse.json({ error: "Missing Supabase env." }, { status: 500 }) };
  }

  const supabaseUser = createClient(url, anonKey);
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser(token);
  if (userErr || !user) {
    return { error: NextResponse.json({ error: "Invalid or expired session." }, { status: 401 }) };
  }

  const admin = getSupabaseAdmin();
  const { data: teacher, error: teacherErr } = await admin
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (teacherErr || !teacher?.id) {
    return { error: NextResponse.json({ error: "Teacher profile not found." }, { status: 404 }) };
  }

  return { teacherId: teacher.id as string, admin };
}

export async function PATCH(req: Request) {
  const auth = await getAuthenticatedTeacher(req);
  if ("error" in auth && auth.error) return auth.error;

  const { teacherId, admin } = auth as {
    teacherId: string;
    admin: ReturnType<typeof getSupabaseAdmin>;
  };

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = lessonDurationPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const raw = parsed.data.defaultLessonDurationMinutes;
  if (!isValidLessonDurationMinutes(raw)) {
    return NextResponse.json({ error: "Invalid lesson duration." }, { status: 400 });
  }

  const normalized = normalizeLessonDurationMinutes(raw);

  const { error } = await admin
    .from("teachers")
    .update({
      default_lesson_duration_minutes: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("id", teacherId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, defaultLessonDurationMinutes: normalized });
}
