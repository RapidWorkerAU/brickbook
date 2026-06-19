alter table public.profiles
add column if not exists bio text,
add column if not exists location text,
add column if not exists website text;

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  new_follower boolean not null default true,
  new_comment boolean not null default true,
  new_reply boolean not null default true,
  new_like boolean not null default false,
  mention boolean not null default true,
  email_digest boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_owner_select on public.notification_preferences;
drop policy if exists notification_preferences_owner_insert on public.notification_preferences;
drop policy if exists notification_preferences_owner_update on public.notification_preferences;
drop policy if exists notification_preferences_owner_delete on public.notification_preferences;

create policy notification_preferences_owner_select
on public.notification_preferences for select
using (user_id = auth.uid());

create policy notification_preferences_owner_insert
on public.notification_preferences for insert
with check (user_id = auth.uid());

create policy notification_preferences_owner_update
on public.notification_preferences for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy notification_preferences_owner_delete
on public.notification_preferences for delete
using (user_id = auth.uid());

create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocked_users_not_self check (blocker_id <> blocked_id)
);

alter table public.blocked_users enable row level security;

drop policy if exists blocked_users_owner_select on public.blocked_users;
drop policy if exists blocked_users_owner_insert on public.blocked_users;
drop policy if exists blocked_users_owner_delete on public.blocked_users;

create policy blocked_users_owner_select
on public.blocked_users for select
using (blocker_id = auth.uid());

create policy blocked_users_owner_insert
on public.blocked_users for insert
with check (blocker_id = auth.uid());

create policy blocked_users_owner_delete
on public.blocked_users for delete
using (blocker_id = auth.uid());

create index if not exists blocked_users_blocked_id_idx
on public.blocked_users(blocked_id);

insert into storage.buckets (id, name, public)
values ('brickbook-avatars', 'brickbook-avatars', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists avatars_public_read on storage.objects;
drop policy if exists avatars_owner_insert on storage.objects;
drop policy if exists avatars_owner_update on storage.objects;
drop policy if exists avatars_owner_delete on storage.objects;

create policy avatars_public_read
on storage.objects for select
using (bucket_id = 'brickbook-avatars');

create policy avatars_owner_insert
on storage.objects for insert
with check (
  bucket_id = 'brickbook-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy avatars_owner_update
on storage.objects for update
using (
  bucket_id = 'brickbook-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'brickbook-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy avatars_owner_delete
on storage.objects for delete
using (
  bucket_id = 'brickbook-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create or replace function public.notification_comment_author(comment_row public.comments)
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(to_jsonb(comment_row)->>'author_id', '')::uuid,
    nullif(to_jsonb(comment_row)->>'profile_id', '')::uuid,
    nullif(to_jsonb(comment_row)->>'created_by', '')::uuid,
    nullif(to_jsonb(comment_row)->>'owner_id', '')::uuid,
    nullif(to_jsonb(comment_row)->>'user_id', '')::uuid
  );
$$;

drop policy if exists comments_not_blocked_by_viewer on public.comments;

create policy comments_not_blocked_by_viewer
on public.comments
as restrictive
for select
using (
  auth.uid() is null
  or not exists (
    select 1
    from public.blocked_users bu
    where bu.blocker_id = auth.uid()
      and bu.blocked_id = public.notification_comment_author(comments)
  )
);
