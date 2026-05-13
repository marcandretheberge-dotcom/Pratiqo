# PostGIS geo search (migration 056)

`056_teachers_postgis_search.sql` adds a `teachers.location_point geography(Point, 4326)` column, a GIST index, a sync trigger, and a `nearby_teachers` RPC. Together these power the server-side fast path for the radius pill on `/student/search` and any future map-based browse surface.

## What ships in the app code

- `app/api/teachers/nearby/route.ts` — Edge route that wraps the RPC.
- `lib/teacherNearby.ts` — client helper that calls the route and **falls back gracefully** when the RPC isn't deployed yet (503 response).
- `app/(app)/student/search/page.tsx` — uses the server result when `geo + radius ∈ {5, 10, 25, 50}`. The client-side haversine path is retained as the fallback so radius works the moment the page loads.

## Privacy

- The new column is **not** exposed in `public.teachers_public`. Coordinates never reach the browser.
- The RPC returns only `{ id, distance_km }`. It runs `SECURITY DEFINER` so anon callers can use it without having direct SELECT on `teachers.location_point`.

## Applying the migration

```sql
-- In the Supabase SQL editor or via `supabase db push`:
-- 1. Run the contents of supabase/migrations/056_teachers_postgis_search.sql.
-- 2. Spot-check the backfill:
select count(*) filter (where location_point is not null) as with_point,
       count(*) as total
from public.teachers;

-- 3. Sanity-check the RPC against a known city (Montreal, for example):
select id, distance_km
from public.nearby_teachers(45.5019, -73.5674, 25, 10);
```

The trigger keeps `location_point` in sync with the JSON `location` column on every insert/update, so no write-path code needs to change.

## What if I don't run the migration?

The app keeps working — the radius pill uses the existing client-side haversine path. The server route just returns `503 nearby_teachers_unavailable` and the client helper records that for the rest of the session.

## Backward-compat notes

- `_teacher_location_point(jsonb)` handles both the legacy `{ lat, lng }` shape and the newer `{ public: { lat, lng } }` shape written by `app/api/teacher/location/verify`.
- The function is `IMMUTABLE` + `PARALLEL SAFE` so the trigger overhead on writes is minimal.
- The GIST index uses the `<->` operator for ordering and `ST_DWithin` for filtering — both common patterns supported on standard Supabase Postgres instances.

## Future work (not in scope here)

- Cluster-by-tile aggregation for the map view (`SearchMapView`) when there are >500 teachers in viewport.
- Replace the precomputed `cities` table location lookups with a PostGIS join for "teachers within city polygon".
- Add a similar `nearby_group_sessions` RPC once group sessions get geo metadata.
