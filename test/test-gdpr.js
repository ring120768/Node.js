// test-gdpr.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testGDPR() {
    console.log('Testing GDPR functions...');

    // Test consent update via stored procedure
    const { data, error } = await supabase
        .rpc('update_user_consent', {
            p_user_id: 'test_user_' + Date.now(),
            p_consent: true,
            p_ip_address: '127.0.0.1'
        });

    if (error) {
        console.error('❌ Error:', error);
    } else {
        console.log('✅ Success:', data);
    }

    // Check consent status
    const { data: consent } = await supabase
        .from('gdpr_consent')
        .select('*')
        .limit(5);

    console.log('Current consents:', consent);
}

testGDPR();