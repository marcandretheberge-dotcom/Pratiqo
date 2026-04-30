-- Identity verification status & diploma document storage
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS identity_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS diploma_url text;

-- Soft constraint – only enforced at the application layer; handy for dashboards
-- Valid values: 'none' | 'pending' | 'verified' | 'failed'
CREATE INDEX IF NOT EXISTS idx_teachers_identity_status ON public.teachers (identity_status);

-- ─── Supabase Storage bucket (run once in the Supabase Dashboard / CLI) ────────
--
--   1. Create a PRIVATE bucket named "teacher-diplomas" in the Storage tab.
--
--   2. Apply these RLS policies so teachers can upload/read their own files:
--
-- INSERT INTO storage.buckets (id, name, public) VALUES ('teacher-diplomas', 'teacher-diplomas', false)
--   ON CONFLICT DO NOTHING;
--
-- CREATE POLICY "teachers upload own diplomas"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'teacher-diplomas'
--     AND (storage.foldername(name))[1] = auth.uid()::text);
--
-- CREATE POLICY "teachers read own diplomas"
--   ON storage.objects FOR SELECT TO authenticated
--   USING (bucket_id = 'teacher-diplomas'
--     AND (storage.foldername(name))[1] = auth.uid()::text);
--
-- CREATE POLICY "service role full access"
--   ON storage.objects FOR ALL TO service_role USING (bucket_id = 'teacher-diplomas');
