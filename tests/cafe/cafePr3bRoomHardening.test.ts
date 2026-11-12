/**
 * Targeted PR3b hardening tests (simulated — not Daily API live, not browser E2E).
 */
import assert from "node:assert/strict";
import { resolveCafeRoomCourseReturn } from "@/lib/cafe/roomCourseReturn";
import {
  CafeDailyJoinGeneration,
  destroyCafeDailyCall,
  type CafeDailyCallHandle,
} from "@/lib/cafe/dailyRoomSession";
import {
  buildCafeRoomPermissionsPolicy,
  buildDefaultPermissionsPolicy,
  orderCafeHeaderRules,
  resolveConfiguredDailyOrigin,
} from "@/lib/security/cafeRoomHeaders";

{
  // yoReturn sanitization — protocol-relative and external paths rejected.
  assert.equal(
    resolveCafeRoomCourseReturn("/student/yopratiqo?demo=introductions-complete"),
    "/student/yopratiqo?demo=introductions-complete",
  );
  assert.equal(resolveCafeRoomCourseReturn("//example.com"), null);
  assert.equal(resolveCafeRoomCourseReturn("//example.com/path"), null);
  assert.equal(resolveCafeRoomCourseReturn("https://example.com"), null);
  assert.equal(resolveCafeRoomCourseReturn("http://evil.test"), null);
  assert.equal(resolveCafeRoomCourseReturn(undefined), null);
}

{
  assert.equal(resolveConfiguredDailyOrigin({}), null);
  assert.equal(resolveConfiguredDailyOrigin({ DAILY_DOMAIN: "pratiqo.daily.co" }), "https://pratiqo.daily.co");
  assert.equal(
    resolveConfiguredDailyOrigin({ DAILY_DOMAIN: "https://pratiqo.daily.co" }),
    "https://pratiqo.daily.co",
  );
  assert.equal(resolveConfiguredDailyOrigin({ DAILY_DOMAIN: "evil.example" }), null);
  assert.equal(resolveConfiguredDailyOrigin({ DAILY_DOMAIN: "*.daily.co" }), null);
}

{
  const denied = buildDefaultPermissionsPolicy();
  assert.match(denied, /camera=\(\)/);
  assert.match(denied, /microphone=\(\)/);
  assert.doesNotMatch(denied, /display-capture=\(self\)/);

  const withoutDomain = buildCafeRoomPermissionsPolicy({});
  assert.match(withoutDomain, /camera=\(self\)/);
  assert.match(withoutDomain, /microphone=\(self\)/);
  assert.match(withoutDomain, /display-capture=\(\)/);

  const withDomain = buildCafeRoomPermissionsPolicy({ DAILY_DOMAIN: "pratiqo.daily.co" });
  assert.match(withDomain, /camera=\(self "https:\/\/pratiqo\.daily\.co"\)/);
  assert.match(withDomain, /microphone=\(self "https:\/\/pratiqo\.daily\.co"\)/);
  assert.match(withDomain, /display-capture=\(\)/);
  assert.doesNotMatch(withDomain, /display-capture=\(self/);
}

{
  // Catch-all first; room routes last so Permissions-Policy override wins.
  const ordered = orderCafeHeaderRules({
    defaultHeaders: [
      { key: "X-Test", value: "1" },
      { key: "Permissions-Policy", value: buildDefaultPermissionsPolicy() },
    ],
    cafeRoomPermissionsPolicy: buildCafeRoomPermissionsPolicy({
      DAILY_DOMAIN: "pratiqo.daily.co",
    }),
  });
  assert.equal(ordered[0]?.source, "/:path*");
  assert.equal(ordered[1]?.source, "/cafe/:slug/salle");
  assert.equal(ordered[2]?.source, "/cafe/preview/salle");
  const roomPolicy = ordered[1]?.headers.find((h) => h.key === "Permissions-Policy")?.value ?? "";
  assert.match(roomPolicy, /camera=\(self "https:\/\/pratiqo\.daily\.co"\)/);
  const sitePolicy = ordered[0]?.headers.find((h) => h.key === "Permissions-Policy")?.value ?? "";
  assert.match(sitePolicy, /camera=\(\)/);
}

{
  // Daily lifecycle (simulated handle) — destroy after error / before retry / invalidate stale.
  let destroyed = 0;
  const handle: CafeDailyCallHandle = {
    destroy: () => {
      destroyed += 1;
    },
    join: async () => undefined,
  };
  assert.equal(destroyCafeDailyCall(handle), null);
  assert.equal(destroyed, 1);
  assert.equal(destroyCafeDailyCall(null), null);

  const gen = new CafeDailyJoinGeneration();
  const first = gen.beginAttempt();
  assert.equal(gen.isCurrent(first), true);
  gen.invalidate(); // leave / unmount / error
  assert.equal(gen.isCurrent(first), false);
  const retry = gen.beginAttempt();
  assert.equal(gen.isCurrent(retry), true);
  assert.equal(gen.isCurrent(first), false);
}

console.log("[cafe:pr3b-hardening] headers, yoReturn sanitize, Daily lifecycle (simulated) passed");
