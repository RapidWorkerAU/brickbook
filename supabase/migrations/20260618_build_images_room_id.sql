alter table public.build_images
add column if not exists room_id uuid references public.rooms(id) on delete set null;

create index if not exists build_images_build_id_room_id_idx
on public.build_images(build_id, room_id);

create index if not exists build_images_update_id_idx
on public.build_images(update_id);
