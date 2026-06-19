alter table public.selections
add column if not exists title text;

update public.selections
set title = coalesce(
  nullif(title, ''),
  nullif(item_name, ''),
  nullif(product_name, ''),
  nullif(colour_name, ''),
  nullif(subcategory, ''),
  nullif(category, ''),
  'Selection'
);

alter table public.selections
alter column title set default 'Selection';

alter table public.selections
alter column title set not null;
