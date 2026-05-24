-- Production diagnostic: teachers currently eligible for /student/search.
-- Run in Supabase SQL editor. Adjust filters if migration 071 is not applied yet.

SELECT
  t.id AS teacher_id,
  t.user_id,
  t.name,
  t.discipline,
  t.image_url,
  p.photo_url AS profiles_photo_url,
  t.is_public,
  t.is_demo,
  t.deactivated_at AS teacher_deactivated_at,
  t.deleted_at AS teacher_deleted_at,
  p.is_active AS profile_is_active,
  p.deactivated_at AS profile_deactivated_at,
  p.deleted_at AS profile_deleted_at,
  p.anonymized_at AS profile_anonymized_at,
  t.identity_status,
  (
    COALESCE(t.is_public, true) = true
    AND t.deactivated_at IS NULL
    AND t.deleted_at IS NULL
    AND COALESCE(t.is_demo, false) = false
    AND t.id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND t.user_id IS NOT NULL
    AND COALESCE(t.identity_status, 'none') <> 'failed'
    AND p.id IS NOT NULL
    AND COALESCE(p.is_active, true) = true
    AND p.deactivated_at IS NULL
    AND p.deleted_at IS NULL
    AND p.anonymized_at IS NULL
  ) AS appears_in_search_v071,
  EXISTS (
    SELECT 1 FROM public.teachers_public tp WHERE tp.id = t.id
  ) AS in_teachers_public_view
FROM public.teachers t
LEFT JOIN public.profiles p ON p.id = t.user_id
ORDER BY appears_in_search_v071 DESC, t.name ASC;
