-- Public listings contain scheduling information. Exact locations and joining
-- instructions are returned only after checking the current account.
begin;

create schema if not exists group_session_access;
revoke all on schema group_session_access from public, anon;
grant usage on schema group_session_access to authenticated;

create function group_session_access.is_host(target_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_sessions s join public.teachers t on t.id = s.teacher_id
    where s.id = target_id and t.user_id = (select auth.uid())
  );
$$;
revoke all on function group_session_access.is_host(uuid) from public, anon;
grant execute on function group_session_access.is_host(uuid) to authenticated;

drop policy if exists "Anyone can read open sessions" on public.group_sessions;
drop policy if exists "Teachers read registrations for their sessions" on public.group_registrations;
drop policy if exists "Students insert own group registrations" on public.group_registrations;
drop policy if exists "Students update own group registrations" on public.group_registrations;

create policy "Hosts read their registrations" on public.group_registrations
for select to authenticated using (group_session_access.is_host(session_id));
create policy "Read published group listings" on public.group_sessions
for select to anon, authenticated using (status in ('open','full'));
create policy "Hosts read their own listings" on public.group_sessions
for select to authenticated using (group_session_access.is_host(id));
create policy "Students read their registration history" on public.group_sessions
for select to authenticated using (exists (
  select 1 from public.group_registrations r
  where r.session_id = group_sessions.id and r.student_id = (select auth.uid())
));

-- No broad table grants may override column-level restrictions. Only the
-- server payment and cancellation paths create or change registrations.
revoke all on public.group_registrations, public.group_sessions from public, anon, authenticated;
grant select on public.group_registrations to authenticated;
grant insert, update, delete on public.group_sessions to authenticated;
grant select (id, teacher_id, title, description, discipline, max_participants, min_participants,
  current_participants, price_per_person, date, time, duration_minutes, teaching_mode,
  is_recurring, recurrence, status, created_at)
  on public.group_sessions to anon, authenticated;
grant all on public.group_sessions, public.group_registrations to service_role;

create view public.group_sessions_public with (security_invoker = true, security_barrier = true) as
select s.id, s.teacher_id, s.title, s.description, s.discipline, s.max_participants, s.min_participants,
  s.current_participants, s.price_per_person, s.date, s.time, s.duration_minutes,
  s.teaching_mode, s.is_recurring, s.recurrence, s.status, s.created_at,
  jsonb_build_object('name', t.name, 'image_url', t.image_url, 'bio', t.bio) as teachers
from public.group_sessions s
left join public.teachers_public t on t.id = s.teacher_id
where s.status in ('open','full');
revoke all on public.group_sessions_public from public, anon, authenticated;
grant select on public.group_sessions_public to anon, authenticated, service_role;

create function group_session_access.join_details(session_ids uuid[])
returns table(id uuid, online_link text, location text)
language sql stable security definer set search_path = '' as $$
  select s.id, s.online_link, s.location
  from public.group_sessions s
  where (select auth.uid()) is not null and s.id = any(session_ids)
    and (group_session_access.is_host(s.id) or (
      s.status in ('open','full') and exists (
        select 1 from public.group_registrations r
        where r.session_id = s.id and r.student_id = (select auth.uid())
          and r.status = 'confirmed' and r.price_paid > 0
          and nullif(trim(r.stripe_payment_intent_id), '') is not null
      )
    ));
$$;
revoke all on function group_session_access.join_details(uuid[]) from public, anon;
grant execute on function group_session_access.join_details(uuid[]) to authenticated;

create function public.group_session_join_details(session_ids uuid[])
returns table(id uuid, online_link text, location text)
language sql stable security invoker set search_path = '' as $$
  select d.id, d.online_link, d.location from group_session_access.join_details(session_ids) d;
$$;
revoke all on function public.group_session_join_details(uuid[]) from public, anon;
grant execute on function public.group_session_join_details(uuid[]) to authenticated;

commit;
