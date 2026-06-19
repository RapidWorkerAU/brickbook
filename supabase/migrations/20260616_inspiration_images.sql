alter table public.build_images
add column if not exists image_kind text not null default 'build',
add column if not exists notes text;

update public.build_images
set image_kind = 'selection'
where selection_id is not null
  and image_kind = 'build';

update public.build_images
set image_kind = 'update'
where update_id is not null
  and image_kind = 'build';

create index if not exists build_images_build_kind_created_at_idx
on public.build_images(build_id, image_kind, created_at desc);
