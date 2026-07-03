/**
 * Production access / security audit regression tests.
 *
 * These tests are deterministic source-scan checks. They protect the
 * findings from `docs/security/production-access-audit.md` against
 * future regressions without requiring a live Supabase/Vercel/Stripe
 * environment.
 *
 * Scope:
 *   - RLS: sensitive tables stay locked and the teachers trust-fields
 *     trigger keeps service-role bypass narrow.
 *   - API auth: admin/cron/webhook routes still enforce their guards.
 *   - Secrets: server-only env vars never appear in `"use client"` files.
 *   - Headers: defense-in-depth response headers remain configured.
 *   - Client boundary: no direct client-side writes to protected tables.
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function readRepoFile(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    let stat;
    try {
      stat = statSync(p);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (p.includes("node_modules") || p.includes(".next")) continue;
      out.push(...walk(p));
    } else if (/\.(ts|tsx|js|jsx)$/.test(f)) {
      out.push(p);
    }
  }
  return out;
}

function isClientFile(src: string): boolean {
  return /^["']use client["']/.test(src.slice(0, 200));
}

// ────────────────────────────────────────────────────────────────────────────
// 1. RLS migrations: sensitive tables remain locked
// ────────────────────────────────────────────────────────────────────────────

test("064 enables RLS on every sensitive public table", () => {
  const src = readRepoFile("supabase/migrations/064_enable_rls_public_tables.sql");
  for (const table of [
    "bookings",
    "booking_payments",
    "messages",
    "support_cases",
    "teacher_credentials",
    "credit_transactions",
    "profiles",
    "teachers",
    "review_reports",
    "learner_profiles",
    "notifications",
  ]) {
    const re = new RegExp(`ALTER TABLE IF EXISTS public\\.${table} ENABLE ROW LEVEL SECURITY`);
    assert.match(src, re, `expected RLS enabled for public.${table}`);
  }
});

test("065 hardens credit_transactions / chats / bookings writes", () => {
  const src = readRepoFile("supabase/migrations/065_rls_p0_policy_hardening.sql");
  assert.match(src, /credit_transactions[\s\S]*FOR SELECT[\s\S]*auth\.uid\(\) = user_id/);
  assert.doesNotMatch(src, /CREATE POLICY "chats_insert_participant"/);
  assert.doesNotMatch(src, /CREATE POLICY "bookings_update_participants"/);
  assert.match(src, /CREATE POLICY "bookings_insert_participants"[\s\S]*status = 'pending_payment'/);
});

test("booking_payments locks all client writes", () => {
  const src = readRepoFile("supabase/migrations/038_payment_ledger.sql");
  assert.match(src, /booking_payments_no_client_insert[\s\S]*WITH CHECK \(false\)/);
  assert.match(src, /booking_payments_no_client_update[\s\S]*USING \(false\)[\s\S]*WITH CHECK \(false\)/);
  assert.match(src, /booking_payments_no_client_delete[\s\S]*USING \(false\)/);
});

test("support_cases locks client updates and deletes", () => {
  const src = readRepoFile("supabase/migrations/045_support_cases_resolution_center.sql");
  assert.match(src, /support_cases_no_client_update[\s\S]*USING \(false\)[\s\S]*WITH CHECK \(false\)/);
  assert.match(src, /support_cases_no_client_delete[\s\S]*USING \(false\)/);
  assert.match(src, /support_cases_select_participants/);
});

test("messages SELECT/INSERT is scoped to participants", () => {
  const src = readRepoFile("supabase/migrations/005_messages_realtime.sql");
  assert.match(src, /Users can read their own messages[\s\S]*auth\.uid\(\) = sender_id OR auth\.uid\(\) = receiver_id/);
  assert.match(src, /Users can send messages[\s\S]*auth\.uid\(\) = sender_id AND sender_id <> receiver_id/);
});

test("messages INSERT requires a booking relationship (no spam to strangers)", () => {
  const src = readRepoFile("supabase/migrations/050_security_hardening_rls.sql");
  assert.match(src, /Users can send messages[\s\S]*FROM public\.bookings b/);
});

test("waitlist denies anon SELECT (email harvest protection)", () => {
  const src = readRepoFile("supabase/migrations/050_security_hardening_rls.sql");
  assert.match(src, /waitlist_select_none[\s\S]*USING \(false\)/);
});

// ────────────────────────────────────────────────────────────────────────────
// 2. New: teachers trust-fields trigger (migration 069)
// ────────────────────────────────────────────────────────────────────────────

test("069 teachers trigger preserves OLD trust/Stripe values on self-update", () => {
  const src = readRepoFile("supabase/migrations/069_teachers_preserve_sensitive_client_fields.sql");
  assert.match(src, /CREATE OR REPLACE FUNCTION public\.teachers_preserve_sensitive_client_fields/);
  assert.match(src, /jwt_role = 'service_role'/);
  for (const col of [
    "identity_verified",
    "diploma_verified",
    "phone_verified",
    "is_verified",
    "verification_level",
    "stripe_account_id",
    "stripe_connect_charges_enabled",
    "stripe_connect_payouts_enabled",
    "stripe_identity_status",
    "location_verification_status",
    "cv_verification_status",
    "deactivated_at",
    "deleted_at",
  ]) {
    const re = new RegExp(`NEW\\.${col} := OLD\\.${col}`);
    assert.match(src, re, `expected UPDATE branch to preserve teachers.${col}`);
  }
});

test("069 trigger forces safe defaults on self-INSERT for trust columns", () => {
  const src = readRepoFile("supabase/migrations/069_teachers_preserve_sensitive_client_fields.sql");
  for (const line of [
    "NEW.identity_verified := false",
    "NEW.diploma_verified := false",
    "NEW.phone_verified := false",
    "NEW.is_verified := false",
    "NEW.verification_level := 0",
    "NEW.stripe_account_id := NULL",
    "NEW.stripe_connect_charges_enabled := false",
    "NEW.stripe_connect_payouts_enabled := false",
  ]) {
    assert.ok(
      src.includes(line),
      `expected INSERT branch to force ${line}`,
    );
  }
});

test("069 trigger is BEFORE INSERT OR UPDATE and bound to public.teachers", () => {
  const src = readRepoFile("supabase/migrations/069_teachers_preserve_sensitive_client_fields.sql");
  assert.match(
    src,
    /CREATE TRIGGER teachers_preserve_sensitive_client_fields_trigger\s+BEFORE INSERT OR UPDATE ON public\.teachers/,
  );
});

// ────────────────────────────────────────────────────────────────────────────
// 3. API route guards
// ────────────────────────────────────────────────────────────────────────────

test("/api/admin/review enforces server-side admin check", () => {
  const src = readRepoFile("app/api/admin/review/route.ts");
  assert.match(src, /async function requireAdmin/);
  assert.match(src, /supabaseUser\.auth\.getUser\(token\)/);
  assert.match(src, /from\(["']profiles["']\)[\s\S]*select\(["']role["']\)/);
  assert.match(src, /role: \?[^}]*}\s*\)\?\.\role !== "admin"|role\?: string[^}]*\} \| null\)\?\.role !== "admin"/);
});

test("admin app layout calls requireAdminPage server-side", () => {
  const src = readRepoFile("app/(app)/admin/layout.tsx");
  assert.match(src, /requireAdminPage/);
  // Must be invoked, not just imported.
  assert.match(src, /await requireAdminPage/);
});

test("both cron routes require CRON_SECRET via verifyCronSecret", () => {
  for (const path of [
    "app/api/cron/bookings/complete/route.ts",
    "app/api/cron/bookings/reminders/route.ts",
  ]) {
    const src = readRepoFile(path);
    assert.match(src, /verifyCronSecret\(req\)/, `${path}: must call verifyCronSecret`);
    assert.match(src, /CRON_SECRET/, `${path}: must reference CRON_SECRET env`);
  }
});

test("verifyCronSecret reads from Authorization or x-cron-secret only", () => {
  const src = readRepoFile("lib/cron/auth.ts");
  assert.match(src, /process\.env\.CRON_SECRET/);
  assert.match(src, /headers\.get\("authorization"\)/);
  assert.match(src, /x-cron-secret/);
});

test("Stripe webhook verifies provider signature before processing", () => {
  const src = readRepoFile("app/api/stripe/webhook/route.ts");
  assert.match(src, /stripe\.webhooks\.constructEvent\(body, signature, webhookSecret\)/);
  assert.match(src, /STRIPE_WEBHOOK_SECRET/);
  assert.match(src, /headers\.get\("stripe-signature"\)/);
});

test("review-published webhook requires SUPABASE_WEBHOOK_SECRET", () => {
  const src = readRepoFile("app/api/webhooks/review-published/route.ts");
  assert.match(src, /process\.env\.SUPABASE_WEBHOOK_SECRET/);
  assert.match(src, /Unauthorized/);
});

test("messages/send verifies sender token and resolves user.id server-side", () => {
  const src = readRepoFile("app/api/messages/send/route.ts");
  assert.match(src, /supabaseUser\.auth\.getUser\(token\)/);
  // sender_id must come from server-resolved user, never from request body.
  assert.match(src, /sender_id: user\.id/);
  assert.doesNotMatch(src, /sender_id:\s*body\./);
});

test("support/cases verifies booking participation server-side", () => {
  const src = readRepoFile("app/api/support/cases/route.ts");
  assert.match(src, /canUserOpenCaseForBooking\(user\.id/);
  assert.match(src, /inferSupportCaseRole\(user\.id/);
});

test("booking cancel verifies actor matches student or teacher.user_id", () => {
  const src = readRepoFile("app/api/bookings/[id]/cancel/route.ts");
  assert.match(src, /booking\.student_id === user\.id/);
  assert.match(src, /from\("teachers"\)[\s\S]*\.eq\("user_id", user\.id\)/);
});

test("teacher/pricing resolves teacher row by authenticated user.id (no client teacherId trust)", () => {
  const src = readRepoFile("app/api/teacher/pricing/route.ts");
  assert.match(src, /async function getAuthenticatedTeacher/);
  assert.match(src, /from\("teachers"\)[\s\S]*\.eq\("user_id", user\.id\)/);
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Secrets: no server-only env names in `"use client"` files
// ────────────────────────────────────────────────────────────────────────────

const SERVER_ONLY_ENV = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CRON_SECRET",
  "SUPABASE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
];

test("no server-only secret env names appear in client components", () => {
  const files = [...walk("app"), ...walk("components"), ...walk("lib")];
  const offenders: string[] = [];
  for (const p of files) {
    const src = readFileSync(p, "utf8");
    if (!isClientFile(src)) continue;
    for (const env of SERVER_ONLY_ENV) {
      if (src.includes(env)) {
        offenders.push(`${p}: leaks ${env}`);
      }
    }
  }
  assert.equal(offenders.length, 0, `client secret leaks:\n${offenders.join("\n")}`);
});

test("no console.log of a secret env variable value", () => {
  // Anywhere in the repo, we should never log the raw value of these envs.
  // Logging presence (a boolean) is acceptable.
  const files = [...walk("app"), ...walk("lib")];
  const offenders: string[] = [];
  for (const p of files) {
    const src = readFileSync(p, "utf8");
    for (const env of SERVER_ONLY_ENV) {
      const re = new RegExp(`console\\.log\\([^)]*process\\.env\\.${env}\\b`, "g");
      if (re.test(src) && !src.includes(`Boolean(process.env.${env}`)) {
        offenders.push(`${p}: console.log(process.env.${env})`);
      }
    }
  }
  assert.equal(offenders.length, 0, `secret log leaks:\n${offenders.join("\n")}`);
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Response headers (CSP, HSTS, nosniff, referrer, permissions)
// ────────────────────────────────────────────────────────────────────────────

test("next.config sets defense-in-depth response headers", () => {
  const src = readRepoFile("next.config.ts");
  assert.match(src, /Content-Security-Policy/);
  assert.match(src, /X-Frame-Options[^\n]*SAMEORIGIN/);
  assert.match(src, /Strict-Transport-Security[^\n]*max-age=63072000/);
  assert.match(src, /X-Content-Type-Options[^\n]*nosniff/);
  assert.match(src, /Referrer-Policy[^\n]*strict-origin-when-cross-origin/);
  assert.match(src, /Permissions-Policy/);
});

test("no Access-Control-Allow-Origin: \\* is configured anywhere", () => {
  const files = [...walk("app"), ...walk("lib")];
  for (const p of files) {
    const src = readFileSync(p, "utf8");
    assert.doesNotMatch(
      src,
      /Access-Control-Allow-Origin["']?\s*[:,]\s*["']\*["']/,
      `${p}: wildcard CORS detected`,
    );
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 6. Redirect sanitization
// ────────────────────────────────────────────────────────────────────────────

test("auth/callback redirects always use resolveOAuthCallbackRedirect", () => {
  const src = readRepoFile("app/auth/callback/route.ts");
  assert.match(src, /resolveOAuthCallbackRedirect\(/);
  // Final redirect anchors on the canonical origin (www in production), not raw apex host.
  assert.match(src, /NextResponse\.redirect\(new URL\([^,]+, canonicalOrigin\)\)/);
  assert.match(src, /resolveRequestCanonicalOrigin/);
});

test("login page sanitizes next param before forwarding to Google OAuth", () => {
  const src = readRepoFile("app/login/page.tsx");
  assert.match(src, /resolveLoginOAuthNextPath/);
});

// ────────────────────────────────────────────────────────────────────────────
// 7. Server/client boundary: no direct writes to protected tables
// ────────────────────────────────────────────────────────────────────────────

const PROTECTED_TABLES = [
  "booking_payments",
  "support_cases",
  "teacher_credentials",
  "credit_transactions",
  "review_reports",
];

test("no client component writes to protected tables", () => {
  const files = [...walk("app"), ...walk("components"), ...walk("lib")];
  const offenders: string[] = [];
  for (const p of files) {
    const src = readFileSync(p, "utf8");
    if (!isClientFile(src)) continue;
    for (const t of PROTECTED_TABLES) {
      const re = new RegExp(
        `\\.from\\(\\s*["']${t}["']\\s*\\)[\\s\\S]{0,300}?\\.(insert|update|delete|upsert)\\b`,
        "g",
      );
      if (re.test(src)) offenders.push(`${p}: writes to ${t}`);
    }
  }
  assert.equal(offenders.length, 0, `client writes to protected tables:\n${offenders.join("\n")}`);
});

test("no client component imports getSupabaseAdmin or builds a service-role client", () => {
  const files = [...walk("app"), ...walk("components"), ...walk("lib")];
  const offenders: string[] = [];
  for (const p of files) {
    const src = readFileSync(p, "utf8");
    if (!isClientFile(src)) continue;
    if (/getSupabaseAdmin|SUPABASE_SERVICE_ROLE_KEY|service_role/.test(src)) {
      offenders.push(p);
    }
  }
  assert.equal(offenders.length, 0, `client uses service-role:\n${offenders.join("\n")}`);
});

// ────────────────────────────────────────────────────────────────────────────
// 8. Storage buckets
// ────────────────────────────────────────────────────────────────────────────

test("avatars bucket: public read, writes scoped to auth.uid() folder", () => {
  const src = readRepoFile("supabase/migrations/067_avatars_storage_bucket.sql");
  // Bucket itself is public to render profile photos.
  assert.match(src, /'avatars'[\s\S]*true[\s\S]*5242880/);
  // Insert / Update / Delete all gated by uid folder.
  assert.match(src, /Users can upload avatars in own folder[\s\S]*storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
  assert.match(src, /Users can update avatars in own folder[\s\S]*storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
  assert.match(src, /Users can delete avatars in own folder[\s\S]*storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
});

test("teacher-diplomas access only via service-role signed URLs in admin route", () => {
  const adminSrc = readRepoFile("app/api/admin/review/route.ts");
  assert.match(adminSrc, /const DIPLOMA_BUCKET = "teacher-diplomas"/);
  assert.match(adminSrc, /createSignedUrl\(path, SIGNED_URL_TTL\)/);
  // Admin route must verify admin role before issuing signed URLs.
  assert.match(adminSrc, /await requireAdmin\(req\)/);

  const uploadSrc = readRepoFile("app/api/teacher/diploma/route.ts");
  // Upload must use admin client (service-role) on the server, never the browser.
  assert.match(uploadSrc, /admin\.storage\s*\.from\(BUCKET\)\s*\.upload/);
});

// ────────────────────────────────────────────────────────────────────────────
// Runner
// ────────────────────────────────────────────────────────────────────────────

async function run() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (err) {
      console.error(`not ok - ${name}`);
      throw err;
    }
  }
  console.log(`[security:productionAccessAudit] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
