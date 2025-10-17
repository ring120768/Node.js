-- Migration: Backup Log Table
-- Purpose: Track S3 backups for audit trail and prevent duplicates
-- Version: 1.0.0
-- Date: 2025-10-17

-- Create backup_log table
CREATE TABLE IF NOT EXISTS backup_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type TEXT NOT NULL, -- 'incident' or 'account'
    record_id UUID NOT NULL, -- incident_id or account_id
    s3_bucket TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    checksum TEXT NOT NULL, -- SHA-256 checksum for integrity verification
    backup_date TIMESTAMP DEFAULT NOW(),
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),

    -- Prevent duplicate backups for same record
    UNIQUE(backup_type, record_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_backup_log_type
ON backup_log(backup_type);

CREATE INDEX IF NOT EXISTS idx_backup_log_record_id
ON backup_log(record_id);

CREATE INDEX IF NOT EXISTS idx_backup_log_backup_date
ON backup_log(backup_date);

CREATE INDEX IF NOT EXISTS idx_backup_log_s3_key
ON backup_log(s3_key);

-- Add comment to table
COMMENT ON TABLE backup_log IS 'Tracks S3 backups for incidents and accounts (audit trail and duplicate prevention)';

-- Grant permissions (adjust as needed for your Supabase setup)
-- ALTER TABLE backup_log ENABLE ROW LEVEL SECURITY;
