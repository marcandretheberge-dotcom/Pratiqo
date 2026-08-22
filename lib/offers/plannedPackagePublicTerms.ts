/**
 * Load / record planned package public terms acknowledgements.
 */

import { createClient } from "@supabase/supabase-js";
import {
  isLearnerPackageTermsAccepted,
  isTeacherPackageTermsAccepted,
  PLANNED_PACKAGE_PUBLIC_TERMS_VERSION,
} from "./plannedPackagePublicLaunchGate";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_admin");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type TeacherPackageTermsRow = {
  acceptedAt: string | null;
  policyVersion: string | null;
};

export async function loadTeacherPackageTerms(
  teacherId: string,
): Promise<TeacherPackageTermsRow> {
  const admin = adminClient();
  const { data } = await admin
    .from("teachers")
    .select("teacher_package_terms_accepted_at, teacher_package_terms_policy_version")
    .eq("id", teacherId)
    .maybeSingle();
  return {
    acceptedAt:
      typeof data?.teacher_package_terms_accepted_at === "string"
        ? data.teacher_package_terms_accepted_at
        : null,
    policyVersion:
      typeof data?.teacher_package_terms_policy_version === "string"
        ? data.teacher_package_terms_policy_version
        : null,
  };
}

export async function recordTeacherPackageTermsAcknowledgment(
  teacherId: string,
): Promise<{ ok: true; acceptedAt: string; policyVersion: string } | { ok: false; error: string }> {
  const admin = adminClient();
  const acceptedAt = new Date().toISOString();
  const policyVersion = PLANNED_PACKAGE_PUBLIC_TERMS_VERSION;
  const { error } = await admin
    .from("teachers")
    .update({
      teacher_package_terms_accepted_at: acceptedAt,
      teacher_package_terms_policy_version: policyVersion,
    })
    .eq("id", teacherId);
  if (error) return { ok: false, error: "teacher_terms_save_failed" };
  return { ok: true, acceptedAt, policyVersion };
}

export function teacherPackageTermsGateInput(terms: TeacherPackageTermsRow): {
  requireTeacherTerms: true;
  teacherTermsAccepted: boolean;
  teacherTermsPolicyVersion: string | null;
} {
  return {
    requireTeacherTerms: true,
    teacherTermsAccepted: isTeacherPackageTermsAccepted({
      acceptedAt: terms.acceptedAt,
      policyVersion: terms.policyVersion,
    }),
    teacherTermsPolicyVersion: terms.policyVersion,
  };
}

export async function recordLearnerPackageTermsOnPendingOrder(args: {
  orderId: string;
  studentId: string;
}): Promise<{ ok: true; acceptedAt: string; policyVersion: string } | { ok: false; error: string }> {
  const admin = adminClient();
  const acceptedAt = new Date().toISOString();
  const policyVersion = PLANNED_PACKAGE_PUBLIC_TERMS_VERSION;
  const { data, error } = await admin
    .from("planned_package_pending_orders")
    .update({
      learner_package_terms_accepted_at: acceptedAt,
      learner_package_terms_policy_version: policyVersion,
    })
    .eq("id", args.orderId)
    .eq("student_id", args.studentId)
    .eq("status", "pending_payment")
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "learner_terms_save_failed" };
  return { ok: true, acceptedAt, policyVersion };
}

export function learnerPackageTermsFromOrder(row: {
  learner_package_terms_accepted_at?: string | null;
  learner_package_terms_policy_version?: string | null;
}): {
  requireLearnerTerms: true;
  learnerTermsAccepted: boolean;
  learnerTermsPolicyVersion: string | null;
} {
  const acceptedAt =
    typeof row.learner_package_terms_accepted_at === "string"
      ? row.learner_package_terms_accepted_at
      : null;
  const policyVersion =
    typeof row.learner_package_terms_policy_version === "string"
      ? row.learner_package_terms_policy_version
      : null;
  return {
    requireLearnerTerms: true,
    learnerTermsAccepted: isLearnerPackageTermsAccepted({ acceptedAt, policyVersion }),
    learnerTermsPolicyVersion: policyVersion,
  };
}
