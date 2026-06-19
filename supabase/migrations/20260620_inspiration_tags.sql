-- Junction table: tag build images with selections for the inspiration feed
CREATE TABLE IF NOT EXISTS image_selection_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id uuid NOT NULL REFERENCES build_images(id) ON DELETE CASCADE,
  selection_id uuid NOT NULL REFERENCES selections(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(image_id, selection_id)
);

ALTER TABLE image_selection_tags ENABLE ROW LEVEL SECURITY;

-- Build owners can manage tags on their own build images
CREATE POLICY "Owner manages image selection tags"
  ON image_selection_tags FOR ALL
  USING (
    image_id IN (
      SELECT bi.id FROM build_images bi
      JOIN builds b ON bi.build_id = b.id
      WHERE b.owner_id = auth.uid()
    )
  );

-- Anyone can read tags for images on public builds
CREATE POLICY "Public reads image selection tags for listed builds"
  ON image_selection_tags FOR SELECT
  USING (
    image_id IN (
      SELECT bi.id FROM build_images bi
      JOIN builds b ON bi.build_id = b.id
      WHERE b.is_listed = true
    )
  );
