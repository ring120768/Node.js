-- Migration 002 Rollback: Restore visibility column name
-- Date: 2025-11-03
-- Purpose: Rename visibility_street_lights back to visibility_severely_restricted
--
-- ⚠️  WARNING: This rollback will NOT lose data, just rename the column back
--
-- Use only if you need to revert to the old naming convention

BEGIN;

-- Check if new column exists and old column doesn't
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'visibility_street_lights'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'visibility_severely_restricted'
    ) THEN
        -- Rename back to old name
        ALTER TABLE incident_reports
        RENAME COLUMN visibility_street_lights TO visibility_severely_restricted;

        RAISE NOTICE '✅ Rolled back: Renamed visibility_street_lights to visibility_severely_restricted';
    ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'visibility_severely_restricted'
    ) THEN
        RAISE NOTICE 'ℹ️  Column visibility_severely_restricted already exists, rollback already applied';
    ELSE
        RAISE NOTICE 'ℹ️  Neither column found, nothing to roll back';
    END IF;
END $$;

-- Update comment
COMMENT ON COLUMN incident_reports.visibility_severely_restricted IS
'Whether visibility was severely restricted at accident scene';

-- Verify rollback
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'visibility_severely_restricted'
    ) THEN
        RAISE NOTICE '✅ Rollback 002 successful: visibility_severely_restricted column exists';
    ELSE
        RAISE EXCEPTION '❌ Rollback 002 failed: visibility_severely_restricted column not found';
    END IF;
END $$;

COMMIT;
