-- Migration 024: Create incident_witnesses Table
-- Date: 2025-11-12
-- Purpose: Create normalized table for storing multiple witnesses per incident
-- Related: incident-form-page9-witnesses.html, incidentForm.controller.js lines 266-333

BEGIN;

-- Create incident_witnesses table for normalized witness data
CREATE TABLE IF NOT EXISTS public.incident_witnesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_report_id UUID NOT NULL,  -- Foreign key to incident_reports
  create_user_id UUID NOT NULL,      -- For RLS policies
  witness_number INTEGER NOT NULL,   -- 1, 2, 3 (witness sequence number)

  -- Witness identity
  witness_name TEXT,
  witness_mobile_number TEXT,
  witness_email_address TEXT,

  -- Witness account
  witness_statement TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,  -- Soft delete for GDPR

  -- Constraints
  CONSTRAINT fk_incident_report FOREIGN KEY (incident_report_id)
    REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  CONSTRAINT unique_witness_per_incident UNIQUE (incident_report_id, witness_number)
);

-- Add helpful comments
COMMENT ON TABLE public.incident_witnesses IS 'Normalized storage for multiple witnesses per incident (Page 9)';
COMMENT ON COLUMN public.incident_witnesses.incident_report_id IS 'Foreign key to incident_reports table';
COMMENT ON COLUMN public.incident_witnesses.witness_number IS 'Sequence number: 1=primary witness, 2-4=additional witnesses';
COMMENT ON COLUMN public.incident_witnesses.witness_name IS 'Witness full name';
COMMENT ON COLUMN public.incident_witnesses.witness_mobile_number IS 'Witness contact phone number';
COMMENT ON COLUMN public.incident_witnesses.witness_email_address IS 'Witness email address';
COMMENT ON COLUMN public.incident_witnesses.witness_statement IS 'Witness statement/account of the incident';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incident_witnesses_incident_id
  ON public.incident_witnesses(incident_report_id);

CREATE INDEX IF NOT EXISTS idx_incident_witnesses_user_id
  ON public.incident_witnesses(create_user_id);

CREATE INDEX IF NOT EXISTS idx_incident_witnesses_deleted_at
  ON public.incident_witnesses(deleted_at);

-- Enable Row Level Security
ALTER TABLE public.incident_witnesses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own witnesses
DROP POLICY IF EXISTS "Users can view their own witnesses" ON public.incident_witnesses;
CREATE POLICY "Users can view their own witnesses"
  ON public.incident_witnesses
  FOR SELECT
  USING (auth.uid() = create_user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can insert their own witnesses" ON public.incident_witnesses;
CREATE POLICY "Users can insert their own witnesses"
  ON public.incident_witnesses
  FOR INSERT
  WITH CHECK (auth.uid() = create_user_id);

DROP POLICY IF EXISTS "Users can update their own witnesses" ON public.incident_witnesses;
CREATE POLICY "Users can update their own witnesses"
  ON public.incident_witnesses
  FOR UPDATE
  USING (auth.uid() = create_user_id);

DROP POLICY IF EXISTS "Users can soft-delete their own witnesses" ON public.incident_witnesses;
CREATE POLICY "Users can soft-delete their own witnesses"
  ON public.incident_witnesses
  FOR UPDATE
  USING (auth.uid() = create_user_id)
  WITH CHECK (deleted_at IS NOT NULL);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 024 complete: Created incident_witnesses table';
  RAISE NOTICE '✅ Table supports up to 4 witnesses per incident (witness_number 1-4)';
  RAISE NOTICE '✅ RLS policies enabled for user data isolation';
  RAISE NOTICE '✅ Indexes created for performance';
  RAISE NOTICE 'ℹ️  Primary witness data also stored in incident_reports for backward compatibility';
END $$;

COMMIT;
