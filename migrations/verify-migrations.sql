-- Verification SQL for Migrations 002-005
-- Run this in Supabase SQL Editor to check migration status

-- Check Migration 002: Visibility column
SELECT
    'Migration 002' as migration,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'incident_reports'
            AND column_name = 'visibility_street_lights'
        ) THEN '✅ APPLIED'
        ELSE '❌ NOT APPLIED'
    END as status,
    'visibility_street_lights column' as description;

-- Check Migration 003: Your speed column
SELECT
    'Migration 003' as migration,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'incident_reports'
            AND column_name = 'your_speed'
        ) THEN '✅ APPLIED'
        ELSE '❌ NOT APPLIED'
    END as status,
    'your_speed column' as description;

-- Check Migration 004: Road type column
SELECT
    'Migration 004' as migration,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'incident_reports'
            AND column_name = 'road_type_private_road'
        ) THEN '✅ APPLIED'
        ELSE '❌ NOT APPLIED'
    END as status,
    'road_type_private_road column' as description;

-- Check Migration 005: User documents columns (part 1)
SELECT
    'Migration 005a' as migration,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_documents'
            AND column_name = 'incident_report_id'
        ) THEN '✅ APPLIED'
        ELSE '❌ NOT APPLIED'
    END as status,
    'incident_report_id column' as description;

-- Check Migration 005: User documents columns (part 2)
SELECT
    'Migration 005b' as migration,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_documents'
            AND column_name = 'download_url'
        ) THEN '✅ APPLIED'
        ELSE '❌ NOT APPLIED'
    END as status,
    'download_url column' as description;

-- Summary of all required columns
SELECT
    '═══════════════════════' as divider,
    'SUMMARY' as section;

SELECT
    table_name,
    column_name,
    data_type,
    '✅' as found
FROM information_schema.columns
WHERE table_name IN ('incident_reports', 'user_documents')
AND column_name IN (
    'visibility_street_lights',
    'your_speed',
    'road_type_private_road',
    'incident_report_id',
    'download_url'
)
ORDER BY table_name, column_name;
