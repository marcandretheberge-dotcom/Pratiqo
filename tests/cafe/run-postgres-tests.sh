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
echo "[cafe:postgres] functional, ACL, deletion, freeze and concurrency tests passed"
