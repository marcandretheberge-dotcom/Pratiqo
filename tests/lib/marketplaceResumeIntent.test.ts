import assert from "node:assert/strict";
import {
  MARKETPLACE_RESUME_INTENT_TTL_MS,
  clearMarketplaceResumeIntent,
  consumeMarketplaceResumeIntent,
  isMarketplaceResumeIntentExpired,
  peekMarketplaceResumeIntent,
  planGuestBookResume,
  setMarketplaceResumeIntent,
} from "@/lib/marketplaceResumeIntent";

const STORAGE_KEY = "pratiqo.marketplace.resumeBook";

function withMockSessionStorage(run: () => void) {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };

  const prevWindow = globalThis.window;
  // @ts-expect-error test shim
  globalThis.window = { sessionStorage };
  try {
    run();
  } finally {
    globalThis.window = prevWindow;
  }
}

withMockSessionStorage(() => {
  clearMarketplaceResumeIntent();

  setMarketplaceResumeIntent({
    teacherId: "teacher-42",
    bookKind: "home",
    source: "landing",
  });

  const peeked = peekMarketplaceResumeIntent();
  assert.ok(peeked);
  assert.equal(peeked?.teacherId, "teacher-42");
  assert.equal(peekMarketplaceResumeIntent()?.teacherId, "teacher-42", "peek does not clear intent");

  const consumed = consumeMarketplaceResumeIntent();
  assert.equal(consumed?.teacherId, "teacher-42");
  assert.equal(peekMarketplaceResumeIntent(), null, "consume clears intent");
});

withMockSessionStorage(() => {
  clearMarketplaceResumeIntent();
  setMarketplaceResumeIntent({ teacherId: "t1", source: "search" });

  assert.equal(planGuestBookResume({ loadingTeachers: true, teacherIds: ["t1"] }).status, "wait");
  assert.ok(peekMarketplaceResumeIntent(), "intent survives while loading");

  assert.equal(planGuestBookResume({ loadingTeachers: false, teacherIds: [] }).status, "wait");
  assert.ok(peekMarketplaceResumeIntent(), "intent survives when teacher list is empty");

  const ready = planGuestBookResume({ loadingTeachers: false, teacherIds: ["t1", "t2"] });
  assert.equal(ready.status, "ready");
  if (ready.status === "ready") {
    assert.equal(ready.intent.teacherId, "t1");
  }
  assert.ok(peekMarketplaceResumeIntent(), "plan ready does not consume");

  assert.equal(
    planGuestBookResume({ loadingTeachers: false, teacherIds: ["other"] }).status,
    "discard",
  );
});

withMockSessionStorage(() => {
  clearMarketplaceResumeIntent();
  const createdAt = Date.now() - MARKETPLACE_RESUME_INTENT_TTL_MS - 1;
  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      teacherId: "expired",
      source: "landing",
      createdAt,
      expiresAt: createdAt + MARKETPLACE_RESUME_INTENT_TTL_MS,
    }),
  );

  assert.equal(peekMarketplaceResumeIntent(), null, "expired intent is cleared on peek");
  assert.equal(window.sessionStorage.getItem(STORAGE_KEY), null);
});

withMockSessionStorage(() => {
  clearMarketplaceResumeIntent();
  window.sessionStorage.setItem(STORAGE_KEY, "{not-json");
  assert.equal(peekMarketplaceResumeIntent(), null, "invalid json does not crash");
  assert.equal(window.sessionStorage.getItem(STORAGE_KEY), null);

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ teacherId: "", source: "landing" }));
  assert.equal(peekMarketplaceResumeIntent(), null, "invalid shape is cleared");
});

assert.equal(peekMarketplaceResumeIntent(), null, "no window → no intent");

assert.equal(
  isMarketplaceResumeIntentExpired({
    teacherId: "t",
    source: "search",
    createdAt: 0,
    expiresAt: 100,
  }),
  true,
);

console.log("[marketplaceResumeIntent] ok");
