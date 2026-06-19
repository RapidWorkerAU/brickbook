alter table public.selections
add column if not exists colour_name text,
add column if not exists code text,
add column if not exists finish text,
add column if not exists material_type text;

