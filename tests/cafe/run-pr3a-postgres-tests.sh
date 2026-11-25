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
"${PSQL[@]}" -f supabase/migrations/20261111124000_cafe_daily_room_foundation.sql
"${PSQL[@]}" -f supabase/migrations/20261111133000_cafe_daily_room_hardening.sql
"${PSQL[@]}" -f supabase/migrations/20261111140000_cafe_daily_binding_race_hardening.sql
"${PSQL[@]}" -f tests/cafe/sql/pr3a-functional.sql
"${PSQL[@]}" -f tests/cafe/sql/pr3a-boundaries.sql

# Private provider/moderation/consent rows are not directly reachable.
for TABLE in room_bindings session_removals participant_agreements; do
  for ROLE in anon authenticated service_role; do
    if "${PSQL[@]}" -c "SET ROLE $ROLE; SELECT * FROM cafe_private.$TABLE LIMIT 1;" >/dev/null 2>&1; then
      echo "$ROLE unexpectedly read cafe_private.$TABLE" >&2
      exit 1
    fi
  done
done

# Server RPCs are never callable by browser roles or PUBLIC.
RPC_FUNCTIONS=(
  "public.cafe_authorize_join_server(uuid,text,text)"
  "public.cafe_bind_room_server(uuid,text,text)"
  "public.cafe_record_removal_server(uuid,text,uuid,text)"
  "public.cafe_admin_cancel_room_server(uuid,text)"
  "public.cafe_clear_room_binding_server(uuid,uuid,text,text)"
)
for FN in "${RPC_FUNCTIONS[@]}"; do
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

# Prove the privilege boundary by actually invoking each RPC as browser roles.
for ROLE in anon authenticated; do
  if "${PSQL[@]}" -c "SET ROLE $ROLE; SELECT public.cafe_authorize_join_server('00000000-0000-4000-8000-000000000003','room-joinable','participant');" >/dev/null 2>&1; then
    echo "$ROLE unexpectedly invoked cafe_authorize_join_server" >&2
    exit 1
  fi
  if "${PSQL[@]}" -c "SET ROLE $ROLE; SELECT public.cafe_bind_room_server('70000000-0000-4000-8000-000000000001','daily','cafe-abcdefghijklmnopqrstuvwx');" >/dev/null 2>&1; then
    echo "$ROLE unexpectedly invoked cafe_bind_room_server" >&2
    exit 1
  fi
  if "${PSQL[@]}" -c "SET ROLE $ROLE; SELECT public.cafe_record_removal_server('00000000-0000-4000-8000-000000000002','room-joinable','00000000-0000-4000-8000-000000000004','conduct');" >/dev/null 2>&1; then
    echo "$ROLE unexpectedly invoked cafe_record_removal_server" >&2
    exit 1
  fi
  if "${PSQL[@]}" -c "SET ROLE $ROLE; SELECT public.cafe_admin_cancel_room_server('00000000-0000-4000-8000-000000000001','room-joinable');" >/dev/null 2>&1; then
    echo "$ROLE unexpectedly invoked cafe_admin_cancel_room_server" >&2
    exit 1
  fi
done

# Every Café SECURITY DEFINER function used by PR3a has an empty search_path.
DEFINER_FUNCTIONS=(
  "cafe_private.require_active_profile(uuid)"
  "cafe_private.require_admin(uuid)"
  "cafe_private.host_is_eligible(uuid)"
  "cafe_private.handle_profile_removal()"
  "public.cafe_public_sessions(text)"
  "public.cafe_my_reservations_server(uuid)"
  "public.cafe_set_reservation_server(uuid,text,text,bigint,uuid)"
  "public.cafe_admin_create_draft_server(uuid,text,text,text,text,text,timestamptz,integer,integer,uuid)"
  "public.cafe_admin_publish_server(uuid,text)"
  "public.cafe_admin_cancel_server(uuid,text)"
  "public.cafe_admin_reassign_host_server(uuid,text,uuid)"
  "public.cafe_authorize_join_server(uuid,text,text)"
  "public.cafe_bind_room_server(uuid,text,text)"
  "public.cafe_record_removal_server(uuid,text,uuid,text)"
  "public.cafe_admin_cancel_room_server(uuid,text)"
  "public.cafe_clear_room_binding_server(uuid,uuid,text,text)"
)
for FN in "${DEFINER_FUNCTIONS[@]}"; do
  SAFE=$("${PSQL[@]}" -c "SELECT EXISTS (
    SELECT 1
      FROM pg_proc p
      CROSS JOIN LATERAL unnest(coalesce(p.proconfig, ARRAY[]::text[])) setting
     WHERE p.oid = '$FN'::regprocedure
       AND setting ~ '^search_path=(\"\"|)$'
  );")
  if [[ "$SAFE" != "t" ]]; then
    echo "$FN does not have an empty search_path" >&2
    exit 1
  fi
done

# Concurrent deterministic binding calls collapse to one private row.
BIND_SESSION=$("${PSQL[@]}" -c "SELECT id FROM public.cafe_sessions WHERE slug='room-host-boundary';")
BIND1=$(mktemp)
BIND2=$(mktemp)
(
  "${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_bind_room_server('$BIND_SESSION','daily','cafe-1234567890abcdefghijklmn');" >"$BIND1"
) &
P1=$!
(
  "${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_bind_room_server('$BIND_SESSION','daily','cafe-1234567890abcdefghijklmn');" >"$BIND2"
) &
P2=$!
wait "$P1"
wait "$P2"
if [[ "$("${PSQL[@]}" -c "SELECT count(*) FROM cafe_private.room_bindings WHERE session_id='$BIND_SESSION';")" != "1" ]]; then
  echo "concurrent room binding did not collapse to one row" >&2
  cat "$BIND1" "$BIND2" >&2
  exit 1
fi
if ! grep -q '"ok": true' "$BIND1" || ! grep -q '"ok": true' "$BIND2"; then
  echo "concurrent room binding did not return idempotent success" >&2
  cat "$BIND1" "$BIND2" >&2
  exit 1
fi
rm -f "$BIND1" "$BIND2"

# Published material terms cannot drift after a provider room is bound.
if "${PSQL[@]}" -c "UPDATE public.cafe_sessions SET starts_at=starts_at+interval '1 hour' WHERE slug='room-host-boundary';" >/dev/null 2>&1; then
  echo "published Café was rescheduled after room binding" >&2
  exit 1
fi

# Join tokens are short-lived (about three minutes) and still capped by DB time.
TTL=$("${PSQL[@]}" -c "SET ROLE service_role; SELECT ((j->>'tokenExp')::bigint - extract(epoch FROM clock_timestamp())::bigint) FROM (SELECT public.cafe_authorize_join_server('00000000-0000-4000-8000-000000000004','room-joinable','participant') j) q;")
if (( TTL < 1 || TTL > 185 )); then
  echo "join token TTL outside three-minute bound: $TTL" >&2
  exit 1
fi

# Cancellation returns the binding for provider deletion, and clearing is idempotent.
CANCEL=$("${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_admin_cancel_room_server('00000000-0000-4000-8000-000000000001','room-host-boundary');")
if [[ "$CANCEL" != *'"ok": true'* || "$CANCEL" != *'"provider": "daily"'* || "$CANCEL" != *'"providerRoomId": "cafe-1234567890abcdefghijklmn"'* ]]; then
  echo "provider-aware cancellation did not return its binding: $CANCEL" >&2
  exit 1
fi
CLEAR=$("${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_clear_room_binding_server('00000000-0000-4000-8000-000000000001','$BIND_SESSION','daily','cafe-1234567890abcdefghijklmn');")
if [[ "$CLEAR" != *'"ok": true'* ]]; then
  echo "room binding clear failed: $CLEAR" >&2
  exit 1
fi
CLEAR_AGAIN=$("${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_clear_room_binding_server('00000000-0000-4000-8000-000000000001','$BIND_SESSION','daily','cafe-1234567890abcdefghijklmn');")
if [[ "$CLEAR_AGAIN" != *'"already_clear"'* ]]; then
  echo "room binding clear was not idempotent: $CLEAR_AGAIN" >&2
  exit 1
fi

# The eight-person pilot capacity is enforced below the API layer.
if "${PSQL[@]}" -c "SET ROLE service_role; SELECT public.cafe_admin_create_draft_server(
  '00000000-0000-4000-8000-000000000001','room-too-large','Too large','fr',NULL,NULL,
  clock_timestamp()+interval '1 day',30,9,'00000000-0000-4000-8000-000000000002'
);" >/dev/null 2>&1; then
  echo "Café session above pilot capacity was accepted" >&2
  exit 1
fi

# Account deletion removes adult agreement, reservation and target-removal identity.
"${PSQL[@]}" -c "DELETE FROM public.profiles WHERE id='00000000-0000-4000-8000-000000000003';"
if [[ "$("${PSQL[@]}" -c "SELECT count(*) FROM cafe_private.participant_agreements WHERE profile_id='00000000-0000-4000-8000-000000000003';")" != "0" ]]; then
  echo "adult agreement survived account deletion" >&2
  exit 1
fi
if [[ "$("${PSQL[@]}" -c "SELECT count(*) FROM cafe_private.session_removals WHERE profile_id='00000000-0000-4000-8000-000000000003';")" != "0" ]]; then
  echo "session removal identity survived account deletion" >&2
  exit 1
fi

# Deleting the moderator preserves the safety record while anonymizing removed_by.
"${PSQL[@]}" -c "
INSERT INTO cafe_private.session_removals(session_id,profile_id,removed_by_profile_id,reason_code)
SELECT id,'00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000002','safety'
FROM public.cafe_sessions WHERE slug='room-joinable'
ON CONFLICT (session_id,profile_id) DO UPDATE SET removed_by_profile_id=EXCLUDED.removed_by_profile_id;
"
"${PSQL[@]}" -c "DELETE FROM public.profiles WHERE id='00000000-0000-4000-8000-000000000002';"
if [[ "$("${PSQL[@]}" -c "SELECT count(*) FROM cafe_private.session_removals r JOIN public.cafe_sessions s ON s.id=r.session_id WHERE s.slug='room-joinable' AND r.profile_id='00000000-0000-4000-8000-000000000004' AND r.removed_by_profile_id IS NULL;")" != "1" ]]; then
  echo "moderation record was lost or not anonymized after moderator deletion" >&2
  exit 1
fi

# No existing role/payment table was replaced by PR3a.
if [[ "$("${PSQL[@]}" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('cafe_sessions','cafe_reservations');")" != "2" ]]; then
  echo "base Café tables missing after PR3a" >&2
  exit 1
fi

echo "[cafe:pr3a-postgres] authorization, ACL, search_path, cancellation, consent, removal and binding tests passed"
