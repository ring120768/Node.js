
/**
 * RLS Policy Acceptance Tests
 * Tests that RLS policies correctly prevent cross-user access
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

async function testRLSPolicies() {
  console.log('🔒 Testing RLS Policies - Owner-Only Access');
  
  // Create two different user sessions
  const user1Client = createClient(supabaseUrl, supabaseAnonKey);
  const user2Client = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // Test 1: Create test users (this would normally be done through your auth flow)
    console.log('\n1️⃣ Testing user isolation...');
    
    // Sign up user 1
    const { data: user1Data, error: user1Error } = await user1Client.auth.signUp({
      email: `test1-${Date.now()}@example.com`,
      password: 'testpass123'
    });
    
    if (user1Error) throw user1Error;
    console.log('✅ User 1 created:', user1Data.user.id);
    
    // Sign up user 2
    const { data: user2Data, error: user2Error } = await user2Client.auth.signUp({
      email: `test2-${Date.now()}@example.com`,
      password: 'testpass123'
    });
    
    if (user2Error) throw user2Error;
    console.log('✅ User 2 created:', user2Data.user.id);
    
    // Test 2: User 1 creates a record
    console.log('\n2️⃣ User 1 creating record...');
    const testRecord = {
      auth_user_id: user1Data.user.id,
      uid: user1Data.user.id,
      create_user_id: user1Data.user.id,
      email: user1Data.user.email,
      first_name: 'Test',
      last_name: 'User1',
      typeform_completed: false,
      created_at: new Date().toISOString()
    };
    
    const { data: insertedRecord, error: insertError } = await user1Client
      .from('user_signup')
      .insert(testRecord)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError);
      return;
    }
    console.log('✅ User 1 record created:', insertedRecord.id);
    
    // Test 3: User 1 can read their own record
    console.log('\n3️⃣ User 1 reading own record...');
    const { data: ownRecord, error: ownReadError } = await user1Client
      .from('user_signup')
      .select('*')
      .eq('id', insertedRecord.id)
      .single();
    
    if (ownReadError) {
      console.error('❌ User 1 cannot read own record:', ownReadError);
      return;
    }
    console.log('✅ User 1 can read own record');
    
    // Test 4: User 2 CANNOT read User 1's record (THIS SHOULD FAIL)
    console.log('\n4️⃣ User 2 attempting to read User 1\'s record...');
    const { data: otherRecord, error: otherReadError } = await user2Client
      .from('user_signup')
      .select('*')
      .eq('id', insertedRecord.id)
      .single();
    
    if (otherRecord || !otherReadError) {
      console.error('❌ RLS POLICY FAILED: User 2 can read User 1\'s record!');
      return;
    }
    console.log('✅ RLS Policy working: User 2 cannot read User 1\'s record');
    
    // Test 5: User 2 cannot insert with User 1's auth_user_id (THIS SHOULD FAIL)
    console.log('\n5️⃣ User 2 attempting to insert with User 1\'s ID...');
    const maliciousRecord = {
      auth_user_id: user1Data.user.id, // Wrong! Should be user2Data.user.id
      uid: user2Data.user.id,
      create_user_id: user2Data.user.id,
      email: user2Data.user.email,
      first_name: 'Malicious',
      last_name: 'User2'
    };
    
    const { data: maliciousInsert, error: maliciousError } = await user2Client
      .from('user_signup')
      .insert(maliciousRecord);
    
    if (maliciousInsert || !maliciousError) {
      console.error('❌ RLS POLICY FAILED: User 2 can insert with User 1\'s ID!');
      return;
    }
    console.log('✅ RLS Policy working: User 2 cannot insert with User 1\'s auth_user_id');
    
    // Test 6: User 2 CAN insert with their own auth_user_id
    console.log('\n6️⃣ User 2 inserting with correct auth_user_id...');
    const validRecord = {
      auth_user_id: user2Data.user.id, // Correct!
      uid: user2Data.user.id,
      create_user_id: user2Data.user.id,
      email: user2Data.user.email,
      first_name: 'Valid',
      last_name: 'User2',
      created_at: new Date().toISOString()
    };
    
    const { data: validInsert, error: validError } = await user2Client
      .from('user_signup')
      .insert(validRecord)
      .select()
      .single();
    
    if (validError) {
      console.error('❌ User 2 cannot insert with own auth_user_id:', validError);
      return;
    }
    console.log('✅ User 2 can insert with own auth_user_id');
    
    console.log('\n🎉 ALL RLS POLICY TESTS PASSED!');
    console.log('✅ Users can only access their own records');
    console.log('✅ Cross-user access is properly blocked');
    
  } catch (error) {
    console.error('💥 Test error:', error);
  } finally {
    // Clean up
    await user1Client.auth.signOut();
    await user2Client.auth.signOut();
  }
}

testRLSPolicies().catch(console.error);
