/**
 * Isolated Café live reservation check (API + handoff for browser).
 *
 * Prerequisites fail closed before creating accounts:
 * - Target must be local unless CAFE_LIVE_ALLOW_REMOTE=true
 * - CAFE_V1_ENABLED=true
 * - cafe tables + required RPC signatures present (via psql)
 *
 * Admin/service role: draft/publish prep only.
 * Learner JWT: reserve/cancel/GET via /api/cafe/reservations.
 */
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  attemptCafeReserve,
  fetchMyCafeReservations,
  seatStateFromReservation,
} from "../lib/cafe/reservationClient";
import { resolveCafePracticeInvitation } from "../lib/cafe/practiceInvitation";
import { attachVerifiedCafeTheme } from "../lib/cafe/themeAssociation";
import type { CafePublicSession } from "../lib/cafe/publicTypes";

type Step = { step: string; ok: boolean; detail?: unknown };

function loadEnvFile(path: string) {
  if (!existsSync(path)) return {} as Record<string, string>;
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i)] = line.slice(i + 1);
  }
  return env;
}

for (const file of [".env.local", ".env.cafe-local"]) {
  const loaded = loadEnvFile(file);
  for (const [k, v] of Object.entries(loaded)) {
    if (process.env[k] == null || process.env[k] === "") process.env[k] = v;
  }
}

function assertStep(steps: Step[], name: string, condition: boolean, detail?: unknown) {
  steps.push({ step: name, ok: condition, detail });
  console.log(JSON.stringify({ step: name, ok: condition, detail: detail ?? null }));
  if (!condition) {
    const err = new Error(`ASSERT_FAIL ${name}${detail ? `: ${JSON.stringify(detail)}` : ""}`);
    (err as Error & { step?: string }).step = name;
    throw err;
  }
}

function isLocalUrl(value: string) {
  try {
    const u = new URL(value);
    return u.hostname === "127.0.0.1" || u.hostname === "localhost";
  } catch {
    return false;
  }
}

const REQUIRED_RPCS = [
  "public.cafe_set_reservation_server(uuid,text,text,bigint,uuid)",
  "public.cafe_my_reservations_server(uuid)",
  "public.cafe_admin_create_draft_server(uuid,text,text,text,text,text,timestamptz,integer,integer,uuid)",
  "public.cafe_admin_publish_server(uuid,text)",
  "public.cafe_admin_cancel_server(uuid,text)",
] as const;

function psqlScalar(sql: string): string {
  const dbUrl = process.env.CAFE_LIVE_DATABASE_URL || "";
  const u = new URL(dbUrl);
  const result = spawnSync(
    "psql",
    [
      "-X",
      "-h", u.hostname,
      "-p", u.port || "5432",
      "-U", decodeURIComponent(u.username || "postgres"),
      "-d", (u.pathname || "/postgres").replace(/^\//, "") || "postgres",
      "-v", "ON_ERROR_STOP=1",
      "-qAt",
      "-c", sql,
    ],
    {
      encoding: "utf8",
      env: { ...process.env, PGPASSWORD: decodeURIComponent(u.password || "") },
    },
  );
  if (result.status !== 0) {
    throw new Error(`psql failed: ${result.stderr || result.stdout || result.error}`);
  }
  return (result.stdout || "").trim();
}

const appBase = (process.env.CAFE_LIVE_APP_BASE || "http://127.0.0.1:3456").replace(/\/$/, "");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const cafeEnabled = (process.env.CAFE_V1_ENABLED || "").trim().toLowerCase() === "true";
const allowRemote = (process.env.CAFE_LIVE_ALLOW_REMOTE || "").trim().toLowerCase() === "true";
const keep = process.argv.includes("--keep");

const created = {
  learnerId: null as string | null,
  adminId: null as string | null,
  slug: null as string | null,
  promotedAdmin: false,
};

const steps: Step[] = [];
const cleanupLog: Array<{ action: string; ok: boolean; detail?: unknown }> = [];

async function verifyPrerequisites() {
  assertStep(steps, "env_supabase_url", Boolean(supabaseUrl), supabaseUrl || "missing");
  assertStep(steps, "env_anon_key", Boolean(anonKey), anonKey ? "present" : "missing");
  assertStep(steps, "env_service_key", Boolean(serviceKey), serviceKey ? "present" : "missing");
  assertStep(steps, "env_cafe_v1", cafeEnabled, `CAFE_V1_ENABLED=${process.env.CAFE_V1_ENABLED}`);
  assertStep(
    steps,
    "target_isolated",
    allowRemote || (isLocalUrl(supabaseUrl) && isLocalUrl(appBase)),
    allowRemote ? "remote_allowed" : `${supabaseUrl} / ${appBase}`,
  );
  assertStep(steps, "env_database_url", Boolean(process.env.CAFE_LIVE_DATABASE_URL), "CAFE_LIVE_DATABASE_URL");

  assertStep(steps, "migration_cafe_sessions", psqlScalar("SELECT to_regclass('public.cafe_sessions') IS NOT NULL") === "t");
  assertStep(steps, "migration_cafe_reservations", psqlScalar("SELECT to_regclass('public.cafe_reservations') IS NOT NULL") === "t");
  assertStep(steps, "migration_profiles", psqlScalar("SELECT to_regclass('public.profiles') IS NOT NULL") === "t");

  for (const fn of REQUIRED_RPCS) {
    const name = fn.split("(")[0]!.split(".").pop()!;
    assertStep(steps, `rpc_${name}`, psqlScalar(`SELECT to_regprocedure('${fn}') IS NOT NULL`) === "t", fn);
  }

  const health = await fetch(`${appBase}/cafe/preview/pratiquer`, { redirect: "manual" });
  assertStep(steps, "app_preview_reachable", health.status === 200, `status=${health.status}`);
}

async function cleanup() {
  if (!supabaseUrl || !serviceKey) return [] as string[];
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const failures: string[] = [];

  if (created.slug && created.adminId) {
    try {
      const cancelled = await admin.rpc("cafe_admin_cancel_server", {
        p_actor_id: created.adminId,
        p_slug: created.slug,
      });
      cleanupLog.push({ action: "cancel_session", ok: !cancelled.error, detail: cancelled.error?.message ?? cancelled.data });
      if (cancelled.error) failures.push(`cancel_session: ${cancelled.error.message}`);
    } catch (error) {
      failures.push(`cancel_session: ${error instanceof Error ? error.message : "unknown"}`);
      cleanupLog.push({ action: "cancel_session", ok: false, detail: String(error) });
    }
  }

  if (created.learnerId) {
    try {
      const del = await admin.auth.admin.deleteUser(created.learnerId);
      cleanupLog.push({ action: "delete_learner", ok: !del.error, detail: del.error?.message ?? null });
      if (del.error) failures.push(`delete_learner: ${del.error.message}`);
    } catch (error) {
      failures.push(`delete_learner: ${error instanceof Error ? error.message : "unknown"}`);
      cleanupLog.push({ action: "delete_learner", ok: false, detail: String(error) });
    }
  }

  if (created.adminId && created.promotedAdmin) {
    try {
      const delAdmin = await admin.auth.admin.deleteUser(created.adminId);
      cleanupLog.push({ action: "delete_temp_admin", ok: !delAdmin.error, detail: delAdmin.error?.message ?? null });
      if (delAdmin.error) failures.push(`delete_temp_admin: ${delAdmin.error.message}`);
    } catch (error) {
      failures.push(`admin_cleanup: ${error instanceof Error ? error.message : "unknown"}`);
      cleanupLog.push({ action: "admin_cleanup", ok: false, detail: String(error) });
    }
  }

  return failures;
}

async function main() {
  await verifyPrerequisites();

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const stamp = Date.now().toString(36);
  const learnerEmail = `cafe.live.learner+${stamp}@example.test`;
  const learnerPassword = `CafeLive-${stamp}-Aa1!`;
  const adminEmail = `cafe.live.admin+${stamp}@example.test`;
  const adminPassword = `CafeAdmin-${stamp}-Aa1!`;
  const courseReturn = `/student/yopratiqo?demo=introductions-complete&live=${stamp}`;

  const createdAdmin = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { name: "Cafe Live Admin" },
  });
  assertStep(steps, "create_temp_admin", !createdAdmin.error && Boolean(createdAdmin.data.user), createdAdmin.error?.message);
  created.adminId = createdAdmin.data.user!.id;
  created.promotedAdmin = true;
  const adminProfile = await admin.from("profiles").upsert({
    id: created.adminId,
    email: adminEmail,
    name: "Cafe Live Admin",
    role: "admin",
    is_active: true,
  }, { onConflict: "id" });
  assertStep(steps, "admin_profile", !adminProfile.error, adminProfile.error?.message);

  const createdLearner = await admin.auth.admin.createUser({
    email: learnerEmail,
    password: learnerPassword,
    email_confirm: true,
    user_metadata: { name: "Cafe Live Learner" },
  });
  assertStep(steps, "create_permanent_learner", !createdLearner.error && Boolean(createdLearner.data.user), createdLearner.error?.message);
  created.learnerId = createdLearner.data.user!.id;
  const learnerProfile = await admin.from("profiles").upsert({
    id: created.learnerId,
    email: learnerEmail,
    name: "Cafe Live Learner",
    role: "student",
    is_active: true,
    // Complete student onboarding so /login?intent=student&next=/cafe/... redirects to Café (test fixture only).
    companion_chosen: true,
    student_onboarding_consent_completed_at: new Date().toISOString(),
    student_onboarding_consent_version: "student_onboarding_consent_v1_2026_06",
  }, { onConflict: "id" });
  assertStep(steps, "learner_profile", !learnerProfile.error, learnerProfile.error?.message);

  const slug = `live-intro-${stamp}`;
  created.slug = slug;
  const startsAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  // Published future sessions require an eligible host (admin prep only).
  const draft = await admin.rpc("cafe_admin_create_draft_server", {
    p_actor_id: created.adminId,
    p_slug: slug,
    p_title: "LIVE Introductions A1",
    p_primary_language: "fr",
    p_practice_language: null,
    p_level: "A1",
    p_starts_at: startsAt,
    p_duration_minutes: 30,
    p_max_participants: 4,
    p_host_profile_id: created.adminId,
  });
  assertStep(steps, "admin_create_draft", !draft.error && (draft.data as { ok?: boolean } | null)?.ok !== false, draft.error?.message ?? draft.data);
  const published = await admin.rpc("cafe_admin_publish_server", {
    p_actor_id: created.adminId,
    p_slug: slug,
  });
  assertStep(steps, "admin_publish", !published.error && (published.data as { ok?: boolean } | null)?.ok !== false, published.error?.message ?? published.data);

  const publicSessions = await fetch(`${appBase}/api/cafe/sessions?slug=${encodeURIComponent(slug)}`);
  assertStep(steps, "public_session_http", publicSessions.ok, `status=${publicSessions.status}`);
  const publicBody = (await publicSessions.json()) as { sessions?: CafePublicSession[] };
  const sessionRow = publicBody.sessions?.[0];
  assertStep(steps, "public_session_row", Boolean(sessionRow), publicBody);
  const tagged = attachVerifiedCafeTheme(sessionRow!, { [slug]: "introductions" });
  const invitation = resolveCafePracticeInvitation(
    {
      language: "fr",
      themeId: "introductions",
      level: "A1",
      courseReturnPath: courseReturn,
      reviewExpression: "Bonjour, je m’appelle…",
    },
    [tagged],
    { reservationPathAvailable: true },
  );
  assertStep(steps, "invitation_kind_invite", invitation.kind === "invite", invitation.kind);
  assertStep(
    steps,
    "invitation_reserve_href",
    invitation.kind === "invite" && invitation.reserveHref.includes("intent=student"),
    invitation.kind === "invite" ? invitation.reserveHref : null,
  );

  const learnerClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signedIn = await learnerClient.auth.signInWithPassword({
    email: learnerEmail,
    password: learnerPassword,
  });
  assertStep(steps, "learner_sign_in", !signedIn.error && Boolean(signedIn.data.session?.access_token), signedIn.error?.message);
  const learnerToken = signedIn.data.session!.access_token;

  const apiFetch: typeof fetch = async (input, init) => {
    const url = String(input).startsWith("http") ? String(input) : `${appBase}${input}`;
    return fetch(url, init);
  };

  const reserveRequestId = randomUUID();
  const reserved = await attemptCafeReserve({
    slug,
    expectedVersion: 0,
    requestId: reserveRequestId,
    accessToken: learnerToken,
    fetchImpl: apiFetch,
  });
  assertStep(steps, "post_reserve_confirmed", reserved.ok && reserved.seat.kind === "confirmed", reserved);
  const confirmedVersion = reserved.seat.kind === "confirmed" ? reserved.seat.version : 0;

  const mine = await fetchMyCafeReservations({ accessToken: learnerToken, fetchImpl: apiFetch });
  assertStep(steps, "get_after_reserve_ok", mine.ok === true, mine);
  const row = mine.ok ? mine.reservations.find((r) => r.slug === slug) : null;
  assertStep(steps, "get_effective_confirmed", row?.effectiveStatus === "confirmed", row);
  assertStep(steps, "get_version_matches", row?.version === confirmedVersion, row);
  assertStep(steps, "seat_from_get_confirmed", seatStateFromReservation(row).kind === "confirmed", seatStateFromReservation(row));

  const cancelRequestId = randomUUID();
  const cancelRes = await apiFetch("/api/cafe/reservations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${learnerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug,
      action: "cancel",
      expectedVersion: confirmedVersion,
      requestId: cancelRequestId,
    }),
  });
  const cancelBody = await cancelRes.json();
  assertStep(steps, "post_cancel_ok", cancelRes.ok && cancelBody.ok === true, cancelBody);

  const afterCancel = await fetchMyCafeReservations({ accessToken: learnerToken, fetchImpl: apiFetch });
  const cancelRow = afterCancel.ok ? afterCancel.reservations.find((r) => r.slug === slug) : null;
  const cancelSeat = seatStateFromReservation(cancelRow);
  assertStep(steps, "after_cancel_not_confirmed", cancelSeat.kind === "ready", cancelSeat);
  assertStep(steps, "after_cancel_keeps_version", cancelSeat.kind === "ready" && cancelSeat.expectedVersion > 0, cancelSeat);

  const rereserveId = randomUUID();
  const rereserved = await attemptCafeReserve({
    slug,
    expectedVersion: cancelSeat.kind === "ready" ? cancelSeat.expectedVersion : 0,
    requestId: rereserveId,
    accessToken: learnerToken,
    fetchImpl: apiFetch,
  });
  assertStep(steps, "post_rereserve_confirmed", rereserved.ok && rereserved.seat.kind === "confirmed", rereserved);

  let firstPostDone = false;
  const lostId = randomUUID();
  const lost = await attemptCafeReserve({
    slug,
    expectedVersion: rereserved.seat.expectedVersion,
    requestId: lostId,
    accessToken: learnerToken,
    fetchImpl: async (input, init) => {
      if (init?.method === "POST" && !firstPostDone) {
        firstPostDone = true;
        const real = await apiFetch(input, init);
        await real.arrayBuffer();
        return new Response("not-json", { status: 200 });
      }
      return apiFetch(input, init);
    },
  });
  assertStep(
    steps,
    "lost_post_reconcile",
    lost.ok === true || lost.reuseRequestId === true || lost.seat.kind === "confirmed",
    lost,
  );

  const magic = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: learnerEmail,
    options: {
      redirectTo: `${appBase}/cafe/${slug}?from=yo&yoReturn=${encodeURIComponent(courseReturn)}&yoExpression=${encodeURIComponent("Bonjour, je m’appelle…")}&yoMission=introductions`,
    },
  });
  assertStep(steps, "magic_link_for_browser", !magic.error && Boolean(magic.data.properties?.action_link), magic.error?.message);

  const handoff = {
    environment: "local-supabase-pr405-sandbox+cafe-foundation",
    appBase,
    supabaseUrl,
    learnerEmail,
    learnerPassword,
    learnerToken,
    learnerId: created.learnerId,
    adminId: created.adminId,
    courseReturn,
    slug,
    inviteReserveHref: invitation.kind === "invite" ? invitation.reserveHref : null,
    previewLiveUrl: `${appBase}/cafe/preview/pratiquer?liveSlug=${encodeURIComponent(slug)}&yoReturn=${encodeURIComponent(courseReturn)}`,
    sessionUrl: `${appBase}/cafe/${slug}?from=yo&yoReturn=${encodeURIComponent(courseReturn)}&yoExpression=${encodeURIComponent("Bonjour, je m’appelle…")}&yoMission=introductions`,
    magicLink: magic.data.properties?.action_link ?? null,
    steps,
  };
  writeFileSync(".cafe-live-handoff.json", JSON.stringify(handoff, null, 2));
  console.log(JSON.stringify({ live: "API_SUCCESS", handoffFile: ".cafe-live-handoff.json", previewLiveUrl: handoff.previewLiveUrl, sessionUrl: handoff.sessionUrl }, null, 2));
  return handoff;
}

void (async () => {
  let exitCode = 0;
  try {
    await main();
    if (!keep) {
      console.log(JSON.stringify({ note: "cleanup_in_finally" }));
    } else {
      console.log(JSON.stringify({ note: "keep_flag_set_skip_cleanup" }));
    }
  } catch (error) {
    exitCode = 1;
    console.error(JSON.stringify({
      live: "FAILED",
      step: (error as { step?: string })?.step ?? "unknown",
      message: error instanceof Error ? error.message : String(error),
      steps,
    }, null, 2));
  } finally {
    if (!keep) {
      const cleanupFailures = await cleanup();
      if (cleanupFailures.length) {
        console.error(JSON.stringify({ cleanupFailed: true, failures: cleanupFailures, cleanupLog }, null, 2));
        exitCode = exitCode || 1;
      } else {
        console.log(JSON.stringify({ cleanupFailed: false, cleanupLog }, null, 2));
      }
    }
    process.exit(exitCode);
  }
})();
