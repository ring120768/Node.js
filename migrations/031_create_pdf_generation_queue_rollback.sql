-- Rollback Migration 031: Drop PDF Generation Queue Table
-- Date: 2025-12-18

BEGIN;

DROP TRIGGER IF EXISTS pdf_queue_updated_at ON public.pdf_generation_queue;
DROP FUNCTION IF EXISTS update_pdf_queue_updated_at();
DROP TABLE IF EXISTS public.pdf_generation_queue;
DROP TYPE IF EXISTS pdf_job_status;

COMMIT;
