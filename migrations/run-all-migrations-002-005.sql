-- ═════════════════════════════════════════════════════════════════════════
-- Combined Migrations 002-005 for Car Crash Lawyer AI
-- Date: 2025-11-03
-- Purpose: Apply all Page 3/4a field alignment migrations in one go
-- ═════════════════════════════════════════════════════════════════════════

-- IMPORTANT: This script is safe to run multiple times (idempotent)
-- It checks for existing columns before making changes

BEGIN;

-- ═════════════════════════════════════════════════════════════════════════
-- Migration 002: Rename Visibility Column
-- ═════════════════════════════════════════════════════════════════════════
-- Rename: visibility_severely_restricted → visibility_street_lights
-- Impact: No data loss, column rename only

DO $$
BEGIN
    RAISE NOTICE '▶ Starting Migration 002: Rename visibility column';

    -- If old column exists, rename it
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'visibility_severely_restricted'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'visibility_street_lights'
    ) THEN
        ALTER TABLE incident_reports
        RENAME COLUMN visibility_severely_restricted TO visibility_street_lights;
        RAISE NOTICE '✅ Renamed visibility_severely_restricted → visibility_street_lights';

    ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'visibility_street_lights'
    ) THEN
        RAISE NOTICE '⏭️  Column visibility_street_lights already exists, skipping rename';

    ELSE
        RAISE NOTICE '➕ Creating new column visibility_street_lights';
        ALTER TABLE incident_reports
        ADD COLUMN IF NOT EXISTS visibility_street_lights BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN incident_reports.visibility_street_lights IS
'Whether street lights were present/on at accident scene (Page Three visibility section)';

RAISE NOTICE '✅ Migration 002 complete';

-- ═════════════════════════════════════════════════════════════════════════
-- Migration 003: Add Your Speed Column
-- ═════════════════════════════════════════════════════════════════════════
-- Add: your_speed TEXT (user estimated speed in MPH)
-- Impact: No data loss, new column only

DO $$
BEGIN
    RAISE NOTICE '▶ Starting Migration 003: Add your_speed column';
END $$;

ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS your_speed TEXT;

COMMENT ON COLUMN incident_reports.your_speed IS
'User estimated speed in MPH at time of accident (Page Three, text input)';

CREATE INDEX IF NOT EXISTS idx_incident_reports_your_speed
ON incident_reports(your_speed)
WHERE your_speed IS NOT NULL AND deleted_at IS NULL;

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 003 complete: your_speed column added';
END $$;

-- ═════════════════════════════════════════════════════════════════════════
-- Migration 004: Rename Road Type Column
-- ═════════════════════════════════════════════════════════════════════════
-- Rename: road_type_other → road_type_private_road
-- Impact: No data loss, column rename only

DO $$
BEGIN
    RAISE NOTICE '▶ Starting Migration 004: Rename road type column';

    -- If old column exists, rename it
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'road_type_other'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'road_type_private_road'
    ) THEN
        ALTER TABLE incident_reports
        RENAME COLUMN road_type_other TO road_type_private_road;
        RAISE NOTICE '✅ Renamed road_type_other → road_type_private_road';

    ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'road_type_private_road'
    ) THEN
        RAISE NOTICE '⏭️  Column road_type_private_road already exists, skipping rename';

    ELSE
        RAISE NOTICE '➕ Creating new column road_type_private_road';
        ALTER TABLE incident_reports
        ADD COLUMN IF NOT EXISTS road_type_private_road BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN incident_reports.road_type_private_road IS
'Whether accident occurred on private road (important for UK liability - Page Three road type section)';

RAISE NOTICE '✅ Migration 004 complete';

-- ═════════════════════════════════════════════════════════════════════════
-- Migration 005: Add User Documents Columns (IMAGE STORAGE!)
-- ═════════════════════════════════════════════════════════════════════════
-- Add: incident_report_id UUID (foreign key to incident_reports)
-- Add: download_url TEXT (permanent API URL)
-- Impact: No data loss, new columns only

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
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═════════════════════════════════════════════════════════════';
    RAISE NOTICE 'VERIFICATION: Checking all migrations...';
    RAISE NOTICE '═════════════════════════════════════════════════════════════';

    -- Count how many of our 5 new columns exist
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name IN ('incident_reports', 'user_documents')
    AND column_name IN (
        'visibility_street_lights',
        'your_speed',
        'road_type_private_road',
        'incident_report_id',
        'download_url'
    );

    IF col_count = 5 THEN
        RAISE NOTICE '✅ SUCCESS: All 5 columns created/renamed successfully!';
        RAISE NOTICE '';
        RAISE NOTICE 'incident_reports:';
        RAISE NOTICE '  ✅ visibility_street_lights';
        RAISE NOTICE '  ✅ your_speed';
        RAISE NOTICE '  ✅ road_type_private_road';
        RAISE NOTICE '';
        RAISE NOTICE 'user_documents:';
        RAISE NOTICE '  ✅ incident_report_id';
        RAISE NOTICE '  ✅ download_url';
        RAISE NOTICE '';
        RAISE NOTICE '🎉 All migrations applied successfully!';
    ELSE
        RAISE EXCEPTION '❌ FAILED: Expected 5 columns, found %', col_count;
    END IF;

    RAISE NOTICE '═════════════════════════════════════════════════════════════';
END $$;

COMMIT;

-- Done!
SELECT '🎉 All migrations 002-005 completed successfully!' as result;
