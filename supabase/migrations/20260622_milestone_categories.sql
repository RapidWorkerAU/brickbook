ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS milestone_categories text[] DEFAULT '{}';
