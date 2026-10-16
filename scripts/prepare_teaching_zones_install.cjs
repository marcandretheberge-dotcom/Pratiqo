// Generates a reviewable bundle only. Never connects to a database.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
// Git may check SQL out as CRLF on Windows. Hash/generate canonical LF SQL.
const normalizeSql = sql => sql.replace(/\r\n/g, '\n').replace(/\r$/, '');
function build() {
  const original = normalizeSql(fs.readFileSync(path.join(root, 'supabase/migrations/128_teacher_teaching_zones.sql'), 'utf8'));
  if (crypto.createHash('sha256').update(original).digest('hex') !== '62d7522a59fb6452b5316bf464d4d627ed60e06f29ae90d14178a81720ac03c5') {
    throw new Error('Historical128 checksum changed; review required');
  }
  const marker = '\nINSERT INTO public.teacher_teaching_zones (';
  if (original.split(marker).length !== 2) throw new Error('128 shape changed; review required');
  // Deliberately omit the unverified historical backfill, not user-entered zones.
  // Store the actual executed SQL in migration history, never pretend full128 ran.
  const schema = original.slice(0, original.indexOf(marker));
  const hardening = normalizeSql(fs.readFileSync(path.join(root, 'supabase/migrations/134_harden_teacher_teaching_zones.sql'), 'utf8'));
  const body = hardening.replace(/^BEGIN;\s*$/gm, '').replace(/^COMMIT;\s*$/gm, '');
  const quote = s => "'" + s.replaceAll("'", "''") + "'";
  return `BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='120s';
LOCK TABLE public.teachers, supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN IF to_regclass('public.teacher_teaching_zones') IS NOT NULL OR EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version IN ('128','134')) THEN RAISE EXCEPTION 'Expected fresh128/134 installation'; END IF; END $$;
${schema}\n${body}
INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES
('128','teacher_teaching_zones_schema_only_no_unverified_backfill',ARRAY[${quote(schema)}]),
('134','harden_teacher_teaching_zones',ARRAY[${quote(body)}]);
DO $$ BEGIN
IF has_function_privilege('anon','public.replace_teacher_teaching_zones(text,jsonb)','EXECUTE') OR has_function_privilege('authenticated','public.replace_teacher_teaching_zones(text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Unsafe RPC grant'; END IF;
IF EXISTS(SELECT 1 FROM public.teacher_teaching_zones) THEN RAISE EXCEPTION 'Unexpected backfill'; END IF;
END $$;
NOTIFY pgrst,'reload schema'; COMMIT;`;
}
function plan(history) {
  if (!Array.isArray(history)) throw new Error('Explicit migration history required');
  const versions = new Set(history.map(row => row.version));
  if (!versions.has('128')) {
    if (versions.has('134')) throw new Error('Partial/inconsistent128/134 history');
    return { mode: 'controlled-bootstrap', sql: build(), standardPushAllowed: false };
  }
  const row = history.find(row => row.version === '128');
  if (row.name !== 'teacher_teaching_zones_schema_only_no_unverified_backfill' ||
      !Array.isArray(row.statements) || row.statements.length !== 1 ||
      typeof row.statements[0] !== 'string' || normalizeSql(row.statements[0]) !== buildSchema()) {
    throw new Error('Historical128/provenance requires separate review; no automatic backfill or history repair');
  }
  if (!versions.has('134')) throw new Error('Incomplete controlled installation');
  const hardening = normalizeSql(fs.readFileSync(path.join(root, 'supabase/migrations/134_harden_teacher_teaching_zones.sql'), 'utf8'))
    .replace(/^BEGIN;\s*$/gm, '').replace(/^COMMIT;\s*$/gm, '');
  const fix = history.find(row => row.version === '134');
  if (!Array.isArray(fix.statements) || fix.statements.length !== 1 || typeof fix.statements[0] !== 'string' || normalizeSql(fix.statements[0]) !== hardening) {
    throw new Error('134 executed SQL differs; review required');
  }
  return { mode: 'standard-after-bootstrap', skippedVersions: ['128','134'], standardPushAllowed: true };
}
function buildSchema() {
  const original = normalizeSql(fs.readFileSync(path.join(root, 'supabase/migrations/128_teacher_teaching_zones.sql'), 'utf8'));
  return original.slice(0, original.indexOf('\nINSERT INTO public.teacher_teaching_zones ('));
}
module.exports = { build, plan, buildSchema };
if (require.main === module) {
  if (!process.argv[2]) throw new Error('Explicit output path required');
  const sql = build();
  fs.writeFileSync(process.argv[2], sql, { flag: 'wx' });
  console.log('Prepared only. SHA256: ' + crypto.createHash('sha256').update(sql).digest('hex'));
}
