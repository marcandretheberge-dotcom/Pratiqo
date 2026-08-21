import { NextResponse } from "next/server";
import { requireOwnedTeacher } from "@/lib/offers/requireOwnedTeacher";
import { sortTeacherOffersForDashboard } from "@/lib/offers/sortTeacherOffers";
import {
  isPostgresUniqueViolation,
  mapTeacherOfferRow,
  TEACHER_OFFER_SELECT_COLUMNS,
} from "@/lib/offers/teacherOfferDto";
import { TEACHER_OFFERS_SANITY_CAP } from "@/lib/offers/types";
import {
  assertTeacherOfferPublishable,
  createInputToPublishCandidate,
} from "@/lib/offers/publishReadiness";
import {
  assertPlannedPackageDraftAllowed,
  assertPlannedPackagePublishAllowed,
} from "@/lib/offers/plannedPackages";
import {
  OFFER_NOT_PUBLISHABLE_STATUS,
  offerNotPublishableResponseBody,
} from "@/lib/offers/offerNotPublishableResponse";
import {
  parseTeacherOfferCreateInput,
  teacherOfferCreateToInsertRow,
} from "@/lib/offers/validation";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireOwnedTeacher(req);
  if (!auth.ok) return auth.response;

  const { teacherId, admin } = auth.context;
  const { data, error } = await admin
    .from("teacher_offers")
    .select(TEACHER_OFFER_SELECT_COLUMNS)
    .eq("teacher_id", teacherId);

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const offers = (data ?? [])
    .map((row) => mapTeacherOfferRow(row as unknown))
    .filter((row): row is NonNullable<typeof row> => row != null);

  return NextResponse.json({ offers: sortTeacherOffersForDashboard(offers) });
}

export async function POST(req: Request) {
  const auth = await requireOwnedTeacher(req);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const parsed = parseTeacherOfferCreateInput(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues },
      { status: 400 },
    );
  }

  const draftGate = assertPlannedPackageDraftAllowed(parsed.data.offerType);
  if (!draftGate.ok) {
    return NextResponse.json(
      { error: draftGate.error, blockers: draftGate.blockers },
      { status: 422 },
    );
  }

  if (parsed.data.status === "published") {
    const publishGate = assertTeacherOfferPublishable(createInputToPublishCandidate(parsed.data));
    if (!publishGate.ok) {
      return NextResponse.json(offerNotPublishableResponseBody(publishGate), {
        status: OFFER_NOT_PUBLISHABLE_STATUS,
      });
    }
    const launchGate = assertPlannedPackagePublishAllowed(parsed.data.offerType);
    if (!launchGate.ok) {
      return NextResponse.json(offerNotPublishableResponseBody(launchGate), {
        status: OFFER_NOT_PUBLISHABLE_STATUS,
      });
    }
  }

  const { teacherId, userId, admin } = auth.context;

  // Defensive sanity cap only. Product plan/founder published-offer limits are implemented in a later PR.
  const { count, error: countErr } = await admin
    .from("teacher_offers")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", teacherId);

  if (countErr) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if ((count ?? 0) >= TEACHER_OFFERS_SANITY_CAP) {
    return NextResponse.json({ error: "offer_limit_sanity_cap" }, { status: 409 });
  }

  // Future: enforce published offer limits by plan/founder status before publishing.
  const nowIso = new Date().toISOString();
  const insertRow = teacherOfferCreateToInsertRow(teacherId, userId, parsed.data, nowIso);

  const { data, error } = await admin
    .from("teacher_offers")
    .insert(insertRow)
    .select(TEACHER_OFFER_SELECT_COLUMNS)
    .single();

  if (error) {
    if (isPostgresUniqueViolation(error)) {
      return NextResponse.json({ error: "slug_conflict" }, { status: 409 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const offer = mapTeacherOfferRow(data as unknown);
  if (!offer) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ offer });
}
