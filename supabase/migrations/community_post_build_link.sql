-- Link community posts to a specific build (optional, post owner must own the build)
alter table community_posts
  add column if not exists build_id uuid references builds(id) on delete set null;

create index if not exists idx_community_posts_build_id
  on community_posts(build_id)
  where build_id is not null;
