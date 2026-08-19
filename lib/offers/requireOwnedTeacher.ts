import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isTeacherOfferId,
  mapTeacherOfferRow,
  OFFER_NOT_FOUND_BODY,
  TEACHER_NOT_FOUND_BODY,
  TEACHER_OFFER_SELECT_COLUMNS,
} from "./teacherOfferDto";
import type { TeacherOfferDto } from "./types";

export type OwnedTeacherContext = {
  userId: string;
  teacherId: string;
  admin: ReturnType<typeof getSupabaseAdmin>;
};

export async function requireOwnedTeacher(
  req: Request,
): Promise<{ ok: true; context: OwnedTeacherContext } | { ok: false; response: NextResponse }> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return {
      ok: false,
      response: NextResponse.json({ error: "server_error" }, { status: 500 }),
    };
  }

  const supabaseUser = createClient(url, anonKey);
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser(token);
  if (userErr || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    };
  }

  let admin: ReturnType<typeof getSupabaseAdmin>;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "server_error" }, { status: 500 }),
    };
  }

  const { data: teacher, error: teacherErr } = await admin
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (teacherErr) {
    return {
      ok: false,
      response: NextResponse.json({ error: "server_error" }, { status: 500 }),
    };
  }
  if (!teacher?.id) {
    return {
      ok: false,
      response: NextResponse.json(TEACHER_NOT_FOUND_BODY, { status: 403 }),
    };
  }

  return {
    ok: true,
    context: {
      userId: user.id,
      teacherId: teacher.id as string,
      admin,
    },
  };
}

export function offerNotFoundResponse(): NextResponse {
  return NextResponse.json(OFFER_NOT_FOUND_BODY, { status: 404 });
}

/**
 * Load an offer only when it belongs to the authenticated teacher.
 * Missing rows and other-teacher rows both return null so callers can emit
 * the same 404 body (never 403 for ownership mismatch).
 */
export async function loadOwnedTeacherOffer(
  admin: ReturnType<typeof getSupabaseAdmin>,
  teacherId: string,
  offerId: string,
): Promise<TeacherOfferDto | null> {
  if (!isTeacherOfferId(offerId)) return null;

  const { data, error } = await admin
    .from("teacher_offers")
    .select(TEACHER_OFFER_SELECT_COLUMNS)
    .eq("id", offerId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error || !data) return null;
  return mapTeacherOfferRow(data as unknown);
}
