-- ====================================
-- Create incident_witnesses table
-- Run this in Supabase SQL Editor
-- ====================================

CREATE TABLE IF NOT EXISTS incident_witnesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
    create_user_id UUID NOT NULL REFERENCES user_signup(create_user_id) ON DELETE CASCADE,
    witness_name TEXT NOT NULL,
    witness_phone TEXT,
    witness_email TEXT,
    witness_address TEXT,
    witness_statement TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    gdpr_consent BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_incident_witnesses_incident_id ON incident_witnesses(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_witnesses_user_id ON incident_witnesses(create_user_id);
CREATE INDEX IF NOT EXISTS idx_incident_witnesses_deleted_at ON incident_witnesses(deleted_at);

ALTER TABLE incident_witnesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own witnesses"
ON incident_witnesses FOR SELECT
USING (auth.uid() = create_user_id::uuid);

CREATE POLICY "Users can insert own witnesses"
ON incident_witnesses FOR INSERT
WITH CHECK (auth.uid() = create_user_id::uuid);

CREATE POLICY "Users can update own witnesses"
ON incident_witnesses FOR UPDATE
USING (auth.uid() = create_user_id::uuid);

CREATE POLICY "Users can delete own witnesses"
ON incident_witnesses FOR DELETE
USING (auth.uid() = create_user_id::uuid);

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
