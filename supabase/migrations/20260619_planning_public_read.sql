-- Allow public to read suburb/builder wishlists for publicly listed planning builds
CREATE POLICY "Public can read planning suburbs for listed builds"
  ON planning_suburbs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM builds WHERE id = planning_suburbs.build_id AND is_listed = true)
  );

CREATE POLICY "Public can read planning builders for listed builds"
  ON planning_builders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM builds WHERE id = planning_builders.build_id AND is_listed = true)
  );
