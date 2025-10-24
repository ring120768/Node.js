-- ============================================================================
-- CREATE WITNESS AND VEHICLE TABLES - COMBINED SCRIPT
-- Copy this entire file and paste into Supabase SQL Editor, then click RUN
-- ============================================================================

-- ====================================
-- 1. CREATE WITNESSES TABLE
-- ====================================

CREATE TABLE IF NOT EXISTS incident_witnesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
    create_user_id TEXT NOT NULL REFERENCES user_signup(create_user_id) ON DELETE CASCADE,
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

DROP POLICY IF EXISTS "Users can view own witnesses" ON incident_witnesses;
CREATE POLICY "Users can view own witnesses"
ON incident_witnesses FOR SELECT
USING (auth.uid() = create_user_id::uuid);

DROP POLICY IF EXISTS "Users can insert own witnesses" ON incident_witnesses;
CREATE POLICY "Users can insert own witnesses"
ON incident_witnesses FOR INSERT
WITH CHECK (auth.uid() = create_user_id::uuid);

DROP POLICY IF EXISTS "Users can update own witnesses" ON incident_witnesses;
CREATE POLICY "Users can update own witnesses"
ON incident_witnesses FOR UPDATE
USING (auth.uid() = create_user_id::uuid);

DROP POLICY IF EXISTS "Users can delete own witnesses" ON incident_witnesses;
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

DROP TRIGGER IF EXISTS trigger_update_incident_witnesses_updated_at ON incident_witnesses;
CREATE TRIGGER trigger_update_incident_witnesses_updated_at
BEFORE UPDATE ON incident_witnesses
FOR EACH ROW
EXECUTE FUNCTION update_incident_witnesses_updated_at();

-- ====================================
-- 2. CREATE VEHICLES TABLE (WITH ALL DVLA FIELDS)
-- ====================================

CREATE TABLE IF NOT EXISTS incident_other_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
    create_user_id TEXT NOT NULL REFERENCES user_signup(create_user_id) ON DELETE CASCADE,
    driver_name TEXT,
    driver_phone TEXT,
    driver_address TEXT,
    driver_email TEXT,
    vehicle_license_plate TEXT NOT NULL,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_color TEXT,
    vehicle_year_of_manufacture TEXT,
    insurance_company TEXT,
    policy_number TEXT,
    policy_cover TEXT,
    policy_holder TEXT,
    last_v5c_issued TEXT,
    damage_description TEXT,
    mot_status TEXT,
    mot_expiry_date TEXT,
    tax_status TEXT,
    tax_due_date TEXT,
    fuel_type TEXT,
    engine_capacity TEXT,
    dvla_lookup_successful BOOLEAN DEFAULT false,
    dvla_lookup_timestamp TIMESTAMP WITH TIME ZONE,
    dvla_error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    gdpr_consent BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_incident_other_vehicles_incident_id ON incident_other_vehicles(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_other_vehicles_user_id ON incident_other_vehicles(create_user_id);
CREATE INDEX IF NOT EXISTS idx_incident_other_vehicles_deleted_at ON incident_other_vehicles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_incident_other_vehicles_license_plate ON incident_other_vehicles(vehicle_license_plate);

ALTER TABLE incident_other_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own other vehicles" ON incident_other_vehicles;
CREATE POLICY "Users can view own other vehicles"
ON incident_other_vehicles FOR SELECT
USING (auth.uid() = create_user_id::uuid);

DROP POLICY IF EXISTS "Users can insert own other vehicles" ON incident_other_vehicles;
CREATE POLICY "Users can insert own other vehicles"
ON incident_other_vehicles FOR INSERT
WITH CHECK (auth.uid() = create_user_id::uuid);

DROP POLICY IF EXISTS "Users can update own other vehicles" ON incident_other_vehicles;
CREATE POLICY "Users can update own other vehicles"
ON incident_other_vehicles FOR UPDATE
USING (auth.uid() = create_user_id::uuid);

DROP POLICY IF EXISTS "Users can delete own other vehicles" ON incident_other_vehicles;
CREATE POLICY "Users can delete own other vehicles"
ON incident_other_vehicles FOR DELETE
USING (auth.uid() = create_user_id::uuid);

CREATE OR REPLACE FUNCTION update_incident_other_vehicles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_incident_other_vehicles_updated_at ON incident_other_vehicles;
CREATE TRIGGER trigger_update_incident_other_vehicles_updated_at
BEFORE UPDATE ON incident_other_vehicles
FOR EACH ROW
EXECUTE FUNCTION update_incident_other_vehicles_updated_at();

-- ====================================
-- DONE! Both tables created successfully
-- ====================================
