-- Fix incident_witnesses table schema
-- Date: 2025-11-04
-- Purpose: Rename incident_id to incident_report_id and ensure all columns exist

DO $$
BEGIN
  -- 1. Rename incident_id to incident_report_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident_witnesses'
    AND column_name = 'incident_id'
  ) THEN
    -- Drop old foreign key constraint
    ALTER TABLE public.incident_witnesses
    DROP CONSTRAINT IF EXISTS incident_witnesses_incident_id_fkey;

    -- Rename column
    ALTER TABLE public.incident_witnesses
    RENAME COLUMN incident_id TO incident_report_id;

    -- Add new foreign key constraint
    ALTER TABLE public.incident_witnesses
    ADD CONSTRAINT incident_witnesses_incident_report_id_fkey
    FOREIGN KEY (incident_report_id) REFERENCES public.incident_reports(id) ON DELETE CASCADE;

    RAISE NOTICE '✅ Renamed incident_id to incident_report_id';
  ELSE
    RAISE NOTICE '⚠️  incident_id column does not exist (may already be renamed)';
  END IF;

  -- 2. Add witness_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident_witnesses'
    AND column_name = 'witness_number'
  ) THEN
    ALTER TABLE public.incident_witnesses
    ADD COLUMN witness_number INTEGER NOT NULL DEFAULT 1;

    RAISE NOTICE '✅ Added witness_number column';
  ELSE
    RAISE NOTICE '✅ witness_number column already exists';
  END IF;

  -- 3. Add witness_address column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident_witnesses'
    AND column_name = 'witness_address'
  ) THEN
    ALTER TABLE public.incident_witnesses
    ADD COLUMN witness_address TEXT;

    RAISE NOTICE '✅ Added witness_address column';
  ELSE
    RAISE NOTICE '✅ witness_address column already exists';
  END IF;

  -- 4. Ensure all other required columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident_witnesses'
    AND column_name = 'witness_email'
  ) THEN
    ALTER TABLE public.incident_witnesses
    ADD COLUMN witness_email TEXT;

    RAISE NOTICE '✅ Added witness_email column';
  ELSE
    RAISE NOTICE '✅ witness_email column already exists';
  END IF;

  -- 5. Drop and recreate index on incident_report_id
  DROP INDEX IF EXISTS idx_incident_witnesses_incident_id;

  CREATE INDEX IF NOT EXISTS idx_incident_witnesses_incident_report_id
  ON public.incident_witnesses(incident_report_id);

  RAISE NOTICE '✅ Recreated index on incident_report_id';

  -- 6. Add composite index for ordering witnesses
  CREATE INDEX IF NOT EXISTS idx_incident_witnesses_incident_witness_number
  ON public.incident_witnesses(incident_report_id, witness_number);

  RAISE NOTICE '✅ Added composite index for witness ordering';

  RAISE NOTICE '';
  RAISE NOTICE '✅ Schema migration completed successfully!';
  RAISE NOTICE '✅ incident_witnesses table now uses incident_report_id';
  RAISE NOTICE '✅ All required columns present';

END $$;
