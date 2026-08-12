import type { SupabaseClient } from "@supabase/supabase-js";

import { sendLearnerDemandMatchEmail } from "@/lib/email/templates/learnerDemand";
import { matchLearnerDemand } from "@/lib/learnerDemand";
import { fetchTeacherDisciplinesMap, mergeTeachersWithDisciplines } from "@/lib/teacherDisciplines";
import { isLaunchEligibleTeacherRow, teacherRowToTeacher, type TeacherRow } from "@/lib/teacherMapper";
import { TEACHERS_LIST_SELECT, TEACHERS_PUBLIC_TABLE } from "@/lib/supabase/queries";

type LearnerDemandLead = {
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
    .select("id, email, subject, city, accepts_online, local_waitlist, locale")
    .eq("status", "open")
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
  const disciplineMap = await fetchTeacherDisciplinesMap(admin, mapped.map((teacher) => teacher.id));
  const teachers = mergeTeachersWithDisciplines(mapped, disciplineMap);

  for (const lead of pending) {
    const match = matchLearnerDemand(teachers, {
      subject: lead.subject,
      city: lead.city,
      acceptsOnline: lead.local_waitlist ? false : lead.accepts_online,
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
      .select("id")
      .maybeSingle();

    if (claimError || !claimed) continue;

    try {
      await sendLearnerDemandMatchEmail({
        email: lead.email,
        subject: lead.subject,
        city: lead.city,
        outcome: match.outcome,
        searchUrl: match.searchUrl,
        locale: lead.locale,
      });

      const sentAt = new Date().toISOString();
      await admin
        .from("learner_demand_leads")
        .update({ status: "notified", local_waitlist: false, updated_at: sentAt })
        .eq("id", lead.id)
        .eq("status", "matched");
      summary.notified += 1;
    } catch (error) {
      summary.failed += 1;
      console.error("[learner-demand-notifications] send failed", {
        leadId: lead.id,
        message: error instanceof Error ? error.message : "unknown",
      });
      const retryAt = new Date().toISOString();
      await admin
        .from("learner_demand_leads")
        .update({ status: "open", local_waitlist: lead.local_waitlist, updated_at: retryAt })
        .eq("id", lead.id)
        .eq("status", "matched");
    }
  }

  return summary;
}
