/**
 * Create Auth Account for Testing (bypasses Stripe payment)
 *
 * This script manually creates a Supabase Auth account for users
 * who completed signup but didn't finish payment.
 *
 * USE FOR TESTING ONLY - Production uses Stripe webhook
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32);

/**
 * Decrypt the pending_password
 */
function decrypt(encryptedText) {
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = Buffer.from(parts.join(':'), 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  } catch (error) {
    console.error('❌ Decryption error:', error.message);
    throw error;
  }
}

async function createAuthForUser(email) {
  console.log('🔧 Creating Auth Account (Testing Bypass)');
  console.log('═══════════════════════════════════════════════════\n');

  // Find user record
  const { data: user, error: userError } = await supabase
    .from('user_signup')
    .select('create_user_id, email, name, pending_password')
    .eq('email', email)
    .single();

  if (userError || !user) {
    console.error('❌ User not found:', email);
    return;
  }

  console.log('✅ Found user:');
  console.log('   ID:', user.create_user_id);
  console.log('   Email:', user.email);
  console.log('   Name:', user.name);
  console.log('');

  if (!user.pending_password) {
    console.error('❌ No pending_password found - cannot create Auth account');
    return;
  }

  // Check if Auth account already exists
  const { data: authData } = await supabase.auth.admin.listUsers();
  const existingAuth = authData.users.find(u => u.email === email);

  if (existingAuth) {
    console.log('✅ Auth account already exists!');
    console.log('   Auth ID:', existingAuth.id);
    console.log('   User can already log in');
    return;
  }

  // Decrypt password
  console.log('🔓 Decrypting password...');
  const password = decrypt(user.pending_password);

  // Create Auth account
  console.log('🔐 Creating Supabase Auth account...');
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: user.email,
    password: password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      name: user.name || 'User',
      signup_id: user.create_user_id
    }
  });

  if (authError) {
    console.error('❌ Auth creation failed:', authError.message);
    return;
  }

  console.log('✅ Auth account created successfully!');
  console.log('   Auth ID:', authUser.user.id);
  console.log('');

  // Update user_signup record with auth_user_id
  const { error: updateError } = await supabase
    .from('user_signup')
    .update({
      auth_user_id: authUser.user.id,
      pending_password: null // Clear pending password (no longer needed)
    })
    .eq('create_user_id', user.create_user_id);

  if (updateError) {
    console.warn('⚠️  Failed to update user_signup record:', updateError.message);
  } else {
    console.log('✅ Updated user_signup with auth_user_id');
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('🎉 SUCCESS - User can now log in!');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('Login credentials:');
  console.log('  Email:', user.email);
  console.log('  Password: (same as signup)');
  console.log('');
  console.log('Login URL: http://localhost:3000/login.html');
  console.log('');
}

// Get email from command line or use default
const email = process.argv[2] || 'sarahlgilbert70@gmail.com';

createAuthForUser(email)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  });
