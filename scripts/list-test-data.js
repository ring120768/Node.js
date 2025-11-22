/**
 * List Test Data in Supabase
 * Shows all test/development data before deletion
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listTestData() {
  console.log('📊 CURRENT TEST DATA IN SUPABASE\n');
  console.log('='.repeat(60));

  // 1. User Signup Records
  console.log('\n1️⃣  USER_SIGNUP TABLE');
  console.log('-'.repeat(60));
  const { data: signups, count: signupCount } = await supabase
    .from('user_signup')
    .select('create_user_id, email, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  console.log(`Total: ${signupCount} record(s)\n`);
  signups?.forEach((s, i) => {
    console.log(`${i + 1}. ${s.email}`);
    console.log(`   UUID: ${s.create_user_id}`);
    console.log(`   Created: ${new Date(s.created_at).toLocaleString('en-GB')}`);
    console.log('');
  });

  // 2. Incident Reports
  console.log('\n2️⃣  INCIDENT_REPORTS TABLE');
  console.log('-'.repeat(60));
  const { data: incidents, count: incidentCount } = await supabase
    .from('incident_reports')
    .select('id, create_user_id, accident_date, location, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  console.log(`Total: ${incidentCount} record(s)\n`);
  incidents?.forEach((inc, i) => {
    console.log(`${i + 1}. Incident ${inc.id}`);
    console.log(`   User UUID: ${inc.create_user_id}`);
    console.log(`   Accident Date: ${inc.accident_date || 'N/A'}`);
    console.log(`   Location: ${inc.location || 'N/A'}`);
    console.log(`   Created: ${new Date(inc.created_at).toLocaleString('en-GB')}`);
    console.log('');
  });

  // 3. User Documents (Images)
  console.log('\n3️⃣  USER_DOCUMENTS TABLE');
  console.log('-'.repeat(60));
  const { data: docs, count: docCount } = await supabase
    .from('user_documents')
    .select('id, create_user_id, document_type, status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  console.log(`Total: ${docCount} record(s)\n`);
  docs?.forEach((doc, i) => {
    console.log(`${i + 1}. Document ${doc.id}`);
    console.log(`   User UUID: ${doc.create_user_id}`);
    console.log(`   Type: ${doc.document_type}`);
    console.log(`   Status: ${doc.status}`);
    console.log(`   Created: ${new Date(doc.created_at).toLocaleString('en-GB')}`);
    console.log('');
  });

  // 4. Temp Uploads
  console.log('\n4️⃣  TEMP_UPLOADS TABLE');
  console.log('-'.repeat(60));
  const { data: temps, count: tempCount } = await supabase
    .from('temp_uploads')
    .select('id, session_id, field_name, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  console.log(`Total: ${tempCount} record(s)\n`);
  temps?.forEach((temp, i) => {
    console.log(`${i + 1}. Temp ${temp.id}`);
    console.log(`   Session: ${temp.session_id}`);
    console.log(`   Field: ${temp.field_name}`);
    console.log(`   Created: ${new Date(temp.created_at).toLocaleString('en-GB')}`);
    console.log('');
  });

  // 5. Witnesses
  console.log('\n5️⃣  INCIDENT_WITNESSES TABLE');
  console.log('-'.repeat(60));
  const { data: witnesses, count: witnessCount } = await supabase
    .from('incident_witnesses')
    .select('id, create_user_id, witness_name, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  console.log(`Total: ${witnessCount} record(s)\n`);
  witnesses?.forEach((wit, i) => {
    console.log(`${i + 1}. ${wit.witness_name}`);
    console.log(`   User UUID: ${wit.create_user_id}`);
    console.log(`   Created: ${new Date(wit.created_at).toLocaleString('en-GB')}`);
    console.log('');
  });

  // 6. AI Transcriptions
  console.log('\n6️⃣  AI_TRANSCRIPTION TABLE');
  console.log('-'.repeat(60));
  const { data: transcripts, count: transcriptCount } = await supabase
    .from('ai_transcription')
    .select('id, create_user_id, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  console.log(`Total: ${transcriptCount} record(s)\n`);

  // 7. Supabase Auth Users
  console.log('\n7️⃣  SUPABASE AUTH USERS');
  console.log('-'.repeat(60));
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  console.log(`Total: ${users?.length || 0} user(s)\n`);
  users?.forEach((user, i) => {
    console.log(`${i + 1}. ${user.email}`);
    console.log(`   UUID: ${user.id}`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleString('en-GB')}`);
    console.log(`   Last sign in: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('en-GB') : 'Never'}`);
    console.log('');
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`user_signup:          ${signupCount} record(s)`);
  console.log(`incident_reports:     ${incidentCount} record(s)`);
  console.log(`user_documents:       ${docCount} record(s)`);
  console.log(`temp_uploads:         ${tempCount} record(s)`);
  console.log(`incident_witnesses:   ${witnessCount} record(s)`);
  console.log(`ai_transcription:     ${transcriptCount} record(s)`);
  console.log(`auth.users:           ${users?.length || 0} user(s)`);
  console.log('='.repeat(60));
}

listTestData().catch(console.error);
