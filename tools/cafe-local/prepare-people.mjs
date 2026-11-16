import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { localCafeEnv, root } from './env.mjs';

await localCafeEnv(); // Verifies the fixed local Docker identity; no hosted credentials.
const container = 'supabase_db_pr405-local-sandbox';
const sql = query => execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'], { input: query, encoding: 'utf8' }).trim();
const existing = sql("SELECT to_regclass('cafe_private.community_members') IS NOT NULL;");
assert.equal(existing, 't', 'Install the previously reviewed Cafe foundation in the local stack first');
assert.equal(sql("SELECT to_regclass('cafe_private.community_connections') IS NULL;"), 't', 'Already installed: do not replay the migration');
const before = sql("SELECT count(*) FROM cafe_private.community_members; SELECT count(*) FROM cafe_private.community_messages;");
const migration = readFileSync(resolve(root, 'supabase/migrations/20261116201115_cafe_people_first.sql'), 'utf8');
sql(`BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'; ${migration}\nNOTIFY pgrst, 'reload schema'; COMMIT;`);
assert.equal(sql("SELECT count(*) FROM cafe_private.community_members; SELECT count(*) FROM cafe_private.community_messages;"), before);
console.log('PASS: people migration installed on the fixed local stack; existing Cafe members/messages preserved. No hosted database contacted.');
