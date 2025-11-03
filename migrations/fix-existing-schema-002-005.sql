-- ═════════════════════════════════════════════════════════════════════════
-- CORRECTIVE Migrations 002-005 for Car Crash Lawyer AI
-- Date: 2025-11-03
-- Purpose: Fix existing schema issues and add missing columns
-- ═════════════════════════════════════════════════════════════════════════

-- IMPORTANT: This handles your actual database state with existing columns

BEGIN;

-- ═════════════════════════════════════════════════════════════════════════
-- Migration 002: Fix Visibility Column (typo correction)
-- ═════════════════════════════════════════════════════════════════════════
-- Current: visibility_streets_ (typo)
-- Target: visibility_street_lights (correct name)

DO $$
BEGIN
    RAISE NOTICE '▶ Starting Migration 002: Fix visibility column typo';

    -- Check if typo column exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'visibility_streets_'
    ) THEN
        -- Rename the typo column to correct name
        ALTER TABLE incident_reports
        RENAME COLUMN visibility_streets_ TO visibility_street_lights;

        RAISE NOTICE '✅ Fixed typo: visibility_streets_ → visibility_street_lights';

    ELSIF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'visibility_street_lights'
    ) THEN
        -- Neither exists, create new
        RAISE NOTICE '➕ Creating new column visibility_street_lights';
        ALTER TABLE incident_reports
        ADD COLUMN visibility_street_lights BOOLEAN DEFAULT FALSE;
    ELSE
        RAISE NOTICE '⏭️  Column visibility_street_lights already correct';
    END IF;
END $$;

-- Update comment
COMMENT ON COLUMN incident_reports.visibility_street_lights IS
'Whether street lights were present/on at accident scene (Page Three visibility section)';

RAISE NOTICE '✅ Migration 002 complete';

-- ═════════════════════════════════════════════════════════════════════════
-- Migration 003: Add Your Speed Column (SKIP - already exists)
-- ═════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '▶ Checking Migration 003: your_speed column';

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'your_speed'
    ) THEN
        RAISE NOTICE '⏭️  Migration 003 already applied: your_speed exists';
    ELSE
        RAISE NOTICE '➕ Adding your_speed column';
        ALTER TABLE incident_reports
        ADD COLUMN your_speed TEXT;

        COMMENT ON COLUMN incident_reports.your_speed IS
        'User estimated speed in MPH at time of accident (Page Three, text input)';

        CREATE INDEX IF NOT EXISTS idx_incident_reports_your_speed
        ON incident_reports(your_speed)
        WHERE your_speed IS NOT NULL AND deleted_at IS NULL;

        RAISE NOTICE '✅ Migration 003 complete: your_speed added';
    END IF;
END $$;

-- ═════════════════════════════════════════════════════════════════════════
-- Migration 004: Fix Road Type Column (rename for clarity)
-- ═════════════════════════════════════════════════════════════════════════
-- Current: road_type_private (too generic)
-- Target: road_type_private_road (specific for UK legal context)

DO $$
BEGIN
    RAISE NOTICE '▶ Starting Migration 004: Fix road_type_private column';

    -- Check if old column exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'road_type_private'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'road_type_private_road'
    ) THEN
        -- Rename for clarity
        ALTER TABLE incident_reports
        RENAME COLUMN road_type_private TO road_type_private_road;

        RAISE NOTICE '✅ Renamed: road_type_private → road_type_private_road';

    ELSIF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'road_type_private_road'
    ) THEN
        -- Neither exists, create new
        RAISE NOTICE '➕ Creating new column road_type_private_road';
        ALTER TABLE incident_reports
        ADD COLUMN road_type_private_road BOOLEAN DEFAULT FALSE;
    ELSE
        RAISE NOTICE '⏭️  Column road_type_private_road already correct';
    END IF;
END $$;

-- Update comment
COMMENT ON COLUMN incident_reports.road_type_private_road IS
'Whether accident occurred on private road (important for UK liability - Page Three road type section)';

RAISE NOTICE '✅ Migration 004 complete';

-- ═════════════════════════════════════════════════════════════════════════
-- Migration 005: Add User Documents Columns (NEW - for image storage)
-- ═════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '▶ Starting Migration 005: Add user_documents columns';
END $$;

-- Add incident_report_id foreign key
ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS incident_report_id UUID REFERENCES incident_reports(id);

-- Add download_url
ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS download_url TEXT;

-- Add comments
COMMENT ON COLUMN user_documents.incident_report_id IS
'Foreign key to incident_reports table - links documents to specific incident reports (NULL for signup documents)';

COMMENT ON COLUMN user_documents.download_url IS
'Permanent API URL for downloading document (/api/user-documents/{id}/download) - generates fresh signed URLs on demand';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_documents_incident_report
ON user_documents(incident_report_id)
WHERE incident_report_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_documents_user_incident
ON user_documents(create_user_id, incident_report_id)
WHERE incident_report_id IS NOT NULL AND deleted_at IS NULL;

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 005 complete: incident_report_id and download_url columns added';
END $$;

-- ═════════════════════════════════════════════════════════════════════════
-- FINAL VERIFICATION
-- ═════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    col_count INTEGER;
    visibility_ok BOOLEAN;
    speed_ok BOOLEAN;
    road_ok BOOLEAN;
    incident_id_ok BOOLEAN;
    download_ok BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═════════════════════════════════════════════════════════════';
    RAISE NOTICE 'VERIFICATION: Checking all migrations...';
    RAISE NOTICE '═════════════════════════════════════════════════════════════';

    -- Check each column individually
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'incident_reports' AND column_name = 'visibility_street_lights'
    ) INTO visibility_ok;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'incident_reports' AND column_name = 'your_speed'
    ) INTO speed_ok;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'incident_reports' AND column_name = 'road_type_private_road'
    ) INTO road_ok;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_documents' AND column_name = 'incident_report_id'
    ) INTO incident_id_ok;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_documents' AND column_name = 'download_url'
    ) INTO download_ok;

    -- Report individual results
    RAISE NOTICE 'incident_reports:';
    RAISE NOTICE '  % visibility_street_lights', CASE WHEN visibility_ok THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  % your_speed', CASE WHEN speed_ok THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  % road_type_private_road', CASE WHEN road_ok THEN '✅' ELSE '❌' END;
    RAISE NOTICE '';
    RAISE NOTICE 'user_documents:';
    RAISE NOTICE '  % incident_report_id', CASE WHEN incident_id_ok THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  % download_url', CASE WHEN download_ok THEN '✅' ELSE '❌' END;
    RAISE NOTICE '';

    IF visibility_ok AND speed_ok AND road_ok AND incident_id_ok AND download_ok THEN
        RAISE NOTICE '🎉 SUCCESS: All 5 columns verified!';
    ELSE
        RAISE EXCEPTION '❌ FAILED: Some columns missing - check individual results above';
    END IF;

    RAISE NOTICE '═════════════════════════════════════════════════════════════';
END $$;

COMMIT;

-- Done!
SELECT '🎉 Corrective migrations 002-005 completed successfully!' as result;
