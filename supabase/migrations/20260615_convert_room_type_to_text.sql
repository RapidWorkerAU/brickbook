alter table public.rooms
alter column room_type type text using room_type::text;
