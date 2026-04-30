-- 019_blog_posts.sql
-- Blog post table for the Pratiqo SEO Growth Engine.
-- Public read, admin-only write via service-role key.

create table if not exists blog_posts (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  slug             text not null unique,
  content          text not null,           -- Markdown body
  excerpt          text not null,           -- Short summary (for cards + meta description)
  cover_image_url  text,                    -- Optional hero image URL
  category         text not null default 'Général',  -- Maps to teacher discipline for the conversion widget
  language         text not null default 'fr'        -- 'fr' | 'en' | 'es'
                   check (language in ('fr', 'en', 'es')),
  published_at     timestamptz,             -- Null = draft; set to publish
  author_name      text not null default 'Équipe Pratiqo',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Index for fast slug lookups and language filtering
create index if not exists blog_posts_slug_idx      on blog_posts (slug);
create index if not exists blog_posts_language_idx  on blog_posts (language, published_at desc nulls last);
create index if not exists blog_posts_category_idx  on blog_posts (category);

-- Auto-update updated_at on every row change
create or replace function update_blog_posts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger blog_posts_updated_at
  before update on blog_posts
  for each row execute procedure update_blog_posts_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table blog_posts enable row level security;

-- Anyone can read published posts (published_at is not null and <= now)
create policy "Public read published blog posts"
  on blog_posts for select
  using (published_at is not null and published_at <= now());

-- Service-role bypasses RLS, so only admin API routes (using service-role key)
-- can insert / update / delete.  No additional policy needed for writes.
