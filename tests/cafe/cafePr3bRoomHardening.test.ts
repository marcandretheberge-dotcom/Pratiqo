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
  waitForCafeDailyTeardown,
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
  assert.equal(ordered[3]?.source, "/cafe/appels/:callId");
  assert.equal(ordered.length, 4);
  assert.deepEqual(ordered[3]?.headers, ordered[1]?.headers);
  const roomPolicy = ordered[1]?.headers.find((h) => h.key === "Permissions-Policy")?.value ?? "";
  assert.match(roomPolicy, /camera=\(self "https:\/\/pratiqo\.daily\.co"\)/);
  const sitePolicy = ordered[0]?.headers.find((h) => h.key === "Permissions-Policy")?.value ?? "";
  assert.match(sitePolicy, /camera=\(\)/);
}

async function assertAsyncTeardownIsOwnedAndIdempotent() {
  const destroyed: string[] = [];
  const handle = mockCall("once", destroyed);
  const first = destroyCafeDailyCall(handle);
  assert.equal(destroyCafeDailyCall(handle), first);
  await first;
  assert.deepEqual(destroyed, ["once"]);
  await destroyCafeDailyCall(null);

  const older = mockCall("older", destroyed);
  const newer = mockCall("newer", destroyed);
  const slot: CafeDailyCallSlot = { current: newer };
  await releaseOwnedCafeDailyCall(slot, older);
  assert.equal(slot.current, newer);
  assert.ok(!destroyed.includes("newer"));
  await clearCafeDailyCallSlot(slot);

  // Daily returns Promise<void>; neither an asynchronous rejection nor a
  // synchronous teardown race can leak an unhandled provider error.
  await destroyCafeDailyCall({ destroy: async () => { throw new Error("async teardown"); }, join: async () => {} });
  await destroyCafeDailyCall({ destroy: () => { throw new Error("sync teardown"); }, join: async () => {} });
  await waitForCafeDailyTeardown();
}

async function assertLateAttemptCannotDestroyNewer(rejectOlder: boolean) {
  const destroyed: string[] = [];
  const slot: CafeDailyCallSlot = { current: null };
  const gen = new CafeDailyJoinGeneration();
  const joinA = deferred();
  const joinB = deferred();
  const startedA = deferred();
  const startedB = deferred();

  const pendingA = runCafeDailyJoinAttempt({
    attempt: gen.beginAttempt(), gen, slot,
    createCall: () => mockCall("A", destroyed),
    join: () => { startedA.resolve(); return joinA.promise; },
  });
  await startedA.promise;
  gen.invalidate();
  await clearCafeDailyCallSlot(slot);

  const attemptB = gen.beginAttempt();
  const pendingB = runCafeDailyJoinAttempt({
    attempt: attemptB, gen, slot,
    createCall: () => mockCall("B", destroyed),
    join: () => { startedB.resolve(); return joinB.promise; },
  });
  await startedB.promise;
  const callB = slot.current;
  assert.ok(callB);

  if (rejectOlder) joinA.reject(new Error("stale-network"));
  else joinA.resolve();
  assert.equal(await pendingA, "aborted");
  assert.equal(slot.current, callB);
  assert.ok(!destroyed.includes("B"));
  assert.equal(gen.isCurrent(attemptB), true);

  joinB.resolve();
  assert.equal(await pendingB, "connected");
  assert.equal(slot.current, callB);
  await clearCafeDailyCallSlot(slot);
}

async function assertUnmountInvalidatesPendingJoin() {
  const destroyed: string[] = [];
  const slot: CafeDailyCallSlot = { current: null };
  const gen = new CafeDailyJoinGeneration();
  const joined = deferred();
  const started = deferred();
  const pending = runCafeDailyJoinAttempt({
    attempt: gen.beginAttempt(), gen, slot,
    createCall: () => mockCall("unmounted", destroyed),
    join: () => { started.resolve(); return joined.promise; },
  });
  await started.promise;
  gen.invalidate();
  await clearCafeDailyCallSlot(slot);
  joined.resolve();
  assert.equal(await pending, "aborted");
  assert.equal(slot.current, null);
  assert.deepEqual(destroyed, ["unmounted"]);
}

async function assertNextFrameWaitsForAsyncDestroy() {
  const destroying = deferred();
  const destroyStarted = deferred();
  const oldSlot: CafeDailyCallSlot = {
    current: {
      destroy: () => { destroyStarted.resolve(); return destroying.promise; },
      join: async () => {},
    },
  };
  void clearCafeDailyCallSlot(oldSlot);
  await destroyStarted.promise;
  assert.equal(oldSlot.current, null, "release the slot immediately while cleanup finishes");

  // A remounted room has a fresh React ref, but Daily still has a singleton
  // instance until the old async destruction has completed.
  const newSlot: CafeDailyCallSlot = { current: null };
  const gen = new CafeDailyJoinGeneration();
  let created = false;
  const next = runCafeDailyJoinAttempt({
    attempt: gen.beginAttempt(), gen, slot: newSlot,
    createCall: () => { created = true; return mockCall("remounted", []); },
    join: async () => {},
  });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(created, false);
  destroying.resolve();
  assert.equal(await next, "connected");
  assert.equal(created, true);
  await clearCafeDailyCallSlot(newSlot);
}

async function assertStaleWaiterCannotCreateFrame() {
  const destroying = deferred();
  const old = { destroy: () => destroying.promise, join: async () => {} };
  const slot: CafeDailyCallSlot = { current: old };
  const gen = new CafeDailyJoinGeneration();
  const created: string[] = [];
  const stale = runCafeDailyJoinAttempt({
    attempt: gen.beginAttempt(), gen, slot,
    createCall: () => { created.push("stale"); return mockCall("stale", []); },
    join: async () => {},
  });
  const current = runCafeDailyJoinAttempt({
    attempt: gen.beginAttempt(), gen, slot,
    createCall: () => { created.push("current"); return mockCall("current", []); },
    join: async () => {},
  });
  destroying.resolve();
  assert.equal(await stale, "aborted");
  assert.equal(await current, "connected");
  assert.deepEqual(created, ["current"]);
  await clearCafeDailyCallSlot(slot);
}

void (async () => {
  await assertAsyncTeardownIsOwnedAndIdempotent();
  await assertLateAttemptCannotDestroyNewer(false);
  await assertLateAttemptCannotDestroyNewer(true);
  await assertUnmountInvalidatesPendingJoin();
  await assertNextFrameWaitsForAsyncDestroy();
  await assertStaleWaiterCannotCreateFrame();
  console.log("[cafe:pr3b-hardening] headers, yoReturn, production lifecycle with mocked Daily passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
