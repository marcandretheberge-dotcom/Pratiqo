import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const guardedLayouts = [
  {
    file: "app/(app)/admin/layout.tsx",
    expected: "requireAdminServer",
  },
  {
    file: "app/(app)/student/layout.tsx",
    expected: 'requireRoleServer("student"',
  },
  {
    file: "app/(app)/teacher/layout.tsx",
    expected: 'requireRoleServer("teacher"',
  },
  {
    file: "app/(app)/profile/layout.tsx",
    expected: 'requireRoleServer("student"',
  },
  {
    file: "app/(app)/loyalty/layout.tsx",
    expected: 'requireRoleServer("teacher"',
  },
  {
    file: "app/(app)/booking/layout.tsx",
    expected: 'requireRoleServer("student"',
  },
  {
    file: "app/(app)/group-sessions/layout.tsx",
    expected: 'requireRoleServer("student"',
  },
  {
    file: "app/(app)/upgrade/layout.tsx",
    expected: 'requireRoleServer("teacher"',
  },
  {
    file: "app/(app)/onboarding/teacher/layout.tsx",
    expected: 'requireRoleServer("teacher"',
  },
  {
    file: "app/(app)/dashboard/layout.tsx",
    expected: 'requireAnyRoleServer(["student", "teacher"]',
  },
  {
    file: "app/(app)/messages/layout.tsx",
    expected: 'requireAnyRoleServer(["student", "teacher"]',
  },
  {
    file: "app/(app)/resolution/layout.tsx",
    expected: 'requireAnyRoleServer(["student", "teacher"]',
  },
  {
    file: "app/onboarding/layout.tsx",
    expected: "requireCurrentUserServer",
  },
] as const;

for (const { file, expected } of guardedLayouts) {
  const source = readFileSync(file, "utf8");
  assert.match(source, /@\/lib\/auth\/server/, `${file} must import server auth helpers`);
  assert.ok(source.includes(expected), `${file} must call ${expected}`);
}

const authServer = readFileSync("lib/auth/server.ts", "utf8");
assert.ok(authServer.includes("export async function requireAnyRoleServer"), "server auth must expose multi-role guard");
assert.ok(authServer.includes("roles.includes(profile.role)"), "multi-role guard must enforce allowed roles");

console.log("[auth:test] ok - protected app routes declare server-side guards");
