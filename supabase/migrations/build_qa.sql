-- Build Q&A: direct questions to the build owner, one answer per question, public read
create table if not exists build_qa (
  id          uuid default gen_random_uuid() primary key,
  build_id    uuid references builds(id) on delete cascade not null,
  asker_id    uuid references profiles(id) on delete cascade not null,
  question    text not null check (char_length(question) >= 5 and char_length(question) <= 500),
  answer      text check (answer is null or char_length(answer) >= 1),
  answered_at timestamptz,
  created_at  timestamptz default now() not null
);

create index if not exists build_qa_build_id_idx
  on build_qa (build_id, created_at desc);

alter table build_qa enable row level security;

-- Anyone can read Q&As
create policy "build_qa_select" on build_qa
  for select using (true);

-- Logged-in users can ask
create policy "build_qa_insert" on build_qa
  for insert with check (auth.uid() = asker_id);

-- Only the build owner can answer (update)
create policy "build_qa_update" on build_qa
  for update using (
    auth.uid() = (select owner_id from builds where id = build_id)
  );

-- Asker can delete their own unanswered question; owner can delete any
create policy "build_qa_delete" on build_qa
  for delete using (
    auth.uid() = asker_id
    or auth.uid() = (select owner_id from builds where id = build_id)
  );
