-- Update incident_other_vehicles table to include all DVLA fields
-- This adds missing fields needed for PDF generation

-- Add driver_email if it doesn't exist
ALTER TABLE incident_other_vehicles
ADD COLUMN IF NOT EXISTS driver_email TEXT;

-- Add DVLA-specific fields for MOT information
ALTER TABLE incident_other_vehicles
ADD COLUMN IF NOT EXISTS mot_status TEXT;

ALTER TABLE incident_other_vehicles
ADD COLUMN IF NOT EXISTS mot_expiry_date TEXT;

-- Add DVLA-specific fields for Tax information
ALTER TABLE incident_other_vehicles
ADD COLUMN IF NOT EXISTS tax_status TEXT;

ALTER TABLE incident_other_vehicles
ADD COLUMN IF NOT EXISTS tax_due_date TEXT;

-- Add DVLA-specific fields for vehicle specifications
ALTER TABLE incident_other_vehicles
ADD COLUMN IF NOT EXISTS fuel_type TEXT;

ALTER TABLE incident_other_vehicles
ADD COLUMN IF NOT EXISTS engine_capacity TEXT;

-- Add comments for documentation
COMMENT ON COLUMN incident_other_vehicles.driver_email IS 'Other driver email address for contact';
COMMENT ON COLUMN incident_other_vehicles.mot_status IS 'MOT status from DVLA (Valid, Not valid, No details held)';
COMMENT ON COLUMN incident_other_vehicles.mot_expiry_date IS 'MOT expiry date from DVLA';
COMMENT ON COLUMN incident_other_vehicles.tax_status IS 'Vehicle tax status from DVLA (Taxed, SORN, Untaxed)';
COMMENT ON COLUMN incident_other_vehicles.tax_due_date IS 'Vehicle tax due date from DVLA';
COMMENT ON COLUMN incident_other_vehicles.fuel_type IS 'Fuel type from DVLA (Petrol, Diesel, Electric, Hybrid, etc.)';
COMMENT ON COLUMN incident_other_vehicles.engine_capacity IS 'Engine capacity in CC from DVLA';
