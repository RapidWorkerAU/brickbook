-- Build stage (planning, pre_construction, construction, landscaping, complete)
ALTER TABLE builds ADD COLUMN IF NOT EXISTS stage text DEFAULT NULL;

-- Design styles wishlist (array so planners can pick multiple styles they love)
ALTER TABLE builds ADD COLUMN IF NOT EXISTS planning_styles text[] DEFAULT '{}';

-- Budget targets
ALTER TABLE builds ADD COLUMN IF NOT EXISTS budget_land_min integer DEFAULT NULL;
ALTER TABLE builds ADD COLUMN IF NOT EXISTS budget_land_max integer DEFAULT NULL;
ALTER TABLE builds ADD COLUMN IF NOT EXISTS budget_build_min integer DEFAULT NULL;
ALTER TABLE builds ADD COLUMN IF NOT EXISTS budget_build_max integer DEFAULT NULL;

-- Suburb wishlist items
CREATE TABLE IF NOT EXISTS planning_suburbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id uuid NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  suburb_name text NOT NULL,
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Builder shortlist items
CREATE TABLE IF NOT EXISTS planning_builders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id uuid NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  builder_name text NOT NULL,
  website text,
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Saved builds (planners bookmarking builds they love)
CREATE TABLE IF NOT EXISTS saved_builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  build_id uuid NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, build_id)
);

-- RLS
ALTER TABLE planning_suburbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_builders ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages planning suburbs"
  ON planning_suburbs FOR ALL
  USING (build_id IN (SELECT id FROM builds WHERE owner_id = auth.uid()));

CREATE POLICY "Owner manages planning builders"
  ON planning_builders FOR ALL
  USING (build_id IN (SELECT id FROM builds WHERE owner_id = auth.uid()));

CREATE POLICY "Users manage their saved builds"
  ON saved_builds FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can read saved builds"
  ON saved_builds FOR SELECT
  USING (true);
