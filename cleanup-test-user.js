
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// REMOVED: No hardcoded test user IDs allowed
// Test user IDs must come from environment variables or command line arguments

async function cleanupTestUser() {
    console.log(`🧹 Cleaning up test user: ${testUserId}`);
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ Missing Supabase credentials');
        return;
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // 1. Remove from transcription_queue
        const { data: queueData, error: queueError } = await supabase
            .from('transcription_queue')
            .delete()
            .eq('create_user_id', testUserId);
        
        if (queueError) {
            console.error('❌ Error removing from transcription_queue:', queueError.message);
        } else {
            console.log('✅ Removed from transcription_queue');
        }

        // 2. Remove from ai_transcription
        const { data: transcriptionData, error: transcriptionError } = await supabase
            .from('ai_transcription')
            .delete()
            .eq('create_user_id', testUserId);
        
        if (transcriptionError) {
            console.error('❌ Error removing from ai_transcription:', transcriptionError.message);
        } else {
            console.log('✅ Removed from ai_transcription');
        }

        // 3. Remove from ai_summary
        const { data: summaryData, error: summaryError } = await supabase
            .from('ai_summary')
            .delete()
            .eq('create_user_id', testUserId);
        
        if (summaryError) {
            console.error('❌ Error removing from ai_summary:', summaryError.message);
        } else {
            console.log('✅ Removed from ai_summary');
        }

        // 4. Remove from incident_reports
        const { data: incidentData, error: incidentError } = await supabase
            .from('incident_reports')
            .delete()
            .eq('create_user_id', testUserId);
        
        if (incidentError) {
            console.error('❌ Error removing from incident_reports:', incidentError.message);
        } else {
            console.log('✅ Removed from incident_reports');
        }

        // 5. Remove from user_signup
        const { data: signupData, error: signupError } = await supabase
            .from('user_signup')
            .delete()
            .eq('create_user_id', testUserId);
        
        if (signupError) {
            console.error('❌ Error removing from user_signup:', signupError.message);
        } else {
            console.log('✅ Removed from user_signup');
        }

        // 6. Remove from GDPR audit logs
        const { data: auditData, error: auditError } = await supabase
            .from('gdpr_audit_log')
            .delete()
            .eq('create_user_id', testUserId);
        
        if (auditError) {
            console.error('❌ Error removing from gdpr_audit_log:', auditError.message);
        } else {
            console.log('✅ Removed from gdpr_audit_log');
        }

        // 7. Remove audio files from storage
        try {
            const { data: files, error: listError } = await supabase.storage
                .from('incident-audio')
                .list(`${testUserId}/`);

            if (!listError && files && files.length > 0) {
                console.log(`📁 Found ${files.length} audio files to delete`);
                
                for (const file of files) {
                    const filePath = `${testUserId}/${file.name}`;
                    const { error: deleteError } = await supabase.storage
                        .from('incident-audio')
                        .remove([filePath]);
                    
                    if (deleteError) {
                        console.error(`❌ Error deleting ${filePath}:`, deleteError.message);
                    } else {
                        console.log(`✅ Deleted audio file: ${filePath}`);
                    }
                }
            } else {
                console.log('📁 No audio files found to delete');
            }
        } catch (storageError) {
            console.error('❌ Storage cleanup error:', storageError.message);
        }

        console.log('🎉 Test user cleanup completed!');

    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
    }
}

// Run cleanup if called directly
if (require.main === module) {
    cleanupTestUser();
}

module.exports = { cleanupTestUser, testUserId };
