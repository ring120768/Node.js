require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
  const userId = '1af483d1-35c3-4202-a50f-4b5a8aa631f7';

  console.log(`Checking for user: ${userId}\n`);

  // Check if user exists
  const { data, error } = await supabase
    .from('user_signup')
    .select('create_user_id, email, name, surname, created_at')
    .eq('create_user_id', userId);

  if (error) {
    console.log('❌ Error:', error.message);
  } else if (!data || data.length === 0) {
    console.log('❌ User not found in database');
    console.log('\n💡 Let me find some actual user IDs...\n');

    // Get some existing users
    const { data: users, error: err2 } = await supabase
      .from('user_signup')
      .select('create_user_id, email, name, surname, created_at')
      .limit(5)
      .order('created_at', { ascending: false });

    if (users && users.length > 0) {
      console.log('✅ Found users in database:');
      users.forEach((u, i) => {
        console.log(`  ${i+1}. UUID: ${u.create_user_id}`);
        console.log(`     Email: ${u.email || 'N/A'}`);
        console.log(`     Name: ${u.name || 'N/A'} ${u.surname || ''}`);
        console.log(`     Created: ${u.created_at}`);
        console.log('');
      });
    }
  } else {
    console.log('✅ User found!');
    console.log(JSON.stringify(data[0], null, 2));
  }
}

checkUser().then(() => process.exit(0)).catch(console.error);
