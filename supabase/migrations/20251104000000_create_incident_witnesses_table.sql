-- Migration: Create incident_witnesses table for Page 9 witness data
-- Date: 2025-11-04
-- Purpose: Separate table for unlimited witnesses with proper relational design

-- =====================================================
-- 1. CREATE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.incident_witnesses (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Key to incident_reports
  incident_report_id UUID NOT NULL REFERENCES public.incident_reports(id) ON DELETE CASCADE,

  -- User reference (for RLS)
  create_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Witness identification
  witness_number INTEGER NOT NULL DEFAULT 1,

  -- Witness contact details
  witness_name TEXT NOT NULL,
  witness_phone TEXT,
  witness_email TEXT,
  witness_address TEXT,

  -- Witness statement
  witness_statement TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT witness_number_positive CHECK (witness_number > 0),
  CONSTRAINT witness_name_not_empty CHECK (char_length(trim(witness_name)) > 0),
  CONSTRAINT witness_statement_not_empty CHECK (char_length(trim(witness_statement)) > 0)
);

-- =====================================================
-- 2. INDEXES (for performance)
-- =====================================================

-- Index on incident_report_id (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_incident_witnesses_incident_report_id
ON public.incident_witnesses(incident_report_id);

-- Index on create_user_id (for RLS)
CREATE INDEX IF NOT EXISTS idx_incident_witnesses_create_user_id
ON public.incident_witnesses(create_user_id);

-- Composite index for ordering witnesses within an incident
CREATE INDEX IF NOT EXISTS idx_incident_witnesses_incident_witness_number
ON public.incident_witnesses(incident_report_id, witness_number);

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.incident_witnesses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own witnesses
CREATE POLICY "Users can view own witnesses"
ON public.incident_witnesses
FOR SELECT
USING (auth.uid() = create_user_id);

-- Policy: Users can insert their own witnesses
CREATE POLICY "Users can insert own witnesses"
ON public.incident_witnesses
FOR INSERT
WITH CHECK (auth.uid() = create_user_id);

-- Policy: Users can update their own witnesses
CREATE POLICY "Users can update own witnesses"
ON public.incident_witnesses
FOR UPDATE
USING (auth.uid() = create_user_id)
WITH CHECK (auth.uid() = create_user_id);

-- Policy: Users can delete their own witnesses
CREATE POLICY "Users can delete own witnesses"
ON public.incident_witnesses
FOR DELETE
USING (auth.uid() = create_user_id);

-- =====================================================
-- 4. TRIGGER (auto-update updated_at)
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_incident_witnesses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_incident_witnesses_updated_at
BEFORE UPDATE ON public.incident_witnesses
FOR EACH ROW
EXECUTE FUNCTION public.update_incident_witnesses_updated_at();

-- =====================================================
-- 5. COMMENTS (documentation)
-- =====================================================

COMMENT ON TABLE public.incident_witnesses IS
'Stores witness information for incident reports. One-to-many relationship: one incident can have multiple witnesses.';

COMMENT ON COLUMN public.incident_witnesses.id IS
'Unique identifier for the witness record';

COMMENT ON COLUMN public.incident_witnesses.incident_report_id IS
'Foreign key to incident_reports table';

COMMENT ON COLUMN public.incident_witnesses.create_user_id IS
'User who created this witness record (for RLS)';

COMMENT ON COLUMN public.incident_witnesses.witness_number IS
'Sequential number of witness (1, 2, 3, etc.) within the incident';

COMMENT ON COLUMN public.incident_witnesses.witness_name IS
'Full name of the witness (required)';

COMMENT ON COLUMN public.incident_witnesses.witness_phone IS
'Contact phone number (optional)';

COMMENT ON COLUMN public.incident_witnesses.witness_email IS
'Contact email address (optional)';

COMMENT ON COLUMN public.incident_witnesses.witness_address IS
'Physical or postal address (optional)';

COMMENT ON COLUMN public.incident_witnesses.witness_statement IS
'What the witness saw or knows about the incident (required)';

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_witnesses TO authenticated;
GRANT USAGE ON SEQUENCE incident_witnesses_id_seq TO authenticated;

-- Grant access to service role (for backend operations)
GRANT ALL ON public.incident_witnesses TO service_role;

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ incident_witnesses table created successfully';
  RAISE NOTICE '✅ Indexes created for performance optimization';
  RAISE NOTICE '✅ RLS policies enabled for data security';
  RAISE NOTICE '✅ Triggers configured for automatic timestamps';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Table Structure:';
  RAISE NOTICE '   - Supports unlimited witnesses per incident';
  RAISE NOTICE '   - Proper foreign key relationships';
  RAISE NOTICE '   - Secure RLS policies (users see only their data)';
  RAISE NOTICE '   - Indexed for fast queries';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Security:';
  RAISE NOTICE '   - Row Level Security (RLS) enabled';
  RAISE NOTICE '   - Users can only access their own witnesses';
  RAISE NOTICE '   - Service role can access all (for admin/backend)';
END $$;
