-- ============================================================================
-- Page 2 (Medical Assessment) - Incident Report Form Fields
-- ============================================================================
-- Purpose: Create/alter incident_reports table to include all Page 2 fields
-- Page: incident-form-page2.html (Medical Assessment & Symptoms)
-- Total Fields: 19 user-input fields + 1 system timestamp
-- Database Table: incident_reports
-- Generated: 2025-11-06
-- ============================================================================

-- ============================================================================
-- SECTION 1: Primary Medical Assessment Fields
-- ============================================================================

-- Field 1: Medical Attention Needed (Primary Question)
-- Required: Yes | Conditional Trigger: Determines if medical detail fields are shown
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_attention_needed BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN incident_reports.medical_attention_needed IS
'Page 2 - Primary question: Did you need medical attention? (yes=TRUE, no=FALSE). Required field. Triggers conditional display of medical detail fields.';

-- Field 2: Medical Injury Details (Conditional)
-- Required: Conditional (if medical_attention_needed = TRUE) | Type: Textarea
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_injury_details TEXT DEFAULT NULL;

COMMENT ON COLUMN incident_reports.medical_injury_details IS
'Page 2 - Description of injuries sustained. Required if medical_attention_needed = TRUE. Free-text textarea input.';

-- Field 3: Medical Injury Severity (Conditional)
-- Required: Conditional (if medical_attention_needed = TRUE) | Type: Select dropdown
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_injury_severity TEXT DEFAULT NULL;

COMMENT ON COLUMN incident_reports.medical_injury_severity IS
'Page 2 - Severity level of injuries. Required if medical_attention_needed = TRUE. Valid values: minor, moderate, serious, severe, critical';

-- Add check constraint for severity enum
ALTER TABLE incident_reports
DROP CONSTRAINT IF EXISTS medical_injury_severity_check;

ALTER TABLE incident_reports
ADD CONSTRAINT medical_injury_severity_check
CHECK (medical_injury_severity IN ('minor', 'moderate', 'serious', 'severe', 'critical') OR medical_injury_severity IS NULL);

-- Field 4: Medical Hospital Name (Optional)
-- Required: No (optional even if medical attention needed) | Type: Text input
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_hospital_name TEXT DEFAULT NULL;

COMMENT ON COLUMN incident_reports.medical_hospital_name IS
'Page 2 - Name of hospital or medical center where treatment received. Optional field. Shown only if medical_attention_needed = TRUE.';

-- Field 5: Medical Ambulance Called (Conditional)
-- Required: Conditional (if medical_attention_needed = TRUE) | Type: Radio button
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_ambulance_called BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN incident_reports.medical_ambulance_called IS
'Page 2 - Was an ambulance called? (yes=TRUE, no=FALSE). Required if medical_attention_needed = TRUE.';

-- Field 6: Medical Treatment Received (Optional)
-- Required: No (optional) | Type: Textarea | Conditional Display: if ambulance called
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_treatment_received TEXT DEFAULT NULL;

COMMENT ON COLUMN incident_reports.medical_treatment_received IS
'Page 2 - Description of medical treatment received. Optional field. Shown only if medical_ambulance_called = TRUE.';

-- ============================================================================
-- SECTION 2: Medical Symptoms Checkboxes (12 symptoms)
-- ============================================================================
-- All symptom fields are BOOLEAN checkboxes
-- Required: No (optional - user can select multiple or none)
-- Default: FALSE (unchecked)
-- ============================================================================

-- Field 7: Chest Pain
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_symptom_chest_pain BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.medical_symptom_chest_pain IS
'Page 2 - Symptom checkbox: Chest pain. BOOLEAN (TRUE=checked, FALSE=unchecked). Default FALSE.';

-- Field 8: Uncontrolled Bleeding
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_symptom_uncontrolled_bleeding BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.medical_symptom_uncontrolled_bleeding IS
'Page 2 - Symptom checkbox: Uncontrolled bleeding. BOOLEAN (TRUE=checked, FALSE=unchecked). Default FALSE.';

-- Field 9: Breathlessness
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_symptom_breathlessness BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.medical_symptom_breathlessness IS
'Page 2 - Symptom checkbox: Breathlessness or difficulty breathing. BOOLEAN (TRUE=checked, FALSE=unchecked). Default FALSE.';

-- Field 10: Limb Weakness
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_symptom_limb_weakness BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.medical_symptom_limb_weakness IS
'Page 2 - Symptom checkbox: Limb weakness or changes in sensation. BOOLEAN (TRUE=checked, FALSE=unchecked). Default FALSE.';

-- Field 11: Dizziness
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_symptom_dizziness BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.medical_symptom_dizziness IS
'Page 2 - Symptom checkbox: Dizziness or feeling faint. BOOLEAN (TRUE=checked, FALSE=unchecked). Default FALSE.';

-- Field 12: Loss of Consciousness
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_symptom_loss_of_consciousness BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.medical_symptom_loss_of_consciousness IS
'Page 2 - Symptom checkbox: Loss of consciousness (blacked out/passed out). BOOLEAN (TRUE=checked, FALSE=unchecked). Default FALSE.';

-- Field 13: Severe Headache
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_symptom_severe_headache BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.medical_symptom_severe_headache IS
'Page 2 - Symptom checkbox: Severe headache. BOOLEAN (TRUE=checked, FALSE=unchecked). Default FALSE.';

-- Field 14: Change in Vision
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_symptom_change_in_vision BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.medical_symptom_change_in_vision IS
'Page 2 - Symptom checkbox: Change in vision or eyesight. BOOLEAN (TRUE=checked, FALSE=unchecked). Default FALSE.';

-- Field 15: Abdominal Pain
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_symptom_abdominal_pain BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.medical_symptom_abdominal_pain IS
'Page 2 - Symptom checkbox: Abdominal or stomach pain. BOOLEAN (TRUE=checked, FALSE=unchecked). Default FALSE.';

-- Field 16: Abdominal Bruising
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_symptom_abdominal_bruising BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.medical_symptom_abdominal_bruising IS
'Page 2 - Symptom checkbox: Abdominal bruising (seatbelt mark). BOOLEAN (TRUE=checked, FALSE=unchecked). Default FALSE.';

-- Field 17: Limb Pain Affecting Mobility
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_symptom_limb_pain_mobility BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.medical_symptom_limb_pain_mobility IS
'Page 2 - Symptom checkbox: Limb pain that impedes movement or mobility. BOOLEAN (TRUE=checked, FALSE=unchecked). Default FALSE.';

-- Field 18: Life-Threatening Concerns
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_symptom_life_threatening BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.medical_symptom_life_threatening IS
'Page 2 - Symptom checkbox: Life or limb threatening injury concerns. BOOLEAN (TRUE=checked, FALSE=unchecked). Default FALSE.';

-- Field 19: None (No Symptoms)
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS medical_symptom_none BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.medical_symptom_none IS
'Page 2 - Symptom checkbox: No symptoms, feeling fine. BOOLEAN (TRUE=checked, FALSE=unchecked). Default FALSE. Mutually exclusive with other symptoms.';

-- ============================================================================
-- SECTION 3: Indexes for Query Performance
-- ============================================================================

-- Index on medical_attention_needed (frequently queried for filtering cases)
CREATE INDEX IF NOT EXISTS idx_incident_reports_medical_attention
ON incident_reports(medical_attention_needed)
WHERE medical_attention_needed IS NOT NULL;

-- Index on medical_injury_severity (case prioritization queries)
CREATE INDEX IF NOT EXISTS idx_incident_reports_injury_severity
ON incident_reports(medical_injury_severity)
WHERE medical_injury_severity IS NOT NULL;

-- Composite index for critical symptoms (emergency case identification)
CREATE INDEX IF NOT EXISTS idx_incident_reports_critical_symptoms
ON incident_reports(
  medical_symptom_chest_pain,
  medical_symptom_uncontrolled_bleeding,
  medical_symptom_loss_of_consciousness,
  medical_symptom_life_threatening
)
WHERE medical_symptom_chest_pain = TRUE
   OR medical_symptom_uncontrolled_bleeding = TRUE
   OR medical_symptom_loss_of_consciousness = TRUE
   OR medical_symptom_life_threatening = TRUE;

-- ============================================================================
-- SECTION 4: Validation Rules & Business Logic
-- ============================================================================

-- Validation Rule 1: If medical_attention_needed = FALSE, medical detail fields should be NULL
-- This is enforced at application level, but can add check constraint if needed

-- Validation Rule 2: If medical_symptom_none = TRUE, other symptoms should be FALSE
-- This is enforced at application level (JavaScript) but documented here for reference

-- Validation Rule 3: medical_injury_severity must be valid enum value
-- Already enforced by CHECK constraint above

-- ============================================================================
-- SECTION 5: Sample Queries for Testing
-- ============================================================================

-- Query 1: Find all cases requiring medical attention
-- SELECT create_user_id, medical_injury_severity, medical_hospital_name
-- FROM incident_reports
-- WHERE medical_attention_needed = TRUE
-- ORDER BY
--   CASE medical_injury_severity
--     WHEN 'critical' THEN 1
--     WHEN 'severe' THEN 2
--     WHEN 'serious' THEN 3
--     WHEN 'moderate' THEN 4
--     WHEN 'minor' THEN 5
--   END;

-- Query 2: Find cases with critical symptoms (requires immediate attention)
-- SELECT create_user_id,
--        medical_symptom_chest_pain,
--        medical_symptom_uncontrolled_bleeding,
--        medical_symptom_loss_of_consciousness,
--        medical_symptom_life_threatening
-- FROM incident_reports
-- WHERE medical_symptom_chest_pain = TRUE
--    OR medical_symptom_uncontrolled_bleeding = TRUE
--    OR medical_symptom_loss_of_consciousness = TRUE
--    OR medical_symptom_life_threatening = TRUE;

-- Query 3: Count symptom distribution
-- SELECT
--   SUM(CASE WHEN medical_symptom_chest_pain THEN 1 ELSE 0 END) as chest_pain_count,
--   SUM(CASE WHEN medical_symptom_breathlessness THEN 1 ELSE 0 END) as breathlessness_count,
--   SUM(CASE WHEN medical_symptom_severe_headache THEN 1 ELSE 0 END) as headache_count,
--   SUM(CASE WHEN medical_symptom_none THEN 1 ELSE 0 END) as no_symptoms_count
-- FROM incident_reports
-- WHERE deleted_at IS NULL;

-- Query 4: Find ambulance cases with hospital names
-- SELECT create_user_id,
--        medical_hospital_name,
--        medical_treatment_received,
--        medical_injury_severity
-- FROM incident_reports
-- WHERE medical_ambulance_called = TRUE
--   AND medical_hospital_name IS NOT NULL
-- ORDER BY created_at DESC;

-- ============================================================================
-- SECTION 6: Data Migration Considerations
-- ============================================================================

-- If migrating from old schema, consider:
-- 1. Converting existing 'medical_attention' TEXT column to medical_attention_needed BOOLEAN
--    UPDATE incident_reports SET medical_attention_needed = (medical_attention = 'yes');
--
-- 2. Mapping old symptom field names to new standardized names
--    Example: medical_chest_pain → medical_symptom_chest_pain
--
-- 3. Backfilling symptom boolean defaults (FALSE) for existing NULL values
--    UPDATE incident_reports SET medical_symptom_none = FALSE WHERE medical_symptom_none IS NULL;

-- ============================================================================
-- SECTION 7: Statistics & Analytics Views (Optional)
-- ============================================================================

-- View 1: Medical severity summary
CREATE OR REPLACE VIEW medical_severity_summary AS
SELECT
  medical_injury_severity,
  COUNT(*) as case_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage,
  COUNT(CASE WHEN medical_ambulance_called = TRUE THEN 1 END) as ambulance_count
FROM incident_reports
WHERE medical_attention_needed = TRUE
  AND deleted_at IS NULL
GROUP BY medical_injury_severity
ORDER BY
  CASE medical_injury_severity
    WHEN 'critical' THEN 1
    WHEN 'severe' THEN 2
    WHEN 'serious' THEN 3
    WHEN 'moderate' THEN 4
    WHEN 'minor' THEN 5
  END;

COMMENT ON VIEW medical_severity_summary IS
'Summary statistics of medical injury severity levels for all incident reports requiring medical attention.';

-- View 2: Symptom frequency analysis
CREATE OR REPLACE VIEW symptom_frequency_analysis AS
SELECT
  'Chest Pain' as symptom_name,
  SUM(CASE WHEN medical_symptom_chest_pain THEN 1 ELSE 0 END) as count,
  ROUND(100.0 * SUM(CASE WHEN medical_symptom_chest_pain THEN 1 ELSE 0 END) / COUNT(*), 2) as percentage
FROM incident_reports WHERE deleted_at IS NULL
UNION ALL
SELECT
  'Uncontrolled Bleeding' as symptom_name,
  SUM(CASE WHEN medical_symptom_uncontrolled_bleeding THEN 1 ELSE 0 END),
  ROUND(100.0 * SUM(CASE WHEN medical_symptom_uncontrolled_bleeding THEN 1 ELSE 0 END) / COUNT(*), 2)
FROM incident_reports WHERE deleted_at IS NULL
UNION ALL
SELECT
  'Breathlessness' as symptom_name,
  SUM(CASE WHEN medical_symptom_breathlessness THEN 1 ELSE 0 END),
  ROUND(100.0 * SUM(CASE WHEN medical_symptom_breathlessness THEN 1 ELSE 0 END) / COUNT(*), 2)
FROM incident_reports WHERE deleted_at IS NULL
UNION ALL
SELECT
  'Limb Weakness' as symptom_name,
  SUM(CASE WHEN medical_symptom_limb_weakness THEN 1 ELSE 0 END),
  ROUND(100.0 * SUM(CASE WHEN medical_symptom_limb_weakness THEN 1 ELSE 0 END) / COUNT(*), 2)
FROM incident_reports WHERE deleted_at IS NULL
UNION ALL
SELECT
  'Dizziness' as symptom_name,
  SUM(CASE WHEN medical_symptom_dizziness THEN 1 ELSE 0 END),
  ROUND(100.0 * SUM(CASE WHEN medical_symptom_dizziness THEN 1 ELSE 0 END) / COUNT(*), 2)
FROM incident_reports WHERE deleted_at IS NULL
UNION ALL
SELECT
  'Loss of Consciousness' as symptom_name,
  SUM(CASE WHEN medical_symptom_loss_of_consciousness THEN 1 ELSE 0 END),
  ROUND(100.0 * SUM(CASE WHEN medical_symptom_loss_of_consciousness THEN 1 ELSE 0 END) / COUNT(*), 2)
FROM incident_reports WHERE deleted_at IS NULL
UNION ALL
SELECT
  'Severe Headache' as symptom_name,
  SUM(CASE WHEN medical_symptom_severe_headache THEN 1 ELSE 0 END),
  ROUND(100.0 * SUM(CASE WHEN medical_symptom_severe_headache THEN 1 ELSE 0 END) / COUNT(*), 2)
FROM incident_reports WHERE deleted_at IS NULL
UNION ALL
SELECT
  'Change in Vision' as symptom_name,
  SUM(CASE WHEN medical_symptom_change_in_vision THEN 1 ELSE 0 END),
  ROUND(100.0 * SUM(CASE WHEN medical_symptom_change_in_vision THEN 1 ELSE 0 END) / COUNT(*), 2)
FROM incident_reports WHERE deleted_at IS NULL
UNION ALL
SELECT
  'Abdominal Pain' as symptom_name,
  SUM(CASE WHEN medical_symptom_abdominal_pain THEN 1 ELSE 0 END),
  ROUND(100.0 * SUM(CASE WHEN medical_symptom_abdominal_pain THEN 1 ELSE 0 END) / COUNT(*), 2)
FROM incident_reports WHERE deleted_at IS NULL
UNION ALL
SELECT
  'Abdominal Bruising' as symptom_name,
  SUM(CASE WHEN medical_symptom_abdominal_bruising THEN 1 ELSE 0 END),
  ROUND(100.0 * SUM(CASE WHEN medical_symptom_abdominal_bruising THEN 1 ELSE 0 END) / COUNT(*), 2)
FROM incident_reports WHERE deleted_at IS NULL
UNION ALL
SELECT
  'Limb Pain/Mobility' as symptom_name,
  SUM(CASE WHEN medical_symptom_limb_pain_mobility THEN 1 ELSE 0 END),
  ROUND(100.0 * SUM(CASE WHEN medical_symptom_limb_pain_mobility THEN 1 ELSE 0 END) / COUNT(*), 2)
FROM incident_reports WHERE deleted_at IS NULL
UNION ALL
SELECT
  'Life Threatening' as symptom_name,
  SUM(CASE WHEN medical_symptom_life_threatening THEN 1 ELSE 0 END),
  ROUND(100.0 * SUM(CASE WHEN medical_symptom_life_threatening THEN 1 ELSE 0 END) / COUNT(*), 2)
FROM incident_reports WHERE deleted_at IS NULL
UNION ALL
SELECT
  'No Symptoms' as symptom_name,
  SUM(CASE WHEN medical_symptom_none THEN 1 ELSE 0 END),
  ROUND(100.0 * SUM(CASE WHEN medical_symptom_none THEN 1 ELSE 0 END) / COUNT(*), 2)
FROM incident_reports WHERE deleted_at IS NULL
ORDER BY count DESC;

COMMENT ON VIEW symptom_frequency_analysis IS
'Frequency analysis of all medical symptoms across incident reports, sorted by prevalence.';

-- ============================================================================
-- SECTION 8: Row Level Security (RLS) Policies
-- ============================================================================

-- Note: These policies should already exist for the incident_reports table
-- but are documented here for completeness

-- Policy 1: Users can only view their own incident reports
-- CREATE POLICY IF NOT EXISTS "Users view own incident reports"
-- ON incident_reports FOR SELECT
-- USING (auth.uid() = create_user_id::uuid);

-- Policy 2: Users can only update their own incident reports
-- CREATE POLICY IF NOT EXISTS "Users update own incident reports"
-- ON incident_reports FOR UPDATE
-- USING (auth.uid() = create_user_id::uuid);

-- Policy 3: Users can insert their own incident reports
-- CREATE POLICY IF NOT EXISTS "Users insert own incident reports"
-- ON incident_reports FOR INSERT
-- WITH CHECK (auth.uid() = create_user_id::uuid);

-- Policy 4: Service role bypasses all RLS (for webhooks and admin operations)
-- Service role key automatically bypasses RLS - no policy needed

-- ============================================================================
-- SECTION 9: Triggers for Audit Trail (Optional)
-- ============================================================================

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_incident_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_incident_reports_updated_at
BEFORE UPDATE ON incident_reports
FOR EACH ROW
EXECUTE FUNCTION update_incident_reports_updated_at();

COMMENT ON TRIGGER trigger_incident_reports_updated_at ON incident_reports IS
'Automatically updates the updated_at timestamp whenever a row is modified.';

-- ============================================================================
-- END OF SQL SCHEMA FOR PAGE 2 (MEDICAL ASSESSMENT)
-- ============================================================================

-- Verification Query: Check all Page 2 columns exist
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'incident_reports'
--   AND column_name LIKE 'medical_%'
-- ORDER BY ordinal_position;
