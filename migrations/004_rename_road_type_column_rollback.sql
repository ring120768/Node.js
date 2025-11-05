-- Migration 004 Rollback: Restore road_type column name
-- Date: 2025-11-03
-- Purpose: Rename road_type_private_road back to road_type_other
--
-- ⚠️  WARNING: This rollback will NOT lose data, just rename the column back
--
-- Use only if you need to revert to the generic naming convention

BEGIN;

-- Check if new column exists and old column doesn't
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'road_type_private_road'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'road_type_other'
    ) THEN
        -- Rename back to old name
        ALTER TABLE incident_reports
        RENAME COLUMN road_type_private_road TO road_type_other;

        RAISE NOTICE '✅ Rolled back: Renamed road_type_private_road to road_type_other';
    ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'road_type_other'
    ) THEN
        RAISE NOTICE 'ℹ️  Column road_type_other already exists, rollback already applied';
    ELSE
        RAISE NOTICE 'ℹ️  Neither column found, nothing to roll back';
    END IF;
END $$;

-- Update comment
COMMENT ON COLUMN incident_reports.road_type_other IS
'Other road type not covered by standard categories';

-- Verify rollback
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'road_type_other'
    ) THEN
        RAISE NOTICE '✅ Rollback 004 successful: road_type_other column exists';
    ELSE
        RAISE EXCEPTION '❌ Rollback 004 failed: road_type_other column not found';
    END IF;
END $$;

COMMIT;
