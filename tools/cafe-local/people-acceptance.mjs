/** Real local Auth -> production-built Next -> PostgreSQL and private Storage. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { base, databaseOrigin, localCafeEnv } from './env.mjs';

const env = await localCafeEnv();
assert.equal(databaseOrigin, 'http://127.0.0.1:55421');
assert.equal(env.CAFE_PEOPLE_ENABLED, 'true');
assert.equal(env.CAFE_ROOM_PROVIDER_ENABLED, 'false');
const admin = createClient(databaseOrigin, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const made = [], checks = [];
let passed = false;
const run = randomUUID();
const bucket = admin.storage.from('cafe-avatars');
function pass(name) { checks.push(name); console.log(`PASS ${name}`); }
async function account(alias) {
  const email = `cafe-people-${run}-${alias}@example.invalid`, password = randomUUID() + 'aA1!';
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(error, null, 'Local Auth provisioning');
  const id = data.user.id;
  made.push(id);
  assert.equal((await admin.from('profiles').upsert({ id, email, name: `Test ${alias}`, display_name: `Test ${alias}`, role: 'student', is_active: true })).error, null);
  const client = createClient(databaseOrigin, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const signed = await client.auth.signInWithPassword({ email, password });
  assert.equal(signed.error, null, 'Local Auth password sign-in');
  return { id, client, token: signed.data.session.access_token };
}
async function request(actor, path, method = 'GET', body, contentType) {
  return fetch(base + path, { method, redirect: 'error', signal: AbortSignal.timeout(15000), headers: {
    ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}), Origin: base,
    ...(contentType ? { 'Content-Type': contentType } : {}),
  }, ...(body ? { body } : {}) });
}
async function command(actor, payload, status = 200) {
  const response = await request(actor, '/api/cafe/community', 'POST', JSON.stringify(payload), 'application/json');
  const data = await response.json();
  assert.equal(response.status, status, `Command ${payload.action}: ${data.code ?? response.status}`);
  return data;
}
async function snapshot(actor, room, status = 200) {
  const response = await request(actor, '/api/cafe/community' + (room ? `?roomId=${room}` : ''));
  assert.equal(response.status, status, 'Snapshot status');
  assert.match(response.headers.get('cache-control'), /no-store/);
  const data = await response.json();
  assert.doesNotMatch(JSON.stringify(data), /example\.invalid|access_token|avatar_version|requester_id/);
  return data;
}
async function photos(actor) {
  const result = await bucket.list(actor.id);
  assert.equal(result.error, null);
  return result.data.filter(item => item.name.endsWith('.webp'));
}
try {
  const a = await account('alice'), b = await account('bob');
  pass('two permanent local Auth accounts sign in; no email/provider used');
  assert.equal((await request(null, '/api/cafe/community')).status, 401);
  for (const actor of [a, b]) await command(actor, { action: 'profile.save', displayName: actor === a ? 'Test Alice' : 'Test Bob',
    nativeLanguages: ['fr'], learningLanguages: ['it'], adultAgreement: true, rulesAgreement: true, discoverable: true });
  assert.ok((await snapshot(a)).people.some(person => person.id === b.id));
  pass('real profile handlers persist adult/rules choices and language discovery');
  const invite = { action: 'friend.request', targetId: b.id, introduction: 'Ciao! Test local uniquement.', requestId: randomUUID() };
  const [first, retry] = await Promise.all([command(a, invite), command(a, invite)]);
  assert.equal(first.friendshipId, retry.friendshipId);
  const room = first.friendshipId;
  assert.ok(room);
  assert.equal((await snapshot(b)).friends.filter(friend => friend.id === room).length, 1);
  await command(a, { action: 'message.send', roomId: room, body: 'Not accepted', requestId: randomUUID() }, 403);
  await command(a, { action: 'friend.respond', friendshipId: room, accept: true }, 409);
  await command(b, { action: 'friend.respond', friendshipId: room, accept: true });
  pass('concurrent invitation retries are unique; only recipient can accept; no unsolicited DM');
  const message = { action: 'message.send', roomId: room, body: 'Buongiorno! Message de test local.', requestId: randomUUID() };
  await Promise.all([command(a, message), command(a, message)]);
  await command(b, { ...message, body: 'Ciao Alice!', requestId: randomUUID() });
  assert.equal((await snapshot(b, room)).room.messages.length, 2);
  const refreshed = await b.client.auth.refreshSession();
  assert.equal(refreshed.error, null);
  b.token = refreshed.data.session.access_token;
  await command(b, { action: 'room.leave', roomId: room });
  await command(b, { action: 'room.join', roomId: room });
  assert.equal((await snapshot(b, room)).room.messages.length, 2);
  pass('two-way private messages persist across token refresh and reopening; retry does not duplicate');

  const png = await sharp({ create: { width: 640, height: 480, channels: 3, background: '#39796e' } }).withMetadata().png().toBuffer();
  const upload = actor => request(actor, '/api/cafe/community/photos', 'PUT', png, 'image/png');
  assert.equal((await upload(a)).status, 200);
  const photo = await request(b, `/api/cafe/community/photos/${a.id}`);
  assert.equal(photo.status, 200);
  assert.match(photo.headers.get('cache-control'), /private, no-store/);
  const metadata = await sharp(Buffer.from(await photo.arrayBuffer())).metadata();
  assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, 384); assert.equal(metadata.height, 384); assert.equal(metadata.exif, undefined);
  const [file] = await photos(a); assert.ok(file);
  assert.equal((await photos(a)).length, 1);
  pass('real Storage upload/read: resized WebP, EXIF removed, authenticated no-cache delivery');
  const object = `${a.id}/${file.name}`;
  const anonymous = createClient(databaseOrigin, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  assert.ok((await anonymous.storage.from('cafe-avatars').download(object)).error);
  assert.ok((await b.client.storage.from('cafe-avatars').download(object)).error);
  assert.ok((await a.client.storage.from('cafe-avatars').upload(`${a.id}/forged.webp`, png, { contentType: 'image/webp' })).error);
  assert.ok((await b.client.rpc('cafe_community_avatar_server', { p_actor_id: a.id, p_member_id: a.id, p_write: true, p_version: randomUUID() })).error);
  assert.equal((await request(null, `/api/cafe/community/photos/${a.id}`)).status, 401);
  const publicPhoto = await fetch(`${databaseOrigin}/storage/v1/object/public/cafe-avatars/${object}`, { redirect: 'error' });
  assert.equal(publicPhoto.ok, false);
  pass('anonymous/public/raw client Storage and forged privileged RPC access are denied');
  assert.equal((await upload(a)).status, 200);
  const replacement = await photos(a);
  assert.equal(replacement.length, 1); assert.notEqual(replacement[0].name, file.name);
  assert.ok((await bucket.download(object)).error, 'Retired object deleted');
  assert.equal((await request(a, '/api/cafe/community/photos', 'DELETE')).status, 200);
  assert.equal((await photos(a)).length, 0);
  assert.equal((await request(b, `/api/cafe/community/photos/${a.id}`)).status, 404);
  assert.equal((await upload(a)).status, 200);
  pass('photo replacement removes the old object; deletion removes both DB reference and object');
  await command(b, { action: 'member.block', targetId: a.id });
  assert.equal((await request(b, `/api/cafe/community/photos/${a.id}`)).status, 404);
  await snapshot(a, room, 403);
  await command(a, { ...message, requestId: randomUUID() }, 403);
  await command(b, { action: 'member.unblock', targetId: a.id });
  await snapshot(a, room, 403);
  pass('block revokes photo and private-message access; unblock does not restore friendship');
  await command(a, { action: 'call.invite', roomId: room, targetId: b.id, requestId: randomUUID() }, 404);
  pass('video remains unavailable');
  const group = await command(a, { action: 'room.create', title: 'Test local people rooms', languages: ['it'], mode: 'now', capacity: 4, requestId: randomUUID() });
  assert.ok(group.roomId);
  await command(b, { action: 'room.join', roomId: group.roomId });
  const groupView = (await snapshot(b, group.roomId)).room;
  assert.equal(groupView.capacity, 4);
  assert.equal(groupView.participants.length, 2);
  assert.notEqual(groupView.kind, 'direct');
  pass('existing group rooms still work with the new people gate');
  assert.equal((await admin.from('profiles').update({ is_active: false, deletion_requested_at: new Date().toISOString() }).eq('id', a.id)).error, null);
  assert.equal((await request(b, `/api/cafe/community/photos/${a.id}`)).status, 404);
  assert.equal((await request(a, `/api/cafe/community/photos/${a.id}`)).status, 404);
  assert.equal((await snapshot(b)).people.some(person => person.id === a.id), false);
  pass('existing account-deletion flags remove discovery and deny photo access, including the owner');
  passed = true;
} finally {
  for (const id of made) {
    const listed = await bucket.list(id);
    if (listed.data?.length) assert.equal((await bucket.remove(listed.data.map(file => `${id}/${file.name}`))).error, null);
    assert.equal((await admin.auth.admin.deleteUser(id)).error, null, 'Delete only this run synthetic account');
  }
  pass('only this run synthetic accounts and photos removed; pre-existing data untouched');
  const out = resolve('artifacts/cafe-people'); mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, 'real-storage-two-account.json'), JSON.stringify({ passed, at: new Date().toISOString(), base, databaseOrigin, checks, video: false }, null, 2));
}
