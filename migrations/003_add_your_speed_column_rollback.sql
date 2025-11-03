-- Migration 003 Rollback: Remove your_speed column
-- Date: 2025-11-03
-- Purpose: Remove your_speed column if migration needs to be reverted
--
-- ⚠️  WARNING: This rollback will DELETE DATA in the your_speed column!
--
-- Use only if:
-- 1. You need to revert for testing purposes
-- 2. You have backed up the data
-- 3. You are in development environment

BEGIN;

-- Drop index first (if exists)
DROP INDEX IF EXISTS idx_incident_reports_your_speed;

-- Drop the column
ALTER TABLE incident_reports
DROP COLUMN IF EXISTS your_speed;

-- Verify rollback
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'your_speed'
    ) THEN
        RAISE NOTICE '✅ Rollback 003 successful: your_speed column removed';
    ELSE
        RAISE EXCEPTION '❌ Rollback 003 failed: your_speed column still exists';
    END IF;
END $$;

COMMIT;
