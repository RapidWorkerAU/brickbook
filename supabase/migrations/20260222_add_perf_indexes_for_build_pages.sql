create index if not exists milestones_build_id_start_date_idx
on public.milestones(build_id, start_date);

create index if not exists milestones_build_id_sort_order_idx
on public.milestones(build_id, sort_order);

create index if not exists build_updates_build_id_created_at_idx
on public.build_updates(build_id, created_at desc);

create index if not exists build_updates_milestone_id_created_at_idx
on public.build_updates(milestone_id, created_at desc);

create index if not exists rooms_build_id_created_at_idx
on public.rooms(build_id, created_at);

create index if not exists selections_build_id_created_at_idx
on public.selections(build_id, created_at desc);

create index if not exists build_images_build_id_created_at_idx
on public.build_images(build_id, created_at desc);

create index if not exists build_follows_build_id_idx
on public.build_follows(build_id);

create index if not exists comments_build_id_created_at_idx
on public.comments(build_id, created_at desc);

create index if not exists comments_image_id_created_at_idx
on public.comments(image_id, created_at desc);

create index if not exists comments_update_id_created_at_idx
on public.comments(update_id, created_at desc);

create index if not exists image_likes_image_id_idx
on public.image_likes(image_id);

create index if not exists update_likes_update_id_idx
on public.update_likes(update_id);
