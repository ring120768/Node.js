/**
 * User Signup Data Inspector
 * Shows exactly what's stored in user_signup table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = 'e6708c56-f9bb-46f1-94d5-d5bea8db1d71';

async function inspectUserSignupData() {
  console.log('🔍 User Signup Data Inspector\n');
  console.log(`User ID: ${userId}\n`);

  // Fetch ALL columns from user_signup
  const { data, error } = await supabase
    .from('user_signup')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (error) {
    console.error('❌ Error fetching user_signup:', error.message);
    process.exit(1);
  }

  if (!data) {
    console.error('❌ No user_signup record found');
    process.exit(1);
  }

  console.log('✅ User Signup Record Found\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Group fields by category
  const categories = {
    'Personal Information': [
      'first_name', 'last_name', 'dob', 'email', 'phone',
      'street_address', 'city', 'post_code', 'license_number'
    ],
    'Vehicle Information': [
      'vehicle_make', 'vehicle_model', 'vehicle_colour', 'vehicle_condition',
      'recovery_company', 'recovery_breakdown_number', 'recovery_breakdown_email'
    ],
    'Emergency Contact': [
      'emergency_contact_name', 'emergency_contact_phone'
    ],
    'Insurance': [
      'insurance_company', 'policy_number', 'policy_holder', 'cover_type'
    ],
    'Metadata': [
      'create_user_id', 'created_at', 'updated_at', 'gdpr_consent'
    ]
  };

  // Display each category
  Object.entries(categories).forEach(([category, fields]) => {
    console.log(`📋 ${category}\n`);

    fields.forEach(field => {
      const value = data[field];
      const displayValue = value === null ? 'NULL' : `"${value}"`;
      const status = value === null ? '⚠️ ' : '✅';

      console.log(`${status} ${field.padEnd(35)} ${displayValue}`);
    });

    console.log('\n');
  });

  console.log('═══════════════════════════════════════════════════════════════\n');

  // Count NULL fields
  const allFields = Object.values(categories).flat();
  const nullFields = allFields.filter(field => data[field] === null);
  const populatedFields = allFields.filter(field => data[field] !== null);

  console.log(`Total Fields: ${allFields.length}`);
  console.log(`✅ Populated: ${populatedFields.length}`);
  console.log(`⚠️  NULL:      ${nullFields.length}\n`);

  if (nullFields.length > 0) {
    console.log('⚠️  Missing Fields:\n');
    nullFields.forEach(field => {
      console.log(`   - ${field}`);
    });
    console.log('');
  }
}

inspectUserSignupData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
