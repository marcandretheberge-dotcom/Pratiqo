import { NextResponse } from "next/server";
import { requireBearerAdmin, type AdminClient } from "@/lib/apiAuth";

export const runtime = "nodejs";

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => typeof v === "string" && v.length > 0)));
}

async function profilesById(admin: AdminClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, { name: string | null; email: string | null; role: string | null }>();
  const { data, error } = await admin.from("profiles").select("id, name, email, role").in("id", ids);
  if (error) throw error;
  return new Map(
    ((data ?? []) as Array<{ id: string; name: string | null; email: string | null; role: string | null }>).map((p) => [
      p.id,
      { name: p.name ?? null, email: p.email ?? null, role: p.role ?? null },
    ]),
  );
}

async function teachersById(admin: AdminClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, { name: string | null; user_id: string | null }>();
  const { data, error } = await admin.from("teachers").select("id, name, user_id").in("id", ids);
  if (error) throw error;
  return new Map(
    ((data ?? []) as Array<{ id: string; name: string | null; user_id: string | null }>).map((t) => [
      t.id,
      { name: t.name ?? null, user_id: t.user_id ?? null },
    ]),
  );
}

export async function GET(req: Request) {
  const auth = await requireBearerAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { admin } = auth;

  try {
    const [
      supportRes,
      reviewReportsRes,
      deletionRes,
      payoutFailuresRes,
      pendingDiplomasRes,
      pendingCredentialsRes,
    ] = await Promise.all([
      admin
        .from("support_cases")
        .select("id, booking_id, opened_by_user_id, student_id, teacher_id, role, category, status, priority, requested_resolution, payout_hold, created_at, description")
        .in("status", ["new", "waiting_other_party", "under_review"])
        .order("created_at", { ascending: false })
        .limit(25),
      admin
        .from("review_reports")
        .select("id, review_id, reporter_id, reason, details, created_at")
        .order("created_at", { ascending: false })
        .limit(25),
      admin
        .from("profiles")
        .select("id, name, email, role, deletion_requested_at, deactivated_at, is_active")
        .not("deletion_requested_at", "is", null)
        .is("anonymized_at", null)
        .order("deletion_requested_at", { ascending: true })
        .limit(25),
      admin
        .from("booking_payments")
        .select("booking_id, teacher_id, student_id, amount_cents, currency, payment_status, transfer_status, refund_status, failed_at, failure_reason, updated_at")
        .or("transfer_status.eq.failed,refund_status.eq.failed")
        .order("updated_at", { ascending: false })
        .limit(25),
      admin
        .from("teachers")
        .select("id", { count: "exact", head: true })
        .not("diploma_url", "is", null)
        .or("diploma_verified.is.null,diploma_verified.eq.false"),
      admin
        .from("teacher_credentials")
        .select("id", { count: "exact", head: true })
        .in("verification_status", ["pending", "needs_review"]),
    ]);

    for (const result of [supportRes, reviewReportsRes, deletionRes, payoutFailuresRes, pendingDiplomasRes, pendingCredentialsRes]) {
      if (result.error) throw result.error;
    }

    const supportRows = (supportRes.data ?? []) as Array<{
      id: string;
      booking_id: string | null;
      opened_by_user_id: string;
      student_id: string | null;
      teacher_id: string | null;
      role: string;
      category: string;
      status: string;
      priority: string;
      requested_resolution: string | null;
      payout_hold: boolean | null;
      created_at: string;
      description: string;
    }>;
    const payoutRows = (payoutFailuresRes.data ?? []) as Array<{
      booking_id: string;
      teacher_id: string | null;
      student_id: string | null;
      amount_cents: number | null;
      currency: string | null;
      payment_status: string | null;
      transfer_status: string | null;
      refund_status: string | null;
      failed_at: string | null;
      failure_reason: string | null;
      updated_at: string | null;
    }>;
    const reviewReportRows = (reviewReportsRes.data ?? []) as Array<{
      id: string;
      review_id: string;
      reporter_id: string | null;
      reason: string;
      details: string | null;
      created_at: string;
    }>;

    const reviewIds = unique(reviewReportRows.map((r) => r.review_id));
    const { data: reviewRows, error: reviewsErr } = reviewIds.length
      ? await admin
          .from("reviews")
          .select("id, teacher_id, student_id, rating, body, moderation_status, is_flagged, created_at")
          .in("id", reviewIds)
      : { data: [], error: null };
    if (reviewsErr) throw reviewsErr;
    const reviewMap = new Map(
      ((reviewRows ?? []) as Array<{
        id: string;
        teacher_id: string | null;
        student_id: string | null;
        rating: number | null;
        body: string | null;
        moderation_status: string | null;
        is_flagged: boolean | null;
        created_at: string | null;
      }>).map((r) => [r.id, r]),
    );

    const teacherIds = unique([
      ...supportRows.map((r) => r.teacher_id),
      ...payoutRows.map((r) => r.teacher_id),
      ...Array.from(reviewMap.values()).map((r) => r.teacher_id),
    ]);
    const studentIds = unique([
      ...supportRows.map((r) => r.student_id),
      ...payoutRows.map((r) => r.student_id),
      ...Array.from(reviewMap.values()).map((r) => r.student_id),
    ]);
    const profileIds = unique([
      ...supportRows.map((r) => r.opened_by_user_id),
      ...studentIds,
      ...reviewReportRows.map((r) => r.reporter_id),
      ...((deletionRes.data ?? []) as Array<{ id: string }>).map((r) => r.id),
    ]);

    const [teacherMap, profileMap] = await Promise.all([teachersById(admin, teacherIds), profilesById(admin, profileIds)]);

    const supportCases = supportRows.map((row) => {
      const openedBy = profileMap.get(row.opened_by_user_id);
      const student = row.student_id ? profileMap.get(row.student_id) : null;
      const teacher = row.teacher_id ? teacherMap.get(row.teacher_id) : null;
      return {
        id: row.id,
        bookingId: row.booking_id,
        category: row.category,
        status: row.status,
        priority: row.priority,
        role: row.role,
        requestedResolution: row.requested_resolution,
        payoutHold: Boolean(row.payout_hold),
        createdAt: row.created_at,
        description: row.description,
        openedByName: openedBy?.name ?? openedBy?.email ?? row.opened_by_user_id,
        studentName: student?.name ?? student?.email ?? null,
        teacherName: teacher?.name ?? null,
        nextStep: row.payout_hold ? "Reviser avant tout versement" : "Assigner et traiter la demande",
      };
    });

    const reviewReports = reviewReportRows.map((report) => {
      const review = reviewMap.get(report.review_id);
      const teacher = review?.teacher_id ? teacherMap.get(review.teacher_id) : null;
      const reporter = report.reporter_id ? profileMap.get(report.reporter_id) : null;
      return {
        id: report.id,
        reviewId: report.review_id,
        reason: report.reason,
        details: report.details,
        createdAt: report.created_at,
        teacherName: teacher?.name ?? null,
        reporterName: reporter?.name ?? reporter?.email ?? null,
        rating: review?.rating ?? null,
        reviewBody: review?.body ?? null,
        moderationStatus: review?.moderation_status ?? null,
        isFlagged: Boolean(review?.is_flagged),
        nextStep: "Verifier le contenu et approuver, masquer ou demander plus de contexte",
      };
    });

    const deletionRequests = ((deletionRes.data ?? []) as Array<{
      id: string;
      name: string | null;
      email: string | null;
      role: string | null;
      deletion_requested_at: string | null;
      deactivated_at: string | null;
      is_active: boolean | null;
    }>).map((row) => ({
      userId: row.id,
      name: row.name ?? row.email ?? row.id,
      email: row.email,
      role: row.role,
      deletionRequestedAt: row.deletion_requested_at,
      deactivatedAt: row.deactivated_at,
      isActive: Boolean(row.is_active),
      nextStep: "Verifier reservations, paiements, litiges et retention avant anonymisation",
    }));

    const payoutFailures = payoutRows.map((row) => {
      const teacher = row.teacher_id ? teacherMap.get(row.teacher_id) : null;
      const student = row.student_id ? profileMap.get(row.student_id) : null;
      return {
        bookingId: row.booking_id,
        teacherName: teacher?.name ?? row.teacher_id,
        studentName: student?.name ?? student?.email ?? row.student_id,
        amountCents: row.amount_cents ?? 0,
        currency: row.currency ?? "cad",
        paymentStatus: row.payment_status,
        transferStatus: row.transfer_status,
        refundStatus: row.refund_status,
        failedAt: row.failed_at,
        failureReason: row.failure_reason,
        nextStep: row.transfer_status === "failed" ? "Synchroniser Stripe Connect et relancer le versement" : "Verifier Stripe et reconciler le remboursement",
      };
    });

    const summary = {
      supportCases: supportCases.length,
      payoutHolds: supportCases.filter((c) => c.payoutHold).length,
      reviewReports: reviewReports.length,
      deletionRequests: deletionRequests.length,
      payoutFailures: payoutFailures.length,
      pendingDiplomas: pendingDiplomasRes.count ?? 0,
      pendingCredentials: pendingCredentialsRes.count ?? 0,
    };

    return NextResponse.json({
      summary,
      supportCases,
      reviewReports,
      deletionRequests,
      payoutFailures,
      verification: {
        pendingDiplomas: pendingDiplomasRes.count ?? 0,
        pendingCredentials: pendingCredentialsRes.count ?? 0,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur";
    console.error("[admin/operations] GET error", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
