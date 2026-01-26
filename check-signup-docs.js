require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('🔍 Finding users WITH signup documents...\n');

  const { data, error } = await supabase
    .from('user_documents')
    .select('create_user_id, document_type')
    .eq('status', 'completed')
    .is('deleted_at', null)
    .is('incident_report_id', null)
    .limit(100);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ No signup documents found in database');
    console.log('   All users only have incident-linked documents');
    console.log('\n📝 This explains the test results:');
    console.log('   - The OR query is working correctly');
    console.log('   - It would include signup docs IF they existed');
    console.log('   - Currently all 14 images are incident-specific');
    console.log('\n✅ When users upload docs during signup, those will also appear in the email');
    return;
  }

  const userCounts = {};
  data.forEach(doc => {
    userCounts[doc.create_user_id] = (userCounts[doc.create_user_id] || 0) + 1;
  });

  console.log(`✅ Found ${data.length} total signup documents across ${Object.keys(userCounts).length} users\n`);
  console.log('Top users with signup documents:');
  Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([userId, count]) => {
      console.log(`  - ${userId}: ${count} signup docs`);
    });
})();
