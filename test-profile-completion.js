/**
 * Test Profile Completion Feature
 * Run this to check if profile completion section works
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testProfileCompletion(userEmail) {
  console.log('🧪 Testing Profile Completion Feature\n');
  console.log('Searching for user:', userEmail);

  // 1. Find user by email
  const { data: user, error: userError } = await supabase
    .from('user_signup')
    .select('create_user_id, email, name')
    .eq('email', userEmail)
    .single();

  if (userError || !user) {
    console.error('❌ User not found:', userError ? userError.message : 'No user with that email');
    return;
  }

  console.log('✅ Found user:', user.create_user_id);
  console.log('   Name:', user.name);
  console.log('   Email:', user.email);
  console.log('');

  // 2. Check what documents they have
  const { data: documents, error: docsError } = await supabase
    .from('user_documents')
    .select('document_type, storage_path, status')
    .eq('create_user_id', user.create_user_id)
    .is('deleted_at', null);

  if (docsError) {
    console.error('❌ Error fetching documents:', docsError.message);
    return;
  }

  const docCount = documents ? documents.length : 0;
  console.log('📁 User has ' + docCount + ' documents:\n');

  const requiredDocs = [
    'driving_license_picture',
    'vehicle_front_image',
    'vehicle_back_image',
    'vehicle_driver_side_image',
    'vehicle_passenger_side_image'
  ];

  const docStatus = {};
  if (documents) {
    documents.forEach(doc => {
      docStatus[doc.document_type] = doc.storage_path ? '✅' : '❌';
    });
  }

  console.log('Required Documents:');
  requiredDocs.forEach(docType => {
    const status = docStatus[docType] || '❌ Missing';
    const emoji = status === '✅' ? '✅' : '❌';
    console.log('  ' + emoji + ' ' + docType);
  });

  const missingDocs = requiredDocs.filter(doc => !docStatus[doc]);

  console.log('');
  if (missingDocs.length === 0) {
    console.log('✅ Profile is COMPLETE (100%)');
    console.log('   → Dashboard section will be HIDDEN');
  } else {
    const percentage = Math.round((5 - missingDocs.length) / 5 * 100);
    console.log('⚠️  Profile is INCOMPLETE (' + percentage + '%)');
    console.log('   → Dashboard section will SHOW ' + missingDocs.length + ' missing items');
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.log('Usage: node test-profile-completion.js user@example.com');
  process.exit(1);
}

testProfileCompletion(email)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
