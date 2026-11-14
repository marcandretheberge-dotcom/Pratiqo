/**
 * Real two-account community API acceptance against the isolated local sandbox.
 * Uses authenticated bearer tokens (not fixture transport). Video remains gated off.
 *
 * Prerequisites:
 *   - local sandbox Auth/DB with community migrations applied
 *   - .env.cafe-community-local
 *   - artifacts/cafe-community-live/two-accounts.json from provision-two-accounts.mjs
 *   - Next listening with CAFE_V1_ENABLED + CAFE_COMMUNITY_ENABLED (no production flags)
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

type Account = {
  alias: string;
  email: string;
  displayName: string;
  userId: string;
  accessToken: string;
};

function loadEnv(path: string) {
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv(".env.cafe-community-local");
const base = (process.env.CAFE_COMMUNITY_APP_BASE || env.CAFE_COMMUNITY_APP_BASE || "http://127.0.0.1:3475").replace(/\/$/, "");
const outDir = join("artifacts", "cafe-community-live");
mkdirSync(outDir, { recursive: true });
const accounts = (JSON.parse(readFileSync(join(outDir, "two-accounts.json"), "utf8")) as { accounts: Account[] }).accounts;
assert.equal(accounts.length, 2);

const origin = base;
const steps: Array<{ name: string; ok: boolean; detail?: string }> = [];

async function api(account: Account, path: string, init?: RequestInit) {
  // Omit Origin: bearer CLI requests are same-origin exempt when Origin is absent.
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

function record(name: string, ok: boolean, detail?: string) {
  steps.push({ name, ok, detail });
  if (!ok) throw new Error(`${name}: ${detail ?? "failed"}`);
}

async function snapshot(account: Account, roomId?: string | null) {
  const query = roomId ? `?roomId=${encodeURIComponent(roomId)}` : "";
  return api(account, `/api/cafe/community${query}`);
}

async function command(account: Account, body: Record<string, unknown>) {
  return api(account, "/api/cafe/community", { method: "POST", body: JSON.stringify(body) });
}

void (async () => {
  const [a, b] = accounts as [Account, Account];
  const italian = "it";

  for (const account of [a, b]) {
    const save = await command(account, {
      action: "profile.save",
      displayName: account.displayName,
      nativeLanguages: account.alias === "A" ? ["fr"] : ["es"],
      learningLanguages: [italian],
      adultAgreement: true,
      rulesAgreement: true,
    });
    record(`profile.save.${account.alias}`, save.response.status === 200 && save.json.ok === true, JSON.stringify(save.json));
  }

  // Clear leftover memberships/blocks from prior acceptance runs.
  for (const account of [a, b]) {
    const prior = await snapshot(account);
    for (const blocked of prior.json.blockedMembers ?? []) {
      await command(account, { action: "member.unblock", targetId: blocked.id });
    }
    for (const room of prior.json.rooms ?? []) {
      const action = room.creator?.id === account.userId ? "room.end" : "room.leave";
      await command(account, { action, roomId: room.id });
    }
    if (prior.json.room?.id) {
      const action = prior.json.room.creator?.id === account.userId ? "room.end" : "room.leave";
      await command(account, { action, roomId: prior.json.room.id });
    }
  }
  record("cleanup.prior.rooms", true);

  const presenceA = await command(a, { action: "presence.heartbeat", presenceSessionId: randomUUID(), roomId: null });
  const presenceB = await command(b, { action: "presence.heartbeat", presenceSessionId: randomUUID(), roomId: null });
  record("presence.heartbeat.A", presenceA.response.status === 200 && presenceA.json.ok === true, JSON.stringify(presenceA.json));
  record("presence.heartbeat.B", presenceB.response.status === 200 && presenceB.json.ok === true, JSON.stringify(presenceB.json));

  const snapA = await snapshot(a);
  const snapB = await snapshot(b);
  const aSeesB = (snapA.json.people ?? []).some((person: { id: string; online?: boolean }) => person.id === b.userId && person.online);
  const bSeesA = (snapB.json.people ?? []).some((person: { id: string; online?: boolean }) => person.id === a.userId && person.online);
  record("presence.visible.cross", aSeesB && bSeesA, JSON.stringify({ aSeesB, bSeesA, peopleA: snapA.json.people, peopleB: snapB.json.people }));

  const create = await command(a, {
    action: "room.create",
    requestId: randomUUID(),
    title: "Italiano · prova a due",
    languages: [italian],
    mode: "now",
    capacity: 4,
    startsAt: null,
  });
  const roomId = typeof create.json.roomId === "string" ? create.json.roomId : "";
  record("room.create.A", create.response.status === 200 && create.json.ok === true && Boolean(roomId), JSON.stringify(create.json));

  const joined = await command(b, { action: "room.join", roomId });
  record("room.join.B", joined.response.status === 200 && joined.json.ok === true, JSON.stringify(joined.json));

  const msgA = "Ciao! Scrivo davvero dal Café.";
  const msgB = "Ciao Léa — messaggio persistito.";
  const sendA = await command(a, { action: "message.send", roomId, body: msgA, requestId: randomUUID() });
  const sendB = await command(b, { action: "message.send", roomId, body: msgB, requestId: randomUUID() });
  record("message.send.A", sendA.response.status === 200 && sendA.json.ok === true, JSON.stringify(sendA.json));
  record("message.send.B", sendB.response.status === 200 && sendB.json.ok === true, JSON.stringify(sendB.json));

  const roomA = await snapshot(a, roomId);
  const roomB = await snapshot(b, roomId);
  const bodiesA = (roomA.json.room?.messages ?? []).map((message: { body: string }) => message.body);
  const bodiesB = (roomB.json.room?.messages ?? []).map((message: { body: string }) => message.body);
  record("message.persist.both", bodiesA.includes(msgA) && bodiesA.includes(msgB) && bodiesB.includes(msgA) && bodiesB.includes(msgB), JSON.stringify({ bodiesA, bodiesB }));

  // Leave the group room before opening a capacity-2 salon (one membership at a time).
  await command(b, { action: "room.leave", roomId });
  await command(a, { action: "room.end", roomId });

  const pair = await command(a, {
    action: "room.create",
    requestId: randomUUID(),
    title: "À deux · italiano",
    languages: [italian],
    mode: "now",
    capacity: 2,
    startsAt: null,
  });
  const pairId = typeof pair.json.roomId === "string" ? pair.json.roomId : "";
  record("pair.room.create", pair.response.status === 200 && pair.json.ok === true && Boolean(pairId), JSON.stringify(pair.json));
  const pairJoin = await command(b, { action: "room.join", roomId: pairId });
  record("pair.room.join", pairJoin.response.status === 200 && pairJoin.json.ok === true, JSON.stringify(pairJoin.json));

  // Video remains gated: invite/accept/join must stay opaque until CAFE_ROOM_PROVIDER_ENABLED.
  const inviteGated = await command(a, { action: "call.invite", roomId: pairId, targetId: b.userId, requestId: randomUUID() });
  record("call.invite.gated", inviteGated.response.status === 404 && inviteGated.json.code === "not_found", JSON.stringify({ status: inviteGated.response.status, body: inviteGated.json }));
  const joinGated = await api(a, `/api/cafe/community/calls/${encodeURIComponent(randomUUID())}/join`, { method: "POST", body: "{}" });
  record("call.join.gated", joinGated.response.status >= 400, JSON.stringify({ status: joinGated.response.status, body: joinGated.json }));

  // Private text conversation = capacity-2 room; messages stay member-scoped.
  const privateMsg = "Privato: solo noi due.";
  const privateSend = await command(a, { action: "message.send", roomId: pairId, body: privateMsg, requestId: randomUUID() });
  record("private.message.send", privateSend.response.status === 200 && privateSend.json.ok === true, JSON.stringify(privateSend.json));
  const pairSnapB = await snapshot(b, pairId);
  const lobbyA = await snapshot(a);
  record("private.message.member", (pairSnapB.json.room?.messages ?? []).some((message: { body: string }) => message.body === privateMsg), JSON.stringify(pairSnapB.json.room?.messages ?? []));
  record("private.message.not.on.public.lobby", !(lobbyA.json.rooms ?? []).some((room: { id: string; messages?: unknown }) => room.id === pairId && Array.isArray((room as { messages?: unknown[] }).messages)), "lobby rooms must not include message bodies");

  // Reload preservation while both remain members of the pair room.
  const reload = await snapshot(a, pairId);
  record("reload.history.owner", reload.response.status === 200 && (reload.json.room?.messages ?? []).some((message: { body: string }) => message.body === privateMsg), JSON.stringify({ status: reload.response.status, count: reload.json.room?.messages?.length ?? null }));

  const report = await command(a, {
    action: "report.submit",
    targetId: b.userId,
    roomId: pairId,
    reason: "other",
    messageIds: [],
    details: "local acceptance probe — ignore",
  });
  record("report.submit", report.response.status === 200 && report.json.ok === true && typeof report.json.reportId === "string", JSON.stringify(report.json));

  const block = await command(a, { action: "member.block", targetId: b.userId });
  record("member.block", block.response.status === 200 && block.json.ok === true, JSON.stringify(block.json));
  const inviteBlocked = await command(a, { action: "call.invite", roomId: pairId, targetId: b.userId, requestId: randomUUID() });
  record("block.stops.invite", inviteBlocked.response.status >= 400 || inviteBlocked.json.ok === false, JSON.stringify({ status: inviteBlocked.response.status, body: inviteBlocked.json }));
  const rejoinBlocked = await command(b, { action: "room.join", roomId: pairId });
  record("block.stops.join", rejoinBlocked.response.status >= 400 || rejoinBlocked.json.ok === false, JSON.stringify({ status: rejoinBlocked.response.status, body: rejoinBlocked.json }));

  const leavePresence = await command(b, { action: "presence.leave", presenceSessionId: randomUUID() });
  record("presence.leave.B", leavePresence.response.status === 200 && leavePresence.json.ok === true, JSON.stringify(leavePresence.json));
  await command(a, { action: "presence.heartbeat", presenceSessionId: randomUUID(), roomId: null });
  const afterLeave = await snapshot(a);
  const bOnline = (afterLeave.json.people ?? []).some((person: { id: string; online?: boolean }) => person.id === b.userId && person.online);
  record("presence.disconnect.observed", bOnline === false, JSON.stringify(afterLeave.json.people ?? []));

  const reportPath = join(outDir, "two-account-api-report.json");
  writeFileSync(reportPath, JSON.stringify({
    kind: "cafe_community_two_account_api",
    ok: steps.every((step) => step.ok),
    base,
    videoEnabled: false,
    notProduction: true,
    accounts: accounts.map(({ alias, email, userId }) => ({ alias, email, userId })),
    steps,
    createdAt: new Date().toISOString(),
  }, null, 2));
  console.log(JSON.stringify({ ok: true, steps: steps.length, reportPath }, null, 2));
})().catch((error) => {
  writeFileSync(join(outDir, "two-account-api-report.json"), JSON.stringify({
    kind: "cafe_community_two_account_api",
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    steps,
    createdAt: new Date().toISOString(),
  }, null, 2));
  console.error(error);
  process.exitCode = 1;
});
