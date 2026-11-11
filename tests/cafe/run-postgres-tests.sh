#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${PGHOST:-127.0.0.1}"
DB_PORT="${PGPORT:-5432}"
DB_USER="${PGUSER:-postgres}"
DB_NAME="${PGDATABASE:-postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"

PSQL=(psql -X -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -qAt)

"${PSQL[@]}" -f tests/cafe/sql/setup.sql
"${PSQL[@]}" -f supabase/migrations/20261110233000_cafe_secure_foundation.sql
"${PSQL[@]}" -f tests/cafe/sql/functional.sql

# Direct table access must stay closed.
if "${PSQL[@]}" -c "SET ROLE anon; SELECT * FROM public.cafe_sessions LIMIT 1;" >/dev/null 2>&1; then
  echo "anon unexpectedly read cafe_sessions" >&2
  exit 1
fi
if "${PSQL[@]}" -c "SET ROLE authenticated; INSERT INTO public.cafe_reservations(session_id,profile_id,status,version,last_request_id,last_action,last_expected_version) SELECT id,'00000000-0000-4000-8000-000000000003','confirmed',1,'40000000-0000-4000-8000-000000000001','reserve',0 FROM public.cafe_sessions LIMIT 1;" >/dev/null 2>&1; then
  echo "authenticated unexpectedly wrote cafe_reservations" >&2
  exit 1
fi
if "${PSQL[@]}" -c "SET ROLE service_role; SELECT * FROM public.cafe_reservations LIMIT 1;" >/dev/null 2>&1; then
  echo "service_role unexpectedly read cafe_reservations directly" >&2
  exit 1
fi

# Public RPC is callable and does not expose IDs.
PUBLIC_COLS=$("${PSQL[@]}" -c "SET ROLE anon; SELECT jsonb_object_keys(to_jsonb(x)) FROM (SELECT * FROM public.cafe_public_sessions(NULL) LIMIT 1) x ORDER BY 1;" | tr '\n' ' ')
if [[ "$PUBLIC_COLS" == *"profile_id"* || "$PUBLIC_COLS" == *"host_profile_id"* || "$PUBLIC_COLS" == *"id "* ]]; then
  echo "public Cafe projection leaked an identifier: $PUBLIC_COLS" >&2
  exit 1
fi

# Published material terms are frozen.
if "${PSQL[@]}" -c "UPDATE public.cafe_sessions SET max_participants=9 WHERE slug='fr-es-test';" >/dev/null 2>&1; then
  echo "published material terms were mutable" >&2
  exit 1
fi


# Function privileges: public/browser roles may not execute mutation/admin RPCs.
for FN in   "public.cafe_set_reservation_server(uuid,text,text,bigint,uuid)"   "public.cafe_my_reservations_server(uuid)"   "public.cafe_admin_create_draft_server(uuid,text,text,text,text,text,timestamptz,integer,integer,uuid)"   "public.cafe_admin_publish_server(uuid,text)"   "public.cafe_admin_cancel_server(uuid,text)"   "public.cafe_admin_reassign_host_server(uuid,text,uuid)"; do
  HAS_PUBLIC=$("${PSQL[@]}" -c "SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    WHERE p.oid = '$FN'::regprocedure
      AND acl.grantee = 0
      AND acl.privilege_type = 'EXECUTE'
  );")
  if [[ "$HAS_PUBLIC" != "f" ]]; then
    echo "PUBLIC unexpectedly has EXECUTE on $FN" >&2
    exit 1
  fi
  for ROLE in anon authenticated; do
    HAS=$("${PSQL[@]}" -c "SELECT has_function_privilege('$ROLE', '$FN', 'EXECUTE');")
    if [[ "$HAS" != "f" ]]; then
      echo "$ROLE unexpectedly has EXECUTE on $FN" >&2
      exit 1
    fi
  done
  HAS=$("${PSQL[@]}" -c "SELECT has_function_privilege('service_role', '$FN', 'EXECUTE');")
  if [[ "$HAS" != "t" ]]; then
    echo "service_role lacks EXECUTE on $FN" >&2
    exit 1
  fi
done

# Anonymous/banned auth users are rejected even through service-only RPC.
"${PSQL[@]}" -c "UPDATE auth.users SET is_anonymous=true WHERE id='00000000-0000-4000-8000-000000000004';"
if "${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_set_reservation_server('00000000-0000-4000-8000-000000000004','fr-es-test','reserve',0,'41000000-0000-4000-8000-000000000001');" >/dev/null 2>&1; then
  echo "anonymous auth user unexpectedly passed database actor guard" >&2
  exit 1
fi
"${PSQL[@]}" -c "UPDATE auth.users SET is_anonymous=false WHERE id='00000000-0000-4000-8000-000000000004';"

# Last-place race: capacity 1, two distinct users, exactly one confirmation.
"${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_admin_create_draft_server('00000000-0000-4000-8000-000000000001','race-one','Race','fr',NULL,NULL,clock_timestamp()+interval '8 days',45,1,'00000000-0000-4000-8000-000000000002'); SELECT public.cafe_admin_publish_server('00000000-0000-4000-8000-000000000001','race-one');"

OUT1=$(mktemp)
OUT2=$(mktemp)
(
  "${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_set_reservation_server('00000000-0000-4000-8000-000000000003','race-one','reserve',0,'50000000-0000-4000-8000-000000000001');" >"$OUT1"
) &
P1=$!
(
  "${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_set_reservation_server('00000000-0000-4000-8000-000000000004','race-one','reserve',0,'50000000-0000-4000-8000-000000000002');" >"$OUT2"
) &
P2=$!
wait "$P1"
wait "$P2"

COUNT=$("${PSQL[@]}" -c "SELECT count(*) FROM public.cafe_reservations r JOIN public.cafe_sessions s ON s.id=r.session_id WHERE s.slug='race-one' AND r.status='confirmed';")
if [[ "$COUNT" != "1" ]]; then
  echo "capacity race produced $COUNT confirmations" >&2
  cat "$OUT1" "$OUT2" >&2
  exit 1
fi
if ! grep -q '"capacity_full"' "$OUT1" && ! grep -q '"capacity_full"' "$OUT2"; then
  echo "losing reservation did not report capacity_full" >&2
  cat "$OUT1" "$OUT2" >&2
  exit 1
fi

rm -f "$OUT1" "$OUT2"

# Same request UUID concurrently: one state transition, no raw uniqueness error.
"${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_admin_create_draft_server('00000000-0000-4000-8000-000000000001','same-request','Same request','fr',NULL,NULL,clock_timestamp()+interval '9 days',45,2,'00000000-0000-4000-8000-000000000002'); SELECT public.cafe_admin_publish_server('00000000-0000-4000-8000-000000000001','same-request');"
SR1=$(mktemp)
SR2=$(mktemp)
(
  "${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_set_reservation_server('00000000-0000-4000-8000-000000000004','same-request','reserve',0,'51000000-0000-4000-8000-000000000001');" >"$SR1"
) &
S1=$!
(
  "${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_set_reservation_server('00000000-0000-4000-8000-000000000004','same-request','reserve',0,'51000000-0000-4000-8000-000000000001');" >"$SR2"
) &
S2=$!
wait "$S1"; wait "$S2"
SC=$("${PSQL[@]}" -c "SELECT count(*) FROM public.cafe_reservations r JOIN public.cafe_sessions s ON s.id=r.session_id WHERE s.slug='same-request' AND r.profile_id='00000000-0000-4000-8000-000000000004';")
if [[ "$SC" != "1" ]]; then
  echo "same request created $SC rows" >&2
  cat "$SR1" "$SR2" >&2
  exit 1
fi
if ! grep -q '"replay": true' "$SR1" && ! grep -q '"replay": true' "$SR2"; then
  echo "same concurrent request did not produce an idempotent replay" >&2
  cat "$SR1" "$SR2" >&2
  exit 1
fi

# Clear the idempotency-test reservation so the quota race starts from exactly two active reservations.
"${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_set_reservation_server('00000000-0000-4000-8000-000000000004','same-request','cancel',1,'51000000-0000-4000-8000-000000000002');" >/dev/null

# Quota race: actor already has two future reservations; two concurrent third attempts across different sessions -> exactly one succeeds.
for N in qrace-base1 qrace-base2 qrace-a qrace-b; do
  "${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_admin_create_draft_server('00000000-0000-4000-8000-000000000001','$N','$N','pt',NULL,NULL,clock_timestamp()+interval '10 days',45,12,'00000000-0000-4000-8000-000000000002'); SELECT public.cafe_admin_publish_server('00000000-0000-4000-8000-000000000001','$N');"
done
"${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_set_reservation_server('00000000-0000-4000-8000-000000000004','qrace-base1','reserve',0,'52000000-0000-4000-8000-000000000001'); SELECT public.cafe_set_reservation_server('00000000-0000-4000-8000-000000000004','qrace-base2','reserve',0,'52000000-0000-4000-8000-000000000002');"
QR1=$(mktemp)
QR2=$(mktemp)
(
  "${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_set_reservation_server('00000000-0000-4000-8000-000000000004','qrace-a','reserve',0,'52000000-0000-4000-8000-000000000003');" >"$QR1"
) &
Q1=$!
(
  "${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_set_reservation_server('00000000-0000-4000-8000-000000000004','qrace-b','reserve',0,'52000000-0000-4000-8000-000000000004');" >"$QR2"
) &
Q2=$!
wait "$Q1"; wait "$Q2"
QC=$("${PSQL[@]}" -c "SELECT count(*) FROM public.cafe_reservations r JOIN public.cafe_sessions s ON s.id=r.session_id WHERE r.profile_id='00000000-0000-4000-8000-000000000004' AND r.status='confirmed' AND s.status='published' AND s.starts_at>clock_timestamp() AND s.slug LIKE 'qrace-%';")
if [[ "$QC" != "3" ]]; then
  echo "quota race ended with $QC active reservations instead of 3" >&2
  cat "$QR1" "$QR2" >&2
  exit 1
fi
if ! grep -q '"reservation_limit"' "$QR1" && ! grep -q '"reservation_limit"' "$QR2"; then
  echo "quota race loser did not receive reservation_limit" >&2
  cat "$QR1" "$QR2" >&2
  exit 1
fi

rm -f "$SR1" "$SR2" "$QR1" "$QR2"



# Hard profile delete: hosted future session is cancelled/detached and reservations cascade away.
"${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_admin_create_draft_server('00000000-0000-4000-8000-000000000001','hard-delete','Hard delete','de',NULL,NULL,clock_timestamp()+interval '11 days',45,4,'00000000-0000-4000-8000-000000000004'); SELECT public.cafe_admin_publish_server('00000000-0000-4000-8000-000000000001','hard-delete'); SELECT public.cafe_set_reservation_server('00000000-0000-4000-8000-000000000004','hard-delete','reserve',0,'53000000-0000-4000-8000-000000000001');"
"${PSQL[@]}" -c "DELETE FROM public.profiles WHERE id='00000000-0000-4000-8000-000000000004';"
if [[ "$("${PSQL[@]}" -c "SELECT count(*) FROM public.cafe_reservations WHERE profile_id='00000000-0000-4000-8000-000000000004';")" != "0" ]]; then
  echo "hard-deleted profile left Cafe reservations behind" >&2
  exit 1
fi
HD=$("${PSQL[@]}" -c "SELECT status||':'||coalesce(host_profile_id::text,'null') FROM public.cafe_sessions WHERE slug='hard-delete';")
if [[ "$HD" != "cancelled:null" ]]; then
  echo "hard-deleted host left unsafe session state: $HD" >&2
  exit 1
fi

# Recreate U2 for reserve-vs-delete race.
INSERT_SQL="INSERT INTO public.profiles(id,name,email,role) VALUES ('00000000-0000-4000-8000-000000000004','U2','u2@example.test','teacher');"
"${PSQL[@]}" -c "$INSERT_SQL"
"${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_admin_create_draft_server('00000000-0000-4000-8000-000000000001','delete-race','Delete race','fr',NULL,NULL,clock_timestamp()+interval '12 days',45,2,'00000000-0000-4000-8000-000000000002'); SELECT public.cafe_admin_publish_server('00000000-0000-4000-8000-000000000001','delete-race');"
DR1=$(mktemp)
DR2=$(mktemp)
(
  "${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_set_reservation_server('00000000-0000-4000-8000-000000000004','delete-race','reserve',0,'54000000-0000-4000-8000-000000000001');" >"$DR1" 2>&1 || true
) &
D1=$!
(
  "${PSQL[@]}" -c "DELETE FROM public.profiles WHERE id='00000000-0000-4000-8000-000000000004';" >"$DR2" 2>&1
) &
D2=$!
wait "$D1"; wait "$D2"
if [[ "$("${PSQL[@]}" -c "SELECT count(*) FROM public.cafe_reservations WHERE profile_id='00000000-0000-4000-8000-000000000004';")" != "0" ]]; then
  echo "reserve-vs-delete race left a reservation behind" >&2
  cat "$DR1" "$DR2" >&2
  exit 1
fi
rm -f "$DR1" "$DR2"

echo "[cafe:postgres] functional, ACL, deletion, freeze and concurrency tests passed"
