-- Rollback Migration: Drop ai_analysis table
-- Created: 2025-11-16
-- Purpose: Rollback for migration 013_create_ai_analysis_table.sql

BEGIN;

-- Drop RLS policies
DROP POLICY IF EXISTS ai_analysis_select_own ON ai_analysis;
DROP POLICY IF EXISTS ai_analysis_insert_own ON ai_analysis;
DROP POLICY IF EXISTS ai_analysis_update_own ON ai_analysis;
DROP POLICY IF EXISTS ai_analysis_delete_own ON ai_analysis;

-- Drop indexes
DROP INDEX IF EXISTS idx_ai_analysis_create_user_id;
DROP INDEX IF EXISTS idx_ai_analysis_incident_id;
DROP INDEX IF EXISTS idx_ai_analysis_created_at;

-- Drop table
DROP TABLE IF EXISTS ai_analysis;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 013 Rollback: ai_analysis table dropped successfully';
END $$;

COMMIT;
