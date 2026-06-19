alter table public.rooms
add column if not exists room_type text,
add column if not exists level text,
add column if not exists notes text;

alter table public.rooms
alter column room_type type text using room_type::text;
