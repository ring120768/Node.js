/**
 * Verify actual data in user_signup
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = 'e6708c56-f9bb-46f1-94d5-d5bea8db1d71';

async function verify() {
  const { data, error } = await supabase
    .from('user_signup')
    .select('name, surname, mobile, town, postcode, date_of_birth, emergency_contact, email, street_address')
    .eq('create_user_id', userId)
    .single();

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('📋 Actual data in CORRECT columns:\n');
  console.log('Personal:');
  console.log(`  name:           "${data.name}"`);
  console.log(`  surname:        "${data.surname}"`);
  console.log(`  mobile:         "${data.mobile}"`);
  console.log(`  date_of_birth:  "${data.date_of_birth}"`);
  console.log(`  email:          "${data.email}"`);
  console.log(`\nAddress:`);
  console.log(`  street_address: "${data.street_address}"`);
  console.log(`  town:           "${data.town}"`);
  console.log(`  postcode:       "${data.postcode}"`);
  console.log(`\nEmergency:`);
  console.log(`  emergency_contact: "${data.emergency_contact}"`);
}

verify().catch(console.error);
