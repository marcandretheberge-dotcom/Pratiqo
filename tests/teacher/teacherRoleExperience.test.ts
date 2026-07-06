import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.match(read("components/Dashboard.tsx"), /teacherPendingRequestsEmpty/);
assert.match(read("components/Dashboard.tsx"), /TeacherScheduleCard/);
assert.match(read("components/Dashboard.tsx"), /viewHistory/);

const topNav = read("components/TeacherTopNav.tsx");
assert.match(topNav, /\/teacher\/history/);
assert.doesNotMatch(topNav, /\/student\/search/);
assert.doesNotMatch(topNav, /\/student\/progress/);

const appShell = read("components/AppShell.tsx");
assert.match(appShell, /TEACHER_MOBILE_BOTTOM_NAV/);
assert.doesNotMatch(appShell, /STUDENT_MOBILE_BOTTOM_NAV[\s\S]*\/teacher\/schedule/);

assert.match(read("app/(app)/onboarding/teacher/page.tsx"), /teacher\/verification/);
assert.match(read("app/(app)/teacher/schedule/page.tsx"), /tab=dispo/);
assert.match(read("app/(app)/teacher/history/page.tsx"), /teacherHistoryTitle/);
assert.match(read("app/(app)/teacher/verification/page.tsx"), /introSessionPriceRequiredHint/);
assert.match(read("components/teacher/TeacherAccountView.tsx"), /id="payouts"/);

const messages = read("app/(app)/messages/page.tsx");
assert.match(messages, /messagesEmptyHintTeacher/);
assert.match(messages, /profile\?\.role === "teacher"/);
assert.match(messages, /href="\/dashboard"/);

assert.match(read("components/teacher/TeacherPublicProfilePreview.tsx"), /teacher\/verification/);

const login = read("app/login/page.tsx");
assert.doesNotMatch(login, /type=["']password["']/);

console.log("[teacher:roleExperience] teacher role experience QA contracts passed");
