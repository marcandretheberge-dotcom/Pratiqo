-- Optional time range within a day (when set, period is typically NULL)
ALTER TABLE public.blocked_slots
  ADD COLUMN IF NOT EXISTS start_time text,
  ADD COLUMN IF NOT EXISTS end_time text;
