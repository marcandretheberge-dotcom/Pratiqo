import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import sharp from "sharp";
import { createCafeCommunityHandlers } from "../../lib/cafe/communityServer";
import { createCafePhotoHandler, processCafePhoto } from "../../lib/cafe/communityPhotos";
import { CAFE_PHOTO_MAX_BYTES } from "../../lib/cafe/communityPhotoPolicy";
import { communityError } from "../../components/cafe/community/copy";
import type { CafeCommunitySnapshot, CafeCommunityCommandResult } from "../../lib/cafe/communityTypes";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const [alice, bob, stranger, hidden] = [id(2), id(3), id(4), id(5)];
const origin = "https://cafe.example.test";
const db = new PGlite();
let checks = 0;
async function run() {
  for (const locale of ["fr", "en", "es"] as const) {
    assert.ok(communityError("invalid_photo", locale).includes(`${CAFE_PHOTO_MAX_BYTES / 1024 / 1024} M`), "photo error agrees with the actual upload ceiling");
  }
  await db.exec(readFileSync("tests/cafe/sql/setup.sql", "utf8").replace(/^\\.*$/gm, "").replace(/^CREATE EXTENSION.*$/m, ""));
  for (const name of readdirSync("supabase/migrations").filter(name => /^\d+_cafe_.*\.sql$/.test(name)).sort()) await db.exec(readFileSync(`supabase/migrations/${name}`, "utf8"));
  const rpc = async (name: string, args: Record<string, unknown>) => {
    assert.match(name, /^cafe_community_[a-z_]+_server$/);
    const entries = Object.entries(args);
    await db.exec("SET ROLE service_role");
    try {
      const result = await db.query<{ result: unknown }>(`SELECT public.${name}(${entries.map(([key], i) => `${key}=>$${i + 1}`).join(",")}) result`,
        entries.map(([, value]) => value && typeof value === "object" ? JSON.stringify(value) : value));
      return { data: result.rows[0].result, error: null };
    } catch (error) { throw error; } finally { await db.exec("RESET ROLE"); }
  };
  const handlers = createCafeCommunityHandlers({
    enabled: () => true, peopleEnabled: () => true, videoEnabled: () => false,
    authenticate: async request => {
      const actor = request.headers.get("Authorization")?.replace("Bearer ", "");
      return actor && [alice, bob, stranger, hidden, id(1)].includes(actor) ? { ok: true, id: actor, email: null } : { ok: false, status: 401, error: "unauthorized" };
    },
    rpc, limit: async () => null, cleanupCalls: async () => ({ pending: false }),
    joinCall: async () => { throw new Error("No video"); }, onError: (operation, code) => { throw new Error(`${operation} ${code}`); },
  });
  const request = (actor: string, payload?: unknown, room?: string) => new Request(`${origin}/api/cafe/community${room ? `?roomId=${room}` : ""}`, {
    method: payload ? "POST" : "GET", headers: { Authorization: `Bearer ${actor}`, Origin: origin, "Content-Type": "application/json" },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  const command = async (actor: string, payload: unknown, expected = 200): Promise<CafeCommunityCommandResult> => {
    const response = await handlers.command(request(actor, payload)); const result = await response.json();
    assert.equal(response.status, expected, JSON.stringify(result)); checks++; return result;
  };
  const view = async (actor: string, room?: string, expected = 200): Promise<CafeCommunitySnapshot> => {
    const response = await handlers.snapshot(request(actor, undefined, room)); const result = await response.json();
    assert.equal(response.status, expected, JSON.stringify(result));
    assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
    assert.doesNotMatch(JSON.stringify(result), /example\.test|avatar_version|requester_id|accepted_at/);
    checks++; return result;
  };
  for (const actor of [alice, bob, stranger, hidden]) await command(actor, { action: "profile.save", displayName: `Test ${actor.slice(-1)}`,
    nativeLanguages: ["fr"], learningLanguages: ["it"], adultAgreement: true, rulesAgreement: true, discoverable: actor !== hidden });
  assert.equal((await view(alice)).people.some(person => person.id === hidden), false, "offline discovery is opt-in");
  await view(randomUUID(), undefined, 401);
  await command(alice, { action: "friend.request", targetId: alice, introduction: "Hello", requestId: randomUUID() }, 400);
  await command(alice, { action: "friend.request", targetId: hidden, introduction: "Hello", requestId: randomUUID() }, 404);
  const invite = { action: "friend.request", targetId: bob, introduction: "Ciao! Practise Italian?", requestId: randomUUID(), p_actor_id: stranger };
  const sent = await command(alice, invite); assert.ok(sent.ok && sent.friendshipId);
  if (!sent.ok || !sent.friendshipId) throw new Error("Missing connection");
  const connection = sent.friendshipId;
  assert.deepEqual(await command(alice, invite), sent);
  await command(bob, { ...invite, targetId: alice, requestId: randomUUID() });
  assert.equal((await view(alice)).friends!.length, 1, "crossed requests never auto-accept or duplicate");
  await view(alice, connection, 403);
  await command(alice, { action: "message.send", roomId: connection, body: "Not accepted", requestId: randomUUID() }, 403);
  await command(alice, { action: "friend.respond", friendshipId: connection, accept: true }, 409);
  await command(stranger, { action: "friend.respond", friendshipId: connection, accept: true }, 404);
  await command(bob, { action: "friend.respond", friendshipId: connection, accept: true });
  await command(bob, { action: "friend.respond", friendshipId: connection, accept: true });
  await command(alice, { action: "room.join", roomId: connection });
  const message = { action: "message.send", roomId: connection, body: "<script>plain text</script> Ciao!", requestId: randomUUID() };
  await command(alice, message); await command(alice, message);
  const conversation = await view(bob, connection);
  assert.equal(conversation.room?.kind, "direct"); assert.equal(conversation.room?.messages.length, 1);
  const messageId = conversation.room!.messages[0].id;
  assert.equal((await view(stranger)).rooms.some(room => room.id === connection), false);
  assert.equal((await view(stranger)).friends!.length, 0);
  await view(stranger, connection, 403);
  await command(stranger, { ...message, requestId: randomUUID() }, 403);
  await command(alice, { ...message, body: "Changed nonce payload" }, 409);
  await command(alice, { action: "room.leave", roomId: connection });
  assert.equal((await view(bob, connection)).room!.messages.length, 1, "leaving does not expire a private conversation");
  await command(alice, { action: "presence.heartbeat", presenceSessionId: randomUUID(), roomId: connection });
  await command(alice, { action: "call.invite", roomId: connection, targetId: bob, requestId: randomUUID() }, 404);
  await command(alice, { action: "room.end", roomId: connection }, 403);
  await command(bob, { action: "member.block", targetId: alice });
  await view(alice, connection, 403);
  await command(alice, { ...message, requestId: randomUUID() }, 403);
  assert.equal((await view(alice)).friends!.length, 0);
  await command(bob, { action: "report.submit", targetId: alice, roomId: connection, reason: "spam", messageIds: [messageId], details: "" });
  await command(stranger, { action: "report.submit", targetId: alice, roomId: connection, reason: "spam", messageIds: [messageId] }, 403);
  const reports = await rpc("cafe_community_reports_server", { p_actor_id: id(1) });
  assert.match(JSON.stringify(reports.data), /plain text/);
  await command(bob, { action: "member.unblock", targetId: alice });
  await view(alice, connection, 403);
  await command(alice, { ...invite, requestId: randomUUID() }, 409);
  await command(stranger, { action: "report.submit", targetId: bob, reason: "spam", messageIds: [] });

  const photoStore = new Map<string, Blob>();
  const photoHandler = createCafePhotoHandler({
    enabled: () => true, authenticate: async request => ({ ok: true, id: request.headers.get("Authorization")!.replace("Bearer ", ""), email: null }),
    limit: async () => true, rpc: args => rpc("cafe_community_avatar_server", args),
    upload: async (path, bytes) => { photoStore.set(path, new Blob([new Uint8Array(bytes)], { type: "image/webp" })); return true; },
    download: async path => photoStore.get(path) ?? null, remove: async path => { photoStore.delete(path); },
  });
  const png = await sharp({ create: { width: 600, height: 400, channels: 3, background: "#207565" } }).png().toBuffer();
  const upload = () => new Request(`${origin}/api/cafe/community/photos`, { method: "PUT", headers: { Authorization: `Bearer ${alice}`, Origin: origin, "Content-Type": "image/png" }, body: new Uint8Array(png) });
  assert.equal((await photoHandler(upload())).status, 200);
  assert.equal(photoStore.size, 1);
  const read = () => new Request(`${origin}/api/cafe/community/photos/${alice}`, { headers: { Authorization: `Bearer ${bob}` } });
  const image = await photoHandler(read(), alice);
  assert.equal(image.status, 200);
  const metadata = await sharp(Buffer.from(await image.arrayBuffer())).metadata();
  assert.equal(metadata.width, 384); assert.equal(metadata.height, 384); assert.equal(metadata.exif, undefined);
  await photoHandler(upload()); assert.equal(photoStore.size, 1, "replacement deletes only the retired immutable version");
  const fake = new Request(origin, { method: "PUT", headers: { "Content-Type": "image/png" }, body: "<svg onload='bad()' />" });
  assert.equal(await processCafePhoto(fake), null);
  const oversized = new Request(origin, { method: "PUT", headers: { "Content-Type": "image/png", "Content-Length": "1" }, body: new Uint8Array(CAFE_PHOTO_MAX_BYTES + 1) });
  assert.equal(await processCafePhoto(oversized), null, "the real bytes, not a dishonest header, enforce the upload ceiling");
  const forged = await rpc("cafe_community_avatar_server", { p_actor_id: bob, p_member_id: alice, p_write: true, p_version: randomUUID() });
  assert.deepEqual(forged.data, { ok: false, code: "not_allowed" });
  await command(bob, { action: "member.block", targetId: alice });
  assert.equal((await photoHandler(read(), alice)).status, 404);
  assert.equal((await photoHandler(new Request(origin, { method: "DELETE", headers: { Authorization: `Bearer ${alice}` } }))).status, 200);
  assert.equal(photoStore.size, 0);
  assert.equal((await photoHandler(new Request(origin, { method: "PUT", headers: { Authorization: `Bearer ${alice}`, Origin: "https://evil.example" } }))).status, 403);
  checks += 13;
  console.log(`PASS ${checks} people-first real SQL/API/photo assertions; no external provider contacted`);
}
run().finally(() => db.close()).catch(error => { console.error(error); process.exitCode = 1; });
