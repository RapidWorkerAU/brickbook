-- NCC 2025 climate zone reference data
-- Source: ABCB NCC 2025 Housing Provisions, Tables 3 and 13.5.2

-- ── Reference cities (Table 3) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ncc_climate_zones (
  id            SERIAL           PRIMARY KEY,
  state         TEXT             NOT NULL,
  location_name TEXT             NOT NULL,
  postcode      TEXT,
  climate_zone  SMALLINT         NOT NULL CHECK (climate_zone BETWEEN 1 AND 8),
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL,
  created_at    TIMESTAMPTZ      DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ncc_climate_zones_zone_idx
  ON ncc_climate_zones (climate_zone);

CREATE INDEX IF NOT EXISTS ncc_climate_zones_lat_lng_idx
  ON ncc_climate_zones (lat, lng);

-- ── Zone profiles (one row per zone 1–8) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS zone_profiles (
  zone              SMALLINT PRIMARY KEY CHECK (zone BETWEEN 1 AND 8),
  zone_name         TEXT     NOT NULL,
  ncc_zone_name     TEXT     NOT NULL,
  climate_summary   TEXT     NOT NULL,
  design_priority   TEXT     NOT NULL CHECK (design_priority IN ('cooling','heating','mixed')),
  dominant_strategy TEXT     NOT NULL,
  feel_description  TEXT,
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ── Ceiling fan requirements (Table 13.5.2) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS zone_ceiling_fan_requirements (
  id              SERIAL   PRIMARY KEY,
  zone            SMALLINT NOT NULL REFERENCES zone_profiles(zone),
  applies_to      TEXT     NOT NULL CHECK (applies_to IN ('bedroom','habitable_room')),
  room_sqm_min    REAL     NOT NULL,
  room_sqm_max    REAL,
  fan_count       SMALLINT NOT NULL,
  fan_diameter_mm SMALLINT NOT NULL,
  state_restriction TEXT   -- NULL = applies in all states, e.g. 'NSW,QLD' for state-specific
);

CREATE INDEX IF NOT EXISTS zone_ceiling_fan_zone_idx
  ON zone_ceiling_fan_requirements (zone);

-- ── RLS: all three tables are public read ─────────────────────────────────────
ALTER TABLE ncc_climate_zones             ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_ceiling_fan_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read ncc_climate_zones"
  ON ncc_climate_zones FOR SELECT USING (true);

CREATE POLICY "Public read zone_profiles"
  ON zone_profiles FOR SELECT USING (true);

CREATE POLICY "Public read zone_ceiling_fan_requirements"
  ON zone_ceiling_fan_requirements FOR SELECT USING (true);
