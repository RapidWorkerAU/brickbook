-- Enable unauthenticated (anon) users to read public discovery content.
-- Authenticated write policies are unchanged.

-- PROFILES
drop policy if exists "profiles_read_anon" on public.profiles;
create policy "profiles_read_anon"
on public.profiles for select
to anon
using (true);

-- BUILDS
drop policy if exists "builds_public_read_anon" on public.builds;
create policy "builds_public_read_anon"
on public.builds for select
to anon
using (
  is_listed = true
  and public.can_view(owner_id, id, 'public')
);

-- ROOMS
drop policy if exists "rooms_public_read_anon" on public.rooms;
create policy "rooms_public_read_anon"
on public.rooms for select
to anon
using (
  exists (
    select 1
    from public.builds b
    where b.id = build_id
      and b.is_listed = true
      and public.can_view(b.owner_id, b.id, b.standard_visibility)
  )
);

-- SELECTIONS
drop policy if exists "selections_public_read_anon" on public.selections;
create policy "selections_public_read_anon"
on public.selections for select
to anon
using (
  exists (
    select 1
    from public.builds b
    where b.id = build_id
      and b.is_listed = true
      and public.can_view(b.owner_id, b.id, coalesce(selections.visibility, b.standard_visibility))
  )
);

-- MILESTONES
drop policy if exists "milestones_public_read_anon" on public.milestones;
create policy "milestones_public_read_anon"
on public.milestones for select
to anon
using (
  exists (
    select 1
    from public.builds b
    where b.id = build_id
      and b.is_listed = true
      and public.can_view(b.owner_id, b.id, coalesce(milestones.visibility, b.timeline_visibility))
  )
);

-- BUILD UPDATES
drop policy if exists "build_updates_public_read_anon" on public.build_updates;
create policy "build_updates_public_read_anon"
on public.build_updates for select
to anon
using (
  exists (
    select 1
    from public.builds b
    left join public.milestones m on m.id = build_updates.milestone_id
    where b.id = build_updates.build_id
      and b.is_listed = true
      and public.can_view(b.owner_id, b.id, coalesce(m.visibility, b.timeline_visibility))
  )
);

-- BUILD IMAGES
drop policy if exists "build_images_public_read_anon" on public.build_images;
create policy "build_images_public_read_anon"
on public.build_images for select
to anon
using (
  exists (
    select 1
    from public.builds b
    left join public.milestones m on m.id = build_images.milestone_id
    where b.id = build_id
      and b.is_listed = true
      and (
        (
          build_images.milestone_id is not null
          and m.show_images = true
          and public.can_view(
            b.owner_id,
            b.id,
            coalesce(build_images.visibility, coalesce(m.visibility, b.timeline_visibility))
          )
        )
        or
        (
          build_images.milestone_id is null
          and public.can_view(b.owner_id, b.id, coalesce(build_images.visibility, b.standard_visibility))
        )
      )
  )
);

-- FOLLOWS + LIKES COUNTS
drop policy if exists "follows_read_anon" on public.build_follows;
create policy "follows_read_anon"
on public.build_follows for select
to anon
using (true);

drop policy if exists "image_likes_read_anon" on public.image_likes;
create policy "image_likes_read_anon"
on public.image_likes for select
to anon
using (true);

-- COMMENTS
drop policy if exists "comments_public_read_anon" on public.comments;
create policy "comments_public_read_anon"
on public.comments for select
to anon
using (
  (
    update_id is null
    and image_id is null
    and exists (
      select 1
      from public.builds b
      where b.id = build_id and b.is_listed = true
    )
  )
  or
  (
    image_id is not null
    and exists (
      select 1
      from public.build_images bi
      join public.builds b on b.id = bi.build_id
      left join public.milestones m on m.id = bi.milestone_id
      where bi.id = comments.image_id
        and b.is_listed = true
        and (
          (
            bi.milestone_id is not null
            and m.show_images = true
            and public.can_view(
              b.owner_id,
              b.id,
              coalesce(bi.visibility, coalesce(m.visibility, b.timeline_visibility))
            )
          )
          or
          (
            bi.milestone_id is null
            and public.can_view(b.owner_id, b.id, coalesce(bi.visibility, b.standard_visibility))
          )
        )
    )
  )
  or
  (
    update_id is not null
    and exists (
      select 1
      from public.build_updates bu
      join public.builds b on b.id = bu.build_id
      left join public.milestones m on m.id = bu.milestone_id
      where bu.id = comments.update_id
        and b.is_listed = true
        and public.can_view(b.owner_id, b.id, coalesce(m.visibility, b.timeline_visibility))
    )
  )
);
