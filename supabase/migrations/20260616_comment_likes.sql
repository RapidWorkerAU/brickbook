create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.comment_likes enable row level security;

drop policy if exists comment_likes_public_select on public.comment_likes;
drop policy if exists comment_likes_owner_insert on public.comment_likes;
drop policy if exists comment_likes_owner_delete on public.comment_likes;

create policy comment_likes_public_select
on public.comment_likes for select
using (true);

create policy comment_likes_owner_insert
on public.comment_likes for insert
with check (user_id = auth.uid());

create policy comment_likes_owner_delete
on public.comment_likes for delete
using (user_id = auth.uid());

create index if not exists comment_likes_comment_id_idx
on public.comment_likes(comment_id);
