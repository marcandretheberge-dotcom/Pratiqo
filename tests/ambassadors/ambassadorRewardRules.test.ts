import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");
}

const migration089 = read("supabase/migrations/089_ambassador_referral_tracking.sql");
const migration090 = read("supabase/migrations/090_ambassador_rewards_v1.sql");
const migration091 = read("supabase/migrations/091_ambassador_rewards_version_hardening.sql");
const allAmbassadorSql = `${migration089}\n${migration090}\n${migration091}`;

test("durable attribution is separate from sessions, events and rewards", () => {
  for (const table of [
    "ambassador_links",
    "referral_sessions",
    "referral_attributions",
    "referral_events",
    "ambassador_rewards",
    "ambassador_reward_rules",
  ]) {
    assert.match(allAmbassadorSql, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}\\b`), `${table} exists`);
  }
  assert.match(migration089, /COMMENT ON TABLE public\.referral_events IS[\s\S]*Financial rewards are intentionally stored separately/);
  assert.match(migration089, /COMMENT ON TABLE public\.ambassador_rewards IS[\s\S]*Manual-first reward ledger/);
});

test("first-touch acquisition attribution is immutable and idempotent by user and acquisition type", () => {
  assert.match(migration089, /CONSTRAINT referral_attributions_one_per_user_type UNIQUE \(referred_user_id, referral_type\)/);
  assert.match(migration089, /CONSTRAINT referral_attributions_one_per_session_type UNIQUE \(session_id, referral_type\)/);
  assert.match(migration089, /CONSTRAINT referral_attributions_not_self_check CHECK \(ambassador_user_id <> referred_user_id\)/);
  assert.doesNotMatch(migration089, /referred_user_id uuid NOT NULL UNIQUE/);
  assert.doesNotMatch(migration089, /session_id uuid NOT NULL UNIQUE/);
  assert.match(migration089, /ON CONFLICT \(referred_user_id, referral_type\) DO NOTHING/);
  assert.match(migration089, /FOR UPDATE/);
});

test("V1 economics are canonical CAD integer-cent rules", () => {
  assert.match(migration090, /'2026-08-v1'/);
  assert.match(migration090, /5000,\s*\n\s*3,\s*\n\s*500,\s*\n\s*1000,\s*\n\s*1000,\s*\n\s*4000/);
  assert.match(allAmbassadorSql, /amount_cents integer NOT NULL/);
  assert.match(migration090, /student_platform_fee_share_bps smallint NOT NULL/);
  assert.match(migration090, /teacher_activation_bonus_cents integer NOT NULL/);
  assert.match(migration090, /teacher_min_completed_platform_fee_cents integer NOT NULL/);
  assert.match(migration090, /teacher_activation_bonus_cents \* 4 <= teacher_min_completed_platform_fee_cents/);
});

test("learner rewards use actual platform_fee_cents, never lesson GMV", () => {
  assert.match(migration091, /v_payment\.platform_fee_cents > 0/);
  assert.match(migration091, /FLOOR\(\(v_payment\.platform_fee_cents::numeric \* v_rule\.student_platform_fee_share_bps\) \/ 10000\)::integer/);
  assert.match(migration091, /v_rule\.student_per_booking_cap_cents/);
  assert.match(migration091, /v_rule\.student_total_cap_cents - v_student_reward_total/);
  assert.doesNotMatch(migration091, /NEW\.price|amount_cents::numeric \* v_rule\.student_platform_fee_share_bps/);
});

test("eligible bookings must be completed, held, paid, non-refunded and CAD", () => {
  assert.match(migration091, /NEW\.status IS DISTINCT FROM 'completed'/);
  assert.match(migration091, /NEW\.completion_outcome IS DISTINCT FROM 'held'/);
  assert.match(migration091, /bp\.payment_status = 'paid'/);
  assert.match(migration091, /bp\.refunded_cents = 0/);
  assert.match(migration091, /bp\.currency = v_rule\.currency/);
  assert.match(migration091, /b\.status = 'completed'/);
  assert.match(migration091, /b\.completion_outcome = 'held'/);
});

test("learner acquisition caps do not reset across future rule versions", () => {
  assert.match(migration091, /Lifetime acquisition caps/);
  assert.match(migration091, /ar\.status <> 'void'/);
  assert.doesNotMatch(migration091, /AND ar\.rule_version = v_rule\.rule_version[\s\S]*?student_completed_booking_share/);
  assert.doesNotMatch(migration091, /ar\.status NOT IN \('void', 'reversed'\)/);
  assert.match(migration091, /'student_completed:' \|\| v_student_attr\.id::text \|\| ':' \|\| NEW\.id::text/);
  assert.doesNotMatch(migration091, /'student_completed:' \|\| v_student_attr\.id::text \|\| ':' \|\| NEW\.id::text \|\| ':' \|\| v_rule\.rule_version/);
});

test("paid then reversed learner rewards remain historical cap spend", () => {
  assert.match(migration091, /paid->reversed rewards counted as historical acquisition spend/);
  assert.match(migration091, /A pre-payout void releases capacity; paid->reversed remains historical spend/);
  assert.match(migration091, /SET status = CASE WHEN ar\.status = 'paid' THEN 'reversed' ELSE 'void' END/);
});

test("teacher acquisition reward is one-time and version-safe", () => {
  assert.match(migration091, /ar\.status IN \('pending', 'earned', 'paid', 'reversed'\)/);
  assert.match(migration091, /v_teacher_reward_exists/);
  assert.match(migration091, /'teacher_activation:' \|\| v_teacher_attr\.id::text/);
  assert.doesNotMatch(migration091, /'teacher_activation:' \|\| v_teacher_attr\.id::text \|\| ':' \|\| v_rule\.rule_version/);
  assert.match(migration091, /v_teacher_platform_fee_total >= v_rule\.teacher_min_completed_platform_fee_cents/);
});

test("refund and dispute reconciliation preserves financial history", () => {
  assert.match(migration091, /NEW\.payment_status IN \('refunded', 'partially_refunded', 'disputed'\)/);
  assert.match(migration091, /ar\.status IN \('pending', 'earned', 'paid'\)/);
  assert.match(migration091, /status_reason', 'booking_refund_or_dispute'/);
  assert.match(migration091, /status_reason', 'teacher_margin_below_threshold'/);
  assert.match(migration091, /ar\.rule_version = r\.rule_version/);
  assert.match(migration091, /DROP FUNCTION IF EXISTS public\.reconcile_ambassador_rewards_v1_after_payment_adjustment\(\)/);
});

test("reward ledger supports manual payout lifecycle and no automatic transfers", () => {
  assert.match(migration089, /status IN \('pending', 'earned', 'paid', 'void', 'reversed'\)/);
  assert.match(migration089, /paid_at timestamptz/);
  assert.match(migration089, /voided_at timestamptz/);
  assert.match(migration089, /reward_key text NOT NULL UNIQUE/);
  assert.doesNotMatch(allAmbassadorSql, /stripe\.transfers|checkout\.sessions\.create|stripe_account_id/i);
});

test("admin economics view reports unique margin, obligations, paid and reversed amounts", () => {
  assert.match(migration090, /CREATE OR REPLACE VIEW public\.ambassador_reward_economics/);
  assert.match(migration090, /referred_learners/);
  assert.match(migration090, /referred_teachers/);
  assert.match(migration090, /referred_student_eligible_bookings/);
  assert.match(migration090, /referred_teacher_eligible_bookings/);
  assert.match(migration090, /unique_eligible_completed_bookings/);
  assert.match(migration090, /UNION\s+SELECT ambassador_link_id, booking_id, platform_fee_cents FROM teacher_fee_rows/);
  assert.match(migration090, /rewards_due_cents/);
  assert.match(migration090, /rewards_paid_cents/);
  assert.match(migration090, /rewards_reversed_cents/);
  assert.match(migration090, /realized_fee_after_active_rewards_cents/);
});

test("RLS and grants keep ambassador data server/admin only in V1", () => {
  for (const table of [
    "ambassador_links",
    "referral_sessions",
    "referral_attributions",
    "referral_events",
    "ambassador_rewards",
    "ambassador_reward_rules",
  ]) {
    assert.match(allAmbassadorSql, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
    assert.match(allAmbassadorSql, new RegExp(`REVOKE ALL ON public\\.${table} FROM anon, authenticated`));
  }
  assert.match(allAmbassadorSql, /REVOKE ALL ON public\.ambassador_performance FROM anon, authenticated/);
  assert.match(allAmbassadorSql, /REVOKE ALL ON public\.ambassador_reward_economics FROM anon, authenticated/);
  assert.doesNotMatch(allAmbassadorSql, /GRANT (SELECT|INSERT|UPDATE|DELETE|ALL) ON public\.(ambassador|referral)_[\w]+ TO authenticated/);
});

test("SECURITY DEFINER functions have explicit search_path and no public execution", () => {
  for (const fn of [
    "claim_ambassador_referral",
    "record_ambassador_teacher_activation",
    "record_ambassador_booking_payment_event",
    "record_ambassador_booking_completion",
    "record_ambassador_rewards_v1_on_booking_completion",
    "reconcile_ambassador_rewards_after_payment_adjustment",
  ]) {
    assert.match(allAmbassadorSql, new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn}\\(`), `${fn} exists`);
  }
  assert.match(allAmbassadorSql, /SECURITY DEFINER\s+SET search_path = public/);
  assert.match(allAmbassadorSql, /REVOKE ALL ON FUNCTION public\.claim_ambassador_referral\(uuid, uuid\) FROM PUBLIC, anon, authenticated/);
  assert.match(allAmbassadorSql, /REVOKE ALL ON FUNCTION public\.reconcile_ambassador_rewards_after_payment_adjustment\(\) FROM PUBLIC, anon, authenticated/);
});

test("privacy posture avoids raw IP retention and browser-visible economics", () => {
  assert.doesNotMatch(allAmbassadorSql, /ip_address|fingerprint|user_agent|device_id/i);
  assert.match(read("app/r/[code]/route.ts"), /AMBASSADOR_REF_COOKIE, session\.id/);
  assert.doesNotMatch(read("app/r/[code]/route.ts"), /platform_fee_cents|ambassador_user_id/);
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  console.log(`[ambassadors:rewards] ${passed} tests passed`);
}
