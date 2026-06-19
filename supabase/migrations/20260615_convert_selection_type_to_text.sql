alter table public.selections
alter column selection_type type text
using selection_type::text;
