-- Fix "RLS slow security policy" lint on public.blocked_slots.
-- auth.uid() inside USING/WITH CHECK is re-evaluated per row scanned;
-- wrapping it in `(select auth.uid())` lets Postgres evaluate it once per
-- query (initPlan) instead of once per row. Same predicate, no behavior change.

DROP POLICY IF EXISTS "blocked_slots_select_teacher" ON public.blocked_slots;
CREATE POLICY "blocked_slots_select_teacher"
  ON public.blocked_slots FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = blocked_slots.teacher_id AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "blocked_slots_insert_teacher" ON public.blocked_slots;
CREATE POLICY "blocked_slots_insert_teacher"
  ON public.blocked_slots FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = blocked_slots.teacher_id AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "blocked_slots_delete_teacher" ON public.blocked_slots;
CREATE POLICY "blocked_slots_delete_teacher"
  ON public.blocked_slots FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = blocked_slots.teacher_id AND t.user_id = (SELECT auth.uid())
    )
  );
