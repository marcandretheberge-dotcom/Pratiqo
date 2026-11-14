import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { createCommunityCallService } from "../../lib/cafe/communityCallProvider";
import { isCafeCommunityEnabled } from "../../lib/cafe/communityFeatureFlag";
import { createCafeCommunityHandlers, type CafeCommunityRpcReply } from "../../lib/cafe/communityServer";
import { isCafeRoomProviderEnabled } from "../../lib/cafe/roomFeatureFlag";
import type { CafeRoomProvider } from "../../lib/cafe/roomProvider";
import type {
  CafeCommunityCallJoin,
  CafeCommunityCommandResult,
  CafeCommunityFailure,
  CafeCommunitySnapshot,
  CafeModerationReport,
} from "../../lib/cafe/communityTypes";

const ADMIN = "00000000-0000-4000-8000-000000000001";
const OWNER = "00000000-0000-4000-8000-000000000002";
const PEER = "00000000-0000-4000-8000-000000000003";
const OUTSIDER = "00000000-0000-4000-8000-000000000004";
const ORIGIN = "https://pratiqo.example";
const JOIN_TOKEN = "synthetic-daily-token-not-a-real-credential";
const PRIVATE_FIELDS = new Set([
  "email", "role", "accessToken", "provider", "providerRoomId", "cleanupCallIds",
  "fromId", "toId", "generation", "completed_at", "rules_version", "adult_attested_at",
  "rules_accepted_at", "p_actor_id", "p_payload",
]);

function assertPublicProjection(value: unknown, credentials = false): void {
  if (Array.isArray(value)) {
    for (const item of value) assertPublicProjection(item, credentials);
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      assert.equal(PRIVATE_FIELDS.has(key), false, `Unexpected private field: ${key}`);
      if (!credentials) assert.ok(key !== "token" && key !== "roomUrl", `Unexpected provider credential: ${key}`);
      assertPublicProjection(item, credentials);
    }
  }
}

async function publicJson<T>(response: Response, status = 200, credentials = false): Promise<T> {
  const value: unknown = await response.json();
  assert.equal(response.status, status, JSON.stringify(value));
  assert.equal(response.headers.get("Cache-Control"), "private, no-store, max-age=0");
  assert.equal(response.headers.get("Pragma"), "no-cache");
  assert.equal(response.headers.get("Vary"), "Authorization, Cookie");
  assertPublicProjection(value, credentials);
  assert.doesNotMatch(JSON.stringify(value), /(?:admin|host|u1|u2)@example\.test/);
  return value as T;
}

function request(actorId: string, payload?: unknown, pathname = "/api/cafe/community", method?: string): Request {
  return new Request(`${ORIGIN}${pathname}`, {
    method: method ?? (payload === undefined ? "GET" : "POST"),
    headers: {
      Authorization: `Bearer fixture-session-${actorId}`,
      Origin: ORIGIN,
      ...(payload === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
}

test("real Café migrations and RPCs pass through authenticated API projections from text chat through moderation", { timeout: 60_000 }, async () => {
  const db = new PGlite();
  const flags = ["CAFE_V1_ENABLED", "CAFE_COMMUNITY_ENABLED", "CAFE_ROOM_PROVIDER_ENABLED"] as const;
  const previousFlags = flags.map(key => [key, process.env[key]] as const);
  for (const key of flags) process.env[key] = "true";
  const rpcReplies: Array<{ name: string; args: Record<string, unknown>; data: unknown }> = [];
  const rpcErrors: string[] = [];
  const diagnostics: Array<{ operation: string; code?: string }> = [];
  const providerEvents: Array<{ action: string; input: unknown }> = [];
  const limits: Array<{ actorId: string; operation: string }> = [];
  let failCleanup = true;

  // Requests run sequentially, so SET ROLE stays scoped to this one service invocation.
  const rpc = async (name: string, args: Record<string, unknown>): Promise<CafeCommunityRpcReply> => {
    assert.match(name, /^cafe_community_[a-z_]+_server$/);
    const fields = Object.entries(args);
    for (const [field] of fields) assert.match(field, /^p_[a-z_]+$/);
    const values = fields.map(([, value]) => value && typeof value === "object" ? JSON.stringify(value) : value);
    await db.exec("SET ROLE service_role");
    try {
      const result = await db.query<{ result: unknown }>(
        `SELECT public.${name}(${fields.map(([field], index) => `${field} => $${index + 1}`).join(",")}) AS result`,
        values,
      );
      const data = result.rows[0].result;
      rpcReplies.push({ name, args, data });
      return { data, error: null };
    } catch (error) {
      const code = (error as { code?: unknown }).code;
      rpcErrors.push(typeof code === "string" ? code : "unknown");
      return { data: null, error: { code: typeof code === "string" ? code : undefined } };
    } finally {
      await db.exec("RESET ROLE");
    }
  };

  const provider: CafeRoomProvider = {
    provider: "daily",
    deterministicRoomId: callId => `community-${callId}`,
    opaqueParticipantId: (callId, actorId) => `participant-${callId}-${actorId}`,
    async ensureRoom(input) {
      providerEvents.push({ action: "ensure", input });
      const roomId = `community-${input.sessionId}`;
      return { provider: "daily", roomId, roomUrl: `https://integration.daily.co/${roomId}` };
    },
    async createToken(input) {
      providerEvents.push({ action: "token", input });
      return { token: JOIN_TOKEN, expiresAt: new Date(input.exp * 1_000).toISOString() };
    },
    async removeParticipant(input) {
      providerEvents.push({ action: "eject", input });
      if (failCleanup) throw new Error("Synthetic provider teardown failure");
    },
    async deleteRoom(input) {
      providerEvents.push({ action: "delete", input });
      if (failCleanup) throw new Error("Synthetic provider teardown failure");
    },
  };
  const calls = createCommunityCallService({
    rpc,
    enabled: () => isCafeCommunityEnabled() && isCafeRoomProviderEnabled(),
    provider: () => provider,
  });
  const accounts = new Set([ADMIN, OWNER, PEER, OUTSIDER]);
  const handlers = createCafeCommunityHandlers({
    enabled: isCafeCommunityEnabled,
    videoEnabled: isCafeRoomProviderEnabled,
    authenticate: async input => {
      const match = /^Bearer fixture-session-(.+)$/.exec(input.headers.get("authorization") ?? "");
      const id = match?.[1];
      return id && accounts.has(id)
        ? { ok: true, id, email: "verified-private-account@example.test" }
        : { ok: false, status: 401, error: "unauthorized" };
    },
    limit: async (_request, actorId, operation) => { limits.push({ actorId, operation }); return null; },
    rpc,
    joinCall: calls.joinCommunityCall,
    cleanupCalls: calls.cleanupCommunityCalls,
    onError: (operation, code) => { diagnostics.push({ operation, code }); },
  });
  const command = (actorId: string, payload: unknown, status = 200) =>
    handlers.command(request(actorId, payload)).then(response => publicJson<CafeCommunityCommandResult>(response, status));
  const view = (actorId: string, roomId?: string, status = 200) =>
    handlers.snapshot(request(actorId, undefined, `/api/cafe/community${roomId ? `?roomId=${roomId}` : ""}`))
      .then(response => publicJson<CafeCommunitySnapshot | CafeCommunityFailure>(response, status));
  const status = (actorId: string, callId: string, expectedStatus = 200) =>
    handlers.callStatus(request(actorId, undefined, `/api/cafe/community/calls/${callId}`), callId)
      .then(response => publicJson<{ ok: true; callId: string; roomId: string; endsAt: string } | CafeCommunityFailure>(response, expectedStatus));

  try {
    const setup = readFileSync("tests/cafe/sql/setup.sql", "utf8")
      .replace(/^\\.*$/gm, "").replace(/^CREATE EXTENSION IF NOT EXISTS pgcrypto;$/m, "");
    await db.exec(setup);
    await db.exec(`ALTER ROLE service_role BYPASSRLS;
      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;`);
    const directory = path.join(process.cwd(), "supabase/migrations");
    const migrations = readdirSync(directory).filter(name => /^\d+_cafe_.*\.sql$/.test(name)).sort();
    assert.equal(migrations.length, 5, "This integration must exercise the complete Café migration chain");
    for (const migration of migrations) await db.exec(readFileSync(path.join(directory, migration), "utf8"));

    assert.deepEqual(await view(randomUUID(), undefined, 401), { ok: false, code: "unauthorized" });
    assert.equal(rpcReplies.length, 0, "Failed identity verification never reaches PostgreSQL");
    const onboarding = await view(OWNER);
    assert.equal(onboarding.ok, true);
    if (!onboarding.ok) throw new Error("Expected onboarding snapshot");
    assert.equal(onboarding.me, null);
    assert.deepEqual(onboarding.people, []);

    for (const [actorId, displayName, nativeLanguages, learningLanguages] of [
      [OWNER, "Camille", ["FR"], ["ja", "AR"]],
      [PEER, "Nour", ["AR"], ["JA", "fr"]],
      [OUTSIDER, "Rui", ["PT-br"], ["sw"]],
    ] as const) {
      assert.deepEqual(await command(actorId, {
        action: "profile.save", displayName, nativeLanguages, learningLanguages,
        adultAgreement: true, rulesAgreement: true, actorId: ADMIN, role: "admin",
      }), { ok: true });
    }
    const ownerProfile = await view(OWNER);
    assert.ok(ownerProfile.ok && ownerProfile.me);
    assert.deepEqual(ownerProfile.me, { id: OWNER, displayName: "Camille", nativeLanguages: ["fr"], learningLanguages: ["ar", "ja"] });

    const created = await command(OWNER, {
      action: "room.create", requestId: randomUUID(), title: "Morning language exchange",
      languages: ["fr", "ar", "ja"], mode: "now", capacity: 2,
    });
    assert.ok(created.ok && created.roomId);
    const roomId = created.roomId;
    assert.deepEqual(created, { ok: true, roomId });
    assert.deepEqual(await view(OUTSIDER, roomId, 403), { ok: false, code: "room_access_denied" });
    assert.deepEqual(await command(OUTSIDER, { action: "room.join", roomId: randomUUID() }, 404), { ok: false, code: "room_not_found" });
    assert.deepEqual(await command(PEER, { action: "room.join", roomId }), { ok: true });
    assert.deepEqual(await command(OUTSIDER, { action: "room.join", roomId }, 409), { ok: false, code: "capacity_full" });

    for (const body of ["Selected evidence from this conversation", "Unselected conversation context"]) {
      assert.deepEqual(await command(PEER, { action: "message.send", roomId, requestId: randomUUID(), body }), { ok: true });
    }
    const conversation = await view(OWNER, roomId);
    assert.ok(conversation.ok && conversation.room);
    assert.equal(conversation.room.state, "live");
    assert.deepEqual(conversation.room.participants.map(person => person.id), [OWNER, PEER]);
    assert.deepEqual(conversation.room.messages.map(message => message.body), ["Selected evidence from this conversation", "Unselected conversation context"]);
    const selectedMessage = conversation.room.messages[0];
    assert.equal(selectedMessage.sender.displayName, "Nour");
    assert.deepEqual(Object.keys(selectedMessage.sender).sort(), ["displayName", "id", "learningLanguages", "nativeLanguages"]);
    assert.equal(providerEvents.length, 0, "Text conversations do not instantiate or invoke Daily");

    const invitation = await command(OWNER, { action: "call.invite", roomId, targetId: PEER, requestId: randomUUID() });
    assert.ok(invitation.ok && invitation.callId);
    const callId = invitation.callId;
    assert.deepEqual(await status(OWNER, callId, 403), { ok: false, code: "call_access_denied" });
    assert.deepEqual(await command(OWNER, { action: "call.respond", callId, accept: true }, 403), { ok: false, code: "call_access_denied" });
    assert.deepEqual(await command(PEER, { action: "call.respond", callId, accept: true }), { ok: true, callId });
    const accepted = await status(OWNER, callId);
    assert.ok(accepted.ok);
    assert.deepEqual(Object.keys(accepted).sort(), ["callId", "endsAt", "ok", "roomId"]);
    assert.equal(accepted.roomId, roomId);
    assert.ok(Date.parse(accepted.endsAt) > Date.now());
    assert.deepEqual(await status(OUTSIDER, callId, 403), { ok: false, code: "call_access_denied" });

    const joined = await publicJson<CafeCommunityCallJoin>(await handlers.callJoin(
      request(OWNER, undefined, `/api/cafe/community/calls/${callId}/join`, "POST"), callId,
    ), 200, true);
    assert.ok(joined.ok);
    assert.deepEqual(Object.keys(joined).sort(), ["endsAt", "expiresAt", "ok", "roomUrl", "token"]);
    assert.equal(joined.token, JOIN_TOKEN);
    assert.equal(joined.endsAt, accepted.endsAt);
    assert.equal(providerEvents.filter(event => event.action === "ensure").length, 1);
    assert.equal(providerEvents.filter(event => event.action === "token").length, 1);

    assert.deepEqual(await command(OWNER, { action: "member.block", targetId: PEER }), { ok: true, cleanupPending: true });
    const rawBlock = rpcReplies.find(reply => reply.args.p_action === "member.block")?.data as { cleanupCallIds?: string[] };
    assert.ok(rawBlock.cleanupCallIds?.includes(callId), "Actual SQL emitted a private cleanup obligation that HTTP removed");
    assert.deepEqual(await status(OWNER, callId, 403), { ok: false, code: "call_access_denied" });
    assert.deepEqual(await status(PEER, callId, 403), { ok: false, code: "call_access_denied" });
    assert.deepEqual(await view(PEER, roomId, 403), { ok: false, code: "room_access_denied" });
    assert.deepEqual(await command(PEER, { action: "room.join", roomId }, 403), { ok: false, code: "room_access_denied" });
    const blockedView = await view(OWNER, roomId);
    assert.ok(blockedView.ok && blockedView.room);
    assert.deepEqual(blockedView.room.messages, []);
    assert.equal(blockedView.blockedMembers[0].id, PEER);

    const submitted = await command(OWNER, {
      action: "report.submit", targetId: PEER, roomId, callId,
      reason: "sexual_harassment", messageIds: [selectedMessage.id], details: "Synthetic report submitted after the block.",
    });
    assert.ok(submitted.ok && submitted.reportId);
    const reportId = submitted.reportId;
    assert.deepEqual(Object.keys(submitted).sort(), ["cleanupPending", "ok", "reportId"]);
    assert.deepEqual(await publicJson(await handlers.reports(request(OWNER)), 403), { ok: false, code: "access_denied" });
    assert.deepEqual(await publicJson(await handlers.reviewReport(request(OWNER, { action: "review", reportId, role: "admin", actorId: ADMIN })), 403), { ok: false, code: "access_denied" });

    const queue = await publicJson<{ ok: true; reports: CafeModerationReport[] }>(await handlers.reports(request(ADMIN)));
    assert.equal(queue.reports.length, 1);
    const report = queue.reports[0];
    assert.equal(report.id, reportId);
    assert.equal(report.status, "open");
    assert.equal(report.reporter.id, OWNER);
    assert.equal(report.target.id, PEER);
    assert.deepEqual(report.messages, [{ id: selectedMessage.id, senderId: PEER, body: selectedMessage.body, createdAt: selectedMessage.createdAt }]);
    assert.doesNotMatch(JSON.stringify(queue), /Unselected conversation context/);
    assert.deepEqual(await publicJson(await handlers.reviewReport(request(ADMIN, { action: "review", reportId }))), { ok: true });
    const reviewed = await publicJson<{ ok: true; reports: CafeModerationReport[] }>(await handlers.reports(request(ADMIN)));
    assert.equal(reviewed.reports[0].status, "reviewed");

    // The real adapter/RPC boundary retries the failed provider work and acknowledges its generation.
    failCleanup = false;
    assert.deepEqual(await command(OWNER, { action: "presence.heartbeat", presenceSessionId: randomUUID(), roomId }), { ok: true });
    assert.deepEqual((await rpc("cafe_community_cleanup_pending_server", { p_actor_id: OWNER })).data, []);
    assert.ok(providerEvents.some(event => event.action === "eject"));
    assert.ok(providerEvents.some(event => event.action === "delete"));
    assert.ok(limits.some(limit => limit.actorId === OWNER && limit.operation === "snapshot"));
    assert.ok(limits.some(limit => limit.actorId === ADMIN && limit.operation === "report.review"));
    assert.deepEqual(rpcErrors, []);
    assert.deepEqual(diagnostics, []);
  } finally {
    await db.close();
    for (const [key, value] of previousFlags) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
