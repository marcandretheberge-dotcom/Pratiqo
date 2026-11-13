#!/usr/bin/env bash
set -euo pipefail

# Opt-in developer/CI validation. Never links to or modifies a hosted backend.
for cafe_secret in DAILY_API_KEY DAILY_DOMAIN CAFE_DAILY_ROOM_HMAC_SECRET CAFE_DAILY_PARTICIPANT_HMAC_SECRET; do
  if [[ -z "${!cafe_secret:-}" ]]; then
    echo "[cafe:room-browser] BLOCKED: $cafe_secret is missing" >&2
    exit 2
  fi
done
if [[ "${VERCEL_ENV:-}" == "production" ]]; then
  echo '[cafe:room-browser] Refusing a production environment' >&2
  exit 2
fi
command -v docker >/dev/null
command -v supabase >/dev/null
if [[ "$(supabase --version)" != "3.1.0" ]]; then
  echo '[cafe:room-browser] Requires the verified Supabase CLI version 3.1.0' >&2
  exit 2
fi

cafe_repo_root="$(pwd)"
cafe_phase='initialize_local_stack'
cafe_sandbox_dir="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/cafe-room-browser.XXXXXX")"
chmod 700 "$cafe_sandbox_dir"
touch "$cafe_sandbox_dir/.cafe-browser-sandbox"
cleanup() {
  local cafe_exit=$?
  local cafe_stopped=true
  local cafe_removed=true
  supabase stop --workdir "$cafe_sandbox_dir" --no-backup > /dev/null 2>&1 || { cafe_exit=1; cafe_stopped=false; }
  rm -rf -- "$cafe_sandbox_dir" || { cafe_exit=1; cafe_removed=false; }
  node - "$cafe_repo_root/artifacts/cafe-room-browser-live/report.json" "$cafe_exit" "$cafe_phase" "$cafe_stopped" "$cafe_removed" <<'REPORT'
const fs = require('node:fs');
const path = require('node:path');
const [file, code, phase, stopped, removed] = process.argv.slice(2);
let report = { status: 'FAIL', step: phase };
try { report = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
report.cleanup = { ...report.cleanup, localStackStopped: stopped === 'true', privateFilesRemoved: removed === 'true' };
if (code !== '0' && report.status !== 'BLOCKED') report.status = 'FAIL';
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, step: report.failedStep ?? report.step ?? phase, cleanup: report.cleanup }));
REPORT
  exit "$cafe_exit"
}
trap cleanup EXIT

# Raw CLI output may include local credentials. It stays in the private temp
# directory and is never uploaded or printed, including on failure.
supabase init --workdir "$cafe_sandbox_dir" > "$cafe_sandbox_dir/init.log" 2>&1
supabase start --workdir "$cafe_sandbox_dir" \
  --exclude realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor \
  > "$cafe_sandbox_dir/start.log" 2>&1
supabase status --workdir "$cafe_sandbox_dir" -o json > "$cafe_sandbox_dir/status.json"
chmod 600 "$cafe_sandbox_dir/status.json"

cafe_phase='apply_local_fixture_schema'
for cafe_sql in \
  tests/cafe/sql/browser-profiles.sql \
  supabase/migrations/20261110233000_cafe_secure_foundation.sql \
  supabase/migrations/20261111124000_cafe_daily_room_foundation.sql \
  supabase/migrations/20261111133000_cafe_daily_room_hardening.sql \
  supabase/migrations/20261111140000_cafe_daily_binding_race_hardening.sql; do
  supabase db query --workdir "$cafe_sandbox_dir" --file "$cafe_repo_root/$cafe_sql" \
    >> "$cafe_sandbox_dir/schema.log" 2>&1
done
supabase db query --workdir "$cafe_sandbox_dir" "NOTIFY pgrst, 'reload schema';" \
  >> "$cafe_sandbox_dir/schema.log" 2>&1

export CAFE_BROWSER_SANDBOX_DIR="$cafe_sandbox_dir"
export CAFE_BROWSER_STATUS_FILE="$cafe_sandbox_dir/status.json"
cafe_phase='real_browser_journey'
node --import tsx scripts/cafe-room-browser-live.ts
