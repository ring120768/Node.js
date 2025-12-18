-- Migration 022: Add pdf_storage_path column to completed_incident_forms
-- This column stores the Supabase Storage path for on-demand URL regeneration

-- Add pdf_storage_path column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'completed_incident_forms'
    AND column_name = 'pdf_storage_path'
  ) THEN
    ALTER TABLE completed_incident_forms
    ADD COLUMN pdf_storage_path TEXT;

    COMMENT ON COLUMN completed_incident_forms.pdf_storage_path IS
      'Supabase Storage path for the PDF file, used to regenerate signed URLs on demand';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'completed_incident_forms'
AND column_name = 'pdf_storage_path';
