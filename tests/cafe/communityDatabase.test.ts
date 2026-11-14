import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import type { CafeCommunitySnapshot, CafeModerationReport } from "../../lib/cafe/communityTypes";

// The shipped SQL runs in PostgreSQL WASM, with synthetic accounts and real
// permissions. Network providers, browser claims and query builders are not mocked.
// Native PostgreSQL concurrency still belongs to the CI database job.
const db = new PGlite();
const root = process.cwd();
const actor = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
const admin = actor(1), owner = actor(2), alice = actor(3), bob = actor(4), carol = actor(5), dora = actor(6), erin = actor(7);
type Decision = { ok: boolean; code?: string; roomId?: string; callId?: string; reportId?: string; cleanupCallIds?: string[] };
type Cleanup = { callId: string; fromId: string; toId: string; generation: number };
let checks = 0;

async function rpc<T = Decision>(name: string, values: unknown[] = []): Promise<T> {
  assert.match(name, /^cafe_community_[a-z_]+_server$/);
  await db.exec("SET ROLE service_role");
  try {
    const result = await db.query<{ result: T }>(`SELECT public.${name}(${values.map((_, i) => `$${i + 1}`).join(",")}) AS result`, values);
    return result.rows[0].result;
  } finally { await db.exec("RESET ROLE").catch(() => undefined); }
}
const command = (id: string, action: string, payload: Record<string, unknown> = {}) =>
  rpc("cafe_community_command_server", [id, action, JSON.stringify(payload)]);
async function saved(id: string, overrides: Record<string, unknown> = {}) {
  const result = await command(id, "profile.save", {
    displayName: `Member ${id.slice(-1)}`, nativeLanguages: ["fr"], learningLanguages: ["ja"],
    adultAgreement: true, rulesAgreement: true, ...overrides,
  });
  assert.equal(result.ok, true, JSON.stringify(result));
}
async function ready(...ids: string[]) { for (const id of ids) await saved(id); }
async function view(id: string, roomId: string | null = null): Promise<CafeCommunitySnapshot> {
  const result = await rpc<CafeCommunitySnapshot | Decision>("cafe_community_snapshot_server", [id, roomId]);
  assert.equal(result.ok, true, JSON.stringify(result));
  return result as CafeCommunitySnapshot;
}
async function success(id: string, action: string, payload: Record<string, unknown> = {}) {
  const result = await command(id, action, payload);
  assert.equal(result.ok, true, JSON.stringify(result));
  return result;
}
async function fail(id: string, action: string, payload: Record<string, unknown>, code: string) {
  assert.deepEqual(await command(id, action, payload), { ok: false, code });
}
async function room(id: string, overrides: Record<string, unknown> = {}) {
  const result = await success(id, "room.create", {
    requestId: randomUUID(), title: "A conversation", languages: ["fr", "ja"], mode: "now", capacity: 4, ...overrides,
  });
  assert.ok(result.roomId);
  return result.roomId;
}
async function joined(roomId: string, ...ids: string[]) {
  for (const id of ids) await success(id, "room.join", { roomId });
}
async function message(id: string, roomId: string, body: string) {
  const requestId = randomUUID();
  await success(id, "message.send", { roomId, body, requestId });
  return (await db.query<{ id: string }>("SELECT id FROM cafe_private.community_messages WHERE request_id=$1", [requestId])).rows[0].id;
}
async function invite(roomId: string, from = owner, to = alice) {
  const result = await success(from, "call.invite", { roomId, targetId: to, requestId: randomUUID() });
  assert.ok(result.callId);
  return result.callId;
}
async function callAuth(id: string, callId: string) { return rpc<Decision & Record<string, unknown>>("cafe_community_authorize_call_server", [id, callId]); }
async function denied(role: string, sql: string) {
  await db.exec("SAVEPOINT permission_check");
  await db.exec(`SET ROLE ${role}`);
  try { await assert.rejects(db.query(sql), (error: unknown) => (error as { code: string }).code === "42501"); }
  finally { await db.exec("ROLLBACK TO SAVEPOINT permission_check; RESET ROLE; RELEASE SAVEPOINT permission_check"); }
}
async function check(name: string, test: () => Promise<void>) {
  await db.exec("BEGIN");
  try { await test(); checks++; console.log(`PASS ${name}`); }
  finally { await db.exec("ROLLBACK; RESET ROLE"); }
}

async function main() {
  const setup = readFileSync(path.join(root, "tests/cafe/sql/setup.sql"), "utf8")
    .replace(/^\\.*$/gm, "").replace(/^CREATE EXTENSION IF NOT EXISTS pgcrypto;$/m, "");
  await db.exec(setup);
  await db.exec(`ALTER ROLE service_role BYPASSRLS;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;`);
  const migrationNames = readdirSync(path.join(root, "supabase/migrations"))
    .filter(name => /^\d+_cafe_.*\.sql$/.test(name)).sort();
  assert.equal(migrationNames.length, 5, "Update the real migration chain deliberately when adding Café migrations");
  for (const name of migrationNames) {
    await db.exec(readFileSync(path.join(root, "supabase/migrations", name), "utf8"));
  }
  console.log("PASS applied all five unmodified Café migrations to PostgreSQL");
  await db.exec(readFileSync(path.join(root, "tests/cafe/sql/community.sql"), "utf8").replace(/^\\.*$/gm, ""));
  console.log("PASS native PostgreSQL-compatible community SQL smoke fixture");

  await check("every community table is private and every public RPC is service-only", async () => {
    const tables = (await db.query<{ name: string; rls: boolean }>(`SELECT relname AS name,relrowsecurity AS rls FROM pg_class
      WHERE relnamespace='cafe_private'::regnamespace AND relkind='r' AND relname LIKE 'community_%'`)).rows;
    assert.equal(tables.length, 11);
    assert.ok(tables.every(table => table.rls));
    for (const table of tables) for (const role of ["anon", "authenticated", "service_role"]) {
      assert.equal((await db.query<{ allowed: boolean }>("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') AS allowed", [role, `cafe_private.${table.name}`])).rows[0].allowed, false);
    }
    const functions = (await db.query<{ signature: string }>(`SELECT p.oid::regprocedure::text AS signature FROM pg_proc p
      WHERE pronamespace='public'::regnamespace AND proname LIKE 'cafe_community_%'`)).rows;
    assert.equal(functions.length, 8);
    for (const fn of functions) for (const role of ["anon", "authenticated", "service_role"]) {
      assert.equal((await db.query<{ allowed: boolean }>("SELECT has_function_privilege($1,$2,'EXECUTE') AS allowed", [role, fn.signature])).rows[0].allowed, role === "service_role");
    }
    const directCalls = [
      `SELECT public.cafe_community_snapshot_server('${owner}')`,
      `SELECT public.cafe_community_command_server('${owner}','profile.save','{}')`,
      `SELECT public.cafe_community_authorize_call_server('${owner}','${randomUUID()}')`,
      "SELECT public.cafe_community_cleanup_pending_server(NULL)",
      `SELECT public.cafe_community_cleanup_done_server('${randomUUID()}',1)`,
      `SELECT public.cafe_community_cleanup_requeue_server('${randomUUID()}')`,
      `SELECT public.cafe_community_reports_server('${admin}')`,
      `SELECT public.cafe_community_review_report_server('${admin}','${randomUUID()}')`,
    ];
    for (const role of ["anon", "authenticated"]) for (const sql of directCalls) await denied(role, sql);
    await db.exec("GRANT USAGE ON SCHEMA cafe_private TO anon,authenticated,service_role");
    for (const role of ["anon", "authenticated", "service_role"]) {
      await denied(role, "SELECT * FROM cafe_private.community_messages");
      await denied(role, "SELECT cafe_private.community_lock()");
    }
  });
  await check("onboarding is private, explicit and independent of the course language catalogue", async () => {
    const initial = await view(owner);
    assert.equal(initial.me, null);
    assert.deepEqual(initial.people, []);
    await fail(owner, "presence.heartbeat", { presenceSessionId: randomUUID() }, "profile_required");
    await fail(owner, "profile.save", { displayName: "A", nativeLanguages: ["fr"], learningLanguages: ["ja"], adultAgreement: false, rulesAgreement: true }, "invalid_request");
    await saved(owner, { displayName: "  Camille  ", nativeLanguages: ["FR", "fr"], learningLanguages: ["cmn", "PT-br", "sw", "iu"] });
    assert.deepEqual((await view(owner)).me, { id: owner, displayName: "Camille", nativeLanguages: ["fr"], learningLanguages: ["cmn", "iu", "pt-br", "sw"] });
    await fail(owner, "profile.save", { displayName: "A", nativeLanguages: "fr", learningLanguages: ["ja"], adultAgreement: true, rulesAgreement: true }, "invalid_request");
    await fail(owner, "profile.save", { displayName: "A", nativeLanguages: ["french"], learningLanguages: ["ja"], adultAgreement: true, rulesAgreement: true }, "invalid_request");
    const table = (await db.query<{ rules_version: string; adult_attested_at: Date; rules_accepted_at: Date }>("SELECT * FROM cafe_private.community_members WHERE profile_id=$1", [owner])).rows[0];
    assert.equal(table.rules_version, "cafe-community-adults-v1");
    assert.ok(table.adult_attested_at && table.rules_accepted_at);
  });
  await check("inactive, anonymous, banned and deleting accounts cannot enter or mutate", async () => {
    await ready(owner, alice, bob, carol);
    await db.query("UPDATE public.profiles SET is_active=false WHERE id=$1", [owner]);
    await db.query("UPDATE auth.users SET is_anonymous=true WHERE id=$1", [alice]);
    await db.query("UPDATE auth.users SET banned_until=clock_timestamp()+interval '1 hour' WHERE id=$1", [bob]);
    await db.query("UPDATE public.profiles SET deletion_requested_at=clock_timestamp() WHERE id=$1", [carol]);
    for (const id of [owner, alice, bob, carol]) {
      assert.deepEqual(await rpc("cafe_community_snapshot_server", [id, null]), { ok: false, code: "access_denied" });
      await fail(id, "presence.heartbeat", { presenceSessionId: randomUUID() }, "access_denied");
    }
  });
  await check("per-tab presence deduplicates people, closing one tab preserves another and stale leases disappear without writes", async () => {
    await ready(owner, alice);
    const first = randomUUID(), second = randomUUID();
    await success(owner, "presence.heartbeat", { presenceSessionId: first });
    await success(owner, "presence.heartbeat", { presenceSessionId: second });
    assert.equal((await view(alice)).people.length, 1);
    await success(alice, "presence.leave", { presenceSessionId: first });
    assert.equal((await db.query<{ n: number }>("SELECT count(*)::int AS n FROM cafe_private.community_presence WHERE profile_id=$1", [owner])).rows[0].n, 2);
    await success(owner, "presence.leave", { presenceSessionId: first });
    assert.equal((await view(alice)).people[0].online, true);
    await db.query("UPDATE cafe_private.community_presence SET last_seen_at=clock_timestamp()-interval '91 seconds' WHERE profile_id=$1", [owner]);
    assert.deepEqual((await view(alice)).people, []);
    assert.equal((await db.query<{ n: number }>("SELECT count(*)::int AS n FROM cafe_private.community_presence WHERE profile_id=$1", [owner])).rows[0].n, 1);
  });
  await check("room creation is idempotent, counts the creator and enforces capacity plus one active room", async () => {
    await ready(owner, alice, bob, carol);
    const requestId = randomUUID();
    const roomId = await room(owner, { capacity: 2, requestId });
    assert.equal(await room(owner, { capacity: 2, requestId }), roomId);
    assert.equal((await view(owner, roomId)).room?.state, "waiting");
    await joined(roomId, alice);
    const live = (await view(owner, roomId)).room!;
    assert.equal(live.state, "live");
    assert.deepEqual(live.participants.map(person => person.id), [owner, alice]);
    await fail(bob, "room.join", { roomId }, "capacity_full");
    await fail(alice, "room.create", { requestId: randomUUID(), title: "Other", languages: ["ja"], mode: "now", capacity: 2 }, "already_in_room");
    await success(alice, "room.leave", { roomId });
    await joined(roomId, bob);
    await fail(carol, "presence.heartbeat", { presenceSessionId: randomUUID(), roomId }, "room_access_denied");
    await success(owner, "room.leave", { roomId });
    await fail(bob, "message.send", { roomId, requestId: randomUUID(), body: "After end" }, "room_access_denied");
    assert.equal((await view(bob)).rooms.length, 0);
  });
  await check("future rooms list their offline creators and RSVP capacity never becomes live occupancy", async () => {
    await ready(owner, alice, bob);
    const roomId = await room(owner, { mode: "scheduled", startsAt: new Date(Date.now() + 3_600_000).toISOString(), capacity: 2 });
    await success(alice, "room.rsvp", { roomId, attending: true });
    await success(alice, "room.rsvp", { roomId, attending: true });
    await fail(owner, "room.rsvp", { roomId, attending: false }, "access_denied");
    await fail(bob, "room.rsvp", { roomId, attending: true }, "capacity_full");
    const lobby = await view(alice);
    assert.equal(lobby.rooms[0].state, "scheduled");
    assert.deepEqual(lobby.rooms[0].participants, []);
    assert.equal(lobby.rooms[0].rsvpCount, 2);
    assert.equal(lobby.people.find(person => person.id === owner)?.online, false);
    await fail(owner, "room.join", { roomId }, "room_not_started");
    await db.query("UPDATE cafe_private.community_rooms SET starts_at=clock_timestamp()-interval '1 second' WHERE id=$1", [roomId]);
    await fail(alice, "room.join", { roomId }, "room_not_started");
    await joined(roomId, owner, alice);
    assert.equal((await view(owner, roomId)).room?.state, "live");
  });
  await check("a failed scheduled-room start does not open a room while its creator is elsewhere", async () => {
    await ready(owner, alice);
    const waiting = await room(owner);
    const later = await room(owner, { mode: "scheduled", startsAt: new Date(Date.now() + 3_600_000).toISOString() });
    await db.query("UPDATE cafe_private.community_rooms SET starts_at=clock_timestamp()-interval '1 second' WHERE id=$1", [later]);
    await fail(owner, "room.join", { roomId: later }, "already_in_room");
    assert.equal((await view(alice)).rooms.find(item => item.id === later)?.state, "scheduled");
    await success(owner, "room.end", { roomId: waiting });
    await joined(later, owner);
    assert.equal((await view(owner, later)).room?.state, "waiting");
  });
  await check("room bounds reject invented now dates and limit scheduled inventory per member", async () => {
    await ready(owner);
    const base = { requestId: randomUUID(), title: "Schedule", languages: ["sw"], mode: "now", capacity: 2 };
    await fail(owner, "room.create", { ...base, startsAt: new Date(Date.now() + 3_600_000).toISOString() }, "invalid_request");
    await fail(owner, "room.create", { ...base, capacity: 9 }, "invalid_request");
    await fail(owner, "room.create", { ...base, mode: "scheduled", startsAt: new Date(Date.now() - 60_000).toISOString() }, "invalid_request");
    const future = new Date(Date.now() + 3_600_000).toISOString();
    for (let index = 0; index < 3; index++) await room(owner, { mode: "scheduled", startsAt: future });
    await fail(owner, "room.create", { ...base, mode: "scheduled", startsAt: future }, "room_limit");
  });
  await check("bounded lobby projections preserve a joined room beyond the newest 500 listings", async () => {
    await ready(owner);
    const roomId = await room(owner);
    await db.exec(`WITH users AS (
      INSERT INTO auth.users(id,email) SELECT gen_random_uuid(),'synthetic-crowd@example.test' FROM generate_series(1,501) RETURNING id
    ), profiles AS (
      INSERT INTO public.profiles(id,display_name) SELECT id,'Crowd' FROM users RETURNING id
    ) INSERT INTO cafe_private.community_members(profile_id,display_name,native_languages,learning_languages,adult_attested_at,rules_accepted_at,rules_version)
      SELECT id,'Crowd',ARRAY['sw'],ARRAY['iu'],clock_timestamp(),clock_timestamp(),'cafe-community-adults-v1' FROM profiles;
    INSERT INTO cafe_private.community_presence(profile_id,session_id)
      SELECT profile_id,gen_random_uuid() FROM cafe_private.community_members WHERE display_name='Crowd';
    INSERT INTO cafe_private.community_rooms(creator_id,request_id,title,languages,mode,state,starts_at,capacity,created_at)
      SELECT profile_id,gen_random_uuid(),'Future',ARRAY['sw'],'scheduled','scheduled',clock_timestamp()+interval '2 hours',2,clock_timestamp()
      FROM cafe_private.community_members WHERE display_name='Crowd';`);
    const capped = await view(owner, roomId);
    assert.equal(capped.people.length, 500);
    assert.equal(capped.rooms.length, 500);
    assert.ok(capped.rooms.some(listed => listed.id === roomId));
    assert.equal(capped.room?.id, roomId);
    await db.query("INSERT INTO cafe_private.community_blocks(blocker_id,blocked_id) SELECT $1,profile_id FROM cafe_private.community_members WHERE display_name='Crowd'", [owner]);
    assert.equal((await view(owner, roomId)).blockedMembers.length, 500);
  });
  await check("stale owners hide waiting rooms on reads and a later command expires membership history", async () => {
    await ready(owner, alice);
    const roomId = await room(owner);
    await db.query("UPDATE cafe_private.community_memberships SET last_seen_at=clock_timestamp()-interval '91 seconds' WHERE profile_id=$1", [owner]);
    assert.equal((await view(alice)).rooms.length, 0);
    const before = (await db.query<{ state: string; left_at: Date | null }>("SELECT r.state,m.left_at FROM cafe_private.community_rooms r JOIN cafe_private.community_memberships m ON m.room_id=r.id WHERE r.id=$1", [roomId])).rows[0];
    assert.deepEqual(before, { state: "waiting", left_at: null });
    await success(alice, "presence.heartbeat", { presenceSessionId: randomUUID() });
    const after = (await db.query<{ state: string; left_at: Date | null }>("SELECT r.state,m.left_at FROM cafe_private.community_rooms r JOIN cafe_private.community_memberships m ON m.room_id=r.id WHERE r.id=$1", [roomId])).rows[0];
    assert.equal(after.state, "ended");
    assert.ok(after.left_at);
  });
  await check("messages require live membership, deduplicate retries and disclose only entitled history", async () => {
    await ready(owner, alice, bob);
    const roomId = await room(owner);
    const earlier = await message(owner, roomId, "Before Alice arrived");
    await joined(roomId, alice);
    const requestId = randomUUID();
    await success(owner, "message.send", { roomId, requestId, body: " Hello\nthere " });
    await success(owner, "message.send", { roomId, requestId, body: "Repeated delivery" });
    const messages = (await view(alice, roomId)).room!.messages;
    assert.equal(messages.length, 1);
    assert.equal(messages[0].body, "Hello\nthere");
    assert.notEqual(messages[0].id, earlier);
    assert.deepEqual(Object.keys(messages[0].sender).sort(), ["displayName", "id", "learningLanguages", "nativeLanguages"]);
    assert.deepEqual(await rpc("cafe_community_snapshot_server", [bob, roomId]), { ok: false, code: "room_access_denied" });
    await fail(bob, "message.send", { roomId, requestId: randomUUID(), body: "Unauthorized" }, "room_access_denied");
    await success(alice, "room.leave", { roomId });
    await message(owner, roomId, "While Alice was away");
    await joined(roomId, alice);
    assert.equal((await view(alice, roomId)).room!.messages.length, 1);
    await fail(alice, "message.send", { roomId, requestId: randomUUID(), body: "x".repeat(2001) }, "invalid_request");
  });
  await check("private video needs recipient acceptance and denies third parties and simultaneous invitations", async () => {
    await ready(owner, alice, bob);
    const roomId = await room(owner);
    await joined(roomId, alice, bob);
    const callId = await invite(roomId);
    assert.deepEqual(await callAuth(owner, callId), { ok: false, code: "call_access_denied" });
    await fail(owner, "call.respond", { callId, accept: true }, "call_access_denied");
    await fail(bob, "call.respond", { callId, accept: true }, "call_access_denied");
    await fail(bob, "call.invite", { roomId, targetId: alice, requestId: randomUUID() }, "call_busy");
    await success(alice, "call.respond", { callId, accept: true });
    const authorized = await callAuth(alice, callId);
    assert.equal(authorized.ok, true);
    assert.deepEqual([authorized.callId, authorized.roomId, authorized.fromId, authorized.toId], [callId, roomId, owner, alice]);
    assert.ok(Date.parse(String(authorized.endsAt)) > Date.parse(String(authorized.acceptedAt)));
    assert.deepEqual(await callAuth(bob, callId), { ok: false, code: "call_access_denied" });
    assert.equal((await view(bob, roomId)).calls.length, 0);
    assert.equal((await view(owner, roomId)).calls[0].status, "accepted");
    assert.equal((await success(alice, "call.respond", { callId, accept: true })).callId, callId);
  });
  await check("declining limits repeated invitations and pending invitation expiry is authoritative", async () => {
    await ready(owner, alice);
    const roomId = await room(owner);
    await joined(roomId, alice);
    const callId = await invite(roomId);
    await success(alice, "call.respond", { callId, accept: false });
    await fail(owner, "call.invite", { roomId, targetId: alice, requestId: randomUUID() }, "rate_limited");
    await db.query("UPDATE cafe_private.community_calls SET closed_at=clock_timestamp()-interval '121 seconds' WHERE id=$1", [callId]);
    const expired = await invite(roomId);
    await db.query("UPDATE cafe_private.community_calls SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1", [expired]);
    assert.equal((await view(alice, roomId)).calls.find(call => call.id === expired)?.status, "expired");
    assert.equal((await db.query<{ status: string }>("SELECT status FROM cafe_private.community_calls WHERE id=$1", [expired])).rows[0].status, "pending");
    await fail(alice, "call.respond", { callId: expired, accept: true }, "call_unavailable");
  });
  await check("personal blocking immediately stops contact, invalidates accepted video and preserves selected report evidence", async () => {
    await ready(owner, alice, bob);
    const roomId = await room(owner);
    await joined(roomId, alice);
    const selected = await message(alice, roomId, "An unwanted sexual comment");
    await message(owner, roomId, "Unselected private conversation");
    const callId = await invite(roomId);
    await success(alice, "call.respond", { callId, accept: true });
    const blocked = await success(owner, "member.block", { targetId: alice });
    assert.ok(blocked.cleanupCallIds?.includes(callId));
    assert.deepEqual(await callAuth(alice, callId), { ok: false, code: "call_access_denied" });
    await fail(alice, "room.join", { roomId }, "room_access_denied");
    await fail(alice, "message.send", { roomId, requestId: randomUUID(), body: "Still here" }, "room_access_denied");
    const ownerView = await view(owner, roomId);
    assert.deepEqual(ownerView.room!.participants.map(person => person.id), [owner]);
    assert.ok(!ownerView.room!.messages.some(msg => msg.sender.id === alice));
    assert.equal(ownerView.blockedMembers[0].id, alice);
    assert.ok(!(await view(alice)).people.some(person => person.id === owner));
    const report = await success(owner, "report.submit", { roomId, callId, targetId: alice, reason: "sexual_harassment", messageIds: [selected], details: "What happened" });
    assert.ok(report.reportId);
    await fail(bob, "report.submit", { roomId, targetId: alice, reason: "other", messageIds: [selected] }, "report_access_denied");
    const queue = await rpc<{ ok: true; reports: CafeModerationReport[] }>("cafe_community_reports_server", [admin]);
    assert.equal(queue.reports.length, 1);
    assert.deepEqual(queue.reports[0].messages.map(item => [item.id, item.senderId, item.body]), [[selected, alice, "An unwanted sexual comment"]]);
    assert.equal(queue.reports[0].status, "open");
    await db.query("UPDATE cafe_private.community_messages SET body='Later edit' WHERE id=$1", [selected]);
    assert.equal((await rpc<{ reports: CafeModerationReport[] }>("cafe_community_reports_server", [admin])).reports[0].messages[0].body, "An unwanted sexual comment");
    assert.deepEqual(await rpc("cafe_community_reports_server", [owner]), { ok: false, code: "access_denied" });
    assert.deepEqual(await rpc("cafe_community_review_report_server", [bob, report.reportId]), { ok: false, code: "access_denied" });
    assert.equal((await rpc("cafe_community_review_report_server", [admin, report.reportId])).ok, true);
    assert.equal((await rpc<{ reports: CafeModerationReport[] }>("cafe_community_reports_server", [admin])).reports[0].status, "reviewed");
    assert.deepEqual(await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [owner]), [{ callId, fromId: owner, toId: alice, generation: 1 }]);
    assert.deepEqual(await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [bob]), []);
    await rpc("cafe_community_cleanup_done_server", [callId, 1]);
    assert.deepEqual(await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [null]), []);
    await success(owner, "call.end", { callId });
    assert.deepEqual(await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [null]), [{ callId, fromId: owner, toId: alice, generation: 2 }], "Repeated end durably compensates for provider work that completed after earlier cleanup");
    assert.deepEqual(await rpc("cafe_community_cleanup_done_server", [callId, 1]), { ok: true, completed: false }, "Old worker cannot acknowledge a newer cleanup obligation");
    assert.equal((await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [null]))[0].generation, 2);
    assert.deepEqual(await rpc("cafe_community_cleanup_done_server", [callId, 2]), { ok: true, completed: true });
  });
  await check("an ordinary personal blocker leaves the shared room without kicking other members", async () => {
    await ready(owner, alice, bob, carol);
    const roomId = await room(owner);
    await joined(roomId, alice, bob);
    await success(alice, "member.block", { targetId: bob });
    assert.deepEqual((await view(owner, roomId)).room!.participants.map(person => person.id), [owner, bob]);
    await fail(alice, "room.join", { roomId }, "room_access_denied");
    await fail(bob, "room.remove", { roomId, targetId: owner }, "access_denied");
    await success(owner, "room.remove", { roomId, targetId: bob });
    await fail(bob, "room.join", { roomId }, "room_access_denied");
    const independent = await room(carol);
    await joined(independent, bob);
    assert.equal((await view(bob, independent)).room!.participants.length, 2);
  });
  await check("reports reject messages predating membership, unrelated messages, forged call context and oversized selection", async () => {
    await ready(owner, alice, bob, carol);
    const roomId = await room(owner);
    const previous = await message(owner, roomId, "Earlier");
    await joined(roomId, alice);
    const actual = await message(owner, roomId, "Visible to Alice");
    const unrelated = await room(bob);
    await joined(unrelated, carol);
    const secret = await message(bob, unrelated, "Unrelated secret");
    const unrelatedCall = await invite(unrelated, bob, carol);
    const base = { roomId, targetId: owner, reason: "other", messageIds: [actual] };
    await fail(alice, "report.submit", { ...base, messageIds: [previous] }, "report_access_denied");
    await fail(alice, "report.submit", { ...base, messageIds: [secret] }, "report_access_denied");
    await fail(alice, "report.submit", { ...base, callId: unrelatedCall }, "report_access_denied");
    await fail(alice, "report.submit", { ...base, messageIds: Array.from({ length: 11 }, () => actual) }, "invalid_request");
    await fail(alice, "report.submit", { ...base, messageIds: "not-an-array" }, "invalid_request");
    await success(alice, "room.leave", { roomId });
    await success(alice, "report.submit", { ...base, details: "Report after leaving" });
    const reports = await rpc<{ reports: CafeModerationReport[] }>("cafe_community_reports_server", [admin]);
    assert.equal(reports.reports.length, 1);
    assert.deepEqual(reports.reports[0].messages.map(item => item.id), [actual]);
  });
  await check("moderation cap keeps the oldest unresolved reports visible and reviewing one advances the queue", async () => {
    await ready(owner, alice);
    const reportId = (index: number) => `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
    // Reverse insertion and equal timestamps exercise the stable UUID tie-break.
    // New reviewed reports must not displace any unresolved report.
    await db.query(`INSERT INTO cafe_private.community_reports(id,reporter_id,target_id,reason,status,created_at)
      SELECT ('30000000-0000-4000-8000-' || lpad(item::text,12,'0'))::uuid,$1,$2,'other','open',
        now()-interval '1 day'+((item-1)/2)*interval '1 second'
      FROM generate_series(1,101) item ORDER BY item DESC`, [owner, alice]);
    await db.query(`INSERT INTO cafe_private.community_reports(reporter_id,target_id,reason,status,created_at)
      SELECT $1,$2,'other','reviewed',now()+item*interval '1 second' FROM generate_series(1,101) item`, [owner, alice]);
    const queue = () => rpc<{ ok: true; reports: CafeModerationReport[] }>("cafe_community_reports_server", [admin]);
    const initial = (await queue()).reports;
    assert.equal(initial.length, 100);
    assert.ok(initial.every(report => report.status === "open"));
    assert.deepEqual(initial.map(report => report.id), Array.from({ length: 100 }, (_, index) => reportId(index + 1)));
    await rpc("cafe_community_review_report_server", [admin, reportId(1)]);
    const advanced = (await queue()).reports;
    assert.deepEqual(advanced.map(report => report.id), Array.from({ length: 100 }, (_, index) => reportId(index + 2)));
    assert.ok(advanced.every(report => report.status === "open"));
    await rpc("cafe_community_review_report_server", [admin, reportId(2)]);
    const remainder = (await queue()).reports;
    assert.deepEqual(remainder.slice(0, 99).map(report => report.id), Array.from({ length: 99 }, (_, index) => reportId(index + 3)));
    assert.equal(remainder[99].id, reportId(1));
    assert.equal(remainder[99].status, "reviewed");
  });
  await check("expired membership denies video immediately, GET stays read-only and global cleanup queues both participants", async () => {
    await ready(owner, alice);
    const roomId = await room(owner);
    await joined(roomId, alice);
    const callId = await invite(roomId);
    await success(alice, "call.respond", { callId, accept: true });
    await db.query("UPDATE cafe_private.community_memberships SET last_seen_at=clock_timestamp()-interval '91 seconds' WHERE profile_id=$1", [alice]);
    assert.deepEqual(await callAuth(owner, callId), { ok: false, code: "call_access_denied" });
    assert.equal((await view(owner, roomId)).calls[0].status, "ended");
    assert.equal((await db.query<{ status: string }>("SELECT status FROM cafe_private.community_calls WHERE id=$1", [callId])).rows[0].status, "accepted");
    assert.deepEqual(await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [null]), [{ callId, fromId: owner, toId: alice, generation: 1 }]);
    assert.equal((await db.query<{ status: string }>("SELECT status FROM cafe_private.community_calls WHERE id=$1", [callId])).rows[0].status, "ended");
    assert.ok((await db.query<{ left_at: Date | null }>("SELECT left_at FROM cafe_private.community_memberships WHERE profile_id=$1", [alice])).rows[0].left_at);
    await rpc("cafe_community_cleanup_done_server", [callId, 1]);
    assert.deepEqual(await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [null]), []);
  });
  await check("accepted video has a fixed hour limit and rechecks both permanent active accounts", async () => {
    await ready(owner, alice);
    const roomId = await room(owner);
    await joined(roomId, alice);
    const callId = await invite(roomId);
    await success(alice, "call.respond", { callId, accept: true });
    const auth = await callAuth(owner, callId);
    assert.equal(Date.parse(String(auth.endsAt)) - Date.parse(String(auth.acceptedAt)), 3_600_000);
    await db.query("UPDATE auth.users SET is_anonymous=true WHERE id=$1", [alice]);
    assert.deepEqual(await callAuth(owner, callId), { ok: false, code: "call_access_denied" });
    await db.query("UPDATE auth.users SET is_anonymous=false WHERE id=$1", [alice]);
    await db.query("UPDATE cafe_private.community_calls SET ends_at=clock_timestamp()-interval '1 second' WHERE id=$1", [callId]);
    assert.deepEqual(await callAuth(owner, callId), { ok: false, code: "call_access_denied" });
    assert.equal((await view(owner, roomId)).calls[0].status, "ended");
    assert.deepEqual(await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [null]), [{ callId, fromId: owner, toId: alice, generation: 1 }]);
  });
  await check("room departure and creator removal persist provider cleanup before success", async () => {
    await ready(owner, alice, bob, dora, erin);
    const roomId = await room(owner);
    await joined(roomId, alice, bob);
    const callId = await invite(roomId, alice, bob);
    await success(bob, "call.respond", { callId, accept: true });
    assert.deepEqual(await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [owner]), [], "Active calls never appear in cleanup");
    const removed = await success(owner, "room.remove", { roomId, targetId: bob });
    assert.ok(removed.cleanupCallIds?.includes(callId));
    assert.deepEqual(await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [owner]), [{ callId, fromId: alice, toId: bob, generation: 1 }]);
    assert.deepEqual(await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [dora]), []);
    assert.deepEqual(await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [null]), [{ callId, fromId: alice, toId: bob, generation: 1 }]);
    const elsewhere = await room(dora);
    await joined(elsewhere, erin);
    const leftCall = await invite(elsewhere, dora, erin);
    await success(erin, "call.respond", { callId: leftCall, accept: true });
    assert.ok((await success(erin, "room.leave", { roomId: elsewhere })).cleanupCallIds?.includes(leftCall));
    assert.deepEqual(await callAuth(dora, leftCall), { ok: false, code: "call_access_denied" });
  });
  for (const deletion of ["room creator auth account", "call participant profile"] as const) {
    await check(`${deletion} deletion preserves teardown IDs independently of all cascading records`, async () => {
      await ready(owner, alice, bob, carol);
      const roomId = await room(owner);
      await joined(roomId, alice, bob);
      const callId = await invite(roomId, alice, bob);
      await success(bob, "call.respond", { callId, accept: true });
      if (deletion === "room creator auth account") await db.query("DELETE FROM auth.users WHERE id=$1", [owner]);
      else await db.query("DELETE FROM public.profiles WHERE id=$1", [alice]);
      assert.equal((await db.query<{ n: number }>("SELECT count(*)::int AS n FROM cafe_private.community_calls WHERE id=$1", [callId])).rows[0].n, 0);
      const obligation: Cleanup = { callId, fromId: alice, toId: bob, generation: 1 };
      assert.deepEqual(await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [null]), [obligation]);
      assert.deepEqual(await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [bob]), [obligation]);
      if (deletion === "call participant profile") assert.deepEqual(await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [owner]), [obligation]);
      assert.deepEqual(await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [carol]), []);
      assert.deepEqual(await rpc("cafe_community_cleanup_done_server", [callId, 1]), { ok: true, completed: true });
      assert.deepEqual(await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [null]), []);
      assert.deepEqual(await rpc("cafe_community_cleanup_requeue_server", [callId]), { ok: true, queued: true }, "Delayed provider work can requeue a deleted call from retained private IDs");
      assert.deepEqual(await rpc("cafe_community_cleanup_done_server", [callId, 1]), { ok: true, completed: false });
      assert.deepEqual(await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [null]), [{ ...obligation, generation: 2 }]);
      assert.deepEqual(await rpc("cafe_community_cleanup_done_server", [callId, 2]), { ok: true, completed: true });
      assert.deepEqual(await rpc("cafe_community_cleanup_requeue_server", [randomUUID()]), { ok: true, queued: false }, "Compensation cannot invent cleanup identities");
      await db.query("UPDATE cafe_private.community_call_cleanup SET completed_at=clock_timestamp()-interval '8 days' WHERE call_id=$1", [callId]);
      await rpc("cafe_community_cleanup_pending_server", [null]);
      assert.equal((await db.query<{ n: number }>("SELECT count(*)::int AS n FROM cafe_private.community_call_cleanup WHERE call_id=$1", [callId])).rows[0].n, 0);
    });
  }
  await check("provider compensation cannot queue or acknowledge an active call", async () => {
    await ready(owner, alice);
    const roomId = await room(owner);
    await joined(roomId, alice);
    const callId = await invite(roomId);
    await success(alice, "call.respond", { callId, accept: true });
    await db.query("INSERT INTO cafe_private.community_call_cleanup(call_id,from_id,to_id,creator_id) VALUES($1,$2,$3,$2)", [callId, owner, alice]);
    assert.deepEqual(await rpc("cafe_community_cleanup_requeue_server", [callId]), { ok: true, queued: false });
    assert.deepEqual(await rpc("cafe_community_cleanup_done_server", [callId, 1]), { ok: true, completed: false });
    assert.deepEqual(await rpc<Cleanup[]>("cafe_community_cleanup_pending_server", [null]), []);
    assert.equal((await callAuth(owner, callId)).ok, true);
  });
  console.log(`${checks} community database behavioral checks passed`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.close());
