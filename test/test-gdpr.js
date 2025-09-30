// test-gdpr.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testGDPR() {
    console.log('Testing GDPR functions...');

    // Test consent update in user_signup table
    const testUserId = 'test_user_' + Date.now();
    
    const { data, error } = await supabase
        .from('user_signup')
        .upsert({
            create_user_id: testUserId,
            gdpr_consent: true,
            gdpr_consent_date: new Date().toISOString()
        }, {
            onConflict: 'create_user_id'
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Error:', error);
    } else {
        console.log('✅ Success:', data);
    }

    // Check consent status from user_signup
    const { data: consent } = await supabase
        .from('user_signup')
        .select('create_user_id, gdpr_consent, gdpr_consent_date')
        .eq('create_user_id', testUserId)
        .limit(5);

    console.log('Current consents:', consent);
}

testGDPR();