-- Migration: Add Page 2 Medical/Safety Fields to incident_reports
-- Date: 2025-11-06
-- Purpose: Add 19 medical symptom and treatment fields from Page 2
-- Source: PAGE2_COMPLETE_FIELD_LIST.csv

BEGIN;

-- Add primary medical attention fields
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS medical_attention_needed BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS medical_injury_details TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS medical_injury_severity TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS medical_hospital_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS medical_ambulance_called BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS medical_treatment_received TEXT DEFAULT NULL;

-- Add medical symptom checkboxes (all default to FALSE)
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS medical_symptom_chest_pain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS medical_symptom_uncontrolled_bleeding BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS medical_symptom_breathlessness BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS medical_symptom_limb_weakness BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS medical_symptom_dizziness BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS medical_symptom_loss_of_consciousness BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS medical_symptom_severe_headache BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS medical_symptom_change_in_vision BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS medical_symptom_abdominal_pain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS medical_symptom_abdominal_bruising BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS medical_symptom_limb_pain_mobility BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS medical_symptom_life_threatening BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS medical_symptom_none BOOLEAN DEFAULT FALSE;

-- Add helpful comments for each field
COMMENT ON COLUMN incident_reports.medical_attention_needed IS 'Primary question: Did you need medical attention? (yes=TRUE, no=FALSE)';
COMMENT ON COLUMN incident_reports.medical_injury_details IS 'Details of injuries sustained (conditional on medical_attention_needed=yes)';
COMMENT ON COLUMN incident_reports.medical_injury_severity IS 'Severity level: minor, moderate, serious, severe, critical (conditional)';
COMMENT ON COLUMN incident_reports.medical_hospital_name IS 'Hospital or medical center name (optional, conditional)';
COMMENT ON COLUMN incident_reports.medical_ambulance_called IS 'Whether ambulance was called (yes=TRUE, no=FALSE, conditional)';
COMMENT ON COLUMN incident_reports.medical_treatment_received IS 'Description of treatment received (conditional on ambulance_called=yes)';
COMMENT ON COLUMN incident_reports.medical_symptom_chest_pain IS 'Checkbox: Experiencing chest pain';
COMMENT ON COLUMN incident_reports.medical_symptom_uncontrolled_bleeding IS 'Checkbox: Uncontrolled bleeding';
COMMENT ON COLUMN incident_reports.medical_symptom_breathlessness IS 'Checkbox: Breathlessness or difficulty breathing';
COMMENT ON COLUMN incident_reports.medical_symptom_limb_weakness IS 'Checkbox: Limb weakness or changes in sensation';
COMMENT ON COLUMN incident_reports.medical_symptom_dizziness IS 'Checkbox: Dizziness';
COMMENT ON COLUMN incident_reports.medical_symptom_loss_of_consciousness IS 'Checkbox: Loss of consciousness';
COMMENT ON COLUMN incident_reports.medical_symptom_severe_headache IS 'Checkbox: Severe headache';
COMMENT ON COLUMN incident_reports.medical_symptom_change_in_vision IS 'Checkbox: Change in vision';
COMMENT ON COLUMN incident_reports.medical_symptom_abdominal_pain IS 'Checkbox: Abdominal pain';
COMMENT ON COLUMN incident_reports.medical_symptom_abdominal_bruising IS 'Checkbox: Abdominal bruising';
COMMENT ON COLUMN incident_reports.medical_symptom_limb_pain_mobility IS 'Checkbox: Limb pain impeding mobility';
COMMENT ON COLUMN incident_reports.medical_symptom_life_threatening IS 'Checkbox: Life or limb threatening injury concerns';
COMMENT ON COLUMN incident_reports.medical_symptom_none IS 'Checkbox: No symptoms - feel fine';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 014 complete: Added 19 Page 2 medical/safety fields';
  RAISE NOTICE '✅ Fields: 6 primary medical fields + 13 symptom checkboxes';
  RAISE NOTICE '✅ All fields support conditional logic based on medical_attention_needed';
END $$;

COMMIT;
