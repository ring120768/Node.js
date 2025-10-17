-- ============================================================================
-- DUAL RETENTION MODEL: Database Migration
-- Version: 001
-- Date: 2025-10-17
-- Purpose: Implement 12-month subscription + 90-day incident retention
-- ============================================================================

-- ============================================================================
-- 1. ADD SUBSCRIPTION TRACKING TO user_signup TABLE
-- ============================================================================
-- Tracks 12-month subscription lifecycle with auto-renewal support

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP DEFAULT (NOW() + INTERVAL '12 months'),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'expired', 'cancelled')),
ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS retention_until TIMESTAMP;

COMMENT ON COLUMN user_signup.subscription_start_date IS 'When the current subscription period started';
COMMENT ON COLUMN user_signup.subscription_end_date IS 'When the current subscription period ends (12 months from start)';
COMMENT ON COLUMN user_signup.subscription_status IS 'Current status: active, expired, or cancelled';
COMMENT ON COLUMN user_signup.auto_renewal IS 'Whether subscription auto-renews at expiry';
COMMENT ON COLUMN user_signup.retention_until IS 'Calculated retention date (same as subscription_end_date)';

-- ============================================================================
-- 2. ADD ASSOCIATION TRACKING TO user_documents TABLE
-- ============================================================================
-- Links documents to either user accounts (12mo) or incidents (90d)

ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS associated_with TEXT CHECK (associated_with IN ('incident_report', 'user_signup')),
ADD COLUMN IF NOT EXISTS associated_id UUID,
ADD COLUMN IF NOT EXISTS retention_until TIMESTAMP;

COMMENT ON COLUMN user_documents.associated_with IS 'Type of record this document belongs to (incident_report or user_signup)';
COMMENT ON COLUMN user_documents.associated_id IS 'ID of the associated incident or signup record';
COMMENT ON COLUMN user_documents.retention_until IS 'Calculated based on association type (90d for incidents, 12mo for accounts)';

-- Create index for faster association lookups
CREATE INDEX IF NOT EXISTS idx_user_documents_association ON user_documents(associated_with, associated_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_retention ON user_documents(retention_until) WHERE deleted_at IS NULL;

-- ============================================================================
-- 3. ADD CHECKSUM FIELDS TO user_documents TABLE
-- ============================================================================
-- SHA-256 checksums for data integrity verification

ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS original_checksum_sha256 TEXT,
ADD COLUMN IF NOT EXISTS current_checksum_sha256 TEXT,
ADD COLUMN IF NOT EXISTS checksum_algorithm TEXT DEFAULT 'sha256',
ADD COLUMN IF NOT EXISTS checksum_verified_at TIMESTAMP;

COMMENT ON COLUMN user_documents.original_checksum_sha256 IS 'SHA-256 hash of original file at upload time';
COMMENT ON COLUMN user_documents.current_checksum_sha256 IS 'SHA-256 hash for periodic verification';
COMMENT ON COLUMN user_documents.checksum_algorithm IS 'Algorithm used (always sha256 for now)';
COMMENT ON COLUMN user_documents.checksum_verified_at IS 'Last time checksum was verified';

-- ============================================================================
-- 4. ENSURE incident_reports HAS RETENTION FIELD
-- ============================================================================
-- 90-day retention for all incidents

ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS retention_until TIMESTAMP;

COMMENT ON COLUMN incident_reports.retention_until IS '90 days from incident creation (automatic deletion after this date)';

-- Create index for deletion queries
CREATE INDEX IF NOT EXISTS idx_incident_reports_retention ON incident_reports(retention_until) WHERE deleted_at IS NULL;

-- ============================================================================
-- 5. CREATE export_log TABLE
-- ============================================================================
-- Track all incident exports for legal protection

CREATE TABLE IF NOT EXISTS export_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  incident_id UUID NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
  exported_at TIMESTAMP DEFAULT NOW(),
  export_format TEXT DEFAULT 'zip',
  file_size BIGINT,
  checksum TEXT,
  download_ip INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE export_log IS 'Audit trail of incident exports (proves user downloaded data)';
COMMENT ON COLUMN export_log.user_id IS 'ID of user who exported';
COMMENT ON COLUMN export_log.incident_id IS 'ID of incident that was exported';
COMMENT ON COLUMN export_log.exported_at IS 'When export occurred';
COMMENT ON COLUMN export_log.export_format IS 'Format of export (always zip for now)';
COMMENT ON COLUMN export_log.file_size IS 'Size of exported ZIP in bytes';
COMMENT ON COLUMN export_log.checksum IS 'SHA-256 of exported ZIP';
COMMENT ON COLUMN export_log.download_ip IS 'IP address of downloader';
COMMENT ON COLUMN export_log.user_agent IS 'Browser/client user agent';

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_export_log_incident ON export_log(incident_id);
CREATE INDEX IF NOT EXISTS idx_export_log_user ON export_log(user_id, exported_at);
CREATE INDEX IF NOT EXISTS idx_export_log_date ON export_log(exported_at);

-- ============================================================================
-- 6. CREATE TRIGGER: Set 90-day retention for incidents
-- ============================================================================

CREATE OR REPLACE FUNCTION set_incident_retention_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Set retention to 90 days from now if not already set
  IF NEW.retention_until IS NULL THEN
    NEW.retention_until := NOW() + INTERVAL '90 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS set_incident_retention_trigger ON incident_reports;
CREATE TRIGGER set_incident_retention_trigger
BEFORE INSERT ON incident_reports
FOR EACH ROW EXECUTE FUNCTION set_incident_retention_date();

COMMENT ON FUNCTION set_incident_retention_date() IS 'Automatically sets 90-day retention period for new incidents';

-- ============================================================================
-- 7. CREATE TRIGGER: Set 12-month subscription dates for user_signup
-- ============================================================================

CREATE OR REPLACE FUNCTION set_subscription_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Set subscription start date if not provided
  IF NEW.subscription_start_date IS NULL THEN
    NEW.subscription_start_date := NOW();
  END IF;

  -- Set subscription end date (12 months from start) if not provided
  IF NEW.subscription_end_date IS NULL THEN
    NEW.subscription_end_date := NEW.subscription_start_date + INTERVAL '12 months';
  END IF;

  -- Set retention_until to match subscription end date
  IF NEW.retention_until IS NULL THEN
    NEW.retention_until := NEW.subscription_end_date;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS set_subscription_trigger ON user_signup;
CREATE TRIGGER set_subscription_trigger
BEFORE INSERT ON user_signup
FOR EACH ROW EXECUTE FUNCTION set_subscription_dates();

COMMENT ON FUNCTION set_subscription_dates() IS 'Automatically sets 12-month subscription period for new accounts';

-- ============================================================================
-- 8. CREATE TRIGGER: Set retention for documents based on association
-- ============================================================================

CREATE OR REPLACE FUNCTION set_document_retention()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set retention if associated_with is specified
  IF NEW.associated_with IS NOT NULL THEN
    IF NEW.associated_with = 'incident_report' THEN
      -- Incident documents: 90 days
      NEW.retention_until := NOW() + INTERVAL '90 days';
    ELSIF NEW.associated_with = 'user_signup' THEN
      -- Account documents: 12 months
      NEW.retention_until := NOW() + INTERVAL '12 months';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS set_document_retention_trigger ON user_documents;
CREATE TRIGGER set_document_retention_trigger
BEFORE INSERT ON user_documents
FOR EACH ROW EXECUTE FUNCTION set_document_retention();

COMMENT ON FUNCTION set_document_retention() IS 'Automatically sets retention period based on document association type';

-- ============================================================================
-- 9. BACKFILL EXISTING RECORDS (Optional - for existing data)
-- ============================================================================

-- Update existing user_signup records with default subscription dates
-- (Only runs if records exist without subscription dates)
UPDATE user_signup
SET
  subscription_start_date = COALESCE(subscription_start_date, created_at, NOW()),
  subscription_end_date = COALESCE(subscription_end_date, created_at + INTERVAL '12 months', NOW() + INTERVAL '12 months'),
  subscription_status = COALESCE(subscription_status, 'active'),
  auto_renewal = COALESCE(auto_renewal, true),
  retention_until = COALESCE(retention_until, created_at + INTERVAL '12 months', NOW() + INTERVAL '12 months')
WHERE subscription_start_date IS NULL;

-- Update existing incident_reports with 90-day retention
-- (Only runs if records exist without retention dates)
UPDATE incident_reports
SET retention_until = COALESCE(retention_until, created_at + INTERVAL '90 days', NOW() + INTERVAL '90 days')
WHERE retention_until IS NULL;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify schema changes
SELECT
  'user_signup' as table_name,
  COUNT(*) as total_records,
  COUNT(subscription_end_date) as with_subscription,
  COUNT(retention_until) as with_retention
FROM user_signup

UNION ALL

SELECT
  'incident_reports' as table_name,
  COUNT(*) as total_records,
  NULL as with_subscription,
  COUNT(retention_until) as with_retention
FROM incident_reports

UNION ALL

SELECT
  'user_documents' as table_name,
  COUNT(*) as total_records,
  COUNT(associated_with) as with_association,
  COUNT(original_checksum_sha256) as with_checksum
FROM user_documents

UNION ALL

SELECT
  'export_log' as table_name,
  COUNT(*) as total_records,
  NULL as with_subscription,
  NULL as with_retention
FROM export_log;

-- ============================================================================
-- NOTES FOR DBA:
--
-- 1. This migration is idempotent (safe to run multiple times)
-- 2. All ALTER TABLE statements use IF NOT EXISTS
-- 3. Existing data is backfilled with sensible defaults
-- 4. Three triggers are created for automatic retention management
-- 5. Indexes are created for performance
-- 6. Run this via Supabase SQL Editor or psql command line
-- 7. After running, verify the SELECT statement output shows expected counts
--
-- ROLLBACK (if needed):
-- -- DROP TRIGGER set_incident_retention_trigger ON incident_reports;
-- -- DROP TRIGGER set_subscription_trigger ON user_signup;
-- -- DROP TRIGGER set_document_retention_trigger ON user_documents;
-- -- DROP FUNCTION set_incident_retention_date();
-- -- DROP FUNCTION set_subscription_dates();
-- -- DROP FUNCTION set_document_retention();
-- -- DROP TABLE export_log;
-- -- (Don't drop columns as they may contain data)
-- ============================================================================
