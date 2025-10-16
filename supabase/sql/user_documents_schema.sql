-- =============================================
-- USER DOCUMENTS TABLE SCHEMA
-- Car Crash Lawyer AI - Image Processing System
-- =============================================
--
-- This table tracks all user-uploaded documents and images
-- with comprehensive metadata, status tracking, and audit trail
--
-- Features:
-- - Status tracking (pending, processing, completed, failed)
-- - Retry mechanism support
-- - File metadata (size, type, dimensions)
-- - Processing timestamps
-- - Error logging
-- - User ownership via create_user_id
-- - Relationship to source tables (user_signup, incident_reports)
--

-- Drop existing table if you want to recreate (BE CAREFUL!)
-- DROP TABLE IF EXISTS public.user_documents CASCADE;

-- Create user_documents table
CREATE TABLE IF NOT EXISTS public.user_documents (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User Ownership
  create_user_id TEXT NOT NULL, -- User ID from auth system

  -- Document Classification
  document_type TEXT NOT NULL, -- e.g., 'driving_license', 'vehicle_front', 'incident_scene'
  document_category TEXT NOT NULL DEFAULT 'user_signup', -- 'user_signup', 'incident_report', 'other'

  -- Source Tracking
  source_type TEXT NOT NULL DEFAULT 'typeform', -- 'typeform', 'direct_upload', 'mobile_app'
  source_id TEXT, -- Typeform submission ID, incident_report_id, etc.
  source_field TEXT, -- Original field name from source

  -- File Information
  original_filename TEXT, -- Original filename from upload
  original_url TEXT, -- Original Typeform URL or upload URL

  -- Storage Information
  storage_bucket TEXT NOT NULL, -- 'user-documents', 'incident-images'
  storage_path TEXT NOT NULL UNIQUE, -- Full path in Supabase Storage
  public_url TEXT, -- Public/signed URL for access

  -- File Metadata
  file_size INTEGER, -- Size in bytes
  mime_type TEXT, -- e.g., 'image/jpeg', 'application/pdf'
  file_extension TEXT, -- e.g., '.jpg', '.pdf'

  -- Image-Specific Metadata (NULL for non-images)
  image_width INTEGER,
  image_height INTEGER,
  has_thumbnail BOOLEAN DEFAULT false,
  thumbnail_path TEXT, -- Path to thumbnail if generated

  -- Processing Status
  status TEXT NOT NULL DEFAULT 'pending',
    -- 'pending'    : Waiting to be processed
    -- 'processing' : Currently downloading/uploading
    -- 'completed'  : Successfully processed and accessible
    -- 'failed'     : Processing failed (see error_message)

  -- Retry Mechanism
  retry_count INTEGER DEFAULT 0, -- Number of processing attempts
  max_retries INTEGER DEFAULT 3, -- Maximum retry attempts
  last_retry_at TIMESTAMPTZ, -- Last retry timestamp
  next_retry_at TIMESTAMPTZ, -- Scheduled next retry time

  -- Error Tracking
  error_message TEXT, -- Last error message
  error_code TEXT, -- Error code for categorization
  error_details JSONB, -- Detailed error information

  -- Processing Metadata
  processing_started_at TIMESTAMPTZ, -- When processing started
  processing_completed_at TIMESTAMPTZ, -- When processing completed
  processing_duration_ms INTEGER, -- Duration in milliseconds

  -- Additional Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional flexible metadata
    -- Example: {
    --   "source": "typeform",
    --   "form_id": "b03aFxEO",
    --   "submission_id": "abc123",
    --   "user_agent": "TypeformBot",
    --   "ip_address": "1.2.3.4",
    --   "processor_version": "2.0.0"
    -- }

  -- Audit Trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- Soft delete timestamp (GDPR)

  -- GDPR Compliance
  retention_until TIMESTAMPTZ, -- When this document should be deleted (7 years)
  gdpr_consent BOOLEAN DEFAULT true, -- User consent for storage

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT valid_document_category CHECK (document_category IN ('user_signup', 'incident_report', 'other')),
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Index for user queries (most common)
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id
  ON public.user_documents(create_user_id);

-- Index for status filtering (find pending/failed documents)
CREATE INDEX IF NOT EXISTS idx_user_documents_status
  ON public.user_documents(status);

-- Compound index for user + status queries
CREATE INDEX IF NOT EXISTS idx_user_documents_user_status
  ON public.user_documents(create_user_id, status);

-- Index for retry mechanism (find documents needing retry)
CREATE INDEX IF NOT EXISTS idx_user_documents_retry
  ON public.user_documents(status, next_retry_at)
  WHERE status = 'failed' AND next_retry_at IS NOT NULL;

-- Index for document type queries
CREATE INDEX IF NOT EXISTS idx_user_documents_type
  ON public.user_documents(document_type);

-- Index for source tracking
CREATE INDEX IF NOT EXISTS idx_user_documents_source
  ON public.user_documents(source_type, source_id);

-- Index for GDPR compliance (find documents to delete)
CREATE INDEX IF NOT EXISTS idx_user_documents_retention
  ON public.user_documents(retention_until)
  WHERE retention_until IS NOT NULL AND deleted_at IS NULL;

-- Index for soft deletes
CREATE INDEX IF NOT EXISTS idx_user_documents_deleted
  ON public.user_documents(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- =============================================
-- TRIGGERS FOR AUTO-UPDATE
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_user_documents_updated_at ON public.user_documents;
CREATE TRIGGER trigger_update_user_documents_updated_at
  BEFORE UPDATE ON public.user_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_user_documents_updated_at();

-- Function to set retention date on insert (7 years)
CREATE OR REPLACE FUNCTION set_user_documents_retention()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.retention_until IS NULL THEN
    NEW.retention_until = NOW() + INTERVAL '7 years'; -- 2555 days
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set retention date
DROP TRIGGER IF EXISTS trigger_set_user_documents_retention ON public.user_documents;
CREATE TRIGGER trigger_set_user_documents_retention
  BEFORE INSERT ON public.user_documents
  FOR EACH ROW
  EXECUTE FUNCTION set_user_documents_retention();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on user_documents table
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own documents
CREATE POLICY "Users can view own documents" ON public.user_documents
  FOR SELECT
  USING (
    auth.uid()::text = create_user_id
    OR auth.role() = 'service_role'
  );

-- Policy: Service role can insert documents (for webhook processing)
CREATE POLICY "Service role can insert documents" ON public.user_documents
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Service role can update documents (for status changes)
CREATE POLICY "Service role can update documents" ON public.user_documents
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Policy: Service role can delete documents (for GDPR compliance)
CREATE POLICY "Service role can delete documents" ON public.user_documents
  FOR DELETE
  USING (auth.role() = 'service_role');

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get document statistics for a user
CREATE OR REPLACE FUNCTION get_user_document_stats(user_id TEXT)
RETURNS TABLE (
  total_documents BIGINT,
  pending_documents BIGINT,
  processing_documents BIGINT,
  completed_documents BIGINT,
  failed_documents BIGINT,
  total_size_bytes BIGINT,
  document_types JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_documents,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_documents,
    COUNT(*) FILTER (WHERE status = 'processing')::BIGINT as processing_documents,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_documents,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_documents,
    COALESCE(SUM(file_size), 0)::BIGINT as total_size_bytes,
    jsonb_object_agg(
      document_type,
      count
    ) FILTER (WHERE document_type IS NOT NULL) as document_types
  FROM public.user_documents
  LEFT JOIN LATERAL (
    SELECT document_type, COUNT(*) as count
    FROM public.user_documents
    WHERE create_user_id = user_id
    GROUP BY document_type
  ) type_counts ON true
  WHERE create_user_id = user_id
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find documents needing retry
CREATE OR REPLACE FUNCTION get_documents_needing_retry(limit_count INTEGER DEFAULT 10)
RETURNS SETOF public.user_documents AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.user_documents
  WHERE status = 'failed'
    AND retry_count < max_retries
    AND (next_retry_at IS NULL OR next_retry_at <= NOW())
    AND deleted_at IS NULL
  ORDER BY next_retry_at ASC NULLS FIRST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE public.user_documents IS
'Tracks all user-uploaded documents and images with comprehensive metadata, status tracking, and error handling. Supports retry mechanism for failed uploads and GDPR compliance.';

COMMENT ON COLUMN public.user_documents.status IS
'Processing status: pending (waiting), processing (in progress), completed (success), failed (error - see error_message)';

COMMENT ON COLUMN public.user_documents.retry_count IS
'Number of processing attempts made. Used with next_retry_at for exponential backoff retry mechanism.';

COMMENT ON COLUMN public.user_documents.metadata IS
'Flexible JSONB field for additional metadata like processor version, source details, user agent, etc.';

COMMENT ON COLUMN public.user_documents.retention_until IS
'GDPR compliance: Documents will be automatically flagged for deletion after this date (7 years from creation).';

-- =============================================
-- SAMPLE QUERIES
-- =============================================

-- Get all completed documents for a user
-- SELECT * FROM user_documents
-- WHERE create_user_id = 'user123' AND status = 'completed'
-- ORDER BY created_at DESC;

-- Get failed documents needing retry
-- SELECT * FROM get_documents_needing_retry(10);

-- Get document statistics for a user
-- SELECT * FROM get_user_document_stats('user123');

-- Find documents expiring soon (GDPR)
-- SELECT * FROM user_documents
-- WHERE retention_until < NOW() + INTERVAL '30 days'
--   AND deleted_at IS NULL
-- ORDER BY retention_until ASC;

-- Update document status to completed
-- UPDATE user_documents
-- SET status = 'completed',
--     processing_completed_at = NOW(),
--     processing_duration_ms = EXTRACT(EPOCH FROM (NOW() - processing_started_at)) * 1000
-- WHERE id = 'doc-uuid';

-- =============================================
-- MIGRATION NOTES
-- =============================================

-- If you have existing data in the 'images' table, you can migrate it:
--
-- INSERT INTO user_documents (
--   create_user_id, document_type, storage_path, original_url,
--   status, created_at, metadata
-- )
-- SELECT
--   create_user_id,
--   image_type as document_type,
--   storage_path,
--   original_url,
--   'completed' as status,
--   created_at,
--   metadata
-- FROM images
-- WHERE NOT EXISTS (
--   SELECT 1 FROM user_documents WHERE storage_path = images.storage_path
-- );

-- =============================================
-- END OF SCHEMA
-- =============================================
