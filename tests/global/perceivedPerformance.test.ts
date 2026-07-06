import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.match(read("components/AppLoadingFallback.tsx"), /AppLoadingFallback/);
assert.match(read("components/loading/AppSkeletons.tsx"), /AppTeacherDashboardSkeleton/);
assert.match(read("components/loading/AppSkeletons.tsx"), /AppMessagesSkeleton/);
assert.match(read("components/loading/AppSkeletons.tsx"), /AppStatGridSkeleton/);

assert.match(read("components/AuthenticatedShell.tsx"), /AppShellLoadingSkeleton/);
assert.match(read("components/Dashboard.tsx"), /AppTeacherDashboardSkeleton/);
assert.match(read("components/StudentDashboard.tsx"), /AppListSkeleton/);
assert.match(read("app/(app)/messages/page.tsx"), /AppMessagesSkeleton/);
assert.match(read("app/(app)/profile/page.tsx"), /AppStatGridSkeleton/);
assert.match(read("app/(app)/student/search/page.tsx"), /AppTeacherSearchCardSkeleton/);
assert.match(read("app/(app)/teacher/schedule/page.tsx"), /AppListSkeleton/);
assert.match(read("app/(app)/teacher/history/page.tsx"), /AppSectionListSkeleton/);
assert.match(read("app/(app)/teacher/verification/page.tsx"), /AppCardSkeleton/);

const login = read("app/login/page.tsx");
assert.doesNotMatch(login, /type=["']password["']/);
assert.doesNotMatch(login, /magic.?link/i);

const repoScan = [
  read("components/AuthenticatedShell.tsx"),
  read("components/Dashboard.tsx"),
  read("app/(app)/messages/page.tsx"),
].join("\n");
assert.doesNotMatch(repoScan, /serviceWorker\.register/i);
assert.doesNotMatch(repoScan, /workbox/i);
assert.doesNotMatch(repoScan, /PushManager/i);

console.log("[global:perceivedPerformance] perceived performance contracts passed");
