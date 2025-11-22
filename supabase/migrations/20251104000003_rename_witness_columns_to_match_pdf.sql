-- Rename witness columns to match PDF field names
-- Date: 2025-11-04
-- Purpose: Align database column names with PDF placeholder names

DO $$
BEGIN
  -- 1. Rename witness_phone to witness_mobile_number
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident_witnesses'
    AND column_name = 'witness_phone'
  ) THEN
    ALTER TABLE public.incident_witnesses
    RENAME COLUMN witness_phone TO witness_mobile_number;

    RAISE NOTICE '✅ Renamed witness_phone to witness_mobile_number';
  ELSE
    RAISE NOTICE '⚠️  witness_phone column does not exist (may already be renamed)';
  END IF;

  -- 2. Rename witness_email to witness_email_address
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident_witnesses'
    AND column_name = 'witness_email'
  ) THEN
    ALTER TABLE public.incident_witnesses
    RENAME COLUMN witness_email TO witness_email_address;

    RAISE NOTICE '✅ Renamed witness_email to witness_email_address';
  ELSE
    RAISE NOTICE '⚠️  witness_email column does not exist (may already be renamed)';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Database columns now match PDF field names!';
  RAISE NOTICE '   - witness_mobile_number (was witness_phone)';
  RAISE NOTICE '   - witness_email_address (was witness_email)';

END $$;
