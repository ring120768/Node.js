-- Migration 033: Add incident_id to completed_incident_forms
-- Created: 2026-01-01
-- Purpose: Fix PDF delivery bug - store incident_id for traceability

BEGIN;

-- Add incident_id column
ALTER TABLE public.completed_incident_forms
  ADD COLUMN IF NOT EXISTS incident_id UUID NULL;

-- Add foreign key constraint
ALTER TABLE public.completed_incident_forms
  ADD CONSTRAINT fk_completed_forms_incident_id
  FOREIGN KEY (incident_id)
  REFERENCES public.incident_reports(id)
  ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_completed_forms_incident_id
  ON public.completed_incident_forms(incident_id);

-- Add comment
COMMENT ON COLUMN public.completed_incident_forms.incident_id IS
  'References the incident_reports record this PDF was generated for. Required for linking completed forms to incidents.';

COMMIT;
