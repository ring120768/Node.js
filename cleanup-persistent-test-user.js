
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const BLOCKED_USER_ID = 'user_1759410448804_yzas7ml2p';

async function cleanupPersistentTestUser() {
    console.log(`🧹 COMPREHENSIVE CLEANUP for persistent test user: ${BLOCKED_USER_ID}`);
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ Missing Supabase credentials');
        return;
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // 1. Remove from all database tables
        const tablesToClean = [
            'transcription_queue',
            'ai_transcription', 
            'ai_summary',
            'incident_reports',
            'user_signup',
            'gdpr_audit_log',
            'gdpr_consent',
            'incident_images',
            'additional_vehicles',
            'witness_reports',
            'dash_cam_footage',
            'incident_evidence'
        ];

        for (const table of tablesToClean) {
            try {
                const { error, count } = await supabase
                    .from(table)
                    .delete()
                    .or(`create_user_id.eq.${BLOCKED_USER_ID},user_id.eq.${BLOCKED_USER_ID}`);
                
                if (error) {
                    console.warn(`⚠️ Could not clean ${table}:`, error.message);
                } else {
                    console.log(`✅ Cleaned ${table} - removed ${count || 0} records`);
                }
            } catch (tableError) {
                console.warn(`⚠️ Error cleaning ${table}:`, tableError.message);
            }
        }

        // 2. Remove all files from storage buckets
        const bucketsToClean = ['incident-audio', 'incident-images', 'dash-cam-footage'];
        
        for (const bucket of bucketsToClean) {
            try {
                const { data: files, error: listError } = await supabase.storage
                    .from(bucket)
                    .list(`${BLOCKED_USER_ID}/`);

                if (!listError && files && files.length > 0) {
                    console.log(`📁 Found ${files.length} files in ${bucket}/${BLOCKED_USER_ID}/`);
                    
                    const filePaths = files.map(file => `${BLOCKED_USER_ID}/${file.name}`);
                    const { error: deleteError } = await supabase.storage
                        .from(bucket)
                        .remove(filePaths);
                    
                    if (deleteError) {
                        console.error(`❌ Error deleting files from ${bucket}:`, deleteError.message);
                    } else {
                        console.log(`✅ Deleted ${files.length} files from ${bucket}`);
                    }
                } else {
                    console.log(`📁 No files found in ${bucket}/${BLOCKED_USER_ID}/`);
                }
            } catch (storageError) {
                console.warn(`⚠️ Storage cleanup error for ${bucket}:`, storageError.message);
            }
        }

        // 3. Add to permanent blocklist table (create if doesn't exist)
        try {
            const { error: blockError } = await supabase
                .from('blocked_user_ids')
                .upsert({
                    user_id: BLOCKED_USER_ID,
                    reason: 'Persistent test user - auto-generated ID',
                    blocked_at: new Date().toISOString(),
                    blocked_by: 'system'
                });
            
            if (blockError && !blockError.message.includes('relation "blocked_user_ids" does not exist')) {
                console.warn('Could not add to blocklist:', blockError.message);
            } else if (!blockError) {
                console.log('✅ Added to permanent blocklist');
            }
        } catch (blockError) {
            console.warn('Blocklist update failed:', blockError.message);
        }

        console.log('🎉 Comprehensive cleanup completed!');
        console.log(`🚫 User ${BLOCKED_USER_ID} has been completely removed from the system`);

    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
    }
}

// Also clean up any similar pattern user IDs
async function cleanupAllTimestampBasedUsers() {
    console.log('🔍 Searching for other timestamp-based user IDs...');
    
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // Get all user IDs that match the timestamp pattern
        const { data: users, error } = await supabase
            .from('user_signup')
            .select('create_user_id')
            .like('create_user_id', 'user_%');

        if (error) {
            console.warn('Could not search for timestamp users:', error.message);
            return;
        }

        const timestampUsers = users.filter(user => 
            /^user_\d{13}_[a-z0-9]+$/.test(user.create_user_id)
        );

        if (timestampUsers.length > 0) {
            console.log(`⚠️ Found ${timestampUsers.length} timestamp-based user IDs:`);
            timestampUsers.forEach(user => console.log(`  - ${user.create_user_id}`));
            console.log('These should be reviewed and potentially cleaned up');
        } else {
            console.log('✅ No other timestamp-based user IDs found');
        }

    } catch (error) {
        console.warn('Pattern search failed:', error.message);
    }
}

// Run both cleanups
if (require.main === module) {
    cleanupPersistentTestUser().then(() => {
        return cleanupAllTimestampBasedUsers();
    });
}

module.exports = { cleanupPersistentTestUser, BLOCKED_USER_ID };
