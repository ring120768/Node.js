-- ROLLBACK: Remove Page 2 Medical/Safety Fields from incident_reports
-- Date: 2025-11-06
-- Purpose: Rollback migration 014 if needed
-- WARNING: Only use if migration needs to be reversed

BEGIN;

-- Drop all Page 2 medical fields
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS medical_attention_needed,
  DROP COLUMN IF EXISTS medical_injury_details,
  DROP COLUMN IF EXISTS medical_injury_severity,
  DROP COLUMN IF EXISTS medical_hospital_name,
  DROP COLUMN IF EXISTS medical_ambulance_called,
  DROP COLUMN IF EXISTS medical_treatment_received,
  DROP COLUMN IF EXISTS medical_symptom_chest_pain,
  DROP COLUMN IF EXISTS medical_symptom_uncontrolled_bleeding,
  DROP COLUMN IF EXISTS medical_symptom_breathlessness,
  DROP COLUMN IF EXISTS medical_symptom_limb_weakness,
  DROP COLUMN IF EXISTS medical_symptom_dizziness,
  DROP COLUMN IF EXISTS medical_symptom_loss_of_consciousness,
  DROP COLUMN IF EXISTS medical_symptom_severe_headache,
  DROP COLUMN IF EXISTS medical_symptom_change_in_vision,
  DROP COLUMN IF EXISTS medical_symptom_abdominal_pain,
  DROP COLUMN IF EXISTS medical_symptom_abdominal_bruising,
  DROP COLUMN IF EXISTS medical_symptom_limb_pain_mobility,
  DROP COLUMN IF EXISTS medical_symptom_life_threatening,
  DROP COLUMN IF EXISTS medical_symptom_none;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE '⚠️ ROLLBACK complete: Removed 19 Page 2 medical/safety fields';
  RAISE NOTICE '⚠️ Table returned to previous state';
END $$;

COMMIT;
