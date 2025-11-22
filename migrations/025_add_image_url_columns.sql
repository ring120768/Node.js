-- Migration 025: Add Image URL Columns to incident_reports
-- Date: 2025-11-06
-- Purpose: Add 2 columns to store Page 8 photo download URLs
-- Note: Pages 4a and 6 photos are stored ONLY in user_documents table
--
-- Context:
-- - Page 4a (scene photos): 3 photos stored in user_documents only
-- - Page 6 (vehicle damage): 5 photos stored in user_documents only
-- - Page 8 (other vehicle damage): Photos 1-2 stored in BOTH tables (backward compatibility)
--                                  Photos 3-5 stored in user_documents only
--
-- Total: 13 photos, 2 redundant copies for quick access

BEGIN;

-- Add Page 8 Photo URL Columns (Other Vehicle Damage Photos)
-- Only first 2 photos stored in incident_reports for backward compatibility
-- Photos 3-5 stored in user_documents only
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS file_url_other_vehicle TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS file_url_other_vehicle_1 TEXT DEFAULT NULL;

-- Add helpful comments
COMMENT ON COLUMN incident_reports.file_url_other_vehicle IS
  'Download URL for other vehicle photo 1 (Page 8) - Format: /api/user-documents/{uuid}/download';
COMMENT ON COLUMN incident_reports.file_url_other_vehicle_1 IS
  'Download URL for other vehicle photo 2 (Page 8) - Format: /api/user-documents/{uuid}/download';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 025 complete: Added 2 image URL columns to incident_reports';
  RAISE NOTICE '📊 Columns added:';
  RAISE NOTICE '   - file_url_other_vehicle (Page 8 photo 1)';
  RAISE NOTICE '   - file_url_other_vehicle_1 (Page 8 photo 2)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Note: Pages 4a and 6 photos stored in user_documents table only';
  RAISE NOTICE '📝 Note: Page 8 photos 3-5 also stored in user_documents only';
  RAISE NOTICE '';
  RAISE NOTICE '🏗️ Complete Image Architecture:';
  RAISE NOTICE '   - Page 4a: 3 scene photos → user_documents';
  RAISE NOTICE '   - Page 6:  5 vehicle damage photos → user_documents';
  RAISE NOTICE '   - Page 8:  2 other vehicle photos → incident_reports + user_documents';
  RAISE NOTICE '   - Page 8:  3 other damage photos → user_documents';
  RAISE NOTICE '   Total: 13 photos, all tracked in user_documents';
END $$;

COMMIT;
