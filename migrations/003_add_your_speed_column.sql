-- Migration 003: Add your_speed column
-- Date: 2025-11-03
-- Purpose: Add column to store user's estimated speed at time of accident
--
-- Context: Page Three HTML has "your_speed" field but no database column existed
--          This is a text field for estimated MPH (user input)
--
-- Impact: No data loss, new column only
--         Existing records will have NULL for this field

BEGIN;

-- Add your_speed column
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS your_speed TEXT;

-- Add comment to document the column
COMMENT ON COLUMN incident_reports.your_speed IS
'User estimated speed in MPH at time of accident (Page Three, text input)';

-- Add index for queries involving speed (optional, for future analytics)
CREATE INDEX IF NOT EXISTS idx_incident_reports_your_speed
ON incident_reports(your_speed)
WHERE your_speed IS NOT NULL AND deleted_at IS NULL;

-- Verify migration
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'your_speed'
    ) THEN
        RAISE NOTICE '✅ Migration 003 successful: your_speed column added';
    ELSE
        RAISE EXCEPTION '❌ Migration 003 failed: your_speed column not found';
    END IF;
END $$;

COMMIT;
