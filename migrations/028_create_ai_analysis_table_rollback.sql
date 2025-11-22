-- Rollback Migration 028: Drop AI Analysis Table
-- Purpose: Undo creation of ai_analysis table if needed
-- Date: 2025-11-20
-- Author: Document Automation Engineer

BEGIN;

-- Drop RLS policies
DROP POLICY IF EXISTS ai_analysis_user_policy ON ai_analysis;

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_update_ai_analysis_timestamp ON ai_analysis;
DROP FUNCTION IF EXISTS update_ai_analysis_timestamp();

-- Drop indexes
DROP INDEX IF EXISTS idx_ai_analysis_user_id;

-- Drop table
DROP TABLE IF EXISTS ai_analysis;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE 'Rollback 028 complete: Dropped ai_analysis table';
END $$;

COMMIT;
