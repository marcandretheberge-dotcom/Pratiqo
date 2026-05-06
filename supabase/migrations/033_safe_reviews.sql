-- Safe review lifecycle: moderation, reporting, and teacher replies.

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS moderation_reason text,
  ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_at timestamptz,
  ADD COLUMN IF NOT EXISTS teacher_reply text,
  ADD COLUMN IF NOT EXISTS teacher_reply_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS teacher_reply_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_reviews_teacher_public
  ON public.reviews (teacher_id, moderation_status, is_flagged, created_at DESC);

DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;
CREATE POLICY "reviews_select_public"
  ON public.reviews FOR SELECT
  USING (moderation_status = 'approved' AND is_flagged = false);

CREATE TABLE IF NOT EXISTS public.review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_review_reports_review_id
  ON public.review_reports (review_id);

ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_reports_insert_own" ON public.review_reports;
CREATE POLICY "review_reports_insert_own"
  ON public.review_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "review_reports_select_own" ON public.review_reports;
CREATE POLICY "review_reports_select_own"
  ON public.review_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);
