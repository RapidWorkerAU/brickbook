alter table public.comments
add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade,
add column if not exists image_path text,
add column if not exists mentions text[] not null default '{}';

create index if not exists comments_build_id_parent_idx
on public.comments(build_id, parent_comment_id, created_at);

create index if not exists comments_parent_idx
on public.comments(parent_comment_id);
