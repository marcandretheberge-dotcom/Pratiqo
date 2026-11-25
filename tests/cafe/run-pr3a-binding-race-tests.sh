#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${PGHOST:-127.0.0.1}"
DB_PORT="${PGPORT:-5432}"
DB_USER="${PGUSER:-postgres}"
DB_NAME="${PGDATABASE:-postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"
PSQL=(psql -X -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -qAt)

"${PSQL[@]}" -f supabase/migrations/20261111140000_cafe_daily_binding_race_hardening.sql

SEARCH_PATH_OK=$("${PSQL[@]}" -c "SELECT EXISTS (
  SELECT 1
    FROM pg_proc p
    CROSS JOIN LATERAL unnest(coalesce(p.proconfig, ARRAY[]::text[])) setting
   WHERE p.oid = 'public.cafe_bind_room_server(uuid,text,text)'::regprocedure
     AND split_part(setting,'=',1) = 'search_path'
     AND replace(split_part(setting,'=',2),'\"','') = ''
);")
if [[ "$SEARCH_PATH_OK" != "t" ]]; then
  echo "serialized binding RPC does not have an empty search_path" >&2
  exit 1
fi

# Scenario A: cancellation owns the session row first. Binding waits and then
# returns session_unavailable without writing a private binding.
"${PSQL[@]}" -c "SET ROLE service_role;
SELECT public.cafe_admin_create_draft_server(
  '00000000-0000-4000-8000-000000000001',
  'binding-race-cancel-first','Cancel first','fr',NULL,NULL,
  clock_timestamp()+interval '1 day',30,8,
  '00000000-0000-4000-8000-000000000004'
);
SELECT public.cafe_admin_publish_server(
  '00000000-0000-4000-8000-000000000001','binding-race-cancel-first'
);" >/dev/null
SESSION_A=$("${PSQL[@]}" -c "SELECT id FROM public.cafe_sessions WHERE slug='binding-race-cancel-first';")
A_LOCK=$(mktemp)
A_BIND=$(mktemp)
(
  "${PSQL[@]}" -c "BEGIN;
    SELECT id FROM public.cafe_sessions WHERE id='$SESSION_A' FOR UPDATE;
    UPDATE public.cafe_sessions SET status='cancelled' WHERE id='$SESSION_A';
    SELECT pg_sleep(1.0);
    COMMIT;" >"$A_LOCK" 2>&1
) &
A1=$!
sleep 0.15
(
  "${PSQL[@]}" -c "SET ROLE service_role;
    SELECT public.cafe_bind_room_server(
      '$SESSION_A','daily','cafe-aaaaaaaaaaaaaaaaaaaaaaaa'
    );" >"$A_BIND" 2>&1
) &
A2=$!
wait "$A1"
wait "$A2"
if ! grep -q '"session_unavailable"' "$A_BIND"; then
  echo "binding was not rejected after cancellation won the row lock" >&2
  cat "$A_LOCK" "$A_BIND" >&2
  exit 1
fi
if [[ "$("${PSQL[@]}" -c "SELECT count(*) FROM cafe_private.room_bindings WHERE session_id='$SESSION_A';")" != "0" ]]; then
  echo "cancel-first race left a room binding behind" >&2
  exit 1
fi
rm -f "$A_LOCK" "$A_BIND"

# Scenario B: binding owns KEY SHARE first. Cancellation waits, then returns the
# persisted binding so the server can delete the provider room.
"${PSQL[@]}" -c "SET ROLE service_role;
SELECT public.cafe_admin_create_draft_server(
  '00000000-0000-4000-8000-000000000001',
  'binding-race-bind-first','Bind first','es',NULL,NULL,
  clock_timestamp()+interval '1 day',30,8,
  '00000000-0000-4000-8000-000000000004'
);
SELECT public.cafe_admin_publish_server(
  '00000000-0000-4000-8000-000000000001','binding-race-bind-first'
);" >/dev/null
SESSION_B=$("${PSQL[@]}" -c "SELECT id FROM public.cafe_sessions WHERE slug='binding-race-bind-first';")
B_BIND=$(mktemp)
B_CANCEL=$(mktemp)
(
  "${PSQL[@]}" -c "BEGIN; SET ROLE service_role;
    SELECT public.cafe_bind_room_server(
      '$SESSION_B','daily','cafe-bbbbbbbbbbbbbbbbbbbbbbbb'
    );
    SELECT pg_sleep(1.0);
    COMMIT;" >"$B_BIND" 2>&1
) &
B1=$!
sleep 0.15
(
  "${PSQL[@]}" -c "SET ROLE service_role;
    SELECT public.cafe_admin_cancel_room_server(
      '00000000-0000-4000-8000-000000000001','binding-race-bind-first'
    );" >"$B_CANCEL" 2>&1
) &
B2=$!
wait "$B1"
wait "$B2"
if ! grep -q '"ok": true' "$B_BIND"; then
  echo "bind-first race did not persist the deterministic binding" >&2
  cat "$B_BIND" "$B_CANCEL" >&2
  exit 1
fi
if ! grep -q '"providerRoomId": "cafe-bbbbbbbbbbbbbbbbbbbbbbbb"' "$B_CANCEL"; then
  echo "cancellation did not recover the binding after waiting" >&2
  cat "$B_BIND" "$B_CANCEL" >&2
  exit 1
fi
if [[ "$("${PSQL[@]}" -c "SELECT status FROM public.cafe_sessions WHERE id='$SESSION_B';")" != "cancelled" ]]; then
  echo "bind-first session was not cancelled" >&2
  exit 1
fi
rm -f "$B_BIND" "$B_CANCEL"

echo "[cafe:pr3a-binding-race] cancellation/binding serialization passed"
