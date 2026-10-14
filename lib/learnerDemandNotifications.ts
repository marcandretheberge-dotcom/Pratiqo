import type { SupabaseClient } from "@supabase/supabase-js";

import { sendLearnerDemandMatchEmail } from "@/lib/email/templates/learnerDemand";
import { matchLearnerDemand } from "@/lib/learnerDemand";
import { loadLearnerDemandSupply } from "@/lib/learnerDemandSupply";
import type { LearnerAvailability } from "@/lib/learnerAvailability";
import type { Teacher } from "@/types";
import { isLaunchEligibleTeacherRow, teacherRowToTeacher, type TeacherRow } from "@/lib/teacherMapper";
import { TEACHERS_LIST_SELECT, TEACHERS_PUBLIC_TABLE } from "@/lib/supabase/queries";

type LearnerDemandLead = {
  availability_preference: LearnerAvailability;
  requested_format: "in_person" | "online";
  id: string;
  email: string;
  subject: string;
  city: string;
  accepts_online: boolean;
  local_waitlist: boolean;
  locale: string | null;
};

export type LearnerDemandNotificationSummary = {
  checked: number;
  matched: number;
  notified: number;
  failed: number;
};

export async function processLearnerDemandMatches(
  admin: SupabaseClient,
  options: { limit?: number } = {},
): Promise<LearnerDemandNotificationSummary> {
  const limit = Math.max(1, Math.min(250, Math.round(options.limit ?? 100)));
  const summary: LearnerDemandNotificationSummary = { checked: 0, matched: 0, notified: 0, failed: 0 };

  const { data: leads, error: leadsError } = await admin
    .from("learner_demand_leads")
    .select("id, email, subject, city, accepts_online, local_waitlist, locale, availability_preference, requested_format")
    .eq("status", "open")
    .not("alert_consent_at", "is", null)
    .eq("adult_contact_confirmed", true)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (leadsError) throw new Error(`learner_demand_leads query failed: ${leadsError.code}`);
  const pending = (leads ?? []) as LearnerDemandLead[];
  summary.checked = pending.length;
  if (!pending.length) return summary;

  const { data: teacherRows, error: teachersError } = await admin
    .from(TEACHERS_PUBLIC_TABLE)
    .select(TEACHERS_LIST_SELECT)
    .order("verification_level", { ascending: false })
    .order("rating", { ascending: false });

  if (teachersError) throw new Error(`teachers_public query failed: ${teachersError.code}`);

  const mapped = (teacherRows ?? [])
    .filter((row) => isLaunchEligibleTeacherRow(row as TeacherRow))
    .map((row) => teacherRowToTeacher(row as TeacherRow));
  const supply = new Map<LearnerAvailability, Teacher[]>();

  for (const lead of pending) {
    const preference = lead.availability_preference ?? "any";
    if (!supply.has(preference)) supply.set(preference, await loadLearnerDemandSupply(admin, mapped, preference));
    const teachers = supply.get(preference)!;
    const match = matchLearnerDemand(teachers, {
      subject: lead.subject,
      city: lead.city,
      acceptsOnline: lead.local_waitlist ? false : lead.accepts_online,
      requestedFormat: lead.requested_format,
      availabilityPreference: preference,
    });
    const now = new Date().toISOString();

    if (match.outcome === "waitlist" || !match.searchUrl) {
      const patch = lead.local_waitlist
        ? { last_match_at: now, updated_at: now }
        : { last_match_at: now, matched_teacher_count: 0, match_type: "none", updated_at: now };
      await admin.from("learner_demand_leads").update(patch).eq("id", lead.id).eq("status", "open");
      continue;
    }

    summary.matched += 1;
    const matchType = match.outcome === "local_match" ? "local" : "online";

    const { data: claimed, error: claimError } = await admin
      .from("learner_demand_leads")
      .update({
        status: "matched",
        match_type: matchType,
        matched_teacher_count: match.matchCount,
        last_match_at: now,
        updated_at: now,
      })
      .eq("id", lead.id)
      .eq("status", "open")
      .not("alert_consent_at", "is", null)
      .eq("adult_contact_confirmed", true)
      .select("id")
      .maybeSingle();

    if (claimError || !claimed) continue;

    try {
      // Recheck withdrawal immediately before handoff. A request already handed
      // to the provider cannot be recalled; never automatically retry ambiguity.
      const { data: permitted, error: permissionError } = await admin
        .from("learner_demand_leads").select("id")
        .eq("id", lead.id).eq("status", "matched")
        .not("alert_consent_at", "is", null).eq("adult_contact_confirmed", true)
        .maybeSingle();
      if (permissionError || !permitted) { summary.failed += 1; continue; }
      await sendLearnerDemandMatchEmail({
        idempotencyKey: `learner-demand/${lead.id}`,
        email: lead.email,
        subject: lead.subject,
        city: lead.city,
        outcome: match.outcome,
        searchUrl: match.searchUrl,
        locale: lead.locale,
      });

      const sentAt = new Date().toISOString();
      const { data: notified, error: notifiedError } = await admin
        .from("learner_demand_leads")
        .update({ status: "notified", local_waitlist: false, updated_at: sentAt })
        .eq("id", lead.id)
        .eq("status", "matched").select("id").maybeSingle();
      if (notifiedError) {
        // Do not reopen after an accepted email: a retry could send it twice.
        summary.failed += 1;
        console.error("[learner-demand-notifications] delivery state save failed", { code: notifiedError.code });
        continue;
      }
      if (notified) summary.notified += 1;
    } catch (error) {
      summary.failed += 1;
      console.error("[learner-demand-notifications] send failed", {
        leadId: lead.id,
        message: error instanceof Error ? error.message : "unknown",
      });
      // Keep the claimed row for operator reconciliation. A timeout can mean
      // accepted delivery; reopening here would create an unbounded retry loop.
    }
  }

  return summary;
}
