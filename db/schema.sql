-- ============================================================
-- paulsavvas.com — site database schema
--
-- HOW TO RUN:
--   1. Open your Neon project (https://console.neon.tech)
--   2. Go to "SQL Editor"
--   3. Paste this entire file and click "Run"
--
-- The script is idempotent — running it again is safe and will
-- not delete or overwrite any content you have created.
-- ============================================================

-- Needed for gen_random_uuid() on some Postgres setups (built in on Neon).
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Projects
-- ------------------------------------------------------------
create table if not exists projects (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  summary            text not null default '',
  slug               text unique,
  tags               text[] not null default '{}',
  year               text,
  featured           boolean not null default false,
  -- Project was built end-to-end with AI ("vibe-coded"); shows a
  -- "✦ Built with AI" badge on the site.
  ai_built           boolean not null default false,
  -- true  -> project gets its own page at /projects/<slug> (body_md is shown)
  -- false -> project card links out to project_info_url instead
  has_page           boolean not null default true,
  project_info_url   text,
  featured_blog_slug text,
  -- Markdown body. Content ABOVE the first "---" divider that contains links
  -- is turned into the button row at the top of the project page.
  body_md            text not null default '',
  visibility         text not null default 'draft'
                     check (visibility in ('draft', 'published')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Blog posts
-- ------------------------------------------------------------
create table if not exists blog_posts (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null,
  slug                  text not null unique,
  summary               text not null default '',
  published_on          date not null default current_date,
  tags                  text[] not null default '{}',
  featured_project_slug text,
  body_md               text not null default '',
  visibility            text not null default 'draft'
                        check (visibility in ('draft', 'published')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Short links  (paulsavvas.com/redirect/<slug> -> destination)
-- ------------------------------------------------------------
create table if not exists redirects (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  destination text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Singleton site content (e.g. the "Now" section on /about)
-- ------------------------------------------------------------
create table if not exists site_content (
  key        text primary key,
  body_md    text not null default '',
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Upgrades for databases created by earlier versions of this
-- script (each statement is safe to re-run)
-- ------------------------------------------------------------
alter table projects add column if not exists ai_built boolean not null default false;

-- ------------------------------------------------------------
-- Keep updated_at fresh automatically
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_set_updated_at on projects;
create trigger projects_set_updated_at
  before update on projects
  for each row execute function set_updated_at();

drop trigger if exists blog_posts_set_updated_at on blog_posts;
create trigger blog_posts_set_updated_at
  before update on blog_posts
  for each row execute function set_updated_at();

drop trigger if exists redirects_set_updated_at on redirects;
create trigger redirects_set_updated_at
  before update on redirects
  for each row execute function set_updated_at();

drop trigger if exists site_content_set_updated_at on site_content;
create trigger site_content_set_updated_at
  before update on site_content
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- Helpful indexes for the public site queries
-- ------------------------------------------------------------
create index if not exists projects_visibility_idx  on projects (visibility);
create index if not exists blog_posts_visibility_idx on blog_posts (visibility, published_on desc);

-- ------------------------------------------------------------
-- Seed content
-- ------------------------------------------------------------

-- "Now" section shown on /about (edit it in the admin portal afterwards).
insert into site_content (key, body_md)
values (
  'now',
  E'Right now, I''m focused on building a platform that redefines how independent learners connect, collaborate, and teach one another. I can''t share too many details yet, but the goal is to make peer learning more accessible and effective. I''ll share more as the project is finalized, and I hope to announce it publicly by August 2026.\n\nIf you want to see what I''m working on, the best place to start is my GitHub or Thingiverse.'
)
on conflict (key) do nothing;

-- A sample DRAFT project and blog post so you can see how editing works.
-- Drafts never appear on the public site — publish or delete them from
-- the admin portal at /admin.
insert into projects (title, summary, slug, tags, year, featured, has_page, body_md, visibility)
values (
  'Sample project',
  'A sample project so you can try out the admin portal. Feel free to edit or delete it.',
  'sample-project',
  array['Sample', 'Demo'],
  '2026',
  false,
  true,
  E'[View on GitHub](https://github.com/psavvas)\n\n---\n\n## About this project\n\nThis is **Markdown**. Links above the `---` divider become the button row at the top of the page.\n\n- Bullet lists work\n- So do [links](https://paulsavvas.com), images, and YouTube embeds\n\n![Example image](https://github.com/psavvas.png)',
  'draft'
)
on conflict (slug) do nothing;

insert into blog_posts (title, slug, summary, published_on, tags, body_md, visibility)
values (
  'Sample blog post',
  'sample-blog-post',
  'A sample post so you can try out the admin portal. Feel free to edit or delete it.',
  current_date,
  array['Sample'],
  E'## Hello!\n\nThis post is written in **Markdown**. Paste a YouTube link like [this video](https://www.youtube.com/watch?v=dQw4w9WgXcQ) and it becomes an embedded player.\n\nImages use the standard syntax: `![alt text](https://example.com/image.png)`',
  'draft'
)
on conflict (slug) do nothing;
