-- Migration 036: Add journey_purpose column
-- Date: 2026-01-13
-- Purpose: Add column to store the purpose of the journey (Business/Commuting/Personal)
--
-- Context: Page Three HTML has "journey_purpose" radio button field for insurance purposes
--          This is a critical field that every insurance company requires
--
-- Impact: No data loss, new column only
--         Existing records will have NULL for this field

BEGIN;

-- Add journey_purpose column
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS journey_purpose TEXT;

-- Add comment to document the column
COMMENT ON COLUMN incident_reports.journey_purpose IS
'Purpose of journey: Business (work-related), Commuting (to/from work), or Personal/Pleasure. Critical for insurance liability classification (Page Three, radio input)';

-- Add check constraint to ensure only valid values
ALTER TABLE incident_reports
ADD CONSTRAINT check_journey_purpose_values
CHECK (journey_purpose IS NULL OR journey_purpose IN ('Business', 'Commuting', 'Personal'));

-- Add index for queries involving journey purpose (for insurance analytics)
CREATE INDEX IF NOT EXISTS idx_incident_reports_journey_purpose
ON incident_reports(journey_purpose)
WHERE journey_purpose IS NOT NULL AND deleted_at IS NULL;

-- Verify migration
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'journey_purpose'
    ) THEN
        RAISE NOTICE '✅ Migration 036 successful: journey_purpose column added';
    ELSE
        RAISE EXCEPTION '❌ Migration 036 failed: journey_purpose column not found';
    END IF;
END $$;

COMMIT;
