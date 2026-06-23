-- ============================================================
-- Community Feature Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Community posts
create table if not exists community_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  body text,
  tags text[] default '{}' not null,
  accepted_comment_id uuid,              -- set after comment table exists
  comment_count integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. Images on community posts
--    Each row links to EITHER a build library image OR a new upload, never both.
create table if not exists community_post_images (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references community_posts(id) on delete cascade not null,
  build_image_id uuid references build_images(id) on delete set null,
  storage_path text,
  position smallint default 0 not null,
  created_at timestamptz default now() not null,
  constraint community_post_images_source_check
    check ((build_image_id is null) != (storage_path is null))
);

-- 3. Community comments (flat + 1-level replies via parent_comment_id)
create table if not exists community_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references community_posts(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  parent_comment_id uuid references community_comments(id) on delete cascade,
  build_image_id uuid references build_images(id) on delete set null,
  storage_path text,
  upvote_count integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Now add the accepted-comment FK (table exists now)
alter table community_posts
  add constraint community_posts_accepted_comment_id_fkey
  foreign key (accepted_comment_id)
  references community_comments(id)
  on delete set null;

-- 4. Comment upvotes (one per user per comment)
create table if not exists community_comment_upvotes (
  comment_id uuid references community_comments(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key (comment_id, user_id)
);

-- ── Indexes ─────────────────────────────────────────────────
create index if not exists community_posts_created_at_idx
  on community_posts (created_at desc);

create index if not exists community_posts_comment_count_idx
  on community_posts (comment_count desc, created_at desc);

create index if not exists community_posts_tags_idx
  on community_posts using gin (tags);

create index if not exists community_posts_search_idx
  on community_posts using gin (
    to_tsvector('english', title || ' ' || coalesce(body, ''))
  );

create index if not exists community_comments_post_id_idx
  on community_comments (post_id, created_at);

create index if not exists community_post_images_post_id_idx
  on community_post_images (post_id, position);

-- ── Row-Level Security ───────────────────────────────────────
alter table community_posts enable row level security;
alter table community_post_images enable row level security;
alter table community_comments enable row level security;
alter table community_comment_upvotes enable row level security;

-- community_posts
create policy "community_posts_select" on community_posts
  for select using (true);

create policy "community_posts_insert" on community_posts
  for insert with check (auth.uid() = user_id);

create policy "community_posts_update" on community_posts
  for update using (auth.uid() = user_id);

create policy "community_posts_delete" on community_posts
  for delete using (auth.uid() = user_id);

-- community_post_images
create policy "community_post_images_select" on community_post_images
  for select using (true);

create policy "community_post_images_insert" on community_post_images
  for insert with check (
    auth.uid() = (select user_id from community_posts where id = post_id)
  );

create policy "community_post_images_delete" on community_post_images
  for delete using (
    auth.uid() = (select user_id from community_posts where id = post_id)
  );

-- community_comments
create policy "community_comments_select" on community_comments
  for select using (true);

create policy "community_comments_insert" on community_comments
  for insert with check (auth.uid() = user_id);

create policy "community_comments_update" on community_comments
  for update using (auth.uid() = user_id);

create policy "community_comments_delete" on community_comments
  for delete using (auth.uid() = user_id);

-- community_comment_upvotes
create policy "community_comment_upvotes_select" on community_comment_upvotes
  for select using (true);

create policy "community_comment_upvotes_insert" on community_comment_upvotes
  for insert with check (auth.uid() = user_id);

create policy "community_comment_upvotes_delete" on community_comment_upvotes
  for delete using (auth.uid() = user_id);
