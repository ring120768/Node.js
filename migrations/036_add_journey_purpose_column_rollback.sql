-- Migration 036 Rollback: Remove journey_purpose column
-- Date: 2026-01-13
-- Purpose: Remove journey_purpose column if migration needs to be reverted
--
-- ⚠️  WARNING: This rollback will DELETE DATA in the journey_purpose column!
--
-- Use only if:
-- 1. You need to revert for testing purposes
-- 2. You have backed up the data
-- 3. You are in development environment

BEGIN;

-- Drop check constraint first (if exists)
ALTER TABLE incident_reports
DROP CONSTRAINT IF EXISTS check_journey_purpose_values;

-- Drop index first (if exists)
DROP INDEX IF EXISTS idx_incident_reports_journey_purpose;

-- Drop the column
ALTER TABLE incident_reports
DROP COLUMN IF EXISTS journey_purpose;

-- Verify rollback
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'journey_purpose'
    ) THEN
        RAISE NOTICE '✅ Rollback 036 successful: journey_purpose column removed';
    ELSE
        RAISE EXCEPTION '❌ Rollback 036 failed: journey_purpose column still exists';
    END IF;
END $$;

COMMIT;
