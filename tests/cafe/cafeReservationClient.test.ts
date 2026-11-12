import assert from "node:assert/strict";
import {
  attemptCafeReserve,
  fetchMyCafeReservations,
  parseCafeMyReservationRow,
  seatStateFromReservation,
} from "@/lib/cafe/reservationClient";
import {
  attachVerifiedCafeTheme,
  lookupVerifiedCafeThemeId,
} from "@/lib/cafe/themeAssociation";
import type { CafePublicSession } from "@/lib/cafe/publicTypes";

/** Shapes returned by cafe_my_reservations_server via GET /api/cafe/reservations. */
const RPC_CONFIRMED_ROW = {
  reservation_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  slug: "fr-introductions-a1",
  title: "Présentations A1",
  starts_at: "2099-04-01T18:00:00.000Z",
  duration_minutes: 30,
  reservation_status: "confirmed",
  session_status: "published",
  phase: "upcoming",
  effective_status: "confirmed",
  version: 1,
};

const RPC_CANCELLED_RESERVATION_ROW = {
  ...RPC_CONFIRMED_ROW,
  reservation_status: "cancelled",
  effective_status: "cancelled",
  version: 2,
};

const RPC_SESSION_CANCELLED_ROW = {
  ...RPC_CONFIRMED_ROW,
  reservation_status: "confirmed",
  session_status: "cancelled",
  effective_status: "session_cancelled",
  version: 1,
};

{
  const parsed = parseCafeMyReservationRow(RPC_CONFIRMED_ROW);
  assert.ok(parsed);
  assert.equal(parsed.slug, "fr-introductions-a1");
  assert.equal(parsed.reservationStatus, "confirmed");
  assert.equal(parsed.sessionStatus, "published");
  assert.equal(parsed.effectiveStatus, "confirmed");
  assert.equal(parsed.version, 1);
  // Legacy `status` alone must not be required.
  assert.equal(
    parseCafeMyReservationRow({ slug: "x", status: "confirmed", version: 3 })?.effectiveStatus,
    "",
  );
}

{
  // Confirmation after reload uses effective_status from the real GET shape.
  const seat = seatStateFromReservation(parseCafeMyReservationRow(RPC_CONFIRMED_ROW));
  assert.equal(seat.kind, "confirmed");
  if (seat.kind === "confirmed") {
    assert.equal(seat.version, 1);
    assert.equal(seat.expectedVersion, 1);
  }
}

{
  // Cancelled reservation keeps version for the next reserve expectedVersion.
  const seat = seatStateFromReservation(parseCafeMyReservationRow(RPC_CANCELLED_RESERVATION_ROW));
  assert.equal(seat.kind, "ready");
  if (seat.kind === "ready") {
    assert.equal(seat.expectedVersion, 2);
    assert.equal(seat.reservationStatus, "cancelled");
    assert.equal(seat.effectiveStatus, "cancelled");
  }
}

{
  // Confirmed row on a cancelled session must not show as a confirmed seat.
  const seat = seatStateFromReservation(parseCafeMyReservationRow(RPC_SESSION_CANCELLED_ROW));
  assert.equal(seat.kind, "ready");
  if (seat.kind === "ready") {
    assert.equal(seat.expectedVersion, 1);
    assert.equal(seat.effectiveStatus, "session_cancelled");
  }
}

async function assertFetchParsesRpcGetShape() {
  const result = await fetchMyCafeReservations({
    accessToken: "token",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          ok: true,
          reservations: [RPC_CONFIRMED_ROW, RPC_CANCELLED_RESERVATION_ROW],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("expected ok");
  assert.equal(result.reservations.length, 2);
  assert.equal(result.reservations[0]?.effectiveStatus, "confirmed");
  assert.equal(result.reservations[0]?.reservationStatus, "confirmed");
  assert.equal(result.reservations[1]?.effectiveStatus, "cancelled");
  assert.equal(result.reservations[1]?.version, 2);
}

async function assertCancelThenRereserveUsesStoredVersion() {
  const cancelled = seatStateFromReservation(parseCafeMyReservationRow(RPC_CANCELLED_RESERVATION_ROW));
  assert.equal(cancelled.kind, "ready");
  if (cancelled.kind !== "ready") throw new Error("expected ready");

  type PostedBody = { expectedVersion?: number; requestId?: string };
  const posted = { body: null as PostedBody | null };
  const result = await attemptCafeReserve({
    slug: "fr-introductions-a1",
    expectedVersion: cancelled.expectedVersion,
    requestId: "22222222-2222-4222-8222-222222222222",
    accessToken: "token",
    fetchImpl: async (_input, init) => {
      if (init?.method === "POST") {
        posted.body = JSON.parse(String(init.body)) as PostedBody;
        return new Response(
          JSON.stringify({ ok: true, status: "confirmed", version: 3, replay: false }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error("unexpected");
    },
  });
  assert.equal(posted.body?.expectedVersion, 2);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.seat.kind, "confirmed");
    assert.equal(result.reuseRequestId, false);
  }
}

async function assertLostPostReconcilesAndReusesRequestId() {
  const requestId = "33333333-3333-4333-8333-333333333333";
  let postCount = 0;
  let getCount = 0;

  const first = await attemptCafeReserve({
    slug: "fr-introductions-a1",
    expectedVersion: 0,
    requestId,
    accessToken: "token",
    fetchImpl: async (_input, init) => {
      if (init?.method === "POST") {
        postCount += 1;
        // Connection dropped after the server accepted the write.
        throw new Error("network down");
      }
      getCount += 1;
      return new Response(
        JSON.stringify({ ok: true, reservations: [RPC_CONFIRMED_ROW] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });
  assert.equal(postCount, 1);
  assert.equal(getCount, 1);
  assert.equal(first.ok, true);
  if (first.ok) {
    assert.equal(first.seat.kind, "confirmed");
    assert.equal(first.reuseRequestId, false);
  }

  // Lost response with no server confirmation yet → keep requestId for idempotent retry.
  postCount = 0;
  getCount = 0;
  const uncertain = await attemptCafeReserve({
    slug: "fr-introductions-a1",
    expectedVersion: 0,
    requestId,
    accessToken: "token",
    fetchImpl: async (_input, init) => {
      if (init?.method === "POST") {
        postCount += 1;
        return new Response("not-json", { status: 200 });
      }
      getCount += 1;
      return new Response(JSON.stringify({ ok: true, reservations: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  assert.equal(postCount, 1);
  assert.equal(getCount, 1);
  assert.equal(uncertain.ok, false);
  if (!uncertain.ok) {
    assert.equal(uncertain.code, "response_lost");
    assert.equal(uncertain.reuseRequestId, true);
    assert.equal(uncertain.seat.kind, "ready");
  }

  // version_conflict → reconcile expectedVersion; do not reuse requestId.
  const conflict = await attemptCafeReserve({
    slug: "fr-introductions-a1",
    expectedVersion: 0,
    requestId: "44444444-4444-4444-8444-444444444444",
    accessToken: "token",
    fetchImpl: async (_input, init) => {
      if (init?.method === "POST") {
        return new Response(
          JSON.stringify({ ok: false, code: "version_conflict", version: 2 }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ ok: true, reservations: [RPC_CANCELLED_RESERVATION_ROW] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });
  assert.equal(conflict.ok, false);
  if (!conflict.ok) {
    assert.equal(conflict.code, "version_conflict");
    assert.equal(conflict.reuseRequestId, false);
    assert.equal(conflict.seat.kind, "ready");
    if (conflict.seat.kind === "ready") assert.equal(conflict.seat.expectedVersion, 2);
  }
}

{
  const session = {
    slug: "published-fr-introductions-a1",
    title: "Présentations",
    primary_language: "fr",
    practice_language: null,
    level: "A1",
    starts_at: "2099-05-01T18:00:00.000Z",
    duration_minutes: 30,
    max_participants: 8,
    confirmed_count: 0,
    remaining_spots: 8,
  } satisfies CafePublicSession;

  assert.equal(lookupVerifiedCafeThemeId(session.slug), null);
  assert.equal(attachVerifiedCafeTheme(session).themeId, null);

  const tagged = attachVerifiedCafeTheme(session, {
    "published-fr-introductions-a1": "introductions",
  });
  assert.equal(tagged.themeId, "introductions");
}

void (async () => {
  await assertFetchParsesRpcGetShape();
  await assertCancelThenRereserveUsesStoredVersion();
  await assertLostPostReconcilesAndReusesRequestId();
  console.log("[cafe:reservation-client] RPC GET shapes, cancel/re-reserve, lost POST contracts passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
