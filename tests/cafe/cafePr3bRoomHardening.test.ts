/**
 * Targeted PR3b hardening tests (simulated — not Daily API live, not browser E2E).
 */
import assert from "node:assert/strict";
import { resolveCafeRoomCourseReturn } from "@/lib/cafe/roomCourseReturn";
import {
  CafeDailyJoinGeneration,
  clearCafeDailyCallSlot,
  destroyCafeDailyCall,
  releaseOwnedCafeDailyCall,
  runCafeDailyJoinAttempt,
  type CafeDailyCallHandle,
  type CafeDailyCallSlot,
} from "@/lib/cafe/dailyRoomSession";
import {
  buildCafeRoomPermissionsPolicy,
  buildDefaultPermissionsPolicy,
  orderCafeHeaderRules,
  resolveConfiguredDailyOrigin,
} from "@/lib/security/cafeRoomHeaders";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function mockCall(label: string, destroyed: string[]): CafeDailyCallHandle {
  return {
    destroy: () => {
      destroyed.push(label);
    },
    join: async () => undefined,
  };
}

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
  const destroyed: string[] = [];
  const handle = mockCall("once", destroyed);
  assert.equal(destroyCafeDailyCall(handle), null);
  assert.deepEqual(destroyed, ["once"]);
  assert.equal(destroyCafeDailyCall(handle), null); // idempotent
  assert.deepEqual(destroyed, ["once"]);
  assert.equal(destroyCafeDailyCall(null), null);

  const gen = new CafeDailyJoinGeneration();
  const first = gen.beginAttempt();
  assert.equal(gen.isCurrent(first), true);
  gen.invalidate(); // leave / unmount / error
  assert.equal(gen.isCurrent(first), false);
  const retry = gen.beginAttempt();
  assert.equal(gen.isCurrent(retry), true);
  assert.equal(gen.isCurrent(first), false);

  // Owned release must not clear a newer published call.
  const slot: CafeDailyCallSlot = { current: null };
  const older = mockCall("older", destroyed);
  const newer = mockCall("newer", destroyed);
  slot.current = older;
  slot.current = newer;
  releaseOwnedCafeDailyCall(slot, older);
  assert.equal(slot.current, newer);
  assert.ok(destroyed.includes("older"));
  assert.ok(!destroyed.includes("newer"));
}

void (async () => {
  // A starts → invalidate → B starts → A resolves late → B stays intact and can connect.
  {
    const destroyed: string[] = [];
    const slot: CafeDailyCallSlot = { current: null };
    const gen = new CafeDailyJoinGeneration();
    const joinA = deferred<void>();
    const joinB = deferred<void>();
    let created = 0;

    const attemptA = gen.beginAttempt();
    const pendingA = runCafeDailyJoinAttempt({
      attempt: attemptA,
      gen,
      slot,
      createCall: () => {
        created += 1;
        return mockCall("A", destroyed);
      },
      join: () => joinA.promise,
    });

    // Let A publish its call and park on join.
    await Promise.resolve();
    assert.equal(created, 1);
    assert.ok(slot.current);

    gen.invalidate();
    clearCafeDailyCallSlot(slot);

    const attemptB = gen.beginAttempt();
    const pendingB = runCafeDailyJoinAttempt({
      attempt: attemptB,
      gen,
      slot,
      createCall: () => {
        created += 1;
        return mockCall("B", destroyed);
      },
      join: () => joinB.promise,
    });

    await Promise.resolve();
    assert.equal(created, 2);
    const callB = slot.current;
    assert.ok(callB);

    joinA.resolve();
    assert.equal(await pendingA, "aborted");
    assert.equal(slot.current, callB);
    assert.ok(destroyed.includes("A"));
    assert.ok(!destroyed.includes("B"));

    joinB.resolve();
    assert.equal(await pendingB, "connected");
    assert.equal(slot.current, callB);
    assert.ok(!destroyed.includes("B"));
  }

  // Same race on the catch path: late A reject must not destroy B.
  {
    const destroyed: string[] = [];
    const slot: CafeDailyCallSlot = { current: null };
    const gen = new CafeDailyJoinGeneration();
    const joinA = deferred<void>();
    const joinB = deferred<void>();

    const attemptA = gen.beginAttempt();
    const pendingA = runCafeDailyJoinAttempt({
      attempt: attemptA,
      gen,
      slot,
      createCall: () => mockCall("A-catch", destroyed),
      join: () => joinA.promise,
    });
    await Promise.resolve();

    gen.invalidate();
    clearCafeDailyCallSlot(slot);

    const attemptB = gen.beginAttempt();
    const pendingB = runCafeDailyJoinAttempt({
      attempt: attemptB,
      gen,
      slot,
      createCall: () => mockCall("B-catch", destroyed),
      join: () => joinB.promise,
    });
    await Promise.resolve();
    const callB = slot.current;
    assert.ok(callB);

    joinA.reject(new Error("stale-network"));
    assert.equal(await pendingA, "aborted");
    assert.equal(slot.current, callB);
    assert.ok(destroyed.includes("A-catch"));
    assert.ok(!destroyed.includes("B-catch"));

    joinB.resolve();
    assert.equal(await pendingB, "connected");
    assert.equal(slot.current, callB);
  }

  // Unmount during join: invalidate + clear slot; late resolve only releases owned A.
  {
    const destroyed: string[] = [];
    const slot: CafeDailyCallSlot = { current: null };
    const gen = new CafeDailyJoinGeneration();
    const joinA = deferred<void>();

    const attemptA = gen.beginAttempt();
    const pendingA = runCafeDailyJoinAttempt({
      attempt: attemptA,
      gen,
      slot,
      createCall: () => mockCall("A-unmount", destroyed),
      join: () => joinA.promise,
    });
    await Promise.resolve();
    assert.ok(slot.current);

    // Component unmount.
    gen.invalidate();
    clearCafeDailyCallSlot(slot);
    assert.equal(slot.current, null);
    assert.ok(destroyed.includes("A-unmount"));

    joinA.resolve();
    assert.equal(await pendingA, "aborted");
    assert.equal(slot.current, null);
    assert.deepEqual(
      destroyed.filter((label) => label === "A-unmount"),
      ["A-unmount"],
    );
  }

  console.log(
    "[cafe:pr3b-hardening] headers, yoReturn sanitize, Daily attempt isolation (simulated) passed",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
