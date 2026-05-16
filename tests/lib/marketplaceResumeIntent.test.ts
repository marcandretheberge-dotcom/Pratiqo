import assert from "node:assert/strict";
import {
  clearMarketplaceResumeIntent,
  consumeMarketplaceResumeIntent,
  peekMarketplaceResumeIntent,
  setMarketplaceResumeIntent,
} from "@/lib/marketplaceResumeIntent";

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
  assert.equal(peeked?.bookKind, "home");
  assert.equal(peeked?.source, "landing");

  const consumed = consumeMarketplaceResumeIntent();
  assert.equal(consumed?.teacherId, "teacher-42");
  assert.equal(peekMarketplaceResumeIntent(), null);
});

withMockSessionStorage(() => {
  clearMarketplaceResumeIntent();
  setMarketplaceResumeIntent({ teacherId: "t1", source: "search" });
  consumeMarketplaceResumeIntent();
  assert.equal(peekMarketplaceResumeIntent(), null);
});

assert.equal(peekMarketplaceResumeIntent(), null, "no window → no intent");

console.log("[marketplaceResumeIntent] ok");
