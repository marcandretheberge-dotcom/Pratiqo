import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { primaryRoleForPreAuthIntent } from "@/lib/auth/preAuthOnboardingIntent";
import {
  buildSnapshotInsert,
  parseProgressSnapshotPayload,
} from "@/lib/yopratiqo/progressSnapshotPersistence";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");

function ok(name: string) {
  console.log(`ok - ${name}`);
}

// 1) Existing teacher identity remains protected from learner intent.
assert.equal(primaryRoleForPreAuthIntent("learner", "teacher"), "teacher");
ok("existing teacher is not downgraded by learner intent");

// 2) Current role boundary is intentionally mutually exclusive and must remain untouched in Café V1.
const roleAudit = read("docs/AUTH_ROLE_ONBOARDING_AUDIT.md");
assert.match(roleAudit, /single source of truth is the \*\*\`profiles\.role\`\*\*/);
assert.match(roleAudit, /"student" \| "teacher" \| "admin"/);
const shell = read("components/AuthenticatedShell.tsx");
assert.match(shell, /function studentForbiddenPath/);
assert.match(shell, /function teacherForbiddenPath/);
assert.match(shell, /pathname\.startsWith\("\/student"\)/);
assert.match(shell, /pathname\.startsWith\("\/teacher\/"\)/);
ok("existing student/teacher route separation is pinned");

// 3) Learner profiles are owned learning subjects, not account identity.
const learnerMigration = read("supabase/migrations/043_learner_profiles_phase1.sql");
assert.match(learnerMigration, /owner_user_id uuid NOT NULL REFERENCES auth\.users \(id\) ON DELETE CASCADE/i);
assert.match(learnerMigration, /relationship IN \('self', 'child', 'teen', 'other'\)/i);
ok("learner_profiles remain separate from root account identity");

// 4) Existing marketplace booking learner ownership is the authenticated root user.
const coreSchema = read("supabase/migrations/000_pratiqo_schema.sql");
assert.match(coreSchema, /student_id uuid NOT NULL REFERENCES auth\.users \(id\) ON DELETE CASCADE/i);
ok("marketplace bookings keep root-user learner ownership");

// 5) Commercial group sessions remain teacher-owned and priced; Café must not mutate this domain.
const groupMigration = read("supabase/migrations/007_group_sessions.sql");
assert.match(groupMigration, /teacher_id text NOT NULL REFERENCES public\.teachers \(id\) ON DELETE CASCADE/i);
assert.match(groupMigration, /price_per_person numeric NOT NULL/i);
assert.match(groupMigration, /student_id uuid NOT NULL REFERENCES auth\.users \(id\) ON DELETE CASCADE/i);
assert.match(groupMigration, /UNIQUE \(session_id, student_id\)/i);
assert.match(groupMigration, /Teachers insert own group sessions/i);
ok("commercial group-session semantics are pinned");

// 6) YoPratiqo progress continues to derive ownership from authenticated user identity.
const parsed = parseProgressSnapshotPayload({
  user_id: "client-controlled-id",
  course_id: "yopratiqo:test",
  module_id: "module-1",
  module_title: "Module 1",
  discipline: "Languages",
});
assert.equal(parsed.ok, true);
if (!parsed.ok) throw new Error(parsed.reason);
assert.equal(Object.prototype.hasOwnProperty.call(parsed.value, "user_id"), false);
const snapshot = buildSnapshotInsert(parsed.value, "authenticated-user-id");
assert.equal(snapshot.user_id, "authenticated-user-id");

const yoRoute = read("app/api/yo/progress/route.ts");
assert.match(yoRoute, /buildSnapshotInsert\(parsed\.value, auth\.user\.id\)/);
assert.doesNotMatch(yoRoute, /profiles\.role|role\s*===\s*["']student["']/);
ok("YoPratiqo persistence remains root-user scoped and role-neutral at API boundary");

// 7) Future Café route must remain outside the existing student/teacher role namespaces.
const adr = read("docs/architecture/decisions/001-cafe-unified-account-prep.md");
assert.match(adr, /\`\/cafe\`/);
assert.match(adr, /must not initially live under \`\/student\/\*\` or \`\/teacher\/\*\`/);
assert.match(adr, /reference \`public\.profiles\(id\)\`/);
assert.match(adr, /sanitized projection\/DTO/);
assert.match(adr, /A foreign key is not an authorization boundary/);
assert.match(adr, /Every Café table must explicitly enable RLS and define its own table-specific policies/);
assert.match(adr, /Foreign-key deletion behavior and privacy anonymization are separate mechanisms/);
assert.match(adr, /SET NULL.*does not anonymize/i);
ok("Café architecture contract is role-neutral, privacy-minimized, and explicit about RLS/deletion boundaries");

console.log("[cafe:architecture-contract] tests passed");
