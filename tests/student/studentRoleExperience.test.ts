import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.match(read("components/StudentDashboard.tsx"), /studentFindTeacher/);
assert.match(read("components/StudentDashboard.tsx"), /studentMyTeachersEmpty/);
assert.match(read("components/StudentDashboard.tsx"), /studentPendingPaymentBanner/);
assert.match(read("components/StudentDashboard.tsx"), /\/student\/search\?openTeacher=/);
assert.doesNotMatch(read("components/StudentDashboard.tsx"), /href=\{`\/teacher\/profile\/\$\{/);

const appShell = read("components/AppShell.tsx");
assert.match(appShell, /STUDENT_NAV/);
assert.doesNotMatch(appShell, /href:\s*"\/teacher\/schedule"/);
assert.doesNotMatch(appShell, /href:\s*"\/teacher\/verification"/);

assert.match(read("components/TeacherProfile.tsx"), /\.in\("status", \["confirmed", "completed"\]\)/);

const search = read("app/(app)/student/search/page.tsx");
assert.match(search, /format:\s*searchFormat/);
assert.match(search, /noTeachersFound/);
assert.match(search, /openTeacher/);
assert.match(search, /BookingModal/);

assert.match(read("app/(app)/messages/page.tsx"), /messagesEmptyHint/);
assert.match(read("app/(app)/messages/page.tsx"), /\/student\/search/);

assert.match(read("app/(app)/profile/page.tsx"), /logout\(\)/);
assert.match(read("app/(app)/profile/page.tsx"), /profileLocationSectionTitle/);

const login = read("app/login/page.tsx");
assert.doesNotMatch(login, /type=["']password["']/);
assert.doesNotMatch(login, /magic.?link/i);

console.log("[student:roleExperience] student role experience QA contracts passed");
