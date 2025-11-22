-- Migration 005 Rollback: Remove user_documents columns
-- Date: 2025-11-03
-- Purpose: Remove incident_report_id and download_url columns if migration needs to be reverted
--
-- ⚠️  WARNING: This rollback will DELETE DATA in these columns!
--             This will break the link between documents and incident reports!
--
-- Use only if:
-- 1. You need to revert for testing purposes
-- 2. You have backed up the data
-- 3. You are in development environment
-- 4. No incident reports have been submitted yet

BEGIN;

-- Drop indexes first
DROP INDEX IF EXISTS idx_user_documents_incident_report;
DROP INDEX IF EXISTS idx_user_documents_user_incident;

-- Drop the columns
ALTER TABLE user_documents
DROP COLUMN IF EXISTS incident_report_id;

ALTER TABLE user_documents
DROP COLUMN IF EXISTS download_url;

-- Verify rollback
DO $$
DECLARE
    has_incident_id BOOLEAN;
    has_download_url BOOLEAN;
BEGIN
    -- Check incident_report_id removed
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_documents'
        AND column_name = 'incident_report_id'
    ) INTO has_incident_id;

    -- Check download_url removed
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_documents'
        AND column_name = 'download_url'
    ) INTO has_download_url;

    IF NOT has_incident_id AND NOT has_download_url THEN
        RAISE NOTICE '✅ Rollback 005 successful: incident_report_id and download_url columns removed';
    ELSE
        IF has_incident_id THEN
            RAISE EXCEPTION '❌ Rollback 005 failed: incident_report_id column still exists';
        END IF;
        IF has_download_url THEN
            RAISE EXCEPTION '❌ Rollback 005 failed: download_url column still exists';
        END IF;
    END IF;
END $$;

COMMIT;
