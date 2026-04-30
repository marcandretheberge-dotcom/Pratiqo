-- Optional YouTube / Vimeo intro video for teacher profiles
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS video_url text;
