-- ROLLBACK: Remove Page 3 Date/Time/Weather/Road/Traffic Fields from incident_reports
-- Date: 2025-11-06
-- Purpose: Rollback migration 016 if needed
-- WARNING: Only use if migration needs to be reversed

BEGIN;

-- Drop all 41 Page 3 fields
ALTER TABLE incident_reports
  -- Date & Time
  DROP COLUMN IF EXISTS accident_date,
  DROP COLUMN IF EXISTS accident_time,

  -- Weather conditions
  DROP COLUMN IF EXISTS weather_bright_sunlight,
  DROP COLUMN IF EXISTS weather_clear,
  DROP COLUMN IF EXISTS weather_cloudy,
  DROP COLUMN IF EXISTS weather_raining,
  DROP COLUMN IF EXISTS weather_heavy_rain,
  DROP COLUMN IF EXISTS weather_drizzle,
  DROP COLUMN IF EXISTS weather_fog,
  DROP COLUMN IF EXISTS weather_snow,
  DROP COLUMN IF EXISTS weather_ice,
  DROP COLUMN IF EXISTS weather_windy,
  DROP COLUMN IF EXISTS weather_hail,
  DROP COLUMN IF EXISTS weather_thunder_lightning,

  -- Road conditions
  DROP COLUMN IF EXISTS road_condition_dry,
  DROP COLUMN IF EXISTS road_condition_wet,
  DROP COLUMN IF EXISTS road_condition_icy,
  DROP COLUMN IF EXISTS road_condition_snow_covered,
  DROP COLUMN IF EXISTS road_condition_loose_surface,
  DROP COLUMN IF EXISTS road_condition_slush_on_road,

  -- Road types
  DROP COLUMN IF EXISTS road_type_motorway,
  DROP COLUMN IF EXISTS road_type_a_road,
  DROP COLUMN IF EXISTS road_type_b_road,
  DROP COLUMN IF EXISTS road_type_urban_street,
  DROP COLUMN IF EXISTS road_type_rural_road,
  DROP COLUMN IF EXISTS road_type_car_park,
  DROP COLUMN IF EXISTS road_type_private_road,

  -- Speed fields
  DROP COLUMN IF EXISTS speed_limit,
  DROP COLUMN IF EXISTS your_speed,

  -- Traffic conditions
  DROP COLUMN IF EXISTS traffic_conditions_heavy,
  DROP COLUMN IF EXISTS traffic_conditions_moderate,
  DROP COLUMN IF EXISTS traffic_conditions_light,
  DROP COLUMN IF EXISTS traffic_conditions_no_traffic,

  -- Visibility
  DROP COLUMN IF EXISTS visibility_good,
  DROP COLUMN IF EXISTS visibility_poor,
  DROP COLUMN IF EXISTS visibility_very_poor,
  DROP COLUMN IF EXISTS visibility_street_lights,

  -- Road markings
  DROP COLUMN IF EXISTS road_markings_visible_yes,
  DROP COLUMN IF EXISTS road_markings_visible_no,
  DROP COLUMN IF EXISTS road_markings_visible_partially,

  -- System timestamp
  DROP COLUMN IF EXISTS completed_at;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE '⚠️ ROLLBACK complete: Removed 41 Page 3 fields from incident_reports';
  RAISE NOTICE '⚠️ Table returned to previous state';
END $$;

COMMIT;
