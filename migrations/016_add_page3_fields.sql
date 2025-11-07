-- Migration: Add Page 3 Date/Time/Weather/Road/Traffic Fields to incident_reports
-- Date: 2025-11-06
-- Purpose: Add 41 Page 3 fields (date/time, weather, road conditions, traffic, visibility)
-- Source: PAGE3_COMPLETE_FIELD_LIST.csv

BEGIN;

-- ========================================
-- STEP 1: Add Date & Time fields
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS accident_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS accident_time TIME WITHOUT TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN incident_reports.accident_date IS 'Date the accident occurred';
COMMENT ON COLUMN incident_reports.accident_time IS 'Time the accident occurred (24-hour format)';

-- ========================================
-- STEP 2: Add Weather condition checkboxes
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS weather_bright_sunlight BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS weather_clear BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS weather_cloudy BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS weather_raining BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS weather_heavy_rain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS weather_drizzle BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS weather_fog BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS weather_snow BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS weather_ice BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS weather_windy BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS weather_hail BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS weather_thunder_lightning BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.weather_bright_sunlight IS 'Bright sunlight condition';
COMMENT ON COLUMN incident_reports.weather_clear IS 'Clear and dry weather';
COMMENT ON COLUMN incident_reports.weather_cloudy IS 'Cloudy condition';
COMMENT ON COLUMN incident_reports.weather_raining IS 'Raining weather';
COMMENT ON COLUMN incident_reports.weather_heavy_rain IS 'Heavy rain';
COMMENT ON COLUMN incident_reports.weather_drizzle IS 'Drizzle';
COMMENT ON COLUMN incident_reports.weather_fog IS 'Fog or poor visibility';
COMMENT ON COLUMN incident_reports.weather_snow IS 'Snow weather';
COMMENT ON COLUMN incident_reports.weather_ice IS 'Ice/frost conditions';
COMMENT ON COLUMN incident_reports.weather_windy IS 'Windy conditions';
COMMENT ON COLUMN incident_reports.weather_hail IS 'Hail';
COMMENT ON COLUMN incident_reports.weather_thunder_lightning IS 'Thunder/lightning';

-- ========================================
-- STEP 3: Add Road condition checkboxes
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS road_condition_dry BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS road_condition_wet BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS road_condition_icy BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS road_condition_snow_covered BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS road_condition_loose_surface BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS road_condition_slush_on_road BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.road_condition_dry IS 'Dry road surface';
COMMENT ON COLUMN incident_reports.road_condition_wet IS 'Wet road surface';
COMMENT ON COLUMN incident_reports.road_condition_icy IS 'Icy road surface';
COMMENT ON COLUMN incident_reports.road_condition_snow_covered IS 'Snow-covered road';
COMMENT ON COLUMN incident_reports.road_condition_loose_surface IS 'Loose surface (gravel/debris)';
COMMENT ON COLUMN incident_reports.road_condition_slush_on_road IS 'Slush on road';

-- ========================================
-- STEP 4: Add Road type checkboxes
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS road_type_motorway BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS road_type_a_road BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS road_type_b_road BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS road_type_urban_street BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS road_type_rural_road BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS road_type_car_park BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS road_type_private_road BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.road_type_motorway IS 'Motorway road type';
COMMENT ON COLUMN incident_reports.road_type_a_road IS 'A-road';
COMMENT ON COLUMN incident_reports.road_type_b_road IS 'B-road';
COMMENT ON COLUMN incident_reports.road_type_urban_street IS 'Urban street';
COMMENT ON COLUMN incident_reports.road_type_rural_road IS 'Rural road';
COMMENT ON COLUMN incident_reports.road_type_car_park IS 'Car park';
COMMENT ON COLUMN incident_reports.road_type_private_road IS 'Private road';

-- ========================================
-- STEP 5: Add Speed fields
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS speed_limit TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS your_speed INTEGER DEFAULT NULL;

COMMENT ON COLUMN incident_reports.speed_limit IS 'Posted speed limit (20-70 mph or ''unknown'')';
COMMENT ON COLUMN incident_reports.your_speed IS 'User''s estimated speed (0-150 mph)';

-- ========================================
-- STEP 6: Add Traffic condition checkboxes
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS traffic_conditions_heavy BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS traffic_conditions_moderate BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS traffic_conditions_light BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS traffic_conditions_no_traffic BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.traffic_conditions_heavy IS 'Heavy traffic';
COMMENT ON COLUMN incident_reports.traffic_conditions_moderate IS 'Moderate traffic';
COMMENT ON COLUMN incident_reports.traffic_conditions_light IS 'Light traffic';
COMMENT ON COLUMN incident_reports.traffic_conditions_no_traffic IS 'No traffic';

-- ========================================
-- STEP 7: Add Visibility checkboxes
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS visibility_good BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS visibility_poor BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS visibility_very_poor BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS visibility_street_lights BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.visibility_good IS 'Good visibility';
COMMENT ON COLUMN incident_reports.visibility_poor IS 'Poor visibility';
COMMENT ON COLUMN incident_reports.visibility_very_poor IS 'Very poor visibility';
COMMENT ON COLUMN incident_reports.visibility_street_lights IS 'Street lights present';

-- ========================================
-- STEP 8: Add Road markings checkboxes
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS road_markings_visible_yes BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS road_markings_visible_no BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS road_markings_visible_partially BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.road_markings_visible_yes IS 'Road markings visible';
COMMENT ON COLUMN incident_reports.road_markings_visible_no IS 'Road markings not visible';
COMMENT ON COLUMN incident_reports.road_markings_visible_partially IS 'Road markings partially visible';

-- ========================================
-- STEP 9: Add System timestamp
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN incident_reports.completed_at IS 'JavaScript-generated timestamp (new Date().toISOString())';

-- ========================================
-- STEP 10: Log completion
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 016 complete: Added 41 Page 3 fields';
  RAISE NOTICE '📊 Fields breakdown:';
  RAISE NOTICE '   - 2 date/time fields (accident_date, accident_time)';
  RAISE NOTICE '   - 14 weather checkboxes';
  RAISE NOTICE '   - 6 road condition checkboxes';
  RAISE NOTICE '   - 7 road type checkboxes';
  RAISE NOTICE '   - 2 speed fields (speed_limit, your_speed)';
  RAISE NOTICE '   - 4 traffic condition checkboxes';
  RAISE NOTICE '   - 4 visibility checkboxes';
  RAISE NOTICE '   - 3 road markings checkboxes';
  RAISE NOTICE '   - 1 system timestamp (completed_at)';
END $$;

COMMIT;
