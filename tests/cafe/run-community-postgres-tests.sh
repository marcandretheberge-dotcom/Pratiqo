#!/usr/bin/env bash
set -euo pipefail

# Native PostgreSQL integration runner. Use a fresh disposable CI database:
# these are the real, non-idempotent migrations and synthetic account fixtures.
CAFE_DB_HOST="${PGHOST:-127.0.0.1}"
CAFE_DB_PORT="${PGPORT:-5432}"
CAFE_DB_USER="${PGUSER:-postgres}"
CAFE_DB_NAME="${PGDATABASE:-postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"
PSQL=(psql -X -h "$CAFE_DB_HOST" -p "$CAFE_DB_PORT" -U "$CAFE_DB_USER" -d "$CAFE_DB_NAME" -v ON_ERROR_STOP=1 -qAt)

"${PSQL[@]}" -f tests/cafe/sql/setup.sql
"${PSQL[@]}" -f supabase/migrations/20261110233000_cafe_secure_foundation.sql
"${PSQL[@]}" -f supabase/migrations/20261111124000_cafe_daily_room_foundation.sql
"${PSQL[@]}" -f supabase/migrations/20261111133000_cafe_daily_room_hardening.sql
"${PSQL[@]}" -f supabase/migrations/20261111140000_cafe_daily_binding_race_hardening.sql
"${PSQL[@]}" -f supabase/migrations/20261113111051_cafe_community_text_first.sql
"${PSQL[@]}" -f tests/cafe/sql/community.sql

CAFE_TEMP_DIR=$(mktemp -d)
CAFE_TEST_PREFIX="cafe-community-$$"
CAFE_GATE_NUMBER=0
cleanup() {
  local status=$?
  trap - EXIT
  local child
  while read -r child; do
    [[ -z "$child" ]] || kill "$child" 2>/dev/null || true
  done < <(jobs -pr)
  wait 2>/dev/null || true
  if (( status != 0 )); then
    local log
    for log in "$CAFE_TEMP_DIR"/*.log; do
      [[ -f "$log" ]] || continue
      echo "[cafe:community-postgres] $(basename "$log")" >&2
      cat "$log" >&2
    done
  fi
  rm -rf "$CAFE_TEMP_DIR"
  exit "$status"
}
trap cleanup EXIT

fail() {
  echo "[cafe:community-postgres] $*" >&2
  exit 1
}

# Poll observable database state instead of assuming that a fixed sleep made
# another process acquire a lock. Each contender also has a bounded SQL timeout.
wait_for_sql() {
  local query=$1 expected=$2 description=$3 attempt actual
  for ((attempt=0; attempt<100; attempt++)); do
    actual=$("${PSQL[@]}" -c "$query")
    if [[ "$actual" == "$expected" ]]; then return; fi
    sleep 0.05
  done
  fail "timed out waiting for $description (last result: $actual)"
}

# A persistent psql connection accepts COMMIT only after the test has observed
# the other connection(s) waiting. This guarantees real overlap, independent of
# process launch order or CI scheduling speed.
start_gate() {
  local transaction_sql=$1
  CAFE_GATE_NUMBER=$((CAFE_GATE_NUMBER + 1))
  CAFE_GATE_NAME="$CAFE_TEST_PREFIX-gate-$CAFE_GATE_NUMBER"
  local fifo="$CAFE_TEMP_DIR/gate-$CAFE_GATE_NUMBER.fifo"
  mkfifo "$fifo"
  exec {CAFE_GATE_FD}<>"$fifo"
  PGAPPNAME="$CAFE_GATE_NAME" "${PSQL[@]}" <"$fifo" >"$CAFE_TEMP_DIR/gate-$CAFE_GATE_NUMBER.log" 2>&1 &
  CAFE_GATE_PID=$!
  printf '%s\n' "$transaction_sql" >&"$CAFE_GATE_FD"
  wait_for_sql "SELECT EXISTS (
    SELECT 1 FROM pg_stat_activity activity JOIN pg_locks held ON held.pid=activity.pid
    WHERE activity.application_name='$CAFE_GATE_NAME' AND activity.state='idle in transaction'
      AND held.locktype='advisory' AND held.granted
  );" t "the gate transaction to hold the community lock"
}

release_gate() {
  printf 'COMMIT;\n\\q\n' >&"$CAFE_GATE_FD"
  exec {CAFE_GATE_FD}>&-
  if ! wait "$CAFE_GATE_PID"; then fail "gate transaction failed"; fi
}

CAFE_OWNER='00000000-0000-4000-8000-000000000002'
CAFE_FIRST='00000000-0000-4000-8000-000000000003'
CAFE_SECOND='00000000-0000-4000-8000-000000000004'

"${PSQL[@]}" <<'SQL'
SET ROLE service_role;
DO $profiles$
DECLARE member_id uuid; result jsonb;
BEGIN
 FOREACH member_id IN ARRAY ARRAY[
  '00000000-0000-4000-8000-000000000002'::uuid,
  '00000000-0000-4000-8000-000000000003'::uuid,
  '00000000-0000-4000-8000-000000000004'::uuid
 ] LOOP
  result:=public.cafe_community_command_server(member_id,'profile.save',jsonb_build_object(
   'displayName','Native concurrency member','nativeLanguages',jsonb_build_array('fr'),
   'learningLanguages',jsonb_build_array('cmn'),'adultAgreement',true,'rulesAgreement',true));
  IF result->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Profile fixture failed: %',result; END IF;
 END LOOP;
END $profiles$;
SQL

CAFE_ROOM_ID=$("${PSQL[@]}" -c "SET ROLE service_role;
 SELECT public.cafe_community_command_server('$CAFE_OWNER','room.create',jsonb_build_object(
  'requestId','20000000-0000-4000-8000-000000000001','title','Native last-seat race',
  'languages',jsonb_build_array('fr','cmn'),'mode','now','capacity',2
 ))->>'roomId';")
[[ "$CAFE_ROOM_ID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]] || fail "room fixture did not return an ID"

# Both joins begin before either can make its capacity decision. After the
# gate commits, each RPC must read fresh state after acquiring its own lock.
start_gate "BEGIN; SET LOCAL idle_in_transaction_session_timeout='25s'; SELECT cafe_private.community_lock();"
for contender in first second; do
  if [[ "$contender" == first ]]; then member_id=$CAFE_FIRST; else member_id=$CAFE_SECOND; fi
  PGAPPNAME="$CAFE_TEST_PREFIX-join-$contender" "${PSQL[@]}" -c "
    SET statement_timeout='20s'; SET lock_timeout='15s'; SET ROLE service_role;
    WITH decision AS MATERIALIZED (
      SELECT public.cafe_community_command_server('$member_id','room.join',jsonb_build_object('roomId','$CAFE_ROOM_ID')) AS result
    ) SELECT CASE WHEN result->>'ok'='true' THEN 'ok' ELSE coalesce(result->>'code','invalid_response') END FROM decision;
  " >"$CAFE_TEMP_DIR/join-$contender.log" 2>&1 &
  if [[ "$contender" == first ]]; then CAFE_FIRST_PID=$!; else CAFE_SECOND_PID=$!; fi
done
wait_for_sql "SELECT count(*) FROM pg_stat_activity activity
 WHERE activity.application_name IN ('$CAFE_TEST_PREFIX-join-first','$CAFE_TEST_PREFIX-join-second')
 AND EXISTS(SELECT 1 FROM pg_locks pending WHERE pending.pid=activity.pid AND pending.locktype='advisory' AND NOT pending.granted);" 2 "both separate join connections to wait"
release_gate
if ! wait "$CAFE_FIRST_PID"; then fail "first join connection failed or timed out"; fi
if ! wait "$CAFE_SECOND_PID"; then fail "second join connection failed or timed out"; fi
CAFE_FIRST_RESULT=$(<"$CAFE_TEMP_DIR/join-first.log")
CAFE_SECOND_RESULT=$(<"$CAFE_TEMP_DIR/join-second.log")
if [[ "$CAFE_FIRST_RESULT" == ok && "$CAFE_SECOND_RESULT" == capacity_full ]]; then
  CAFE_WINNER=$CAFE_FIRST
elif [[ "$CAFE_SECOND_RESULT" == ok && "$CAFE_FIRST_RESULT" == capacity_full ]]; then
  CAFE_WINNER=$CAFE_SECOND
else
  fail "last-seat race did not produce exactly one success and one capacity_full"
fi
CAFE_MEMBERSHIP_COUNTS=$("${PSQL[@]}" -c "SELECT
 count(*)::text || ':' || count(*) FILTER (WHERE profile_id='$CAFE_OWNER')::text || ':' ||
 count(*) FILTER (WHERE profile_id='$CAFE_WINNER')::text
 FROM cafe_private.community_memberships WHERE room_id='$CAFE_ROOM_ID' AND left_at IS NULL;")
[[ "$CAFE_MEMBERSHIP_COUNTS" == '2:1:1' ]] || fail "committed membership did not contain exactly creator plus winning member"
echo '[cafe:community-postgres] separate-connection last-seat race passed'

# The block is uncommitted when the message RPC begins and waits. After it
# commits, the waiting RPC must recheck membership/block authorization instead
# of delivering a message from an earlier statement snapshot.
start_gate "BEGIN; SET LOCAL idle_in_transaction_session_timeout='25s'; SET ROLE service_role;
 SELECT public.cafe_community_command_server('$CAFE_OWNER','member.block',jsonb_build_object('targetId','$CAFE_WINNER'));"
PGAPPNAME="$CAFE_TEST_PREFIX-message" "${PSQL[@]}" -c "
 SET statement_timeout='20s'; SET lock_timeout='15s'; SET ROLE service_role;
 WITH decision AS MATERIALIZED (
  SELECT public.cafe_community_command_server('$CAFE_WINNER','message.send',jsonb_build_object(
   'roomId','$CAFE_ROOM_ID','requestId','20000000-0000-4000-8000-000000000002',
   'body','Must not be delivered after block'
  )) AS result
 ) SELECT CASE WHEN result->>'ok'='true' THEN 'ok' ELSE coalesce(result->>'code','invalid_response') END FROM decision;
" >"$CAFE_TEMP_DIR/message.log" 2>&1 &
CAFE_MESSAGE_PID=$!
wait_for_sql "SELECT count(*) FROM pg_stat_activity activity
 WHERE activity.application_name='$CAFE_TEST_PREFIX-message'
 AND EXISTS(SELECT 1 FROM pg_locks pending WHERE pending.pid=activity.pid AND pending.locktype='advisory' AND NOT pending.granted);" 1 "message connection to wait behind the uncommitted block"
release_gate
if ! wait "$CAFE_MESSAGE_PID"; then fail "message connection failed or deadlocked"; fi
[[ "$(<"$CAFE_TEMP_DIR/message.log")" == room_access_denied ]] || fail "waiting message was not denied after the block committed"
[[ "$("${PSQL[@]}" -c "SELECT count(*) FROM cafe_private.community_messages WHERE request_id='20000000-0000-4000-8000-000000000002';")" == 0 ]] || fail "blocked message was committed"
[[ "$("${PSQL[@]}" -c "SELECT count(*) FROM cafe_private.community_blocks WHERE blocker_id='$CAFE_OWNER' AND blocked_id='$CAFE_WINNER';")" == 1 ]] || fail "block transaction did not commit"
[[ "$("${PSQL[@]}" -c "SELECT count(*) FROM cafe_private.community_memberships WHERE room_id='$CAFE_ROOM_ID' AND left_at IS NULL;")" == 1 ]] || fail "blocked member retained active membership"
echo '[cafe:community-postgres] concurrent block/message authorization passed without deadlock'
echo '[cafe:community-postgres] native SQL permissions, behavior and concurrency tests passed'
