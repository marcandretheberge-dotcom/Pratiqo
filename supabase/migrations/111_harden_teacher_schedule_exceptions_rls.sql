-- Forward RLS hardening for PR 17B schedule exceptions table.

ALTER TABLE IF EXISTS public.teacher_schedule_exceptions ENABLE ROW LEVEL SECURITY;
