-- ========================================
-- Migration 002: Add Missing UI Form Fields
-- ========================================
-- Date: 2025-11-02
-- Purpose: Add 77 missing columns that UI sends but Supabase doesn't store
-- This fixes the "postbox" gap where user data was being lost
--
-- SUCCESS METRIC: UI → Supabase → PDF success rate
--   Before: 13.5% (13/96 fields)
--   After:  ~95%+ (90+/96 fields)
-- ========================================

BEGIN;

-- ========================================
-- MEDICAL INFORMATION (19 fields)
-- Critical legal data about injuries
-- ========================================

ALTER TABLE incident_reports

-- Medical Response (boolean)
ADD COLUMN IF NOT EXISTS medical_ambulance_called BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS medical_attention_needed BOOLEAN DEFAULT FALSE,

-- Medical Details (text)
ADD COLUMN IF NOT EXISTS medical_hospital_name TEXT,
ADD COLUMN IF NOT EXISTS medical_injury_details TEXT,
ADD COLUMN IF NOT EXISTS medical_injury_severity TEXT,
ADD COLUMN IF NOT EXISTS medical_treatment_received TEXT,

-- Medical Symptoms (checkboxes - can select multiple)
ADD COLUMN IF NOT EXISTS medical_symptom_none BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS medical_symptom_abdominal_bruising BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS medical_symptom_abdominal_pain BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS medical_symptom_breathlessness BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS medical_symptom_change_in_vision BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS medical_symptom_chest_pain BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS medical_symptom_dizziness BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS medical_symptom_life_threatening BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS medical_symptom_limb_pain_mobility BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS medical_symptom_limb_weakness BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS medical_symptom_loss_of_consciousness BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS medical_symptom_severe_headache BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS medical_symptom_uncontrolled_bleeding BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.medical_symptom_none IS 'No symptoms - mutually exclusive with other symptoms';

-- ========================================
-- ACCIDENT BASIC INFO (2 fields)
-- ========================================

ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS accident_date DATE,
ADD COLUMN IF NOT EXISTS accident_time TIME;

COMMENT ON COLUMN incident_reports.accident_date IS 'Date of accident (separate from timestamp)';
COMMENT ON COLUMN incident_reports.accident_time IS 'Time of accident (separate from timestamp)';

-- ========================================
-- ROAD CONDITIONS (6 fields)
-- Checkboxes - can select multiple
-- ========================================

ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS road_condition_dry BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS road_condition_wet BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS road_condition_icy BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS road_condition_snow_covered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS road_condition_loose_surface BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS road_condition_other BOOLEAN DEFAULT FALSE;

-- ========================================
-- ROAD MARKINGS (3 fields)
-- Radio buttons - only one selected
-- ========================================

ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS road_markings_visible_yes BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS road_markings_visible_partially BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS road_markings_visible_no BOOLEAN DEFAULT FALSE;

-- Add CHECK constraint for radio button behavior
ALTER TABLE incident_reports
ADD CONSTRAINT check_single_road_marking
CHECK (
  (road_markings_visible_yes::int + road_markings_visible_partially::int + road_markings_visible_no::int) <= 1
);

COMMENT ON CONSTRAINT check_single_road_marking ON incident_reports IS 'Only one road marking visibility option can be selected';

-- ========================================
-- ROAD TYPE (7 fields)
-- Radio buttons - only one selected
-- ========================================

ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS road_type_motorway BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS road_type_a_road BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS road_type_b_road BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS road_type_urban_street BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS road_type_rural_road BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS road_type_car_park BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS road_type_other BOOLEAN DEFAULT FALSE;

-- Add CHECK constraint for radio button behavior
ALTER TABLE incident_reports
ADD CONSTRAINT check_single_road_type
CHECK (
  (road_type_motorway::int + road_type_a_road::int + road_type_b_road::int +
   road_type_urban_street::int + road_type_rural_road::int +
   road_type_car_park::int + road_type_other::int) <= 1
);

-- ========================================
-- TRAFFIC CONDITIONS (4 fields)
-- Radio buttons - only one selected
-- ========================================

ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS traffic_conditions_no_traffic BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS traffic_conditions_light BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS traffic_conditions_moderate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS traffic_conditions_heavy BOOLEAN DEFAULT FALSE;

-- Add CHECK constraint for radio button behavior
ALTER TABLE incident_reports
ADD CONSTRAINT check_single_traffic_condition_new
CHECK (
  (traffic_conditions_no_traffic::int + traffic_conditions_light::int +
   traffic_conditions_moderate::int + traffic_conditions_heavy::int) <= 1
);

-- ========================================
-- WEATHER CONDITIONS (6 fields)
-- Checkboxes - can select multiple
-- ========================================

ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS weather_clear BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS weather_cloudy BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS weather_bright_sunlight BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS weather_ice BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS weather_thunder_lightning BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS weather_other BOOLEAN DEFAULT FALSE;

-- ========================================
-- VISIBILITY (1 field)
-- ========================================

ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS visibility_severely_restricted BOOLEAN DEFAULT FALSE;

-- ========================================
-- LOCATION & CONTEXT (6 fields)
-- ========================================

ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS what3words TEXT,
ADD COLUMN IF NOT EXISTS nearestLandmark TEXT,
ADD COLUMN IF NOT EXISTS additionalHazards TEXT,
ADD COLUMN IF NOT EXISTS specialConditions TEXT,
ADD COLUMN IF NOT EXISTS visibilityFactors TEXT;

COMMENT ON COLUMN incident_reports.what3words IS 'What3words location code (e.g., ///filled.count.soap)';
COMMENT ON COLUMN incident_reports.nearestLandmark IS 'Nearest landmark to help locate accident scene';

-- ========================================
-- JUNCTION/INTERSECTION DETAILS (4 fields)
-- ========================================

ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS junctionType TEXT,
ADD COLUMN IF NOT EXISTS junctionControl TEXT,
ADD COLUMN IF NOT EXISTS trafficLightStatus TEXT,
ADD COLUMN IF NOT EXISTS userManoeuvre TEXT;

COMMENT ON COLUMN incident_reports.junctionType IS 'Type of junction (T-junction, roundabout, crossroads, etc.)';
COMMENT ON COLUMN incident_reports.junctionControl IS 'Traffic control at junction (lights, signs, none)';
COMMENT ON COLUMN incident_reports.userManoeuvre IS 'What manoeuvre user was performing';

-- ========================================
-- VEHICLE & DAMAGE (7 fields)
-- ========================================

ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS your_speed TEXT,
ADD COLUMN IF NOT EXISTS impact_point TEXT,
ADD COLUMN IF NOT EXISTS usual_vehicle BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vehicle_driveable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS no_damage BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS no_visible_damage BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS seatbelts_worn BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.your_speed IS 'User-estimated speed at time of accident';
COMMENT ON COLUMN incident_reports.impact_point IS 'Point of impact on user vehicle';
COMMENT ON COLUMN incident_reports.seatbelts_worn IS 'Were seatbelts worn at time of accident?';

-- ========================================
-- RECOVERY DETAILS (3 fields)
-- ========================================

ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS recovery_location TEXT,
ADD COLUMN IF NOT EXISTS recovery_phone TEXT,
ADD COLUMN IF NOT EXISTS recovery_notes TEXT;

-- ========================================
-- POLICE & WITNESSES (2 fields)
-- ========================================

ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS police_attended BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS witnesses_present BOOLEAN DEFAULT FALSE;

-- ========================================
-- FINAL CHECK (1 field)
-- ========================================

ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS final_feeling TEXT;

COMMENT ON COLUMN incident_reports.final_feeling IS 'User final thoughts/feelings after completing form';

-- ========================================
-- OTHER VEHICLE DETAILS (6 fields)
-- Added to incident_other_vehicles table
-- ========================================

ALTER TABLE incident_other_vehicles
ADD COLUMN IF NOT EXISTS other_driver_name TEXT,
ADD COLUMN IF NOT EXISTS other_driver_phone TEXT,
ADD COLUMN IF NOT EXISTS other_driver_email TEXT,
ADD COLUMN IF NOT EXISTS other_driver_license TEXT,
ADD COLUMN IF NOT EXISTS other_license_plate TEXT,
ADD COLUMN IF NOT EXISTS other_point_of_impact TEXT;

COMMENT ON COLUMN incident_other_vehicles.other_driver_name IS 'Name of other driver';
COMMENT ON COLUMN incident_other_vehicles.other_driver_license IS 'Other driver license number';
COMMENT ON COLUMN incident_other_vehicles.other_license_plate IS 'Other vehicle license plate';
COMMENT ON COLUMN incident_other_vehicles.other_point_of_impact IS 'Point of impact on other vehicle';

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Date/time searches
CREATE INDEX IF NOT EXISTS idx_incident_reports_accident_date ON incident_reports(accident_date);
CREATE INDEX IF NOT EXISTS idx_incident_reports_accident_time ON incident_reports(accident_time);

-- Location searches
CREATE INDEX IF NOT EXISTS idx_incident_reports_what3words ON incident_reports(what3words);

-- Medical attention flags (for priority filtering)
CREATE INDEX IF NOT EXISTS idx_incident_reports_medical_attention ON incident_reports(medical_attention_needed) WHERE medical_attention_needed = TRUE;
CREATE INDEX IF NOT EXISTS idx_incident_reports_ambulance_called ON incident_reports(medical_ambulance_called) WHERE medical_ambulance_called = TRUE;

-- Police attendance (legal significance)
CREATE INDEX IF NOT EXISTS idx_incident_reports_police_attended ON incident_reports(police_attended) WHERE police_attended = TRUE;

-- ========================================
-- SUMMARY
-- ========================================

COMMENT ON TABLE incident_reports IS
'Main incident report table - UPDATED in migration 002 to add 71 missing UI fields';

COMMENT ON TABLE incident_other_vehicles IS
'Other vehicle details - UPDATED in migration 002 to add 6 missing UI fields';

COMMIT;

-- ========================================
-- VERIFICATION QUERY
-- ========================================
-- Run this after migration to verify columns were added:
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'incident_reports'
-- AND column_name LIKE 'medical_%'
-- ORDER BY column_name;
--
-- Expected: 19 medical_* columns
-- ========================================

-- ========================================
-- ROLLBACK (if needed)
-- ========================================
-- To undo this migration:
--
-- BEGIN;
--
-- ALTER TABLE incident_reports
-- DROP COLUMN IF EXISTS medical_ambulance_called,
-- DROP COLUMN IF EXISTS medical_attention_needed,
-- ... (drop all 71 columns)
--
-- ALTER TABLE incident_other_vehicles
-- DROP COLUMN IF EXISTS other_driver_name,
-- ... (drop all 6 columns)
--
-- COMMIT;
-- ========================================
