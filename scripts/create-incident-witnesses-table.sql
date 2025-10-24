-- Create incident_witnesses table
-- This table stores witness information for each incident report
-- Allows multiple witnesses per incident for comprehensive legal documentation

CREATE TABLE IF NOT EXISTS incident_witnesses (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys (incident must exist)
    incident_id UUID NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
    create_user_id UUID NOT NULL REFERENCES user_signup(create_user_id) ON DELETE CASCADE,

    -- Witness contact information
    witness_name TEXT NOT NULL,
    witness_phone TEXT,
    witness_email TEXT,
    witness_address TEXT,

    -- Witness account of the incident
    witness_statement TEXT,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- GDPR compliance
    gdpr_consent BOOLEAN DEFAULT false
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incident_witnesses_incident_id ON incident_witnesses(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_witnesses_user_id ON incident_witnesses(create_user_id);
CREATE INDEX IF NOT EXISTS idx_incident_witnesses_deleted_at ON incident_witnesses(deleted_at);

-- Row Level Security (RLS) policies
ALTER TABLE incident_witnesses ENABLE ROW LEVEL SECURITY;

-- Users can view their own witnesses
CREATE POLICY "Users can view own witnesses"
ON incident_witnesses FOR SELECT
USING (auth.uid() = create_user_id::uuid);

-- Users can insert their own witnesses
CREATE POLICY "Users can insert own witnesses"
ON incident_witnesses FOR INSERT
WITH CHECK (auth.uid() = create_user_id::uuid);

-- Users can update their own witnesses
CREATE POLICY "Users can update own witnesses"
ON incident_witnesses FOR UPDATE
USING (auth.uid() = create_user_id::uuid);

-- Users can delete their own witnesses (soft delete via deleted_at)
CREATE POLICY "Users can delete own witnesses"
ON incident_witnesses FOR DELETE
USING (auth.uid() = create_user_id::uuid);

-- Service role bypasses RLS (for webhooks and admin operations)
-- No additional policy needed - service_role automatically bypasses RLS

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_incident_witnesses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_incident_witnesses_updated_at
BEFORE UPDATE ON incident_witnesses
FOR EACH ROW
EXECUTE FUNCTION update_incident_witnesses_updated_at();

-- Comments for documentation
COMMENT ON TABLE incident_witnesses IS 'Stores witness information for incident reports - supports multiple witnesses per incident';
COMMENT ON COLUMN incident_witnesses.incident_id IS 'Reference to the incident report';
COMMENT ON COLUMN incident_witnesses.witness_statement IS 'Witness account of what they saw/heard during the incident';
COMMENT ON COLUMN incident_witnesses.gdpr_consent IS 'GDPR consent for storing witness personal information';
