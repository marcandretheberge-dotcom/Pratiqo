-- Normalize persisted locale values after migrating the app to 2-letter locales.
--
-- App contract from this migration onward:
--   fr-CA -> fr
--   en-CA -> en
--   en-US -> en
--   es-419 / es-UY -> es
--
-- This migration is intentionally defensive:
--   - It updates columns only if they exist in the live database.
--   - It does NOT touch teachers.languages, which stores human-readable spoken
--     language labels such as "Français", "Anglais", "Espagnol".
--   - It normalizes auth.users metadata for future reads from Supabase Auth.

create or replace function public.normalize_locale_code(value text)
returns text
language sql
immutable
as $$
  select case
    when value is null then null
    when lower(value) in ('fr', 'fr-ca', 'fr_ca') then 'fr'
    when lower(value) in ('en', 'en-ca', 'en_ca', 'en-us', 'en_us') then 'en'
    when lower(value) in ('es', 'es-419', 'es_419', 'es-uy', 'es_uy') then 'es'
    else value
  end
$$;

-- Normalize conventional text columns on public tables.
do $$
declare
  col record;
begin
  for col in
    select table_schema, table_name, column_name
    from information_schema.columns
    join information_schema.tables using (table_schema, table_name)
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and data_type in ('text', 'character varying')
      and column_name in (
        'locale',
        'language',
        'preferred_locale',
        'preferred_language',
        'user_locale'
      )
  loop
    execute format(
      'update %I.%I set %I = public.normalize_locale_code(%I) where %I in (%L, %L, %L, %L, %L, %L)',
      col.table_schema,
      col.table_name,
      col.column_name,
      col.column_name,
      col.column_name,
      'fr-CA',
      'fr_CA',
      'en-CA',
      'en_CA',
      'en-US',
      'en_US'
    );

    execute format(
      'update %I.%I set %I = public.normalize_locale_code(%I) where %I in (%L, %L, %L, %L)',
      col.table_schema,
      col.table_name,
      col.column_name,
      col.column_name,
      col.column_name,
      'es-419',
      'es_419',
      'es-UY',
      'es_UY'
    );
  end loop;
end $$;

-- Normalize common JSONB locale keys on public tables (dashboard/profile prefs).
do $$
declare
  col record;
  key text;
begin
  for col in
    select table_schema, table_name, column_name
    from information_schema.columns
    join information_schema.tables using (table_schema, table_name)
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and data_type = 'jsonb'
  loop
    foreach key in array array['locale', 'language', 'preferred_locale', 'preferred_language', 'user_locale']
    loop
      execute format(
        'update %I.%I
         set %I = jsonb_set(%I, %L, to_jsonb(public.normalize_locale_code(%I ->> %L)), false)
         where %I ? %L
           and (%I ->> %L) in (%L, %L, %L, %L, %L, %L, %L, %L, %L, %L)',
        col.table_schema,
        col.table_name,
        col.column_name,
        col.column_name,
        array[key],
        col.column_name,
        key,
        col.column_name,
        key,
        col.column_name,
        key,
        'fr-CA',
        'fr_CA',
        'en-CA',
        'en_CA',
        'en-US',
        'en_US',
        'es-419',
        'es_419',
        'es-UY',
        'es_UY'
      );
    end loop;
  end loop;
end $$;

-- Normalize Supabase Auth metadata if the project stores locale preferences there.
update auth.users
set raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{locale}',
  to_jsonb(public.normalize_locale_code(raw_user_meta_data ->> 'locale')),
  false
)
where raw_user_meta_data ? 'locale'
  and raw_user_meta_data ->> 'locale' in ('fr-CA', 'fr_CA', 'en-CA', 'en_CA', 'en-US', 'en_US', 'es-419', 'es_419', 'es-UY', 'es_UY');

update auth.users
set raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{language}',
  to_jsonb(public.normalize_locale_code(raw_user_meta_data ->> 'language')),
  false
)
where raw_user_meta_data ? 'language'
  and raw_user_meta_data ->> 'language' in ('fr-CA', 'fr_CA', 'en-CA', 'en_CA', 'en-US', 'en_US', 'es-419', 'es_419', 'es-UY', 'es_UY');

update auth.users
set raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{preferred_locale}',
  to_jsonb(public.normalize_locale_code(raw_user_meta_data ->> 'preferred_locale')),
  false
)
where raw_user_meta_data ? 'preferred_locale'
  and raw_user_meta_data ->> 'preferred_locale' in ('fr-CA', 'fr_CA', 'en-CA', 'en_CA', 'en-US', 'en_US', 'es-419', 'es_419', 'es-UY', 'es_UY');

update auth.users
set raw_app_meta_data = jsonb_set(
  raw_app_meta_data,
  '{locale}',
  to_jsonb(public.normalize_locale_code(raw_app_meta_data ->> 'locale')),
  false
)
where raw_app_meta_data ? 'locale'
  and raw_app_meta_data ->> 'locale' in ('fr-CA', 'fr_CA', 'en-CA', 'en_CA', 'en-US', 'en_US', 'es-419', 'es_419', 'es-UY', 'es_UY');

-- Keep future blog content aligned with the 2-letter locale contract.
alter table if exists public.blog_posts
  alter column language set default 'fr';
