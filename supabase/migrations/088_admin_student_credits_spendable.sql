-- Make admin-granted student credits spendable via profiles.credit_balance.
--
-- Context:
--   Migration 087 introduced student_credits / student_credit_ledger /
--   admin_audit_log as an admin foundation that intentionally did NOT
--   mutate profiles.credit_balance. Checkout already consumes
--   profiles.credit_balance (dollars, numeric) via the existing credit
--   system (lib/credits.ts + app/api/stripe/checkout).
--
-- Scope:
--   * SECURITY DEFINER RPCs for atomic grant + unused-only void
--   * service_role EXECUTE only (admin APIs call these after requireAdminApi)
--   * writes student_credits, student_credit_ledger, credit_transactions,
--     profiles.credit_balance, and admin_audit_log in one transaction
--
-- Explicit non-goals:
--   * does NOT wire admin_promo_codes into checkout
--   * does NOT create Stripe coupons
--   * does NOT change commission / booking math
--   * does NOT implement partial-spend reverse of admin credits
--
-- Unit convention:
--   student_credits.*_cents are integer cents.
--   profiles.credit_balance and credit_transactions.amount are dollars (numeric).
--   RPCs convert: dollars = amount_cents / 100.0

-- ── Grant ───────────────────────────────────────────────────────────

create or replace function public.admin_grant_student_credit(
  p_student_profile_id uuid,
  p_amount_cents integer,
  p_currency text,
  p_reason_code text,
  p_reason_note text,
  p_expires_at timestamptz,
  p_actor_id uuid,
  p_actor_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_role text;
  v_currency text;
  v_amount_dollars numeric;
  v_balance numeric;
  v_credit_id uuid;
  v_now timestamptz := now();
  v_row public.student_credits%rowtype;
begin
  if p_student_profile_id is null then
    raise exception 'STUDENT_REQUIRED' using errcode = 'P0001';
  end if;
  if p_actor_id is null then
    raise exception 'ACTOR_REQUIRED' using errcode = 'P0001';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 or p_amount_cents > 5000000 then
    raise exception 'AMOUNT_INVALID' using errcode = 'P0001';
  end if;
  if p_reason_code is null or length(trim(p_reason_code)) = 0 then
    raise exception 'REASON_CODE_REQUIRED' using errcode = 'P0001';
  end if;
  if p_reason_note is null or length(trim(p_reason_note)) = 0 then
    raise exception 'REASON_NOTE_REQUIRED' using errcode = 'P0001';
  end if;
  if length(trim(p_reason_note)) > 1000 then
    raise exception 'REASON_NOTE_TOO_LONG' using errcode = 'P0001';
  end if;

  v_currency := upper(coalesce(nullif(trim(p_currency), ''), 'CAD'));
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'CURRENCY_INVALID' using errcode = 'P0001';
  end if;

  select role into v_student_role
  from public.profiles
  where id = p_student_profile_id
  for update;

  if not found then
    raise exception 'STUDENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_student_role is distinct from 'student' then
    raise exception 'NOT_A_STUDENT' using errcode = 'P0001';
  end if;

  v_amount_dollars := round(p_amount_cents::numeric / 100.0, 2);

  insert into public.student_credits (
    student_profile_id,
    amount_cents,
    currency,
    remaining_cents,
    status,
    reason_code,
    reason_note,
    expires_at,
    created_by,
    created_at
  ) values (
    p_student_profile_id,
    p_amount_cents,
    v_currency,
    p_amount_cents,
    'active',
    trim(p_reason_code),
    trim(p_reason_note),
    p_expires_at,
    p_actor_id,
    v_now
  )
  returning * into v_row;

  v_credit_id := v_row.id;

  insert into public.student_credit_ledger (
    student_credit_id,
    student_profile_id,
    entry_type,
    amount_cents,
    balance_after_cents,
    reference_type,
    reference_id,
    created_by,
    created_at,
    note
  ) values (
    v_credit_id,
    p_student_profile_id,
    'grant',
    p_amount_cents,
    p_amount_cents,
    'admin',
    null,
    p_actor_id,
    v_now,
    trim(p_reason_note)
  );

  insert into public.credit_transactions (
    user_id,
    amount,
    type,
    description,
    reference_id,
    status,
    expires_at,
    created_at
  ) values (
    p_student_profile_id,
    v_amount_dollars,
    'admin_grant',
    left('Crédit admin: ' || trim(p_reason_note), 500),
    'admin_grant:' || v_credit_id::text,
    'active',
    p_expires_at,
    v_now
  );

  update public.profiles
  set credit_balance = coalesce(credit_balance, 0) + v_amount_dollars,
      updated_at = v_now
  where id = p_student_profile_id
  returning credit_balance into v_balance;

  insert into public.admin_audit_log (
    actor_profile_id,
    action,
    target_type,
    target_id,
    metadata,
    created_at
  ) values (
    p_actor_id,
    'student_credit.granted',
    'student_credit',
    v_credit_id,
    jsonb_build_object(
      'student_profile_id', p_student_profile_id,
      'amount_cents', p_amount_cents,
      'amount_dollars', v_amount_dollars,
      'currency', v_currency,
      'reason_code', trim(p_reason_code),
      'new_credit_balance', v_balance,
      'actor_email', p_actor_email,
      'spendable', true
    ),
    v_now
  );

  return jsonb_build_object(
    'id', v_row.id,
    'student_profile_id', v_row.student_profile_id,
    'amount_cents', v_row.amount_cents,
    'currency', v_row.currency,
    'remaining_cents', v_row.remaining_cents,
    'status', v_row.status,
    'reason_code', v_row.reason_code,
    'reason_note', v_row.reason_note,
    'expires_at', v_row.expires_at,
    'created_by', v_row.created_by,
    'created_at', v_row.created_at,
    'voided_by', v_row.voided_by,
    'voided_at', v_row.voided_at,
    'void_reason', v_row.void_reason,
    'spendable', true,
    'new_credit_balance', v_balance
  );
end;
$$;

comment on function public.admin_grant_student_credit(
  uuid, integer, text, text, text, timestamptz, uuid, text
) is
  '088: Atomic admin student-credit grant. Writes student_credits + ledger + credit_transactions(admin_grant) + increments profiles.credit_balance. service_role only.';

revoke all on function public.admin_grant_student_credit(
  uuid, integer, text, text, text, timestamptz, uuid, text
) from public;
grant execute on function public.admin_grant_student_credit(
  uuid, integer, text, text, text, timestamptz, uuid, text
) to service_role;

-- ── Void (unused only) ──────────────────────────────────────────────

create or replace function public.admin_void_student_credit(
  p_credit_id uuid,
  p_void_reason text,
  p_actor_id uuid,
  p_actor_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.student_credits%rowtype;
  v_amount_dollars numeric;
  v_balance numeric;
  v_now timestamptz := now();
begin
  if p_credit_id is null then
    raise exception 'CREDIT_REQUIRED' using errcode = 'P0001';
  end if;
  if p_actor_id is null then
    raise exception 'ACTOR_REQUIRED' using errcode = 'P0001';
  end if;
  if p_void_reason is null or length(trim(p_void_reason)) = 0 then
    raise exception 'VOID_REASON_REQUIRED' using errcode = 'P0001';
  end if;
  if length(trim(p_void_reason)) > 1000 then
    raise exception 'VOID_REASON_TOO_LONG' using errcode = 'P0001';
  end if;

  select * into v_row
  from public.student_credits
  where id = p_credit_id
  for update;

  if not found then
    raise exception 'CREDIT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_row.status = 'voided' then
    raise exception 'ALREADY_VOIDED' using errcode = 'P0001';
  end if;

  if v_row.status is distinct from 'active' then
    raise exception 'NOT_ACTIVE' using errcode = 'P0001';
  end if;

  -- Unused-only rule for this PR: no partial reversal.
  if v_row.remaining_cents is distinct from v_row.amount_cents then
    raise exception 'ALREADY_USED' using errcode = 'P0001';
  end if;

  -- Lock the student balance and ensure it still covers the full grant.
  select credit_balance into v_balance
  from public.profiles
  where id = v_row.student_profile_id
  for update;

  if not found then
    raise exception 'STUDENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_amount_dollars := round(v_row.amount_cents::numeric / 100.0, 2);

  if coalesce(v_balance, 0) < v_amount_dollars then
    raise exception 'BALANCE_INSUFFICIENT' using errcode = 'P0001';
  end if;

  update public.student_credits
  set status = 'voided',
      remaining_cents = 0,
      voided_by = p_actor_id,
      voided_at = v_now,
      void_reason = trim(p_void_reason)
  where id = p_credit_id
  returning * into v_row;

  insert into public.student_credit_ledger (
    student_credit_id,
    student_profile_id,
    entry_type,
    amount_cents,
    balance_after_cents,
    reference_type,
    reference_id,
    created_by,
    created_at,
    note
  ) values (
    v_row.id,
    v_row.student_profile_id,
    'void',
    -v_row.amount_cents,
    0,
    'admin',
    null,
    p_actor_id,
    v_now,
    trim(p_void_reason)
  );

  insert into public.credit_transactions (
    user_id,
    amount,
    type,
    description,
    reference_id,
    status,
    created_at
  ) values (
    v_row.student_profile_id,
    -v_amount_dollars,
    'admin_void',
    left('Annulation crédit admin: ' || trim(p_void_reason), 500),
    'admin_void:' || v_row.id::text,
    'used',
    v_now
  );

  update public.profiles
  set credit_balance = greatest(0, coalesce(credit_balance, 0) - v_amount_dollars),
      updated_at = v_now
  where id = v_row.student_profile_id
  returning credit_balance into v_balance;

  insert into public.admin_audit_log (
    actor_profile_id,
    action,
    target_type,
    target_id,
    metadata,
    created_at
  ) values (
    p_actor_id,
    'student_credit.voided',
    'student_credit',
    v_row.id,
    jsonb_build_object(
      'student_profile_id', v_row.student_profile_id,
      'amount_cents', v_row.amount_cents,
      'amount_dollars', v_amount_dollars,
      'void_reason', trim(p_void_reason),
      'new_credit_balance', v_balance,
      'actor_email', p_actor_email
    ),
    v_now
  );

  return jsonb_build_object(
    'id', v_row.id,
    'student_profile_id', v_row.student_profile_id,
    'amount_cents', v_row.amount_cents,
    'currency', v_row.currency,
    'remaining_cents', v_row.remaining_cents,
    'status', v_row.status,
    'reason_code', v_row.reason_code,
    'reason_note', v_row.reason_note,
    'expires_at', v_row.expires_at,
    'created_by', v_row.created_by,
    'created_at', v_row.created_at,
    'voided_by', v_row.voided_by,
    'voided_at', v_row.voided_at,
    'void_reason', v_row.void_reason,
    'spendable', false,
    'new_credit_balance', v_balance
  );
end;
$$;

comment on function public.admin_void_student_credit(uuid, text, uuid, text) is
  '088: Atomic unused-only admin student-credit void. Rejects partial use / insufficient balance. service_role only.';

revoke all on function public.admin_void_student_credit(uuid, text, uuid, text) from public;
grant execute on function public.admin_void_student_credit(uuid, text, uuid, text) to service_role;
