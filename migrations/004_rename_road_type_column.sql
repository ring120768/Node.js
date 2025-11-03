-- Migration 004: Rename road_type column
-- Date: 2025-11-03
-- Purpose: Rename road_type_other to road_type_private_road
--          to match HTML form field naming and improve specificity
--
-- Context: Page Three HTML uses road_type_private_road (specific for UK legal context)
--          Database had generic road_type_other which didn't capture the important
--          distinction that private roads have different liability rules
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
        AND column_name = 'road_type_other'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'road_type_private_road'
    ) THEN
        -- Rename the column
        ALTER TABLE incident_reports
        RENAME COLUMN road_type_other TO road_type_private_road;

        RAISE NOTICE '✅ Renamed road_type_other to road_type_private_road';
    ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'road_type_private_road'
    ) THEN
        RAISE NOTICE 'ℹ️  Column road_type_private_road already exists, skipping rename';
    ELSE
        RAISE NOTICE 'ℹ️  Neither column found, creating road_type_private_road';
        ALTER TABLE incident_reports
        ADD COLUMN IF NOT EXISTS road_type_private_road BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add comment to document the column
COMMENT ON COLUMN incident_reports.road_type_private_road IS
'Whether accident occurred on private road (important for UK liability - Page Three road type section)';

-- Verify migration
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'road_type_private_road'
    ) THEN
        RAISE NOTICE '✅ Migration 004 successful: road_type_private_road column exists';
    ELSE
        RAISE EXCEPTION '❌ Migration 004 failed: road_type_private_road column not found';
    END IF;
END $$;

COMMIT;
