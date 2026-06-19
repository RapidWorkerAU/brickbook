alter table public.build_images
add column if not exists is_primary boolean not null default false;
