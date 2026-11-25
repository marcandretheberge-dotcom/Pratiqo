/**
 * Server-side helpers for the ambassador admin surface.
 *
 * The underlying program tables remain service-role/admin-only. This
 * module validates admin UI input, calls the SECURITY DEFINER RPCs from
 * migration 095, and parses rows into stable API payloads.
 *
 * DO NOT import from client components.
 */

import type { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { safeAmbassadorDestination } from "@/lib/ambassadors/referrals";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export type AmbassadorStatus = "invited" | "active" | "paused" | "revoked";
export type AmbassadorRewardStatus = "pending" | "earned" | "paid" | "void" | "reversed";

export type AdminAmbassadorOverview = {
  ambassadorId: string;
  teacherId: string | null;
  ambassadorUserId: string | null;
  teacherName: string | null;
  teacherEmail: string | null;
  status: AmbassadorStatus;
  selectedAt: string | null;
  activatedAt: string | null;
  pausedAt: string | null;
  revokedAt: string | null;
  internalNote: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  primaryLinkId: string | null;
  primaryCode: string | null;
  primaryDestinationPath: string | null;
  activeLinksCount: number;
  totalLinksCount: number;
  referralClicks: number;
  referredLearners: number;
  referredTeachers: number;
  referredStudentEligibleBookings: number;
  referredTeacherEligibleBookings: number;
  uniqueEligibleCompletedBookings: number;
  uniqueRealizedPlatformFeeCents: number;
  uniqueRealizedNetPlatformContributionCents: number;
  rewardsOutstandingCents: number;
  rewardsPaidCents: number;
  rewardsReversedUnrecoveredCents: number;
  ambassadorTotalEconomicCostCents: number;
  netContributionAfterAmbassadorCostCents: number;
};

export type AdminAmbassadorLink = {
  id: string;
  ambassadorId: string | null;
  teacherId: string | null;
  code: string;
  destinationPath: string;
  campaign: string | null;
  attributionWindowDays: number;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminAmbassadorReward = {
  id: string;
  ambassadorLinkId: string;
  attributionId: string | null;
  bookingId: string | null;
  sourceEventId: string | null;
  rewardKey: string;
  rewardType: string;
  amountCents: number;
  currency: string;
  ruleVersion: string;
  status: AmbassadorRewardStatus;
  earnedAt: string | null;
  paidAt: string | null;
  voidedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  metadata: Record<string, unknown>;
};

export type AdminAmbassadorDetail = AdminAmbassadorOverview & {
  links: AdminAmbassadorLink[];
  rewards: AdminAmbassadorReward[];
};

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; status: 400 | 404 | 409 | 500 };

const AMBASSADOR_OVERVIEW_SELECT =
  "ambassador_id, teacher_id, ambassador_user_id, teacher_name, teacher_email, status, selected_at, activated_at, paused_at, revoked_at, internal_note, created_at, updated_at, primary_link_id, primary_code, primary_destination_path, active_links_count, total_links_count, referral_clicks, referred_learners, referred_teachers, referred_student_eligible_bookings, referred_teacher_eligible_bookings, unique_eligible_completed_bookings, unique_realized_platform_fee_cents, unique_realized_net_platform_contribution_cents, rewards_outstanding_cents, rewards_paid_cents, rewards_reversed_unrecovered_cents, ambassador_total_economic_cost_cents, net_contribution_after_ambassador_cost_cents";

const AMBASSADOR_LINK_SELECT =
  "id, ambassador_id, teacher_id, code, destination_path, campaign, attribution_window_days, active, created_at, updated_at";

const AMBASSADOR_REWARD_SELECT =
  "id, ambassador_link_id, attribution_id, booking_id, source_event_id, reward_key, reward_type, amount_cents, currency, rule_version, status, earned_at, paid_at, voided_at, created_at, updated_at, metadata";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function normalizeStatus(value: unknown): AmbassadorStatus {
  return value === "invited" || value === "paused" || value === "revoked" ? value : "active";
}

function normalizeRewardStatus(value: unknown): AmbassadorRewardStatus {
  if (
    value === "pending" ||
    value === "earned" ||
    value === "paid" ||
    value === "void" ||
    value === "reversed"
  ) {
    return value;
  }
  return "pending";
}

function optionalText(value: unknown, max = 1000): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) return undefined;
  return trimmed;
}

function parseOverviewRow(data: unknown): AdminAmbassadorOverview | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const ambassadorId = asString(row.ambassador_id);
  const teacherId = asNullableString(row.teacher_id);
  if (!ambassadorId) return null;

  return {
    ambassadorId,
    teacherId,
    ambassadorUserId: asNullableString(row.ambassador_user_id),
    teacherName: asNullableString(row.teacher_name),
    teacherEmail: asNullableString(row.teacher_email),
    status: normalizeStatus(row.status),
    selectedAt: asNullableString(row.selected_at),
    activatedAt: asNullableString(row.activated_at),
    pausedAt: asNullableString(row.paused_at),
    revokedAt: asNullableString(row.revoked_at),
    internalNote: asNullableString(row.internal_note),
    createdAt: asNullableString(row.created_at),
    updatedAt: asNullableString(row.updated_at),
    primaryLinkId: asNullableString(row.primary_link_id),
    primaryCode: asNullableString(row.primary_code),
    primaryDestinationPath: asNullableString(row.primary_destination_path),
    activeLinksCount: asNumber(row.active_links_count),
    totalLinksCount: asNumber(row.total_links_count),
    referralClicks: asNumber(row.referral_clicks),
    referredLearners: asNumber(row.referred_learners),
    referredTeachers: asNumber(row.referred_teachers),
    referredStudentEligibleBookings: asNumber(row.referred_student_eligible_bookings),
    referredTeacherEligibleBookings: asNumber(row.referred_teacher_eligible_bookings),
    uniqueEligibleCompletedBookings: asNumber(row.unique_eligible_completed_bookings),
    uniqueRealizedPlatformFeeCents: asNumber(row.unique_realized_platform_fee_cents),
    uniqueRealizedNetPlatformContributionCents: asNumber(
      row.unique_realized_net_platform_contribution_cents,
    ),
    rewardsOutstandingCents: asNumber(row.rewards_outstanding_cents),
    rewardsPaidCents: asNumber(row.rewards_paid_cents),
    rewardsReversedUnrecoveredCents: asNumber(row.rewards_reversed_unrecovered_cents),
    ambassadorTotalEconomicCostCents: asNumber(row.ambassador_total_economic_cost_cents),
    netContributionAfterAmbassadorCostCents: asNumber(
      row.net_contribution_after_ambassador_cost_cents,
    ),
  };
}

function parseLinkRow(data: unknown): AdminAmbassadorLink | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const id = asString(row.id);
  const teacherId = asNullableString(row.teacher_id);
  const code = asString(row.code);
  if (!id || !code) return null;

  return {
    id,
    ambassadorId: asNullableString(row.ambassador_id),
    teacherId,
    code,
    destinationPath: safeAmbassadorDestination(asNullableString(row.destination_path)),
    campaign: asNullableString(row.campaign),
    attributionWindowDays: Math.max(1, asNumber(row.attribution_window_days) || 30),
    active: asBoolean(row.active),
    createdAt: asNullableString(row.created_at),
    updatedAt: asNullableString(row.updated_at),
  };
}

function parseRewardRow(data: unknown): AdminAmbassadorReward | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const id = asString(row.id);
  const ambassadorLinkId = asString(row.ambassador_link_id);
  if (!id || !ambassadorLinkId) return null;
  const metadata =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {};

  return {
    id,
    ambassadorLinkId,
    attributionId: asNullableString(row.attribution_id),
    bookingId: asNullableString(row.booking_id),
    sourceEventId: asNullableString(row.source_event_id),
    rewardKey: asString(row.reward_key),
    rewardType: asString(row.reward_type),
    amountCents: asNumber(row.amount_cents),
    currency: asString(row.currency).toUpperCase() || "CAD",
    ruleVersion: asString(row.rule_version),
    status: normalizeRewardStatus(row.status),
    earnedAt: asNullableString(row.earned_at),
    paidAt: asNullableString(row.paid_at),
    voidedAt: asNullableString(row.voided_at),
    createdAt: asNullableString(row.created_at),
    updatedAt: asNullableString(row.updated_at),
    metadata,
  };
}

function mapRpcError(message: string | undefined, fallback: string): Result<never> {
  const code = (message ?? "").toUpperCase();
  if (
    code.includes("AMBASSADOR_NOT_FOUND") ||
    code.includes("AMBASSADOR_LINK_NOT_FOUND") ||
    code.includes("AMBASSADOR_REWARD_NOT_FOUND") ||
    code.includes("AMBASSADOR_TEACHER_NOT_FOUND") ||
    code.includes("AMBASSADOR_USER_NOT_FOUND")
  ) {
    return { ok: false, status: 404, error: "Ressource ambassadeur introuvable." };
  }
  if (
    code.includes("AMBASSADOR_TEACHER_REQUIRED") ||
    code.includes("AMBASSADOR_USER_REQUIRED") ||
    code.includes("AMBASSADOR_USER_UNAVAILABLE") ||
    code.includes("AMBASSADOR_REQUIRES_EXISTING_TEACHER_ACCOUNT") ||
    code.includes("AMBASSADOR_STATUS_INVALID") ||
    code.includes("AMBASSADOR_DESTINATION_INVALID") ||
    code.includes("AMBASSADOR_REVOKED") ||
    code.includes("AMBASSADOR_NOT_ACTIVE") ||
    code.includes("AMBASSADOR_REWARD_NOT_PAYABLE")
  ) {
    return { ok: false, status: 400, error: "Action ambassadeur invalide pour cet état." };
  }
  if (code.includes("AMBASSADOR_CODE_UNAVAILABLE")) {
    return { ok: false, status: 409, error: "Code ambassadeur indisponible." };
  }
  console.error("[admin/ambassadors] rpc error", message);
  return { ok: false, status: 500, error: fallback };
}

export async function listAdminAmbassadors(admin: AdminClient): Promise<AdminAmbassadorOverview[]> {
  const { data, error } = await admin
    .from("ambassador_admin_overview")
    .select(AMBASSADOR_OVERVIEW_SELECT)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[admin/ambassadors] list failed", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown[]).map(parseOverviewRow).filter(Boolean) as AdminAmbassadorOverview[];
}

export async function getAdminAmbassadorForTeacher(
  admin: AdminClient,
  teacherId: string,
): Promise<AdminAmbassadorOverview | null> {
  if (!teacherId.trim()) return null;
  const { data, error } = await admin
    .from("ambassador_admin_overview")
    .select(AMBASSADOR_OVERVIEW_SELECT)
    .eq("teacher_id", teacherId.trim())
    .maybeSingle();
  if (error) {
    console.error("[admin/ambassadors] teacher membership lookup failed", error.message);
    return null;
  }
  return parseOverviewRow(data);
}

export async function getAdminAmbassadorDetail(
  admin: AdminClient,
  ambassadorId: string,
): Promise<AdminAmbassadorDetail | null> {
  if (!ambassadorId.trim()) return null;

  const { data: overviewData, error: overviewError } = await admin
    .from("ambassador_admin_overview")
    .select(AMBASSADOR_OVERVIEW_SELECT)
    .eq("ambassador_id", ambassadorId.trim())
    .maybeSingle();
  if (overviewError) {
    console.error("[admin/ambassadors] detail overview failed", overviewError.message);
    throw new Error(overviewError.message);
  }
  const overview = parseOverviewRow(overviewData);
  if (!overview) return null;

  const { data: linkData, error: linkError } = await admin
    .from("ambassador_links")
    .select(AMBASSADOR_LINK_SELECT)
    .eq("ambassador_id", overview.ambassadorId)
    .order("created_at", { ascending: true });
  if (linkError) {
    console.error("[admin/ambassadors] detail links failed", linkError.message);
    throw new Error(linkError.message);
  }
  const links = ((linkData ?? []) as unknown[]).map(parseLinkRow).filter(Boolean) as AdminAmbassadorLink[];
  const linkIds = links.map((link) => link.id);

  let rewards: AdminAmbassadorReward[] = [];
  if (linkIds.length > 0) {
    const { data: rewardData, error: rewardError } = await admin
      .from("ambassador_rewards")
      .select(AMBASSADOR_REWARD_SELECT)
      .in("ambassador_link_id", linkIds)
      .order("created_at", { ascending: false });
    if (rewardError) {
      console.error("[admin/ambassadors] detail rewards failed", rewardError.message);
      throw new Error(rewardError.message);
    }
    rewards = ((rewardData ?? []) as unknown[]).map(parseRewardRow).filter(Boolean) as AdminAmbassadorReward[];
  }

  return { ...overview, links, rewards };
}

export type ActivateAmbassadorInput = {
  userIdentifier: unknown;
  preferredCode?: unknown;
  internalNote?: unknown;
};

export async function activateAdminAmbassador(
  admin: AdminClient,
  actor: { id: string; email: string | null },
  input: ActivateAmbassadorInput,
): Promise<Result<{ ambassador: unknown; primaryLink: unknown }>> {
  const userIdentifier =
    typeof input.userIdentifier === "string" ? input.userIdentifier.trim() : "";
  if (!userIdentifier) {
    return { ok: false, status: 400, error: "Compte Pratiqo requis (courriel, UUID ou Teacher ID)." };
  }

  const preferredCode = optionalText(input.preferredCode, 64);
  if (preferredCode === undefined) return { ok: false, status: 400, error: "Code trop long." };

  const internalNote = optionalText(input.internalNote, 2000);
  if (internalNote === undefined) return { ok: false, status: 400, error: "Note trop longue." };

  const { data, error } = await admin.rpc("admin_activate_ambassador_user", {
    p_user_identifier: userIdentifier,
    p_preferred_code: preferredCode,
    p_internal_note: internalNote,
    p_actor_id: actor.id,
    p_actor_email: actor.email,
  });
  if (error) return mapRpcError(error.message, "Activation ambassadeur impossible.");

  const row = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return { ok: true, value: { ambassador: row.ambassador ?? null, primaryLink: row.primary_link ?? null } };
}

export async function setAdminAmbassadorStatus(
  admin: AdminClient,
  actor: { id: string; email: string | null },
  ambassadorId: string,
  status: unknown,
  internalNote?: unknown,
): Promise<Result<unknown>> {
  const cleanId = ambassadorId.trim();
  if (!cleanId) return { ok: false, status: 400, error: "Identifiant ambassadeur requis." };
  if (status !== "active" && status !== "paused" && status !== "revoked") {
    return { ok: false, status: 400, error: "Statut ambassadeur invalide." };
  }
  const note = optionalText(internalNote, 2000);
  if (note === undefined) return { ok: false, status: 400, error: "Note trop longue." };

  const { data, error } = await admin.rpc("admin_set_ambassador_status", {
    p_ambassador_id: cleanId,
    p_status: status,
    p_internal_note: note,
    p_actor_id: actor.id,
    p_actor_email: actor.email,
  });
  if (error) return mapRpcError(error.message, "Mise a jour du statut impossible.");
  return { ok: true, value: data };
}

export async function createAdminAmbassadorLink(
  admin: AdminClient,
  actor: { id: string; email: string | null },
  ambassadorId: string,
  input: { preferredCode?: unknown; destinationPath?: unknown; campaign?: unknown },
): Promise<Result<AdminAmbassadorLink>> {
  const cleanId = ambassadorId.trim();
  if (!cleanId) return { ok: false, status: 400, error: "Identifiant ambassadeur requis." };
  const preferredCode = optionalText(input.preferredCode, 64);
  if (!preferredCode) return { ok: false, status: 400, error: "Code requis." };
  const destinationPath = optionalText(input.destinationPath, 500) ?? "/trouver-un-prof";
  if (destinationPath === undefined || safeAmbassadorDestination(destinationPath) !== destinationPath) {
    return { ok: false, status: 400, error: "Destination invalide." };
  }
  const campaign = optionalText(input.campaign, 120);
  if (campaign === undefined) return { ok: false, status: 400, error: "Campagne trop longue." };

  const { data, error } = await admin.rpc("admin_create_ambassador_link", {
    p_ambassador_id: cleanId,
    p_preferred_code: preferredCode,
    p_destination_path: destinationPath,
    p_campaign: campaign,
    p_actor_id: actor.id,
    p_actor_email: actor.email,
  });
  if (error) return mapRpcError(error.message, "Creation du lien impossible.");
  const link = parseLinkRow(data);
  if (!link) return { ok: false, status: 500, error: "Creation du lien impossible." };
  return { ok: true, value: link };
}

export async function updateAdminAmbassadorLink(
  admin: AdminClient,
  actor: { id: string; email: string | null },
  linkId: string,
  input: { destinationPath?: unknown; campaign?: unknown; active?: unknown },
): Promise<Result<AdminAmbassadorLink>> {
  const cleanId = linkId.trim();
  if (!cleanId) return { ok: false, status: 400, error: "Identifiant du lien requis." };
  const destinationPath =
    input.destinationPath === undefined ? undefined : optionalText(input.destinationPath, 500);
  if (destinationPath === undefined && input.destinationPath !== undefined) {
    return { ok: false, status: 400, error: "Destination invalide." };
  }
  if (destinationPath !== undefined && destinationPath !== null && safeAmbassadorDestination(destinationPath) !== destinationPath) {
    return { ok: false, status: 400, error: "Destination invalide." };
  }
  const campaign = input.campaign === undefined ? undefined : optionalText(input.campaign, 120);
  if (campaign === undefined && input.campaign !== undefined) {
    return { ok: false, status: 400, error: "Campagne trop longue." };
  }
  const active = typeof input.active === "boolean" ? input.active : null;

  const { data, error } = await admin.rpc("admin_update_ambassador_link", {
    p_link_id: cleanId,
    p_destination_path: destinationPath ?? null,
    p_campaign: campaign ?? null,
    p_active: active,
    p_actor_id: actor.id,
    p_actor_email: actor.email,
  });
  if (error) return mapRpcError(error.message, "Mise a jour du lien impossible.");
  const link = parseLinkRow(data);
  if (!link) return { ok: false, status: 500, error: "Mise a jour du lien impossible." };
  return { ok: true, value: link };
}

export async function markAdminAmbassadorRewardPaid(
  admin: AdminClient,
  actor: { id: string; email: string | null },
  rewardId: string,
  paymentNote?: unknown,
): Promise<Result<AdminAmbassadorReward>> {
  const cleanId = rewardId.trim();
  if (!cleanId) return { ok: false, status: 400, error: "Identifiant de recompense requis." };
  const note = optionalText(paymentNote, 1000);
  if (note === undefined) return { ok: false, status: 400, error: "Note trop longue." };

  const { data, error } = await admin.rpc("admin_mark_ambassador_reward_paid", {
    p_reward_id: cleanId,
    p_payment_note: note,
    p_actor_id: actor.id,
    p_actor_email: actor.email,
  });
  if (error) return mapRpcError(error.message, "Marquage paye impossible.");
  const reward = parseRewardRow(data);
  if (!reward) return { ok: false, status: 500, error: "Marquage paye impossible." };
  return { ok: true, value: reward };
}
