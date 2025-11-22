-- Add missing witness_2_address column to incident_witnesses table
-- Date: 2025-11-04

DO $$
BEGIN
  -- Add witness_2_address if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident_witnesses'
    AND column_name = 'witness_2_address'
  ) THEN
    ALTER TABLE public.incident_witnesses
    ADD COLUMN witness_2_address TEXT;

    RAISE NOTICE '✅ Added witness_2_address column';
  ELSE
    RAISE NOTICE '⚠️  witness_2_address column already exists';
  END IF;
END $$;
