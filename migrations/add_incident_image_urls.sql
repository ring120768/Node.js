-- Migration: Add 13 image URL columns to incident_reports for Pages 11-12 evidence
-- Date: 2025-11-16
-- Purpose: Store image URLs from incident form uploads (not signup)
-- Maps to: PDF Pages 11-12 evidence collection fields

BEGIN;

-- Add 13 new image URL columns to incident_reports table
-- These will store Supabase Storage signed URLs for incident evidence photos

-- Audio recording (1 field)
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS audio_recording_url TEXT;

COMMENT ON COLUMN incident_reports.audio_recording_url IS
'Audio recording URL - maps to PDF field: file_url_record_detailed_account_of_what_happened';

-- Scene overview photos (3 fields)
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS scene_photo_1_url TEXT,
ADD COLUMN IF NOT EXISTS scene_photo_2_url TEXT,
ADD COLUMN IF NOT EXISTS scene_photo_3_url TEXT;

COMMENT ON COLUMN incident_reports.scene_photo_1_url IS
'Scene overview photo 1 URL - maps to PDF field: scene_images_path_1 (may also use location_map_screenshot from user_documents)';

COMMENT ON COLUMN incident_reports.scene_photo_2_url IS
'Scene overview photo 2 URL - maps to PDF field: scene_images_path_2';

COMMENT ON COLUMN incident_reports.scene_photo_3_url IS
'Scene overview photo 3 URL - maps to PDF field: scene_images_path_3';

-- Other vehicle photos (3 fields)
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS other_vehicle_photo_1_url TEXT,
ADD COLUMN IF NOT EXISTS other_vehicle_photo_2_url TEXT,
ADD COLUMN IF NOT EXISTS other_vehicle_photo_3_url TEXT;

COMMENT ON COLUMN incident_reports.other_vehicle_photo_1_url IS
'Other vehicle photo 1 URL - maps to PDF field: other_vehicle_photo_1';

COMMENT ON COLUMN incident_reports.other_vehicle_photo_2_url IS
'Other vehicle photo 2 URL - maps to PDF field: other_vehicle_photo_2';

COMMENT ON COLUMN incident_reports.other_vehicle_photo_3_url IS
'Other vehicle photo 3 URL - maps to PDF field: other_vehicle_photo_3';

-- Vehicle damage photos (6 fields)
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS vehicle_damage_photo_1_url TEXT,
ADD COLUMN IF NOT EXISTS vehicle_damage_photo_2_url TEXT,
ADD COLUMN IF NOT EXISTS vehicle_damage_photo_3_url TEXT,
ADD COLUMN IF NOT EXISTS vehicle_damage_photo_4_url TEXT,
ADD COLUMN IF NOT EXISTS vehicle_damage_photo_5_url TEXT,
ADD COLUMN IF NOT EXISTS vehicle_damage_photo_6_url TEXT;

COMMENT ON COLUMN incident_reports.vehicle_damage_photo_1_url IS
'Vehicle damage photo 1 URL - maps to PDF field: vehicle_damage_path_1';

COMMENT ON COLUMN incident_reports.vehicle_damage_photo_2_url IS
'Vehicle damage photo 2 URL - maps to PDF field: vehicle_damage_path_2';

COMMENT ON COLUMN incident_reports.vehicle_damage_photo_3_url IS
'Vehicle damage photo 3 URL - maps to PDF field: vehicle_damage_path_3';

COMMENT ON COLUMN incident_reports.vehicle_damage_photo_4_url IS
'Vehicle damage photo 4 URL - maps to PDF field: vehicle_damage_path_4';

COMMENT ON COLUMN incident_reports.vehicle_damage_photo_5_url IS
'Vehicle damage photo 5 URL - maps to PDF field: vehicle_damage_path_5';

COMMENT ON COLUMN incident_reports.vehicle_damage_photo_6_url IS
'Vehicle damage photo 6 URL - maps to PDF field: vehicle_damage_path_6';

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Added 13 image URL columns to incident_reports';
  RAISE NOTICE '  - 1 audio recording URL';
  RAISE NOTICE '  - 3 scene photo URLs';
  RAISE NOTICE '  - 3 other vehicle photo URLs';
  RAISE NOTICE '  - 6 vehicle damage photo URLs';
  RAISE NOTICE 'Total: 13 new columns for Pages 11-12 evidence collection';
END $$;

COMMIT;
