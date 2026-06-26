-- Monthly climate averages per NCC zone, keyed per representative city.
-- Multiple cities per zone allow nearest-city lookup from the user's location.

CREATE TABLE IF NOT EXISTS zone_monthly_climate (
  id                 SERIAL PRIMARY KEY,
  zone               SMALLINT NOT NULL REFERENCES zone_profiles(zone),
  city_key           TEXT NOT NULL,
  city_name          TEXT NOT NULL,
  state              TEXT NOT NULL,
  lat                REAL NOT NULL,
  lng                REAL NOT NULL,
  month              SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  avg_max_c          REAL NOT NULL,
  avg_min_c          REAL NOT NULL,
  avg_rainfall_mm    REAL NOT NULL,
  avg_humidity_pct   REAL,
  avg_wind_speed_kmh REAL,
  UNIQUE (city_key, month)
);

ALTER TABLE zone_monthly_climate ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read zone_monthly_climate"
  ON zone_monthly_climate
  FOR SELECT
  USING (true);
