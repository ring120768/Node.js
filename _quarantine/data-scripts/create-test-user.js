#!/usr/bin/env node

/**
 * Create Test User
 * Creates a test user for dashboard upload testing
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createTestUser() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          CREATE TEST USER                                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const testEmail = 'ringo1967@gmail.com';
  const testPassword = 'Skysports1!';

  try {
    console.log(`📧 Creating auth user: ${testEmail}\n`);

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: 'Test User',
        surname: 'Dashboard',
        created_for: 'testing_dashboard_upload'
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError.message);
      return;
    }

    console.log('✅ Auth user created successfully!');
    console.log(`   User ID: ${authData.user.id}\n`);

    // Create user_signup record
    console.log('📝 Creating user_signup record...\n');

    const { data: signupData, error: signupError } = await supabase
      .from('user_signup')
      .insert({
        create_user_id: authData.user.id,
        auth_user_id: authData.user.id,
        email: testEmail,
        name: 'Test User',
        surname: 'Dashboard',
        mobile: '+447700900000',
        postcode: 'SW1A 1AA',
        street_address: '123 Test Street',
        town: 'London',
        country: 'United Kingdom',
        vehicle_make: 'Ford',
        vehicle_model: 'Focus',
        vehicle_colour: 'Blue',
        car_registration_number: 'TEST123',
        insurance_company: 'Test Insurance Co',
        policy_number: 'POL123456',
        gdpr_consent: true,
        images_status: 'complete',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (signupError) {
      console.error('❌ Error creating user_signup record:', signupError.message);
      // Clean up auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return;
    }

    console.log('✅ User signup record created successfully!\n');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('🎉 Test user created successfully!\n');
    console.log('   Email: ' + testEmail);
    console.log('   Password: ' + testPassword);
    console.log('   User ID: ' + authData.user.id + '\n');
    console.log('You can now use these credentials in test-dashboard-upload.js\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestUser().catch(console.error);
