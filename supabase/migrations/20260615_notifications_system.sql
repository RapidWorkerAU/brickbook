create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,
  build_id uuid references public.builds(id) on delete cascade,
  update_id uuid references public.build_updates(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications
add column if not exists recipient_id uuid references public.profiles(id) on delete cascade,
add column if not exists actor_id uuid references public.profiles(id) on delete set null,
add column if not exists type text,
add column if not exists build_id uuid references public.builds(id) on delete cascade,
add column if not exists update_id uuid references public.build_updates(id) on delete cascade,
add column if not exists comment_id uuid references public.comments(id) on delete cascade,
add column if not exists is_read boolean not null default false,
add column if not exists read_at timestamptz,
add column if not exists created_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'user_id'
  ) then
    execute 'update public.notifications set recipient_id = coalesce(recipient_id, user_id) where recipient_id is null';
  end if;
end;
$$;

create index if not exists notifications_recipient_created_idx
on public.notifications(recipient_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
on public.notifications(recipient_id, is_read)
where is_read = false;

alter table public.notifications enable row level security;

drop policy if exists notifications_recipient_all on public.notifications;
drop policy if exists notifications_read_own on public.notifications;
drop policy if exists notifications_update_own on public.notifications;

create policy notifications_read_own
on public.notifications
for select
using (recipient_id = auth.uid());

create policy notifications_update_own
on public.notifications
for update
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

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

create or replace function public.notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  select owner_id into v_owner_id from public.builds where id = new.build_id;

  if v_owner_id is not null and v_owner_id != new.follower_id then
    insert into public.notifications (recipient_id, type, actor_id, build_id)
    values (v_owner_id, 'new_follower', new.follower_id, new.build_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_new_follower on public.build_follows;
create trigger trg_notify_new_follower
after insert on public.build_follows
for each row execute function public.notify_new_follower();

create or replace function public.notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_owner_id uuid;
  v_parent_author_id uuid;
  v_mentioned_id uuid;
  mention text;
begin
  v_actor_id := public.notification_comment_author(new);
  if v_actor_id is null then
    return new;
  end if;

  select owner_id into v_owner_id from public.builds where id = new.build_id;

  if v_owner_id is not null and v_owner_id != v_actor_id then
    insert into public.notifications (recipient_id, type, actor_id, build_id, update_id, comment_id)
    values (v_owner_id, 'new_comment', v_actor_id, new.build_id, new.update_id, new.id);
  end if;

  if new.parent_comment_id is not null then
    select public.notification_comment_author(c) into v_parent_author_id
    from public.comments c
    where c.id = new.parent_comment_id;

    if v_parent_author_id is not null
      and v_parent_author_id != v_actor_id
      and v_parent_author_id != coalesce(v_owner_id, '00000000-0000-0000-0000-000000000000'::uuid)
    then
      insert into public.notifications (recipient_id, type, actor_id, build_id, update_id, comment_id)
      values (v_parent_author_id, 'new_reply', v_actor_id, new.build_id, new.update_id, new.id);
    end if;
  end if;

  if new.mentions is not null and array_length(new.mentions, 1) > 0 then
    foreach mention in array new.mentions loop
      select id into v_mentioned_id
      from public.profiles
      where lower(username) = lower(ltrim(mention, '@'))
      limit 1;

      if v_mentioned_id is not null and v_mentioned_id != v_actor_id then
        insert into public.notifications (recipient_id, type, actor_id, build_id, update_id, comment_id)
        values (v_mentioned_id, 'mention', v_actor_id, new.build_id, new.update_id, new.id);
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_new_comment on public.comments;
create trigger trg_notify_new_comment
after insert on public.comments
for each row execute function public.notify_new_comment();

create or replace function public.notify_new_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_build_id uuid;
begin
  select bu.build_id into v_build_id from public.build_updates bu where bu.id = new.update_id;
  select b.owner_id into v_owner_id from public.builds b where b.id = v_build_id;

  if v_owner_id is not null and v_owner_id != new.user_id then
    insert into public.notifications (recipient_id, type, actor_id, build_id, update_id)
    values (v_owner_id, 'new_like', new.user_id, v_build_id, new.update_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_new_like on public.update_likes;
create trigger trg_notify_new_like
after insert on public.update_likes
for each row execute function public.notify_new_like();
