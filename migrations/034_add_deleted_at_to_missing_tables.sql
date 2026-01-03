-- Migration 034: Add deleted_at to GDPR-non-compliant tables
-- Created: 2026-01-03
-- Purpose: GDPR compliance - add soft delete to incident_other_vehicles, temp_uploads, pdf_generation_queue

BEGIN;

-- Add deleted_at to incident_other_vehicles
ALTER TABLE public.incident_other_vehicles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.incident_other_vehicles.deleted_at IS
  'Soft delete timestamp for GDPR compliance (Right to Erasure). NULL = active record.';

-- Add deleted_at to temp_uploads
ALTER TABLE public.temp_uploads
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.temp_uploads.deleted_at IS
  'Soft delete timestamp for GDPR compliance (Right to Erasure). NULL = active record.';

-- Add deleted_at to pdf_generation_queue
ALTER TABLE public.pdf_generation_queue
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.pdf_generation_queue.deleted_at IS
  'Soft delete timestamp for GDPR compliance (Right to Erasure). NULL = active record.';

COMMIT;
