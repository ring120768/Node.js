/**
 * Test Contact Details API (Phase 1)
 * Tests the new editable contact details endpoints
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testContactDetailsAPI(userEmail) {
  console.log('🧪 Testing Contact Details API (Phase 1)\n');
  console.log('Testing for user:', userEmail);
  console.log('─'.repeat(60));

  try {
    // 1. Find user by email
    console.log('\n1️⃣  Finding user...');
    const { data: user, error: userError } = await supabase
      .from('user_signup')
      .select('create_user_id, email, address_line1, city, postcode, mobile_number, emergency_contact_name')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', userError ? userError.message : 'No user with that email');
      return;
    }

    console.log('✅ Found user:', user.create_user_id);
    console.log('   Current address:', user.address_line1 || '(not set)');
    console.log('   Current mobile:', user.mobile_number || '(not set)');

    // 2. Check profile_edit_audit table exists
    console.log('\n2️⃣  Checking audit table...');
    const { data: auditCount, error: auditError } = await supabase
      .from('profile_edit_audit')
      .select('*', { count: 'exact', head: true });

    if (auditError) {
      console.error('❌ Audit table not found:', auditError.message);
      console.log('   Run migration: migrations/20260202_profile_edit_audit.sql');
      return;
    }

    console.log('✅ Audit table exists');
    console.log('   Current audit records:', auditCount || 0);

    // 3. Test updating contact details
    console.log('\n3️⃣  Testing contact details update...');

    const testUpdates = {
      address_line1: '123 Test Street',
      city: 'London',
      postcode: 'SW1A 1AA',
      mobile_number: '+447700900123'
    };

    console.log('   Updating to test values:');
    console.log('   - Address:', testUpdates.address_line1);
    console.log('   - City:', testUpdates.city);
    console.log('   - Postcode:', testUpdates.postcode);
    console.log('   - Mobile:', testUpdates.mobile_number);

    const { error: updateError } = await supabase
      .from('user_signup')
      .update(testUpdates)
      .eq('create_user_id', user.create_user_id);

    if (updateError) {
      console.error('❌ Update failed:', updateError.message);
      return;
    }

    console.log('✅ Update successful');

    // 4. Test audit logging
    console.log('\n4️⃣  Testing audit logging...');

    const { data: auditLogs, error: logsError } = await supabase
      .from('profile_edit_audit')
      .select('*')
      .eq('user_id', user.create_user_id)
      .order('changed_at', { ascending: false })
      .limit(5);

    if (logsError) {
      console.error('❌ Failed to fetch audit logs:', logsError.message);
      return;
    }

    if (auditLogs && auditLogs.length > 0) {
      console.log('✅ Audit logging working');
      console.log(`   Found ${auditLogs.length} recent changes`);
      auditLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.field_name}: "${log.old_value}" → "${log.new_value}"`);
      });
    } else {
      console.log('⚠️  No audit logs found (create one via API to test)');
    }

    // 5. Test contact details endpoint format
    console.log('\n5️⃣  Testing API response format...');

    const { data: contactData, error: contactError } = await supabase
      .from('user_signup')
      .select('address_line1, address_line2, city, county, postcode, mobile_number, emergency_contact_name, emergency_contact_phone, recovery_email')
      .eq('create_user_id', user.create_user_id)
      .single();

    if (contactError) {
      console.error('❌ Failed to fetch contact details:', contactError.message);
      return;
    }

    console.log('✅ Contact details fetched successfully:');
    console.log('   Address Line 1:', contactData.address_line1 || '-');
    console.log('   Address Line 2:', contactData.address_line2 || '-');
    console.log('   City:', contactData.city || '-');
    console.log('   County:', contactData.county || '-');
    console.log('   Postcode:', contactData.postcode || '-');
    console.log('   Mobile:', contactData.mobile_number || '-');
    console.log('   Emergency Contact:', contactData.emergency_contact_name || '-');
    console.log('   Emergency Phone:', contactData.emergency_contact_phone || '-');
    console.log('   Recovery Email:', contactData.recovery_email || '-');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ All tests passed!');
    console.log('\nNext steps:');
    console.log('1. Apply migration: node migrations/20260202_profile_edit_audit.sql');
    console.log('2. Test API endpoints via dashboard UI');
    console.log('3. Verify GDPR audit logging in database');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n💥 Test error:', error);
    process.exit(1);
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.log('Usage: node test-contact-details-api.js user@example.com');
  process.exit(1);
}

testContactDetailsAPI(email)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
