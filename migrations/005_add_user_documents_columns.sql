-- Migration 005: Add user_documents columns for incident report linking
-- Date: 2025-11-03
-- Purpose: Add incident_report_id foreign key and download_url for permanent storage
--
-- Context: Page 4a location photos need to be linked to incident reports
--          and have permanent download URLs (not just expiring signed URLs)
--
-- Impact: No data loss, new columns only
--         Existing user_documents records will have NULL for incident_report_id
--         (they are signup-related documents, not incident-related)

BEGIN;

-- Add incident_report_id foreign key column
ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS incident_report_id UUID REFERENCES incident_reports(id);

-- Add download_url for permanent API access
ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS download_url TEXT;

-- Add comment to document the columns
COMMENT ON COLUMN user_documents.incident_report_id IS
'Foreign key to incident_reports table - links documents to specific incident reports (NULL for signup documents)';

COMMENT ON COLUMN user_documents.download_url IS
'Permanent API URL for downloading document (/api/user-documents/{id}/download) - generates fresh signed URLs on demand';

-- Add index for efficient queries by incident_report_id
CREATE INDEX IF NOT EXISTS idx_user_documents_incident_report
ON user_documents(incident_report_id)
WHERE incident_report_id IS NOT NULL AND deleted_at IS NULL;

-- Add index for efficient queries by user + incident (common query pattern)
CREATE INDEX IF NOT EXISTS idx_user_documents_user_incident
ON user_documents(create_user_id, incident_report_id)
WHERE incident_report_id IS NOT NULL AND deleted_at IS NULL;

-- Verify migration
DO $$
DECLARE
    has_incident_id BOOLEAN;
    has_download_url BOOLEAN;
BEGIN
    -- Check incident_report_id
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_documents'
        AND column_name = 'incident_report_id'
    ) INTO has_incident_id;

    -- Check download_url
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_documents'
        AND column_name = 'download_url'
    ) INTO has_download_url;

    IF has_incident_id AND has_download_url THEN
        RAISE NOTICE '✅ Migration 005 successful: incident_report_id and download_url columns added';
    ELSE
        IF NOT has_incident_id THEN
            RAISE EXCEPTION '❌ Migration 005 failed: incident_report_id column not found';
        END IF;
        IF NOT has_download_url THEN
            RAISE EXCEPTION '❌ Migration 005 failed: download_url column not found';
        END IF;
    END IF;
END $$;

COMMIT;
