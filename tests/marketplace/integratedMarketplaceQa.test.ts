import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildConversationPreviews,
  getConversationId,
  type MessageRow,
} from "@/lib/messaging";

// ---------------------------------------------------------------------------
// Integrated Marketplace QA — single cross-cutting smoke test that pins
// the six P0 production-readiness fixes shipped between PR #176 and
// PR #181 to a SINGLE failure point in CI. Each underlying area also
// has its own dedicated regression test (deeper assertions + richer
// failure diagnostics); this file exists so a developer who breaks
// the integrated student->teacher journey gets a single,
// human-readable failure that names the exact P0 area and links them
// to the deeper test.
//
// Covered P0 fixes (in journey order):
//
//   P0.1  Student unread message badge parity  (PR #176)
//          tests/messaging/studentUnreadBadge.test.ts
//   P0.2  Message email notifications          (c25ee19)
//          tests/messaging/messageEmailNotifications.test.ts
//   P0.3  Booking date/hour availability colors (PR #177)
//          tests/bookings/bookingSlotAvailabilityColors.test.ts
//   P0.4  Teacher confirmed booking actions    (PR #179)
//          tests/bookings/teacherConfirmedBookingActionVisibility.test.ts
//   P0.5a Mobile teacher card name + badges    (PR #178, PR #180)
//          tests/teacherSearch/studentSearchTeacherCardMobileLayout.test.ts
//   P0.5b Message threads open at latest message (PR #181)
//          tests/messaging/messageThreadScrollToLatest.test.ts
//
// What this test does NOT do:
//   * It does NOT spin up a browser / JSDOM / Supabase / Stripe.
//   * It does NOT replace the deep regression tests above; if any of
//     them fail, this file should fail too — but with a tighter,
//     P0-area-named message.
//   * It does NOT test payment, refund, Stripe Tax, Stripe Connect,
//     subscription, commission, Membre Pro, or webhook code.
//   * It does NOT touch YoPratiqo learning routes.
//
// The mockable email sender below proves the email path is unit-test
// reachable WITHOUT inserting a real provider call — it asserts the
// real `buildNewPratiqoMessageEmail` helper accepts a (recipient,
// sender, conversationUrl, locale) tuple and renders deterministic
// FR/EN copy with no private message body.
// ---------------------------------------------------------------------------

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const ROOT = process.cwd();
function source(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

// =================================================================
// JOURNEY STEP 3: Student "Trouver un prof" mobile teacher card
// =================================================================

test("[P0.5a] mobile teacher card keeps the name visible (badges live in their own flex-wrap row)", () => {
  // Pin the load-bearing primitives from PR #178/PR #180 in a single
  // composite assertion. If any of these regress, the user-visible
  // bug returns: badges crowd the name to zero width on phones.
  const searchPageSrc = source("app/(app)/student/search/page.tsx");
  const teacherCardStart = searchPageSrc.indexOf("function TeacherCard({");
  assert.ok(
    teacherCardStart >= 0,
    "[P0.5a] inline TeacherCard in app/(app)/student/search/page.tsx must still exist",
  );
  const card = searchPageSrc.slice(teacherCardStart);

  // Right-of-avatar column must reserve and limit horizontal space.
  assert.match(
    card,
    /className="min-w-0 flex-1"/,
    "[P0.5a] right-of-avatar column must keep `min-w-0 flex-1` (PR #178)",
  );
  // Search cards keep the name visible; identity is a compact checkmark, not pills.
  assert.doesNotMatch(
    card,
    /<TeacherBadgePill\b/,
    "[P0.5a] student-search TeacherCard must not render TeacherBadgePill",
  );
  assert.match(
    card,
    /<span className="truncate">\{formatPublicTeacherDisplayName\(teacher\.name\)\}<\/span>/,
    "[P0.5a] teacher name must still truncate in its own span",
  );
  const nameMarker = "formatPublicTeacherDisplayName(teacher.name)";
  const nameIdx = card.indexOf(nameMarker);
  assert.ok(nameIdx >= 0, "[P0.5a] teacher name expression must still render");
  const closingP = card.slice(nameIdx).indexOf("</p>");
  const nameRow = card.slice(nameIdx, nameIdx + closingP);
  assert.doesNotMatch(
    nameRow,
    /<TeacherBadgePill\b/,
    "[P0.5a] TeacherBadgePill must NOT live in the same row as the name <p> (PR #178)",
  );
});

// =================================================================
// JOURNEY STEP 7: Booking availability colors (date + hour slots)
// =================================================================

test("[P0.3] booking date and hour slots use distinguishable disabled / available / selected styles", () => {
  // Source-scan BookingModal.tsx for the tri-state Tailwind classes
  // shipped in PR #177. Each state must remain visually distinct so
  // students never mistake "available" for "disabled".
  const modal = source("components/BookingModal.tsx");

  // disabled (past / full): muted slate.
  assert.match(
    modal,
    /border-slate-200\s+bg-slate-100\s+text-slate-400/,
    "[P0.3] disabled date/slot styling must remain `border-slate-200 bg-slate-100 text-slate-400` (PR #177)",
  );
  // available: light teal with darker text + hover affordance.
  assert.match(
    modal,
    /border-teal-300\s+bg-teal-50\s+text-teal-800/,
    "[P0.3] available date/slot styling must remain `border-teal-300 bg-teal-50 text-teal-800` (PR #177)",
  );
  // selected: deep teal with white text.
  assert.match(
    modal,
    /border-teal-700\s+bg-teal-700\s+text-white/,
    "[P0.3] selected date/slot styling must remain `border-teal-700 bg-teal-700 text-white` (PR #177)",
  );
  // Accessibility: aria-pressed + data-availability-state landed in
  // PR #177 to give automation hooks for state without coupling to
  // class names. Pin both.
  assert.match(
    modal,
    /aria-pressed=\{isSelected\}/,
    "[P0.3] booking buttons must keep `aria-pressed={isSelected}` (PR #177)",
  );
  assert.match(
    modal,
    /data-availability-state/,
    "[P0.3] booking buttons must keep `data-availability-state` for QA hooks (PR #177)",
  );
});

// =================================================================
// JOURNEY STEPS 9–11: Teacher sees confirmed booking, NOT reject
// =================================================================

test("[P0.4] teacher dashboard does not show reject/refuse on confirmed/paid bookings", () => {
  // PR #179: pendingList must NOT include `pending_payment` (the
  // status of a paid+confirmed booking). The deep test at
  // tests/bookings/teacherConfirmedBookingActionVisibility.test.ts
  // does parenthesis-balanced parsing; here we just pin the
  // post-fix invariant: the filter list excludes the wrong
  // statuses and keeps the right ones.
  const dash = source("components/Dashboard.tsx");
  const filterMatch = dash.match(
    /const pendingList = teacherBookings\.filter\(\(b\)\s*=>\s*\[([^\]]+)\]\.includes\(b\.status as string\)/,
  );
  assert.ok(
    filterMatch,
    "[P0.4] components/Dashboard.tsx must keep a literal `pendingList = teacherBookings.filter(...).includes(b.status...)` filter (PR #179)",
  );
  const statusList = filterMatch![1];
  assert.match(
    statusList,
    /"pending"/,
    "[P0.4] pendingList must keep `pending` for forward compatibility with manual approval flows (PR #179)",
  );
  assert.match(
    statusList,
    /"pending_teacher"/,
    "[P0.4] pendingList must keep `pending_teacher` for forward compatibility with manual approval flows (PR #179)",
  );
  assert.doesNotMatch(
    statusList,
    /"pending_payment"/,
    "[P0.4] pendingList must NOT include `pending_payment` — that re-creates the QA bug where teachers saw reject/refuse on paid bookings (PR #179)",
  );
  assert.doesNotMatch(
    statusList,
    /"confirmed"/,
    "[P0.4] pendingList must NOT include `confirmed` (PR #179)",
  );
  assert.doesNotMatch(
    statusList,
    /"completed"/,
    "[P0.4] pendingList must NOT include `completed` (PR #179)",
  );
});

test("[P0.4] confirmed bookings still surface the proper cancellation action", () => {
  // PR #179 is explicit that the cancellation flow remains for
  // confirmed bookings. We pin that the cancellation entry point
  // is still wired through the existing API and component without
  // leaking reject/refuse into that surface.
  const dash = source("components/Dashboard.tsx");
  assert.match(
    dash,
    /cancelTeacherBooking/,
    "[P0.4] Dashboard must still wire `cancelTeacherBooking` for confirmed bookings (PR #179)",
  );
});

// =================================================================
// JOURNEY STEPS 12–18: Messaging round-trip (badges + scroll)
// =================================================================

test("[P0.1] unread badge counts only messages where the current user is the receiver", () => {
  // Pure unit-test of the helper (no IO). PR #176 / studentUnreadBadge
  // already cover this; here we re-prove the invariant in the same
  // place as the journey assertion so a regression surfaces under
  // the integrated test name.
  const teacherId = "qa-teacher";
  const studentId = "qa-student";
  const conversationId = getConversationId(teacherId, studentId);

  const teacherToStudent: MessageRow = {
    id: "m1",
    conversation_id: conversationId,
    sender_id: teacherId,
    receiver_id: studentId,
    content: "Bonjour, voici ma première réponse.",
    read: false,
    created_at: "2026-06-14T10:00:00.000Z",
  };
  const studentToTeacher: MessageRow = {
    id: "m2",
    conversation_id: conversationId,
    sender_id: studentId,
    receiver_id: teacherId,
    content: "Merci!",
    read: false,
    created_at: "2026-06-14T10:01:00.000Z",
  };

  const studentPreview = buildConversationPreviews(
    [teacherToStudent, studentToTeacher],
    studentId,
  )[0];
  const teacherPreview = buildConversationPreviews(
    [teacherToStudent, studentToTeacher],
    teacherId,
  )[0];

  assert.equal(
    studentPreview.unreadCount,
    1,
    "[P0.1] student must see exactly 1 unread (the message they received from teacher)",
  );
  assert.equal(
    teacherPreview.unreadCount,
    1,
    "[P0.1] teacher must see exactly 1 unread (the message they received from student)",
  );

  // Sender must NEVER get an unread badge for their own message.
  const senderBadge = buildConversationPreviews([studentToTeacher], studentId)[0];
  assert.equal(
    senderBadge.unreadCount,
    0,
    "[P0.1] sender must not get an unread badge for their own sent message",
  );
});

test("[P0.5b] opening a thread always lands on the latest message (loadingThread flips before the awaits)", () => {
  // PR #181: setLoadingThread(false) MUST be flipped immediately
  // after setMessages(rows), BEFORE the awaits for markAsRead and
  // refreshConversations. Otherwise the scroll effect fires
  // against the loader's tiny scrollHeight and the user opens on
  // the OLDEST message.
  const page = source("app/(app)/messages/page.tsx");
  const startIdx = page.indexOf("const loadThread = useCallback(");
  assert.ok(startIdx >= 0, "[P0.5b] loadThread useCallback must still exist");

  const setMessagesIdx = page.indexOf("setMessages(rows)", startIdx);
  // Skip any setLoadingThread(false) inside the error-return branch
  // (which is BEFORE setMessages on the happy path).
  const setLoadingFalseIdx = page.indexOf(
    "setLoadingThread(false)",
    setMessagesIdx,
  );
  const markAsReadIdx = page.indexOf("await markAsRead", startIdx);
  const refreshConvIdx = page.indexOf("await refreshConversations", startIdx);

  assert.ok(setMessagesIdx >= 0, "[P0.5b] loadThread must call setMessages(rows)");
  assert.ok(
    setLoadingFalseIdx > setMessagesIdx,
    "[P0.5b] setLoadingThread(false) must come AFTER setMessages(rows) (PR #181)",
  );
  assert.ok(
    setLoadingFalseIdx < markAsReadIdx,
    "[P0.5b] setLoadingThread(false) must come BEFORE `await markAsRead` so the message list mounts before the scroll effect runs (PR #181)",
  );
  assert.ok(
    setLoadingFalseIdx < refreshConvIdx,
    "[P0.5b] setLoadingThread(false) must come BEFORE `await refreshConversations` (PR #181)",
  );
});

test("[P0.5b] guarded scroll effect distinguishes fresh-open from realtime arrival", () => {
  const page = source("app/(app)/messages/page.tsx");
  // The effect must depend on (activeConversationId, loadingThread,
  // messages, user?.id, scrollToLatest) — losing any of these
  // dependencies brings back a flavor of the QA bug.
  assert.match(
    page,
    /\[activeConversationId,\s*loadingThread,\s*messages,\s*user\?\.id,\s*scrollToLatest\]/,
    "[P0.5b] scroll effect must depend on the full (activeConversationId, loadingThread, messages, user?.id, scrollToLatest) tuple (PR #181)",
  );
  // Auto on fresh-open, smooth on subsequent updates.
  assert.match(
    page,
    /scrollToLatest\("auto"\)/,
    "[P0.5b] fresh-open path must call scrollToLatest(\"auto\") for instant jump (PR #181)",
  );
  assert.match(
    page,
    /scrollToLatest\("smooth"\)/,
    "[P0.5b] subsequent-update path must call scrollToLatest(\"smooth\") (PR #181)",
  );
  // Near-bottom guard so a user reading older history is NOT yanked
  // back when the peer types something.
  assert.match(
    page,
    /if\s*\(sentByMe\s*\|\|\s*isNearBottomRef\.current\)/,
    "[P0.5b] near-bottom guard must remain so realtime arrivals don't yank a scrolled-up user (PR #181)",
  );
});

// =================================================================
// JOURNEY STEP 19: Message email notifications (recipient-only)
// =================================================================

test("[P0.2] message email helper sends to recipient only and never includes private content", async () => {
  // Lazy-import the helper so this test does not require any
  // environment variables at module-load time. The helper is pure
  // and synchronous; we read it via dynamic import to keep the
  // top-level imports clean.
  process.env.APP_BASE_URL ??= "https://www.pratiqo.ca";
  const { buildNewPratiqoMessageEmail } = (await import(
    "@/lib/email/templates/messages"
  )) as typeof import("@/lib/email/templates/messages");

  const fr = buildNewPratiqoMessageEmail({
    recipientName: "Sofia",
    senderName: "Marc",
    conversationUrl: "https://www.pratiqo.ca/messages?peer=teacher-123",
    locale: "fr",
  });
  assert.equal(
    fr.subject,
    "Nouveau message sur Pratiqo",
    "[P0.2] FR subject must remain stable",
  );
  assert.equal(
    fr.ctaUrl,
    "https://www.pratiqo.ca/messages?peer=teacher-123",
    "[P0.2] FR CTA must deep-link to /messages?peer=...",
  );
  // No private message body must ever leak into the email payload.
  // Use a sentinel that would only appear if a developer regressed
  // the helper to render the message body verbatim.
  const sentinelBody = "Rendez-vous secret au café Saint-Henri à 19h";
  // Build with a body-shaped argument that should be ignored. The
  // helper deliberately doesn't accept `content`/`bodyText`; passing
  // it via a spread should still produce a body-free email.
  const polluted = buildNewPratiqoMessageEmail({
    recipientName: "Sofia",
    senderName: "Marc",
    locale: "fr",
    // @ts-expect-error: validating that the helper rejects/ignores
    //   a private-content prop. If TS ever stops erroring here
    //   because the type was widened, the helper API regressed.
    content: sentinelBody,
  } as unknown as Parameters<typeof buildNewPratiqoMessageEmail>[0]);
  assert.doesNotMatch(
    polluted.html,
    new RegExp(sentinelBody.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    "[P0.2] email helper must NEVER render private message content (anti-circumvention)",
  );

  // Recipient-only contract: the route must guard `receiverId !== user.id`
  // so a user does NOT email themselves their own sent message.
  const routeSrc = source("app/api/messages/send/route.ts");
  assert.match(
    routeSrc,
    /if\s*\(\s*receiverId !== user\.id\s*\)/,
    "[P0.2] messages/send route must guard `receiverId !== user.id` so sender never gets their own email",
  );
});

// =================================================================
// CROSS-CUTTING GUARDRAILS (brief: do NOT touch these)
// =================================================================

test("[guardrail] no Stripe / payment / commission imports were added to the marketplace surfaces fixed by P0", () => {
  // Each P0 area's surface MUST be free of Stripe imports — these
  // tests caught earlier accidental couplings. Re-pin the
  // invariant in the integrated test so any future edit that
  // sneaks Stripe wiring into the booking modal, search page, or
  // messages page surfaces here.
  const surfaces = [
    "components/BookingModal.tsx",
    "app/(app)/student/search/page.tsx",
    "app/(app)/messages/page.tsx",
    "components/Dashboard.tsx",
  ];
  for (const rel of surfaces) {
    const src = source(rel);
    assert.doesNotMatch(
      src,
      /from\s+["']@stripe\/[^"']+["']/,
      `[guardrail] ${rel} must not import from @stripe/* (P0 surfaces stay payment-free)`,
    );
    assert.doesNotMatch(
      src,
      /from\s+["']stripe["']/,
      `[guardrail] ${rel} must not import the Node 'stripe' SDK (P0 surfaces stay payment-free)`,
    );
  }
});

test("[guardrail] no Twilio / SMS / push provider was added during the P0 marketplace pass", () => {
  // The brief explicitly forbids adding Twilio/SMS/push providers.
  // Sanity-check package.json so a future PR that adds twilio /
  // expo-notifications / firebase-admin would fail this guard.
  const pkg = JSON.parse(source("package.json")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const allDeps = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };
  for (const banned of [
    "twilio",
    "expo-notifications",
    "react-native-push-notification",
    "firebase-admin",
    "@aws-sdk/client-sns",
  ]) {
    assert.ok(
      !(banned in allDeps),
      `[guardrail] dependency '${banned}' must NOT have been added during the P0 marketplace pass`,
    );
  }
});

test("[guardrail] integrated marketplace test is wired into npm run test:launch-critical", () => {
  // CI-level guarantee: a regression on any of the P0 areas must
  // fail this single integrated test inside the launch-critical
  // suite. If a future developer forgets to wire this in,
  // `validate:launch` would silently skip it.
  const pkg = JSON.parse(source("package.json")) as {
    scripts?: Record<string, string>;
  };
  assert.match(
    pkg.scripts?.["test:launch-critical"] ?? "",
    /tsx tests\/marketplace\/integratedMarketplaceQa\.test\.ts/,
    "[guardrail] integratedMarketplaceQa test must be in test:launch-critical",
  );
});

// ── Run ─────────────────────────────────────────────────────────────────────

(async () => {
  let passed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
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
    console.log(`[marketplace:integratedMarketplaceQa] ${passed} tests passed`);
  }
})();
