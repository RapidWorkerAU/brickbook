create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.builds(id) on delete cascade,
  name text not null,
  room_type text,
  level text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

drop policy if exists "rooms_owner_select" on public.rooms;
create policy "rooms_owner_select"
on public.rooms for select
to authenticated
using (
  exists (
    select 1 from public.builds b
    where b.id = rooms.build_id and b.owner_id = auth.uid()
  )
);

drop policy if exists "rooms_owner_insert" on public.rooms;
create policy "rooms_owner_insert"
on public.rooms for insert
to authenticated
with check (
  exists (
    select 1 from public.builds b
    where b.id = rooms.build_id and b.owner_id = auth.uid()
  )
);

drop policy if exists "rooms_owner_update" on public.rooms;
create policy "rooms_owner_update"
on public.rooms for update
to authenticated
using (
  exists (
    select 1 from public.builds b
    where b.id = rooms.build_id and b.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.builds b
    where b.id = rooms.build_id and b.owner_id = auth.uid()
  )
);

drop policy if exists "rooms_owner_delete" on public.rooms;
create policy "rooms_owner_delete"
on public.rooms for delete
to authenticated
using (
  exists (
    select 1 from public.builds b
    where b.id = rooms.build_id and b.owner_id = auth.uid()
  )
);

drop policy if exists "rooms_public_read_anon" on public.rooms;
create policy "rooms_public_read_anon"
on public.rooms for select
to anon
using (
  exists (
    select 1
    from public.builds b
    where b.id = rooms.build_id
      and b.is_listed = true
      and public.can_view(b.owner_id, b.id, b.standard_visibility)
  )
);

alter table public.selections
add column if not exists selection_type text,
add column if not exists category text,
add column if not exists subcategory text,
add column if not exists location text,
add column if not exists room_id uuid references public.rooms(id) on delete set null,
add column if not exists item_name text,
add column if not exists brand text,
add column if not exists product_name text,
add column if not exists model text,
add column if not exists supplier text,
add column if not exists product_url text,
add column if not exists image_path text,
add column if not exists notes text,
add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.build_images
add column if not exists selection_id uuid references public.selections(id) on delete set null;

alter table public.build_updates
add column if not exists room_id uuid references public.rooms(id) on delete set null;

create index if not exists rooms_build_id_name_idx
on public.rooms(build_id, name);

create index if not exists selections_build_id_room_id_idx
on public.selections(build_id, room_id);

create index if not exists selections_build_id_type_idx
on public.selections(build_id, selection_type);

create index if not exists build_images_selection_id_created_at_idx
on public.build_images(selection_id, created_at desc);

create index if not exists build_updates_room_id_created_at_idx
on public.build_updates(room_id, created_at desc);
