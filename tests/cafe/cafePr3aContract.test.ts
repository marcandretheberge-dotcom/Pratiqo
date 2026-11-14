import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isCafeRoomProviderEnabled } from "@/lib/cafe/roomFeatureFlag";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");

const migration = read("supabase/migrations/20261111124000_cafe_daily_room_foundation.sql");
const hardening = read("supabase/migrations/20261111133000_cafe_daily_room_hardening.sql");
const bindingRace = read("supabase/migrations/20261111140000_cafe_daily_binding_race_hardening.sql");
const provider = read("lib/cafe/providers/daily.ts");
const providerContract = read("lib/cafe/roomProvider.ts");
const roomJoinFlow = read("lib/cafe/roomJoinFlow.ts");
const joinService = read("lib/cafe/joinService.ts");
const cancellation = read("lib/cafe/adminRoomCancellation.ts");
const adminRoute = read("app/api/admin/cafe/sessions/route.ts");
const participantRoute = read("app/api/cafe/sessions/[slug]/join/route.ts");
const hostRoute = read("app/api/cafe/sessions/[slug]/host/route.ts");
const publicSessionsRoute = read("app/api/cafe/sessions/route.ts");
const audit = read("lib/cafe/roomAudit.ts");
const env = read(".env.example");
const embedDoc = read("docs/architecture/cafe-pr3b-daily-embed-requirements.md");

assert.match(migration, /CREATE TABLE cafe_private\.room_bindings/);
assert.match(migration, /CREATE TABLE cafe_private\.session_removals/);
assert.match(migration, /CREATE TABLE cafe_private\.participant_agreements/);
assert.match(migration, /cafe-pilot-adults-v1/);
assert.match(migration, /CHECK \(max_participants <= 8\)/);
assert.match(migration, /ENABLE ROW LEVEL SECURITY/g);
assert.match(migration, /REVOKE ALL ON cafe_private\.room_bindings[\s\S]*?service_role/);
assert.doesNotMatch(migration, /CREATE TABLE[^;]*(attendance|cafe_reports)|\bjoined_at\b|\bleft_at\b/i);

assert.match(hardening, /SET search_path = ''/g);
assert.match(hardening, /interval '3 minutes'/);
assert.match(hardening, /CREATE OR REPLACE FUNCTION public\.cafe_admin_cancel_room_server/);
assert.match(hardening, /CREATE OR REPLACE FUNCTION public\.cafe_clear_room_binding_server/);
assert.match(hardening, /providerRoomId/);
assert.match(hardening, /CREATE OR REPLACE FUNCTION cafe_private\.enforce_session_invariants/);
assert.match(hardening, /Active\/future published Cafe requires host/);
assert.match(hardening, /NEW\.host_profile_id IS NULL AND TG_OP = 'INSERT'/);

assert.match(bindingRace, /CREATE OR REPLACE FUNCTION public\.cafe_bind_room_server/);
assert.match(bindingRace, /FOR NO KEY UPDATE/);
assert.match(bindingRace, /session_row\.status <> 'published'/);
assert.match(bindingRace, /session_unavailable/);
assert.match(bindingRace, /SET search_path = ''/);
assert.match(bindingRace, /WHEN unique_violation THEN/);
assert.match(bindingRace, /existing\.provider_room_id IS NOT DISTINCT FROM p_provider_room_id/);

for (const signature of [
  "cafe_authorize_join_server(uuid,text,text)",
  "cafe_bind_room_server(uuid,text,text)",
  "cafe_record_removal_server(uuid,text,uuid,text)",
]) {
  assert.match(
    migration,
    new RegExp(
      `REVOKE ALL ON FUNCTION public\\.${signature.replace(/[()]/g, "\\$&")}[\\s\\S]*?PUBLIC, anon, authenticated, service_role`,
    ),
  );
}
for (const [source, signatures] of [
  [hardening, [
    "cafe_authorize_join_server(uuid,text,text)",
    "cafe_admin_cancel_room_server(uuid,text)",
    "cafe_clear_room_binding_server(uuid,uuid,text,text)",
  ]],
  [bindingRace, ["cafe_bind_room_server(uuid,text,text)"]],
] as const) {
  for (const signature of signatures) {
    assert.match(
      source,
      new RegExp(
        `REVOKE ALL ON FUNCTION public\\.${signature.replace(/[()]/g, "\\$&")}[\\s\\S]*?PUBLIC, anon, authenticated, service_role`,
      ),
    );
  }
}

assert.match(providerContract, /ensureRoom/);
assert.match(providerContract, /createToken/);
assert.match(providerContract, /removeParticipant/);
assert.match(providerContract, /deleteRoom/);
assert.doesNotMatch(providerContract, /revokeAccess/);

assert.match(provider, /privacy: "private"/);
assert.match(provider, /max_participants: Math\.min\(8/);
assert.match(provider, /enable_chat: false/);
assert.match(provider, /enable_advanced_chat: false/);
assert.match(provider, /enable_shared_chat_history: false/);
assert.match(provider, /enable_screenshare: false/);
assert.match(provider, /enable_live_captions_ui: false/);
assert.match(provider, /start_video_off: true/);
assert.match(provider, /start_audio_off: true/);
assert.match(provider, /enable_hidden_participants: false/);
assert.doesNotMatch(provider, /enable_recording:\s*"off"/);
assert.match(provider, /isDailyRecordingEnabled/);
assert.match(provider, /Omit enable_recording/);
assert.match(provider, /enable_transcription_storage: false/);
assert.match(provider, /enable_dialout: false/);
assert.match(provider, /enable_recording_ui: false/);
assert.match(provider, /start_cloud_recording: false/);
assert.match(provider, /auto_start_transcription: false/);
assert.match(provider, /eject_at_token_exp: false/);
assert.match(provider, /canAdmin: false/);
assert.doesNotMatch(provider, /canAdmin:.*participants/);
assert.match(provider, /is_owner: false/);
assert.doesNotMatch(provider, /\?t=|NEXT_PUBLIC_DAILY|NEXT_PUBLIC_CAFE_DAILY/);

assert.match(roomJoinFlow, /export async function executeCafeRoomJoinFlow/);
assert.match(roomJoinFlow, /await provider\.ensureRoom/);
assert.match(roomJoinFlow, /await input\.bindRoom/);
assert.match(roomJoinFlow, /CafeRoomBindingRejectedError/);
assert.match(roomJoinFlow, /cleanupProviderRoom/);
assert.match(roomJoinFlow, /await provider\.deleteRoom\(room\.roomId\)/);
assert.match(roomJoinFlow, /const finalDecision = await input\.reauthorize\(\)/);
const reauthorizeBeforeToken = roomJoinFlow.match(
  /const finalDecision = await input\.reauthorize\(\)[\s\S]*?provider\.createToken/,
)?.[0] ?? "";
assert.match(reauthorizeBeforeToken, /if \(!finalDecision\.ok\)/);
assert.match(reauthorizeBeforeToken, /final_authorization_mismatch/);

assert.match(joinService, /authenticateCafeRequest/);
assert.match(joinService, /cafe_authorize_join_server/g);
assert.match(joinService, /executeCafeRoomJoinFlow/);
assert.match(joinService, /cafe_bind_room_server/);
assert.match(joinService, /CafeRoomBindingRejectedError/);
assert.match(joinService, /binding\.code === "session_unavailable"/);
assert.match(joinService, /Cache-Control.*no-store/);
assert.match(joinService, /provider_unavailable/);
assert.match(joinService, /cafe-room-auth-ip/);
assert.match(joinService, /code: "rate_limited"/);
assert.match(joinService, /429/);
assert.match(joinService, /enforceAuthorizedSessionRateLimit/);
assert.match(roomJoinFlow, /export async function authorizeBeforeSharedSessionLimit/);
const authorizeBeforeSharedLimit = roomJoinFlow.match(
  /export async function authorizeBeforeSharedSessionLimit[\s\S]*?limitResult: await input\.applyLimit\(decision\.sessionId\),/,
)?.[0] ?? "";
assert.match(authorizeBeforeSharedLimit, /const decision = await input\.authorize\(\)/);
assert.match(authorizeBeforeSharedLimit, /if \(!decision\.ok\) return \{ decision, limitResult: null \}/);
assert.match(authorizeBeforeSharedLimit, /decision\.sessionId/);
const authorizationGateWiring = joinService.match(
  /authorizeBeforeSharedSessionLimit\(\{[\s\S]*?\}\);/,
)?.[0] ?? "";
assert.match(authorizationGateWiring, /authorize: \(\) => authorize\(/);
assert.match(
  authorizationGateWiring,
  /applyLimit: \(sessionId\) => enforceAuthorizedSessionRateLimit\(req, sessionId, role\)/,
);
assert.match(joinService, /const firstDecision = authorizationGate\.decision/);
assert.match(joinService, /if \(!firstDecision\.ok\)/);
assert.match(joinService, /authorizationGate\.limitResult/);
assert.doesNotMatch(joinService, /identifier: slug/);
assert.doesNotMatch(joinService, /req\.json\(|p_profile_id|body\.profile/);
assert.doesNotMatch(participantRoute + hostRoute, /req\.json\(|profileId|userId/);
assert.match(participantRoute, /"participant"/);
assert.match(hostRoute, /"host"/);
assert.match(participantRoute, /force-dynamic/);
assert.match(hostRoute, /force-dynamic/);

assert.match(cancellation, /cafe_admin_cancel_room_server/);
assert.match(cancellation, /provider\.deleteRoom/);
assert.match(cancellation, /cafe_clear_room_binding_server/);
assert.match(cancellation, /CafeRoomCancellationMigrationUnavailableError/);
assert.match(adminRoute, /cancelCafeSessionAndDeleteRoom/);
assert.match(adminRoute, /provider_cleanup_pending/);
assert.match(adminRoute, /force-dynamic/);
assert.match(adminRoute, /Pre-migration fallback/);

assert.doesNotMatch(publicSessionsRoute, /roomUrl|providerRoomId|token|daily/i);
const auditFields = audit.match(/type CafeRoomAuditFields = \{[\s\S]*?\n\};/)?.[0] ?? "";
assert.match(auditFields, /sessionId/);
assert.match(auditFields, /opaqueParticipantId/);
assert.match(auditFields, /role/);
assert.match(auditFields, /outcome/);
assert.doesNotMatch(auditFields, /roomUrl|token|displayName|email|Authorization|profileId/);
const loggedObject = audit.match(/console\.info\("\[cafe-room\]", \{[\s\S]*?\n  \}\);/)?.[0] ?? "";
assert.match(loggedObject, /opaqueParticipantId/);
assert.doesNotMatch(loggedObject, /roomUrl|token|displayName|email|Authorization|profileId/);

assert.match(env, /CAFE_ROOM_PROVIDER_ENABLED=false/);
assert.match(env, /DAILY_API_KEY=/);
assert.match(env, /DAILY_DOMAIN=pratiqo\.daily\.co/);
assert.match(env, /CAFE_DAILY_ROOM_HMAC_SECRET=/);
assert.match(env, /CAFE_DAILY_PARTICIPANT_HMAC_SECRET=/);
assert.doesNotMatch(env, /NEXT_PUBLIC_DAILY|NEXT_PUBLIC_CAFE_DAILY/);

assert.match(embedDoc, /DailyIframe\.join\(\{ url, token \}\)/);
assert.match(embedDoc, /Do not allow `display-capture`/);
assert.match(embedDoc, /report path exists/);
assert.match(embedDoc, /Law 25/);
assert.match(embedDoc, /deletes or closes the provider room/);
assert.match(embedDoc, /Daily development-account verification/);
assert.match(embedDoc, /native removal control/);
assert.match(embedDoc, /Vercel/);

const oldCafe = process.env.CAFE_V1_ENABLED;
const oldRoom = process.env.CAFE_ROOM_PROVIDER_ENABLED;
try {
  delete process.env.CAFE_V1_ENABLED;
  delete process.env.CAFE_ROOM_PROVIDER_ENABLED;
  assert.equal(isCafeRoomProviderEnabled(), false);
  process.env.CAFE_V1_ENABLED = "true";
  assert.equal(isCafeRoomProviderEnabled(), false);
  process.env.CAFE_ROOM_PROVIDER_ENABLED = "true";
  assert.equal(isCafeRoomProviderEnabled(), true);
} finally {
  if (oldCafe === undefined) delete process.env.CAFE_V1_ENABLED;
  else process.env.CAFE_V1_ENABLED = oldCafe;
  if (oldRoom === undefined) delete process.env.CAFE_ROOM_PROVIDER_ENABLED;
  else process.env.CAFE_ROOM_PROVIDER_ENABLED = oldRoom;
}

console.log("[cafe:pr3a-contract] provider, authorization, cancellation and privacy contracts passed");
