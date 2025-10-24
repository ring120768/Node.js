-- Create incident_other_vehicles table
-- This table stores information about other vehicles involved in each incident
-- Allows multiple other vehicles per incident
-- Integrates with DVLA API for automatic vehicle details lookup

CREATE TABLE IF NOT EXISTS incident_other_vehicles (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys (incident must exist)
    incident_id UUID NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
    create_user_id UUID NOT NULL REFERENCES user_signup(create_user_id) ON DELETE CASCADE,

    -- Driver information
    driver_name TEXT,
    driver_phone TEXT,
    driver_address TEXT,

    -- Vehicle information (from DVLA API)
    vehicle_license_plate TEXT NOT NULL,  -- Required for DVLA lookup
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_color TEXT,
    vehicle_year_of_manufacture TEXT,

    -- Insurance information
    insurance_company TEXT,
    policy_number TEXT,
    policy_cover TEXT,  -- comprehensive, third party, etc.
    policy_holder TEXT,
    last_v5c_issued TEXT,

    -- Damage information
    damage_description TEXT,

    -- DVLA API lookup metadata
    dvla_lookup_successful BOOLEAN DEFAULT false,
    dvla_lookup_timestamp TIMESTAMP WITH TIME ZONE,
    dvla_error_message TEXT,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- GDPR compliance
    gdpr_consent BOOLEAN DEFAULT false
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incident_other_vehicles_incident_id ON incident_other_vehicles(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_other_vehicles_user_id ON incident_other_vehicles(create_user_id);
CREATE INDEX IF NOT EXISTS idx_incident_other_vehicles_deleted_at ON incident_other_vehicles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_incident_other_vehicles_license_plate ON incident_other_vehicles(vehicle_license_plate);

-- Row Level Security (RLS) policies
ALTER TABLE incident_other_vehicles ENABLE ROW LEVEL SECURITY;

-- Users can view their own other vehicles
CREATE POLICY "Users can view own other vehicles"
ON incident_other_vehicles FOR SELECT
USING (auth.uid() = create_user_id::uuid);

-- Users can insert their own other vehicles
CREATE POLICY "Users can insert own other vehicles"
ON incident_other_vehicles FOR INSERT
WITH CHECK (auth.uid() = create_user_id::uuid);

-- Users can update their own other vehicles
CREATE POLICY "Users can update own other vehicles"
ON incident_other_vehicles FOR UPDATE
USING (auth.uid() = create_user_id::uuid);

-- Users can delete their own other vehicles (soft delete via deleted_at)
CREATE POLICY "Users can delete own other vehicles"
ON incident_other_vehicles FOR DELETE
USING (auth.uid() = create_user_id::uuid);

-- Service role bypasses RLS (for webhooks and admin operations)
-- No additional policy needed - service_role automatically bypasses RLS

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_incident_other_vehicles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_incident_other_vehicles_updated_at
BEFORE UPDATE ON incident_other_vehicles
FOR EACH ROW
EXECUTE FUNCTION update_incident_other_vehicles_updated_at();

-- Comments for documentation
COMMENT ON TABLE incident_other_vehicles IS 'Stores information about other vehicles involved in incidents - supports multiple vehicles per incident';
COMMENT ON COLUMN incident_other_vehicles.incident_id IS 'Reference to the incident report';
COMMENT ON COLUMN incident_other_vehicles.vehicle_license_plate IS 'Vehicle registration number - used for DVLA API lookup';
COMMENT ON COLUMN incident_other_vehicles.dvla_lookup_successful IS 'Whether DVLA API successfully returned vehicle details';
COMMENT ON COLUMN incident_other_vehicles.damage_description IS 'Description of damage to the other vehicle';
COMMENT ON COLUMN incident_other_vehicles.gdpr_consent IS 'GDPR consent for storing other driver personal information';
