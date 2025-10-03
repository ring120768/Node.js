
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

/**
 * CRITICAL: Test Data Cleanup Script
 * Removes ALL temporary, test, and dummy data from production database
 */

async function cleanupAllTestData() {
    console.log('🔧 CRITICAL: Starting comprehensive test data cleanup...');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ Database credentials not found');
        return false;
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const tablesToClean = [
        'user_signup',
        'incident_reports', 
        'ai_transcription',
        'ai_summary',
        'transcription_queue',
        'gdpr_audit_log',
        'incident_evidence',
        'dash_cam_footage'
    ];

    let totalCleaned = 0;

    for (const table of tablesToClean) {
        console.log(`🔍 Cleaning ${table}...`);
        
        // Remove records with temporary/test user IDs
        const tempPatterns = [
            'temp_%', 'test_%', 'dummy_%', 'user_%', 'dev_%', 
            'mock_%', 'generated_%', 'placeholder_%', 'default_%',
            'sample_%', 'demo_%', 'fake_%', 'auto_%', 'system_%'
        ];

        for (const pattern of tempPatterns) {
            try {
                const { error, count } = await supabase
                    .from(table)
                    .delete()
                    .like('create_user_id', pattern);

                if (!error && count > 0) {
                    console.log(`  ✅ Removed ${count} records matching ${pattern}`);
                    totalCleaned += count;
                } else if (error) {
                    console.warn(`  ⚠️ Error cleaning ${table} with pattern ${pattern}:`, error.message);
                }
            } catch (error) {
                console.warn(`  ⚠️ Could not clean ${table}:`, error.message);
            }
        }

        // Also remove NULL user IDs
        try {
            const { error, count } = await supabase
                .from(table)
                .delete()
                .is('create_user_id', null);

            if (!error && count > 0) {
                console.log(`  ✅ Removed ${count} records with NULL user_id`);
                totalCleaned += count;
            }
        } catch (error) {
            console.warn(`  ⚠️ Could not clean NULL IDs from ${table}`);
        }
    }

    console.log(`🎯 CLEANUP COMPLETE: Removed ${totalCleaned} test/temporary records`);
    
    // Verify no temporary IDs remain
    console.log('🔍 Verifying cleanup...');
    
    for (const table of tablesToClean) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select('create_user_id')
                .like('create_user_id', 'temp_%')
                .limit(5);

            if (!error && data && data.length > 0) {
                console.warn(`⚠️ WARNING: ${table} still contains ${data.length} temp IDs`);
                data.forEach(record => console.warn(`  - ${record.create_user_id}`));
            } else if (!error) {
                console.log(`✅ ${table} is clean`);
            }
        } catch (error) {
            console.warn(`⚠️ Could not verify ${table}:`, error.message);
        }
    }

    return totalCleaned > 0;
}

// Run cleanup if called directly
if (require.main === module) {
    cleanupAllTestData()
        .then(result => {
            if (result) {
                console.log('✅ Cleanup completed successfully');
                process.exit(0);
            } else {
                console.log('ℹ️ No cleanup needed');
                process.exit(0);
            }
        })
        .catch(error => {
            console.error('❌ Cleanup failed:', error);
            process.exit(1);
        });
}

module.exports = { cleanupAllTestData };
