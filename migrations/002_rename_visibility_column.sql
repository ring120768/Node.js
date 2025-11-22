-- Migration 002: Rename visibility column
-- Date: 2025-11-03
-- Purpose: Rename visibility_severely_restricted to visibility_street_lights
--          to match HTML form field naming and improve clarity
--
-- Context: Page Three HTML uses visibility_street_lights but database
--          had the generic name visibility_severely_restricted
--
-- Impact: No data loss, column rename only

BEGIN;

-- Check if old column exists and new column doesn't
DO $$
BEGIN
    -- If old column exists, rename it
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'visibility_severely_restricted'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'visibility_street_lights'
    ) THEN
        -- Rename the column
        ALTER TABLE incident_reports
        RENAME COLUMN visibility_severely_restricted TO visibility_street_lights;

        RAISE NOTICE '✅ Renamed visibility_severely_restricted to visibility_street_lights';
    ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'visibility_street_lights'
    ) THEN
        RAISE NOTICE 'ℹ️  Column visibility_street_lights already exists, skipping rename';
    ELSE
        RAISE NOTICE 'ℹ️  Neither column found, creating visibility_street_lights';
        ALTER TABLE incident_reports
        ADD COLUMN IF NOT EXISTS visibility_street_lights BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add comment to document the column
COMMENT ON COLUMN incident_reports.visibility_street_lights IS
'Whether street lights were present/on at accident scene (Page Three visibility section)';

-- Verify migration
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'visibility_street_lights'
    ) THEN
        RAISE NOTICE '✅ Migration 002 successful: visibility_street_lights column exists';
    ELSE
        RAISE EXCEPTION '❌ Migration 002 failed: visibility_street_lights column not found';
    END IF;
END $$;

COMMIT;
