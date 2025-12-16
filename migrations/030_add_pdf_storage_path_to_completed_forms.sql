-- Migration 030: Add pdf_storage_path to completed_incident_forms
-- Date: 2025-12-16
-- Purpose: Enable on-demand signed URL generation for PDF downloads
-- Benefit: URLs generated with subscription-aware expiry (duration of sub or 6 week minimum)

BEGIN;

-- Add storage path column for regenerating signed URLs on demand
ALTER TABLE public.completed_incident_forms
ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN public.completed_incident_forms.pdf_storage_path IS
  'Supabase Storage path for PDF file (e.g., completed_forms/{userId}/report_{timestamp}.pdf). Used to generate fresh signed URLs on download.';

-- Backfill existing records: Extract storage path from existing pdf_url
-- The path is everything after /object/sign/incident-images-secure/ and before ?token=
UPDATE public.completed_incident_forms
SET pdf_storage_path = SUBSTRING(
  pdf_url
  FROM '/object/sign/incident-images-secure/(.+)\?token='
)
WHERE pdf_url IS NOT NULL
  AND pdf_storage_path IS NULL;

COMMIT;
