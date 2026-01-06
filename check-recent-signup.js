/**
 * Check the most recent signup record to diagnose webhook issue
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRecentSignup() {
  console.log('\n🔍 Checking most recent signup record...\n');

  try {
    // Get most recent signup
    const { data: signup, error } = await supabase
      .from('user_signup')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('⚠️  No signup records found in database');
        return;
      }
      throw error;
    }

    console.log('📋 Most Recent Signup:');
    console.log('━'.repeat(60));
    console.log('Email:', signup.email);
    console.log('Name:', signup.name, signup.surname);
    console.log('User ID:', signup.create_user_id);
    console.log('Auth Pending:', signup.auth_pending);
    console.log('Has Pending Password:', !!signup.pending_password);
    console.log('Subscription Status:', signup.subscription_status || 'none');
    console.log('Stripe Customer ID:', signup.stripe_customer_id || 'none');
    console.log('Stripe Subscription ID:', signup.stripe_subscription_id || 'none');
    console.log('Created At:', new Date(signup.created_at).toLocaleString('en-GB'));
    console.log('━'.repeat(60));

    // Diagnosis
    console.log('\n🔍 Diagnosis:');
    
    if (signup.auth_pending === true) {
      console.log('❌ Auth account NOT created yet');
      console.log('   Webhook either:');
      console.log('   1. Has not been received by server');
      console.log('   2. Failed to process (check Railway logs)');
      console.log('   3. Is configured incorrectly in Stripe Dashboard');
      
      if (signup.stripe_customer_id) {
        console.log('\n✅ Stripe customer ID exists - payment was processed');
        console.log('   → Webhook should have been sent');
      } else {
        console.log('\n⚠️  No Stripe customer ID - payment may not have completed');
      }
    } else {
      console.log('✅ Auth account created successfully');
      console.log('   auth_pending =', signup.auth_pending);
    }

    if (signup.pending_password) {
      console.log('\n🔐 Encrypted password still in database');
      console.log('   → Will be used to create auth account when webhook processes');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRecentSignup();
