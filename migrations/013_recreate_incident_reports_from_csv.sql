-- =============================================
-- Migration 013: Recreate incident_reports Table from Field Mapping CSV
-- Created: 2025-11-05
-- Purpose: Clean rebuild of incident_reports with proper structure
-- Based on: FIELD_MAPPING_COMPLETE.csv (61 fields)
-- =============================================

BEGIN;

-- ========================================
-- STEP 1: Drop existing table
-- ========================================
-- WARNING: This will delete all existing incident report data!
-- Make sure you have a backup before running this migration.

DROP TABLE IF EXISTS public.incident_reports CASCADE;

-- ========================================
-- STEP 2: Create incident_reports table
-- ========================================

CREATE TABLE public.incident_reports (
  -- Primary Key & Metadata
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  create_user_id UUID NOT NULL,

  -- Timestamps (GDPR compliance)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- ========================================
  -- PAGE 4: Safety & Medical Status
  -- ========================================
  are_you_safe BOOLEAN DEFAULT false,
  medical_attention BOOLEAN DEFAULT false,
  medical_how_are_you_feeling TEXT,
  medical_attention_from_who TEXT,
  further_medical_attention TEXT,
  medical_please_be_completely_honest TEXT,
  six_point_safety_check BOOLEAN DEFAULT false,
  call_emergency_contact BOOLEAN DEFAULT false,

  -- ========================================
  -- PAGE 5: Medical Symptoms (Checkboxes)
  -- ========================================
  medical_chest_pain BOOLEAN DEFAULT false,
  medical_uncontrolled_bleeding BOOLEAN DEFAULT false,
  medical_breathlessness BOOLEAN DEFAULT false,
  medical_limb_weakness BOOLEAN DEFAULT false,
  medical_loss_of_consciousness BOOLEAN DEFAULT false,
  medical_severe_headache BOOLEAN DEFAULT false,
  medical_abdominal_bruising BOOLEAN DEFAULT false,
  medical_change_in_vision BOOLEAN DEFAULT false,
  medical_abdominal_pain BOOLEAN DEFAULT false,
  medical_limb_pain BOOLEAN DEFAULT false,
  medical_none_of_these BOOLEAN DEFAULT false,

  -- ========================================
  -- PAGE 5: Medical Treatment Details
  -- ========================================
  medical_ambulance_called BOOLEAN DEFAULT false,
  medical_attention_needed BOOLEAN DEFAULT false,
  medical_hospital_name TEXT,
  medical_injury_details TEXT,
  medical_injury_severity TEXT,
  medical_treatment_received TEXT,
  medical_follow_up_needed TEXT,

  -- ========================================
  -- PAGE 6: Incident Details
  -- ========================================
  when_did_the_accident_happen TEXT,
  accident_time TEXT,
  where_exactly_did_this_happen TEXT,

  -- PAGE 6: Safety Equipment
  wearing_seatbelts BOOLEAN DEFAULT false,
  airbags_deployed BOOLEAN DEFAULT false,
  why_werent_seat_belts_being_worn TEXT,

  -- PAGE 6: Vehicle Damage
  was_your_vehicle_damaged BOOLEAN DEFAULT false,
  no_damage BOOLEAN DEFAULT false,
  no_visible_damage BOOLEAN DEFAULT false,
  usual_vehicle BOOLEAN DEFAULT false,
  vehicle_driveable BOOLEAN DEFAULT false,

  -- ========================================
  -- PAGE 7: Weather Conditions (Legacy)
  -- ========================================
  overcast_dull BOOLEAN DEFAULT false,
  heavy_rain BOOLEAN DEFAULT false,
  wet_road BOOLEAN DEFAULT false,
  fog_poor_visibility BOOLEAN DEFAULT false,
  street_lights BOOLEAN DEFAULT false,
  dusk BOOLEAN DEFAULT false,
  clear_and_dry BOOLEAN DEFAULT false,
  snow_ice_on_road BOOLEAN DEFAULT false,
  snow BOOLEAN DEFAULT false,
  light_rain BOOLEAN DEFAULT false,
  bright_daylight BOOLEAN DEFAULT false,

  -- ========================================
  -- PAGE 7: Weather Conditions (New)
  -- ========================================
  weather_drizzle BOOLEAN DEFAULT false,
  weather_raining BOOLEAN DEFAULT false,
  weather_hail BOOLEAN DEFAULT false,
  weather_windy BOOLEAN DEFAULT false,
  weather_thunder BOOLEAN DEFAULT false,
  weather_slush_road BOOLEAN DEFAULT false,
  weather_loose_surface BOOLEAN DEFAULT false,
  weather_clear BOOLEAN DEFAULT false,
  weather_cloudy BOOLEAN DEFAULT false,
  weather_bright_sunlight BOOLEAN DEFAULT false,
  weather_ice BOOLEAN DEFAULT false,

  -- ========================================
  -- Foreign Keys & Relationships
  -- ========================================
  CONSTRAINT fk_user
    FOREIGN KEY (create_user_id)
    REFERENCES public.user_signup(create_user_id)
    ON DELETE CASCADE
);

-- ========================================
-- STEP 3: Add helpful comments
-- ========================================

COMMENT ON TABLE public.incident_reports IS 'Traffic accident incident reports - rebuilt from FIELD_MAPPING_COMPLETE.csv (61 fields)';

-- Metadata columns
COMMENT ON COLUMN public.incident_reports.id IS 'Incident report UUID (Primary Key)';
COMMENT ON COLUMN public.incident_reports.create_user_id IS 'User who submitted the report (Foreign Key to user_signup)';
COMMENT ON COLUMN public.incident_reports.created_at IS 'When incident report was submitted';
COMMENT ON COLUMN public.incident_reports.updated_at IS 'Last update timestamp';
COMMENT ON COLUMN public.incident_reports.deleted_at IS 'Soft delete timestamp (GDPR compliance)';

-- Page 4: Safety & Medical
COMMENT ON COLUMN public.incident_reports.are_you_safe IS 'User safety status at time of report';
COMMENT ON COLUMN public.incident_reports.medical_attention IS 'Whether medical attention was received';
COMMENT ON COLUMN public.incident_reports.medical_how_are_you_feeling IS 'User description of how they feel';
COMMENT ON COLUMN public.incident_reports.medical_attention_from_who IS 'Who provided medical attention';
COMMENT ON COLUMN public.incident_reports.six_point_safety_check IS '6-point safety check completed';
COMMENT ON COLUMN public.incident_reports.call_emergency_contact IS 'Emergency contact was called';

-- Page 5: Medical Symptoms
COMMENT ON COLUMN public.incident_reports.medical_chest_pain IS 'Symptom: Chest pain';
COMMENT ON COLUMN public.incident_reports.medical_uncontrolled_bleeding IS 'Symptom: Uncontrolled bleeding';
COMMENT ON COLUMN public.incident_reports.medical_breathlessness IS 'Symptom: Breathlessness';
COMMENT ON COLUMN public.incident_reports.medical_limb_weakness IS 'Symptom: Limb weakness';
COMMENT ON COLUMN public.incident_reports.medical_loss_of_consciousness IS 'Symptom: Loss of consciousness';
COMMENT ON COLUMN public.incident_reports.medical_ambulance_called IS 'Ambulance was called to scene';
COMMENT ON COLUMN public.incident_reports.medical_hospital_name IS 'Hospital or medical center name';
COMMENT ON COLUMN public.incident_reports.medical_injury_details IS 'Detailed injury description';

-- Page 6: Incident Details
COMMENT ON COLUMN public.incident_reports.when_did_the_accident_happen IS 'Accident date (DD/MM/YYYY format)';
COMMENT ON COLUMN public.incident_reports.accident_time IS 'Accident time (HH:MM format)';
COMMENT ON COLUMN public.incident_reports.where_exactly_did_this_happen IS 'Accident location description';
COMMENT ON COLUMN public.incident_reports.wearing_seatbelts IS 'Seatbelts were worn';
COMMENT ON COLUMN public.incident_reports.airbags_deployed IS 'Airbags deployed during accident';
COMMENT ON COLUMN public.incident_reports.was_your_vehicle_damaged IS 'Vehicle sustained damage';

-- Page 7: Weather Conditions
COMMENT ON COLUMN public.incident_reports.weather_raining IS 'Weather: Raining';
COMMENT ON COLUMN public.incident_reports.weather_clear_and_dry IS 'Weather: Clear and dry';
COMMENT ON COLUMN public.incident_reports.weather_fog IS 'Weather: Fog or poor visibility';
COMMENT ON COLUMN public.incident_reports.weather_ice IS 'Road condition: Ice on road';

-- ========================================
-- STEP 4: Create indexes for performance
-- ========================================

CREATE INDEX idx_incident_reports_user_id
  ON public.incident_reports(create_user_id);

CREATE INDEX idx_incident_reports_created_at
  ON public.incident_reports(created_at DESC);

CREATE INDEX idx_incident_reports_deleted_at
  ON public.incident_reports(deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_incident_reports_accident_date
  ON public.incident_reports(when_did_the_accident_happen);

-- ========================================
-- STEP 5: Create updated_at trigger
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_incident_reports_updated_at
  BEFORE UPDATE ON public.incident_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- STEP 6: Log completion
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 013 complete: incident_reports table recreated';
  RAISE NOTICE '📊 Structure: 61 fields from FIELD_MAPPING_COMPLETE.csv';
  RAISE NOTICE '🔑 Primary key: id (UUID)';
  RAISE NOTICE '🔗 Foreign key: create_user_id → user_signup';
  RAISE NOTICE '📅 Metadata: created_at, updated_at, deleted_at';
  RAISE NOTICE '🗂️  Indexes: user_id, created_at, deleted_at, accident_date';
  RAISE NOTICE '⚙️  Trigger: auto-update updated_at timestamp';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  WARNING: This migration drops ALL existing incident data!';
END $$;

COMMIT;
