// Admin → Student credits (spendable)
//
//   GET  /api/admin/student-credits?studentId=…  → list credits
//   POST /api/admin/student-credits              → grant credit (reason required)
//
// Security model (defense in depth):
//   1. Bearer JWT required
//   2. requireAdminApi() verifies profiles.role === "admin" via service-role
//   3. Grant/void run through SECURITY DEFINER RPCs (migration 088) that
//      atomically update student_credits, ledger, credit_transactions,
//      profiles.credit_balance, and admin_audit_log
//   4. reason_note is mandatory; zero/negative amounts rejected
//
// What this does NOT do (intentional):
//   - Does not change Stripe checkout amount math (checkout still reads
//     profiles.credit_balance exactly as before)
//   - Does not create Stripe coupons or apply promo codes
//   - Does not create real refunds
//   - Does not expose credit data on public routes

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import {
  grantStudentCredit,
  listStudentCredits,
  STUDENT_CREDIT_REASON_CODES,
} from "@/lib/admin/studentCredits";

export const runtime = "nodejs";

type PostBody = {
  studentProfileId?: unknown;
  studentId?: unknown;
  amountCents?: unknown;
  currency?: unknown;
  reasonCode?: unknown;
  reasonNote?: unknown;
  expiresAt?: unknown;
};

export async function GET(req: Request) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin } = auth;

  try {
    const url = new URL(req.url);
    const studentId = url.searchParams.get("studentId")?.trim() || null;
    const credits = await listStudentCredits(admin, studentId);
    return NextResponse.json({
      credits,
      reasonCodes: STUDENT_CREDIT_REASON_CODES,
      appliedToSpendableBalance: true,
    });
  } catch (e) {
    console.error("[admin/student-credits] GET failed", e);
    return NextResponse.json(
      { error: "Impossible de charger les crédits apprenants." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin, user: actor } = auth;

  let body: PostBody = {};
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const result = await grantStudentCredit(admin, actor, {
    studentProfileId: body.studentProfileId ?? body.studentId,
    amountCents: body.amountCents,
    currency: body.currency,
    reasonCode: body.reasonCode,
    reasonNote: body.reasonNote,
    expiresAt: body.expiresAt,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  console.log(
    `[admin/student-credits] grant actor=${actor.id} credit=${result.credit.id} student=${result.credit.student_profile_id} balance=${result.credit.new_credit_balance ?? "?"}`,
  );

  return NextResponse.json({ ok: true, credit: result.credit });
}
