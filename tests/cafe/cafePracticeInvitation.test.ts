import assert from "node:assert/strict";
import {
  CAFE_INVITATION_DEMO,
  buildCafeReserveHref,
  levelMatches,
  resolveCafePracticeInvitation,
  themeMatches,
} from "@/lib/cafe/practiceInvitation";
import {
  buildCafeReservationLoginHref,
  parseYoCafeContext,
  postCafeReservation,
} from "@/lib/cafe/reservationClient";

const pathOn = { reservationPathAvailable: true as const };
const pathOff = { reservationPathAvailable: false as const };

{
  const invitation = resolveCafePracticeInvitation(
    CAFE_INVITATION_DEMO.mission,
    [CAFE_INVITATION_DEMO.matchingSession, CAFE_INVITATION_DEMO.unrelatedSession],
    pathOn,
  );
  assert.equal(invitation.kind, "invite");
  if (invitation.kind === "invite") {
    assert.equal(invitation.headline, "Pratiquer au Café");
    assert.equal(invitation.session.slug, "demo-fr-introductions-a1");
    assert.equal(invitation.participation.masteryUnchanged, true);
    assert.match(invitation.reserveHref, /^\/login\?/);
    assert.match(invitation.reserveHref, /intent=student/);
    assert.match(decodeURIComponent(invitation.reserveHref), /yoReturn=/);
    assert.match(decodeURIComponent(invitation.reserveHref), /yoExpression=/);
  }
}

{
  const invitation = resolveCafePracticeInvitation(
    CAFE_INVITATION_DEMO.mission,
    [CAFE_INVITATION_DEMO.fullSession, CAFE_INVITATION_DEMO.unrelatedSession],
    pathOn,
  );
  assert.equal(invitation.kind, "continue");
  if (invitation.kind === "continue") {
    assert.equal(invitation.reason, "full");
    assert.equal(invitation.courseReturnPath, CAFE_INVITATION_DEMO.mission.courseReturnPath);
  }
}

{
  const invitation = resolveCafePracticeInvitation(
    CAFE_INVITATION_DEMO.mission,
    [CAFE_INVITATION_DEMO.unrelatedSession],
    pathOn,
  );
  assert.equal(invitation.kind, "continue");
  if (invitation.kind === "continue") assert.equal(invitation.reason, "no_match");
}

{
  const invitation = resolveCafePracticeInvitation(
    CAFE_INVITATION_DEMO.mission,
    [CAFE_INVITATION_DEMO.matchingSession],
    pathOff,
  );
  assert.equal(invitation.kind, "continue");
  if (invitation.kind === "continue") {
    assert.equal(invitation.reason, "reservation_unavailable");
    assert.equal(invitation.courseReturnPath, CAFE_INVITATION_DEMO.mission.courseReturnPath);
  }
}

{
  assert.equal(
    themeMatches(CAFE_INVITATION_DEMO.matchingSession, "introductions"),
    true,
  );
  assert.equal(
    themeMatches(CAFE_INVITATION_DEMO.fuzzyTitleOnlySession, "introductions"),
    false,
  );
  const invitation = resolveCafePracticeInvitation(
    CAFE_INVITATION_DEMO.mission,
    [CAFE_INVITATION_DEMO.fuzzyTitleOnlySession],
    pathOn,
  );
  assert.equal(invitation.kind, "continue");
  if (invitation.kind === "continue") assert.equal(invitation.reason, "no_match");
}

{
  assert.equal(levelMatches(CAFE_INVITATION_DEMO.unknownLevelSession, "A1"), false);
  const invitation = resolveCafePracticeInvitation(
    CAFE_INVITATION_DEMO.mission,
    [CAFE_INVITATION_DEMO.unknownLevelSession],
    pathOn,
  );
  assert.equal(invitation.kind, "continue");
  if (invitation.kind === "continue") assert.equal(invitation.reason, "no_match");
}

{
  assert.equal(levelMatches(CAFE_INVITATION_DEMO.allLevelsSession, "A1"), true);
  const invitation = resolveCafePracticeInvitation(
    CAFE_INVITATION_DEMO.mission,
    [CAFE_INVITATION_DEMO.allLevelsSession],
    pathOn,
  );
  assert.equal(invitation.kind, "invite");
  if (invitation.kind === "invite") {
    assert.equal(invitation.session.slug, "demo-fr-introductions-all-levels");
  }
}

{
  const href = buildCafeReserveHref({
    slug: "demo-fr-introductions-a1",
    courseReturnPath: "https://evil.example/phish",
    reviewExpression: "Bonjour",
    themeId: "introductions",
  });
  assert.match(href, /intent=student/);
  assert.match(href, /next=%2Fcafe%2Fdemo-fr-introductions-a1/);
  assert.match(decodeURIComponent(href), /yoReturn=%2Fstudent%2Fyopratiqo/);
  assert.doesNotMatch(decodeURIComponent(href), /evil\.example/);
}

async function assertInviteToConfirmedReturnJourney() {
  const savedCourse = "/student/yopratiqo?demo=introductions-complete&step=12";
  const invitation = resolveCafePracticeInvitation(
    {
      ...CAFE_INVITATION_DEMO.mission,
      courseReturnPath: savedCourse,
      reviewExpression: "Enchanté",
    },
    [CAFE_INVITATION_DEMO.matchingSession],
    pathOn,
  );
  assert.equal(invitation.kind, "invite");
  if (invitation.kind !== "invite") throw new Error("expected invite");

  const nextEncoded = new URL(invitation.reserveHref, "https://pratiqo.test").searchParams.get("next");
  assert.ok(nextEncoded);
  const cafeUrl = new URL(nextEncoded, "https://pratiqo.test");
  assert.equal(cafeUrl.pathname, "/cafe/demo-fr-introductions-a1");
  const yo = parseYoCafeContext(cafeUrl.searchParams);
  assert.equal(yo.fromYo, true);
  assert.equal(yo.yoReturn, savedCourse);
  assert.equal(yo.yoExpression, "Enchanté");
  assert.equal(yo.yoMission, "introductions");

  // Context survives a re-login handoff built from the same Café path.
  const again = buildCafeReservationLoginHref(`${cafeUrl.pathname}${cafeUrl.search}`);
  const againNext = new URL(again, "https://pratiqo.test").searchParams.get("next");
  assert.ok(againNext);
  const yoAfterLogin = parseYoCafeContext(new URL(againNext, "https://pratiqo.test").searchParams);
  assert.equal(yoAfterLogin.yoReturn, savedCourse);
  assert.equal(yoAfterLogin.yoExpression, "Enchanté");

  let posted = false;
  const result = await postCafeReservation({
    slug: invitation.session.slug,
    action: "reserve",
    expectedVersion: 0,
    requestId: "11111111-1111-4111-8111-111111111111",
    accessToken: "test-token",
    fetchImpl: async (_input, init) => {
      posted = true;
      assert.equal(init?.method, "POST");
      const headers = init?.headers as Record<string, string>;
      assert.equal(headers.Authorization, "Bearer test-token");
      const body = JSON.parse(String(init?.body)) as {
        slug: string;
        action: string;
        expectedVersion: number;
        requestId: string;
      };
      assert.equal(body.slug, "demo-fr-introductions-a1");
      assert.equal(body.action, "reserve");
      assert.equal(body.expectedVersion, 0);
      return new Response(JSON.stringify({ ok: true, status: "confirmed", version: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  assert.equal(posted, true);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.status, "confirmed");
  assert.equal(invitation.courseReturnPath, savedCourse);
}

assertInviteToConfirmedReturnJourney()
  .then(() => {
    console.log("[cafe:practice-invitation] matching, reservation path, and journey contracts passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });