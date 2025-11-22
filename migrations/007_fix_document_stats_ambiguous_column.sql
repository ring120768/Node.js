-- Fix ambiguous column reference in get_user_document_stats function
-- Migration: 007_fix_document_stats_ambiguous_column.sql
-- Date: 2025-11-13
-- Issue: column reference "document_type" is ambiguous

-- Drop the old function
DROP FUNCTION IF EXISTS get_user_document_stats(TEXT);

-- Create the fixed function with proper column qualification
CREATE OR REPLACE FUNCTION get_user_document_stats(p_user_id TEXT)
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
  WITH document_summary AS (
    SELECT
      COUNT(*)::BIGINT as total_docs,
      COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_docs,
      COUNT(*) FILTER (WHERE status = 'processing')::BIGINT as processing_docs,
      COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_docs,
      COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_docs,
      COALESCE(SUM(file_size), 0)::BIGINT as total_bytes
    FROM public.user_documents
    WHERE create_user_id = p_user_id
      AND deleted_at IS NULL
  ),
  type_breakdown AS (
    SELECT jsonb_object_agg(
      document_type,
      doc_count
    ) as type_stats
    FROM (
      SELECT
        document_type,
        COUNT(*)::INTEGER as doc_count
      FROM public.user_documents
      WHERE create_user_id = p_user_id
        AND deleted_at IS NULL
        AND document_type IS NOT NULL
      GROUP BY document_type
    ) types
  )
  SELECT
    COALESCE(ds.total_docs, 0),
    COALESCE(ds.pending_docs, 0),
    COALESCE(ds.processing_docs, 0),
    COALESCE(ds.completed_docs, 0),
    COALESCE(ds.failed_docs, 0),
    COALESCE(ds.total_bytes, 0),
    COALESCE(tb.type_stats, '{}'::jsonb)
  FROM document_summary ds
  CROSS JOIN type_breakdown tb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comment
COMMENT ON FUNCTION get_user_document_stats(TEXT) IS
  'Returns document statistics for a user, including counts by status and document type breakdown. Fixed ambiguous column reference.';

-- Test the function (optional, can be run manually)
-- SELECT * FROM get_user_document_stats('9db03736-74ac-4d00-9ae2-3639b58360a3');
