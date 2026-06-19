-- Builds saved by planning-build owners as inspiration
CREATE TABLE IF NOT EXISTS public.planning_saved_builds (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_build_id uuid NOT NULL REFERENCES public.builds(id) ON DELETE CASCADE,
  saved_build_id    uuid NOT NULL REFERENCES public.builds(id) ON DELETE CASCADE,
  owner_id          uuid NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT planning_saved_builds_unique UNIQUE (planning_build_id, saved_build_id)
);

ALTER TABLE public.planning_saved_builds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS psb_owner_select  ON public.planning_saved_builds;
DROP POLICY IF EXISTS psb_public_select ON public.planning_saved_builds;
DROP POLICY IF EXISTS psb_owner_insert  ON public.planning_saved_builds;
DROP POLICY IF EXISTS psb_owner_delete  ON public.planning_saved_builds;

-- Owner sees their own
CREATE POLICY psb_owner_select ON public.planning_saved_builds FOR SELECT
  USING (owner_id = auth.uid());

-- Public sees saved-build lists on listed planning builds (Saved Builds tab)
CREATE POLICY psb_public_select ON public.planning_saved_builds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.builds b
      WHERE b.id = planning_build_id AND b.is_listed = true
    )
  );

-- Owner can save builds
CREATE POLICY psb_owner_insert ON public.planning_saved_builds FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Owner can remove saves
CREATE POLICY psb_owner_delete ON public.planning_saved_builds FOR DELETE
  USING (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS psb_planning_build_idx ON public.planning_saved_builds(planning_build_id);
CREATE INDEX IF NOT EXISTS psb_saved_build_idx    ON public.planning_saved_builds(saved_build_id);
CREATE INDEX IF NOT EXISTS psb_owner_idx          ON public.planning_saved_builds(owner_id);
