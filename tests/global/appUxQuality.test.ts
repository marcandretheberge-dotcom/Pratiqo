import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walkTsx(full, out);
    } else if (/\.(tsx|ts)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const appFacingDirs = [
  "app/(app)",
  "app/connexion",
  "app/login",
  "components/AppShell.tsx",
  "components/AuthenticatedShell.tsx",
  "components/StudentDashboard.tsx",
  "components/TeacherDashboard.tsx",
].flatMap((p) => {
  try {
    const full = join(root, p);
    return statSync(full).isDirectory() ? walkTsx(full) : [full];
  } catch {
    return [];
  }
});

for (const file of appFacingDirs) {
  const rel = file.replace(root + "\\", "").replace(root + "/", "");
  const src = readFileSync(file, "utf8");
  assert.doesNotMatch(
    src,
    /href=["']#["']/,
    `${rel} must not use href="#" on app-facing CTAs`,
  );
  assert.doesNotMatch(
    src,
    /href=["']['"]/,
    `${rel} must not use empty href on app-facing CTAs`,
  );
}

const login = read("app/login/page.tsx");
const connexion = read("app/connexion/page.tsx");
assert.match(login, /loginSignOutError/);
assert.match(connexion, /loginSignOutError/);
assert.match(login, /AppLoadingFallback/);
assert.match(connexion, /AppLoadingFallback/);
assert.doesNotMatch(login, /type=["']password["']/);
assert.doesNotMatch(connexion, /type=["']password["']/);
assert.doesNotMatch(login, /magic.?link/i);
assert.doesNotMatch(connexion, /magic.?link/i);

const messages = read("app/(app)/messages/page.tsx");
assert.match(messages, /messagesEmptyHint/);
assert.match(messages, /\/student\/search/);
assert.match(messages, /\/dashboard/);
assert.match(messages, /messagesDraftPrefillHint/);

const payments = read("app/(app)/student/payments/page.tsx");
assert.match(payments, /studentPaymentsEmptyCta/);
assert.match(payments, /href="\/student\/search"/);

const profile = read("app/(app)/profile/page.tsx");
assert.match(profile, /logout\(\)/);

const appShell = read("components/AppShell.tsx");
assert.match(appShell, /STUDENT_NAV/);
assert.match(appShell, /TEACHER_MOBILE_BOTTOM_NAV/);

const studentNavBlock = appShell.match(/const STUDENT_NAV[\s\S]*?];/)?.[0] ?? "";
const studentMobileNavBlock = appShell.match(/const STUDENT_MOBILE_BOTTOM_NAV[\s\S]*?];/)?.[0] ?? "";
assert.doesNotMatch(studentNavBlock, /\/teacher\//);
assert.doesNotMatch(studentMobileNavBlock, /\/teacher\//);

const teacherMobileNavBlock = appShell.match(/const TEACHER_MOBILE_BOTTOM_NAV[\s\S]*?];/)?.[0] ?? "";
const topNav = read("components/TeacherTopNav.tsx");
assert.doesNotMatch(topNav, /\/student\/search/);
assert.doesNotMatch(topNav, /\/student\/choose-companion/);
assert.doesNotMatch(teacherMobileNavBlock, /\/student\//);

const search = read("app/(app)/student/search/page.tsx");
assert.match(search, /AppLoadingText/);
assert.match(search, /TeacherProfile = dynamic/);

const profileSkeleton = read("components/teacher/ProfileRouteSkeleton.tsx");
assert.match(profileSkeleton, /profileLoadingLabel/);

const userFacingSurfaces = [
  "app/(app)/dashboard/page.tsx",
  "app/(app)/student/choose-companion/page.tsx",
  "app/(app)/onboarding/choose-role/page.tsx",
  "components/AuthenticatedShell.tsx",
  "app/login/page.tsx",
  "app/connexion/page.tsx",
];
for (const rel of userFacingSurfaces) {
  const src = read(rel);
  assert.doesNotMatch(
    src,
    /Chargement…/,
    `${rel} should use i18n loading copy instead of hardcoded French`,
  );
}

console.log("[global:appUxQuality] global app UX quality contracts passed");
