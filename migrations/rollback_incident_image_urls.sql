-- Rollback: Remove 13 image URL columns from incident_reports
-- Date: 2025-11-16
-- Purpose: Undo add_incident_image_urls.sql migration

BEGIN;

-- Remove all 13 image URL columns
ALTER TABLE incident_reports
DROP COLUMN IF EXISTS audio_recording_url,
DROP COLUMN IF EXISTS scene_photo_1_url,
DROP COLUMN IF EXISTS scene_photo_2_url,
DROP COLUMN IF EXISTS scene_photo_3_url,
DROP COLUMN IF EXISTS other_vehicle_photo_1_url,
DROP COLUMN IF EXISTS other_vehicle_photo_2_url,
DROP COLUMN IF EXISTS other_vehicle_photo_3_url,
DROP COLUMN IF EXISTS vehicle_damage_photo_1_url,
DROP COLUMN IF EXISTS vehicle_damage_photo_2_url,
DROP COLUMN IF EXISTS vehicle_damage_photo_3_url,
DROP COLUMN IF EXISTS vehicle_damage_photo_4_url,
DROP COLUMN IF EXISTS vehicle_damage_photo_5_url,
DROP COLUMN IF EXISTS vehicle_damage_photo_6_url;

-- Log the rollback
DO $$
BEGIN
  RAISE NOTICE 'Rollback complete: Removed 13 image URL columns from incident_reports';
END $$;

COMMIT;
