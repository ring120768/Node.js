-- Migration: Add signed_url support to user_documents table
-- Date: 2025-10-28
-- Purpose: Store signed URLs for images to enable PDF generation

-- Add signed_url column (TEXT to store full URL)
ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS signed_url TEXT;

-- Add expiry tracking column
ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS signed_url_expires_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient expiry queries
CREATE INDEX IF NOT EXISTS idx_user_documents_signed_url_expiry
ON user_documents(signed_url_expires_at)
WHERE deleted_at IS NULL AND status = 'completed';

-- Add comment to document the column purpose
COMMENT ON COLUMN user_documents.signed_url IS 'Signed URL for accessing the document in storage (expires after 24 hours)';
COMMENT ON COLUMN user_documents.signed_url_expires_at IS 'Timestamp when the signed URL expires (used for automatic refresh)';

-- Verify migration
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'user_documents'
        AND column_name = 'signed_url'
    ) THEN
        RAISE NOTICE '✅ Migration successful: signed_url column added';
    ELSE
        RAISE EXCEPTION '❌ Migration failed: signed_url column not found';
    END IF;
END $$;
