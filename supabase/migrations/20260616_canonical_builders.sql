create table if not exists public.builders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  normalized_name text not null unique,
  website text,
  logo_path text,
  claimed_profile_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint builders_name_not_blank check (length(trim(name)) > 0),
  constraint builders_slug_not_blank check (length(trim(slug)) > 0),
  constraint builders_normalized_name_not_blank check (length(trim(normalized_name)) > 0)
);

alter table public.builders
add column if not exists name text,
add column if not exists slug text,
add column if not exists normalized_name text,
add column if not exists website text,
add column if not exists logo_path text,
add column if not exists claimed_profile_id uuid,
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

alter table public.builders enable row level security;

drop policy if exists builders_public_select on public.builders;
drop policy if exists builders_authenticated_insert on public.builders;
drop policy if exists builders_claimed_update on public.builders;

create policy builders_public_select
on public.builders for select
using (true);

create policy builders_authenticated_insert
on public.builders for insert
with check (auth.uid() is not null);

create policy builders_claimed_update
on public.builders for update
using (claimed_profile_id = auth.uid())
with check (claimed_profile_id = auth.uid());

alter table public.builds
add column if not exists builder_id uuid references public.builders(id) on delete set null;

create index if not exists builds_builder_id_idx on public.builds(builder_id);
create index if not exists builders_slug_idx on public.builders(slug);
create index if not exists builders_normalized_name_idx on public.builders(normalized_name);
create unique index if not exists builders_slug_unique_idx on public.builders(slug);
create unique index if not exists builders_normalized_name_unique_idx on public.builders(normalized_name);

create or replace function public.normalize_builder_name(input text)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(coalesce(input, '')), '&', ' and ', 'g'),
          '[^a-z0-9]+',
          ' ',
          'g'
        ),
        '\m(pty|ltd|limited|homes?|builders?|construction|constructions)\M',
        '',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

insert into public.builders (name, slug, normalized_name)
select distinct on (normalized_name)
  name,
  case when slug_rank = 1 then slug_base else slug_base || '-' || slug_rank::text end as slug,
  normalized_name
from (
  select
    trim(builder_name) as name,
    nullif(regexp_replace(
      regexp_replace(lower(trim(builder_name)), '[^a-z0-9]+', '-', 'g'),
      '(^-|-$)',
      '',
      'g'
    ), '') as slug_base,
    public.normalize_builder_name(builder_name) as normalized_name,
    row_number() over (
      partition by nullif(regexp_replace(regexp_replace(lower(trim(builder_name)), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'), '')
      order by trim(builder_name)
    ) as slug_rank
  from public.builds
  where nullif(trim(builder_name), '') is not null
) source
where normalized_name <> ''
  and slug_base is not null
  and not exists (
    select 1
    from public.builders existing
    where existing.normalized_name = source.normalized_name
       or existing.slug = case when source.slug_rank = 1 then source.slug_base else source.slug_base || '-' || source.slug_rank::text end
  )
on conflict (normalized_name) do nothing;

update public.builds b
set builder_id = canonical.id,
    builder_name = canonical.name
from public.builders canonical
where b.builder_id is null
  and (
    public.normalize_builder_name(b.builder_name) = canonical.normalized_name
    or regexp_replace(regexp_replace(lower(trim(b.builder_name)), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g') = canonical.slug
  );
