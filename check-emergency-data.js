/**
 * Check Emergency Contact Data in Database
 * Queries Supabase directly to see what emergency contact data exists
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmergencyData() {
  try {
    console.log('\n🔍 Checking Emergency Contact Data in Database');
    console.log('================================================\n');

    // Get all users with their emergency contact fields
    const { data: users, error } = await supabase
      .from('user_signup')
      .select('create_user_id, email, name, surname, emergency_contact, recovery_breakdown_number')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Database Error:', error.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    console.log(`✅ Found ${users.length} users (showing most recent 10)\n`);

    users.forEach((user, index) => {
      console.log(`\n👤 User ${index + 1}:`);
      console.log(`   ID: ${user.create_user_id}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Name: ${user.name} ${user.surname}`);
      console.log(`   Emergency Contact: ${user.emergency_contact || '❌ NOT SET'}`);
      console.log(`   Recovery Number: ${user.recovery_breakdown_number || '❌ NOT SET'}`);

      // Check if this user has usable emergency contacts
      const hasEmergency = !!user.emergency_contact;
      const hasRecovery = !!user.recovery_breakdown_number;

      if (hasEmergency || hasRecovery) {
        console.log(`   ✅ Status: Has some emergency contact data`);
      } else {
        console.log(`   ⚠️  Status: No emergency contact data - buttons will show "not available"`);
      }
    });

    // Summary
    const usersWithEmergency = users.filter(u => u.emergency_contact).length;
    const usersWithRecovery = users.filter(u => u.recovery_breakdown_number).length;

    console.log('\n\n📊 Summary:');
    console.log(`   Total users checked: ${users.length}`);
    console.log(`   Users with emergency contact: ${usersWithEmergency}/${users.length}`);
    console.log(`   Users with recovery number: ${usersWithRecovery}/${users.length}`);

    if (usersWithEmergency === 0 && usersWithRecovery === 0) {
      console.log('\n❌ ISSUE CONFIRMED: No users have emergency contact data');
      console.log('   This is why the buttons show "no number available"');
      console.log('\n💡 To fix: Add emergency contact data via Typeform or direct database update');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

checkEmergencyData();
