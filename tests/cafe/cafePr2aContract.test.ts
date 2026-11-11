import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
const migration = read("supabase/migrations/20261110233000_cafe_secure_foundation.sql");
const reservationRoute = read("app/api/cafe/reservations/route.ts");
const publicRoute = read("app/api/cafe/sessions/route.ts");
const adminRoute = read("app/api/admin/cafe/sessions/route.ts");

assert.match(migration, /CREATE TABLE public\.cafe_sessions/);
assert.match(migration, /CREATE TABLE public\.cafe_reservations/);
assert.match(migration, /status IN \('draft', 'published', 'cancelled'\)/);
assert.match(migration, /status IN \('confirmed', 'cancelled'\)/);
assert.doesNotMatch(migration, /attended|no_show|waitlist/i);

assert.match(migration, /ENABLE ROW LEVEL SECURITY/g);
assert.match(migration, /REVOKE ALL ON public\.cafe_sessions, public\.cafe_reservations[\s\S]*?service_role/);
assert.match(migration, /cafe_sessions_deny_direct_clients/);
assert.match(migration, /cafe_reservations_deny_direct_clients/);

assert.match(migration, /UNIQUE \(session_id, profile_id\)/);
assert.match(migration, /FOR NO KEY UPDATE/);
assert.match(migration, /upcoming_confirmed >= 3/);
assert.match(migration, /session_confirmed >= s\.max_participants/);
assert.match(migration, /version_conflict/);
assert.match(migration, /request_id_reused/);
assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\('cafe_quota:'/);
assert.match(migration, /au\.is_anonymous = false/);
assert.match(migration, /au\.deleted_at IS NULL/);
assert.match(migration, /au\.banned_until IS NULL/);

assert.match(migration, /REFERENCES public\.profiles\(id\) ON DELETE CASCADE/);
assert.match(migration, /host_profile_id uuid REFERENCES public\.profiles\(id\) ON DELETE SET NULL/);
assert.match(migration, /handle_profile_removal/);

assert.match(migration, /CREATE OR REPLACE FUNCTION public\.cafe_public_sessions/);
const publicRpc = migration.match(/CREATE OR REPLACE FUNCTION public\.cafe_public_sessions[\s\S]*?GRANT EXECUTE[\s\S]*?;/)?.[0] ?? "";
assert.doesNotMatch(publicRpc, /profile_id|host_profile_id|created_by_profile_id|email/i);
assert.match(publicRpc, /remaining_spots/);

assert.match(reservationRoute, /authenticateCafeRequest/);
assert.match(reservationRoute, /rateLimitByIp/);
assert.match(reservationRoute, /callReservationRpc/);
assert.match(reservationRoute, /40P01/);
assert.match(reservationRoute, /55P03/);
assert.match(reservationRoute, /40001/);
assert.match(reservationRoute, /cafe_set_reservation_server/);
assert.doesNotMatch(reservationRoute, /\.from\(["']cafe_reservations/);
assert.match(adminRoute, /requireAdminApi/);
assert.match(reservationRoute, /isCafeV1Enabled/);
assert.match(publicRoute, /isCafeV1Enabled/);
assert.match(adminRoute, /isCafeV1Enabled/);
assert.match(adminRoute, /cafe_admin_create_draft_server/);
assert.match(adminRoute, /cafe_admin_reassign_host_server/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.cafe_admin_reassign_host_server/);
assert.match(publicRoute, /cafe_public_sessions/);

console.log("[cafe:pr2a-contract] static contract passed");
