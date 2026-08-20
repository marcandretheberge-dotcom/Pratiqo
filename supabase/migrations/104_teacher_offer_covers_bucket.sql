-- Public cover images for teacher_offers.
-- Writes go through the authenticated teacher cover API (service role).
-- Public read is intentional: covers appear on published offer cards.
--
-- Path convention (enforced by API):
--   teacher-offer-covers/{teacherId}/{offerId}/{uuid}.webp

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'teacher-offer-covers',
  'teacher-offer-covers',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = true,
  file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Teacher offer covers are publicly readable" on storage.objects;
create policy "Teacher offer covers are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'teacher-offer-covers');

-- Authenticated clients do not write directly; uploads use service role via API.
-- Keep explicit deny-style absence of insert/update/delete policies for authenticated.
drop policy if exists "Teacher offer covers authenticated insert" on storage.objects;
drop policy if exists "Teacher offer covers authenticated update" on storage.objects;
drop policy if exists "Teacher offer covers authenticated delete" on storage.objects;
