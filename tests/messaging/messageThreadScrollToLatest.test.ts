import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Regression guard: opening a Pratiqo conversation must land at the
// LATEST message for both students and teachers.
//
// Production QA found that opening any thread parked the scroll
// position at the OLDEST message, forcing users to scroll down
// manually to see what just arrived.
//
// Root cause (see PR fix/message-thread-scroll-bottom):
// `loadThread()` used to do
//
//     setLoadingThread(true);
//     const rows = await getMessages(...);
//     setMessages(rows);                      // (a)
//     await markAsRead(...);                  // (b) await
//     await refreshConversations();           // (c) await
//   } finally {
//     setLoadingThread(false);                // (d) only here!
//   }
//
// while the scroll-to-bottom effect ran on `[messages]`. At step (a)
// the messages state changed, the effect fired, but `loadingThread`
// was still `true`, so the conditional render kept the loader on
// screen instead of the message list. `bottomRef.scrollIntoView()`
// resolved against the loader's tiny scrollHeight and effectively
// no-op'd. By the time `setLoadingThread(false)` ran in (d) — two
// awaits later — the `messages` array reference had not changed
// again, so no further scroll fired and the user opened on the
// OLDEST message.
//
// The fix:
//
//   * `setLoadingThread(false)` is now flipped in the SAME async
//     step as `setMessages(rows)`, BEFORE the awaits for markAsRead
//     and refreshConversations. The message list (and the bottom
//     sentinel inside it) becomes the visible layout in the very
//     next commit.
//   * The single `useEffect(() => { ... }, [messages])` that just
//     called `scrollIntoView({ behavior: "smooth" })` is replaced by
//     a guarded effect that depends on
//     (activeConversationId, loadingThread, messages, user?.id) and
//     distinguishes three cases:
//       - fresh open / conversation switch -> instant ("auto") jump
//       - current user just sent a message -> smooth scroll
//       - new realtime message from peer -> smooth scroll only if
//         the user is still near the bottom (so a user who scrolled
//         up to read older history is not yanked back to the bottom)
//   * `requestAnimationFrame` defers the actual scrollIntoView call
//     until after the browser has laid out the just-mounted bottom
//     sentinel, fixing a subtle timing bug on mobile Safari.
//   * A `messagesScrollerRef` + `onScroll` handler tracks whether
//     the user is near the bottom (~80 px tolerance).
//
// This guard scans `app/(app)/messages/page.tsx` so a future
// refactor cannot silently reintroduce any of the four pieces of
// the bug (load order, single naive effect, missing rAF, missing
// near-bottom guard).
// ---------------------------------------------------------------------------

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const ROOT = process.cwd();
const PAGE_SRC = readFileSync(
  join(ROOT, "app", "(app)", "messages", "page.tsx"),
  "utf8",
);
const MESSAGING_LIB_SRC = readFileSync(
  join(ROOT, "lib", "messaging.ts"),
  "utf8",
);

// ---- 1. Underlying ordering contract: messages come oldest-first --------

test("getMessages still orders oldest-first so the bottom of the list IS the newest message", () => {
  // The whole "scroll to bottom = scroll to newest" assumption
  // breaks if a future refactor flips the ascending order. Guard
  // the contract that this UI depends on.
  assert.match(
    MESSAGING_LIB_SRC,
    /export async function getMessages[\s\S]{0,400}?\.order\("created_at",\s*\{\s*ascending:\s*true\s*\}\)/,
    "getMessages must order created_at ascending so newest message is at the END of the array",
  );
});

// ---- 2. loadThread flips loadingThread BEFORE the side-effect awaits ----

test("loadThread sets loadingThread(false) immediately after setMessages, NOT after markAsRead/refreshConversations", () => {
  const startIdx = PAGE_SRC.indexOf("const loadThread = useCallback(");
  assert.ok(startIdx >= 0, "loadThread useCallback must still exist");
  // Slice up to the next top-level useCallback / useEffect / function declaration
  // by walking forward until we hit a known sentinel.
  const tail = PAGE_SRC.slice(startIdx);
  const endSentinel = tail.indexOf("\n  );");
  assert.ok(endSentinel > 0, "loadThread useCallback must close cleanly");
  const body = tail.slice(0, endSentinel);

  const setMessagesIdx = body.indexOf("setMessages(rows)");
  // The body may contain a SECOND setLoadingThread(false) in an
  // early-return error branch (before getMessages succeeds). The
  // bug-fix invariant we care about is the HAPPY-path call: the
  // `setLoadingThread(false)` that fires AFTER setMessages(rows).
  // Look starting from after setMessages.
  const setLoadingFalseIdx = body.indexOf(
    "setLoadingThread(false)",
    setMessagesIdx,
  );
  const markAsReadIdx = body.indexOf("await markAsRead");
  const refreshConvIdx = body.indexOf("await refreshConversations");

  assert.ok(setMessagesIdx >= 0, "loadThread must still call setMessages(rows)");
  assert.ok(
    setLoadingFalseIdx >= 0,
    "loadThread must still call setLoadingThread(false) AFTER setMessages(rows) on the happy path",
  );
  assert.ok(markAsReadIdx >= 0, "loadThread must still await markAsRead");
  assert.ok(
    refreshConvIdx >= 0,
    "loadThread must still await refreshConversations",
  );

  assert.ok(
    setLoadingFalseIdx > setMessagesIdx,
    "setLoadingThread(false) must come AFTER setMessages(rows) on the happy path",
  );
  assert.ok(
    setLoadingFalseIdx < markAsReadIdx,
    "setLoadingThread(false) must come BEFORE `await markAsRead` so the message list mounts before the scroll effect runs",
  );
  assert.ok(
    setLoadingFalseIdx < refreshConvIdx,
    "setLoadingThread(false) must come BEFORE `await refreshConversations` so the message list mounts before the scroll effect runs",
  );
});

test("loadThread does not put markAsRead/refreshConversations in a finally block that would block the visible thread render", () => {
  // The pre-fix shape was `try { ... } finally { setLoadingThread(false) }`.
  // After the fix, setLoadingThread(false) lives outside the finally
  // so the awaits for markAsRead/refreshConversations cannot push
  // the loading flag past two extra microtasks. We forbid the old
  // pattern explicitly.
  const startIdx = PAGE_SRC.indexOf("const loadThread = useCallback(");
  const tail = PAGE_SRC.slice(startIdx, startIdx + 2000);
  assert.doesNotMatch(
    tail,
    /\}\s*finally\s*\{\s*setLoadingThread\(false\)\s*;?\s*\}/,
    "loadThread must NOT defer setLoadingThread(false) into a `finally {}` block — that re-creates the QA bug",
  );
});

// ---- 3. The naive `[messages]`-only smooth-scroll effect is gone --------

test("the old single `useEffect(() => bottomRef.scrollIntoView(...), [messages])` effect is gone", () => {
  // The pre-fix effect was the entire scroll logic:
  //   useEffect(() => {
  //     bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  //   }, [messages]);
  // It missed the loadingThread-still-true edge case AND the
  // user-scrolled-up edge case. Forbid the exact shape — a future
  // refactor must use the guarded effect instead.
  assert.doesNotMatch(
    PAGE_SRC,
    /useEffect\(\(\)\s*=>\s*\{\s*bottomRef\.current\?\.scrollIntoView\(\{\s*behavior:\s*"smooth"\s*\}\);?\s*\},\s*\[messages\]\);/,
    "the naive single-dependency scroll-to-bottom effect must NOT come back",
  );
});

// ---- 4. Scroll helper uses requestAnimationFrame + block:end -----------

test("scrollToLatest defers via requestAnimationFrame so the bottom sentinel is laid out before scrolling", () => {
  const helperIdx = PAGE_SRC.indexOf("const scrollToLatest = useCallback");
  assert.ok(
    helperIdx >= 0,
    "page must define a `scrollToLatest` helper callback",
  );
  const body = PAGE_SRC.slice(helperIdx, helperIdx + 600);
  assert.match(
    body,
    /window\.requestAnimationFrame\(/,
    "scrollToLatest must use requestAnimationFrame so the new message is laid out before scrollIntoView measures positions",
  );
  assert.match(
    body,
    /bottomRef\.current\?\.scrollIntoView\(\{\s*block:\s*"end",/,
    "scrollToLatest must scroll with block:\"end\" so the last message aligns to the bottom of the scroll container, NOT the top of the viewport",
  );
});

test("scrollToLatest accepts a behavior argument and defaults to instant on initial open", () => {
  const helperIdx = PAGE_SRC.indexOf("const scrollToLatest = useCallback");
  const body = PAGE_SRC.slice(helperIdx, helperIdx + 600);
  // Default arg: "auto" (instant). Initial conversation opens use
  // "auto" so the user never sees a long animation when entering a
  // thread with hundreds of messages.
  assert.match(
    body,
    /\(behavior:\s*ScrollBehavior\s*=\s*"auto"\)/,
    "scrollToLatest must accept a ScrollBehavior arg defaulting to \"auto\"",
  );
});

// ---- 5. The guarded effect handles all three required cases -------------

test("guarded scroll effect depends on activeConversationId, loadingThread, messages, and current user id", () => {
  // The effect must fire on every relevant commit:
  //   * activeConversationId change (conversation switch)
  //   * loadingThread flip (load completion)
  //   * messages change (send + realtime arrival)
  //   * user?.id (so we can detect "sent by me")
  // and it must scope work to scrollToLatest. Guard all five.
  const effectMatch = PAGE_SRC.match(
    /useEffect\(\(\)\s*=>\s*\{\s*if\s*\(!activeConversationId\)\s*return;[\s\S]{200,2200}?\},\s*\[activeConversationId,\s*loadingThread,\s*messages,\s*user\?\.id,\s*scrollToLatest\]\);/,
  );
  assert.ok(
    effectMatch,
    "the guarded scroll effect must depend on [activeConversationId, loadingThread, messages, user?.id, scrollToLatest]",
  );
});

test("guarded scroll effect bails out while loadingThread is still true", () => {
  const effectMatch = PAGE_SRC.match(
    /useEffect\(\(\)\s*=>\s*\{\s*if\s*\(!activeConversationId\)\s*return;\s*if\s*\(loadingThread\)\s*return;/,
  );
  assert.ok(
    effectMatch,
    "guarded scroll effect must early-return while loadingThread is still true (otherwise it scrolls against the loader's layout)",
  );
});

test("guarded scroll effect uses 'auto' on fresh-open and 'smooth' on subsequent updates", () => {
  // Fresh open path -> auto (instant), so a thread with 300 messages
  // doesn't visibly animate from top to bottom on entry.
  // Subsequent updates -> smooth, so a new arrival or send is a
  // pleasant nudge, not a hard jump.
  const effectIdx = PAGE_SRC.indexOf(
    "if (hasScrolledForActiveRef.current !== activeConversationId)",
  );
  assert.ok(
    effectIdx >= 0,
    "guarded scroll effect must compare hasScrolledForActiveRef.current against activeConversationId to detect a fresh open",
  );
  const body = PAGE_SRC.slice(effectIdx, effectIdx + 1200);
  assert.match(
    body,
    /scrollToLatest\("auto"\)/,
    "fresh-open branch must call scrollToLatest(\"auto\") for an instant jump",
  );
  assert.match(
    body,
    /scrollToLatest\("smooth"\)/,
    "subsequent-update branch must call scrollToLatest(\"smooth\")",
  );
});

test("guarded scroll effect respects user scrolling up: realtime arrival only auto-scrolls if sentByMe || isNearBottom", () => {
  // The whole point of the near-bottom guard is that a user who
  // deliberately scrolled up to read older history is NOT yanked
  // back down every time the peer types something.
  const effectIdx = PAGE_SRC.indexOf(
    "if (hasScrolledForActiveRef.current !== activeConversationId)",
  );
  const body = PAGE_SRC.slice(effectIdx, effectIdx + 1200);
  assert.match(
    body,
    /const sentByMe\s*=\s*last\.sender_id\s*===\s*user\?\.id;/,
    "guarded effect must compute sentByMe = last.sender_id === user?.id",
  );
  assert.match(
    body,
    /if\s*\(sentByMe\s*\|\|\s*isNearBottomRef\.current\)/,
    "guarded effect must scroll on subsequent updates only when sentByMe OR user is near bottom",
  );
});

// ---- 6. Conversation switch resets the "has scrolled on open" flag -----

test("activeConversationId change resets hasScrolledForActiveRef so re-entering the SAME thread re-pins to bottom", () => {
  // Without this reset, a user who taps back to the conversation
  // list and re-enters the same thread would NOT auto-scroll to
  // the latest message after the (still re-running) load.
  const resetEffectMatch = PAGE_SRC.match(
    /useEffect\(\(\)\s*=>\s*\{\s*hasScrolledForActiveRef\.current\s*=\s*null;\s*isNearBottomRef\.current\s*=\s*true;\s*\},\s*\[activeConversationId\]\);/,
  );
  assert.ok(
    resetEffectMatch,
    "page must reset hasScrolledForActiveRef and isNearBottomRef whenever activeConversationId changes",
  );
});

// ---- 7. Scroll position tracker is wired to the messages container -----

test("messages scroller has ref + onScroll wired so isNearBottomRef stays accurate", () => {
  // The whole near-bottom guard depends on a real onScroll handler
  // attached to the SCROLL container (the one with overflow-y-auto).
  // Guard both the ref attach and the handler attach AND that the
  // handler updates isNearBottomRef using a ~80 px threshold.
  assert.match(
    PAGE_SRC,
    /ref=\{messagesScrollerRef\}\s+onScroll=\{handleMessagesScroll\}\s+className="flex-1 overflow-y-auto/,
    "messages scroll container must carry both ref={messagesScrollerRef} and onScroll={handleMessagesScroll}",
  );
  const handlerIdx = PAGE_SRC.indexOf(
    "const handleMessagesScroll = useCallback",
  );
  assert.ok(
    handlerIdx >= 0,
    "page must define a handleMessagesScroll callback",
  );
  const handlerBody = PAGE_SRC.slice(handlerIdx, handlerIdx + 600);
  assert.match(
    handlerBody,
    /el\.scrollHeight\s*-\s*el\.scrollTop\s*-\s*el\.clientHeight/,
    "handleMessagesScroll must compute distance-from-bottom from the scroll container",
  );
  assert.match(
    handlerBody,
    /isNearBottomRef\.current\s*=\s*distanceFromBottom\s*<\s*80;?/,
    "handleMessagesScroll must update isNearBottomRef using ~80 px tolerance",
  );
});

// ---- 8. Bottom sentinel still rendered as last child of the scroller ---

test("bottom sentinel <div ref={bottomRef} /> is still the last child inside the messages scroll container", () => {
  // The scroll target is `bottomRef.current.scrollIntoView`; the ref
  // must be attached to the very last child of the scroll container,
  // not inside the loader's branch (otherwise it unmounts during
  // loading and scrolling no-ops).
  assert.match(
    PAGE_SRC,
    /<div ref=\{bottomRef\} \/>/,
    "page must still render <div ref={bottomRef} /> as the bottom sentinel",
  );
  // The sentinel must come AFTER the messages.map(...) close paren —
  // i.e. as a sibling of the loader/messages branch, not inside it.
  const sentinelIdx = PAGE_SRC.indexOf("<div ref={bottomRef} />");
  const messagesMapIdx = PAGE_SRC.indexOf("messages.map((m) => {");
  assert.ok(messagesMapIdx >= 0, "messages.map must still render the thread");
  assert.ok(
    sentinelIdx > messagesMapIdx,
    "bottom sentinel must come AFTER messages.map(...) in source order so it is rendered as the LAST child of the scroll container",
  );
});

// ---- 9. Read-state contract preserved (do not touch unread badge) ------

test("markAsRead is still called for the active conversation after the thread loads", () => {
  // PR scope explicitly forbids changing read-state behavior. We
  // verify the call site is still wired.
  assert.match(
    PAGE_SRC,
    /await\s+markAsRead\(\s*supabase,\s*conversationId,\s*user\.id\s*\)/,
    "loadThread must still call markAsRead(supabase, conversationId, user.id) after loading",
  );
  // And the realtime channel must still mark messages read on
  // arrival when the conversation is open. We just verify the call
  // is still there — its location was untouched.
  assert.match(
    PAGE_SRC,
    /void\s+markAsRead\(\s*supabase,\s*newMsg\.conversation_id,\s*user\.id\s*\)/,
    "realtime arrival handler must still mark the new message as read when the conversation is open",
  );
});

// ---- 10. Both student and teacher use this same single page ------------

test("the page is shared by student and teacher (single MessagesPage component)", () => {
  // Pratiqo has ONE messages page used by both roles — that is why
  // the brief says \"works for student conversation view AND teacher
  // conversation view\". This guard pins the architectural decision:
  // do not silently fork the page into role-specific files.
  assert.match(
    PAGE_SRC,
    /export default function MessagesPage\(\)/,
    "the messages route must keep its single, role-agnostic MessagesPage component",
  );
  // The login fence is the only role gate; everything else is the
  // same UI for student and teacher.
  assert.match(
    PAGE_SRC,
    /if\s*\(!user\)\s*\{[\s\S]{0,400}?loginForMessages/,
    "page must still gate access on auth, not on role",
  );
});

// ---- 11. test:launch-critical wires this regression test ---------------

test("messageThreadScrollToLatest test is wired into npm run test:launch-critical", () => {
  // Mirror the wiring guard from messageEmailNotifications.test.ts so
  // CI catches a regression even if a developer forgets to run this
  // test locally.
  const packageJson = JSON.parse(
    readFileSync(join(ROOT, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  assert.match(
    packageJson.scripts?.["test:launch-critical"] ?? "",
    /tsx tests\/messaging\/messageThreadScrollToLatest\.test\.ts/,
    "messageThreadScrollToLatest regression test must be wired into test:launch-critical",
  );
});

// ── Run ─────────────────────────────────────────────────────────────────────

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  console.log(`[messaging:messageThreadScrollToLatest] ${passed} tests passed`);
}
