const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('🔍 Checking all source_id values in user_documents...\n');

  // Get all unique source_id values
  const { data: docs, error } = await supabase
    .from('user_documents')
    .select('source_id, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!docs || docs.length === 0) {
    console.log('⚠️ No user_documents found');
    return;
  }

  // Get unique source_id values
  const sources = {};
  docs.forEach(doc => {
    const source = doc.source_id || 'null';
    if (!sources[source]) {
      sources[source] = 0;
    }
    sources[source]++;
  });

  console.log('📊 user_documents source_id breakdown:');
  for (const [source, count] of Object.entries(sources)) {
    console.log(`  ${source}: ${count} records`);
  }

  // Get sample records
  console.log('\n\n📄 Sample of recent user_documents records:');
  const { data: recentDocs } = await supabase
    .from('user_documents')
    .select('id, create_user_id, document_type, source_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentDocs) {
    recentDocs.forEach(doc => {
      console.log(`  ${doc.created_at.substring(0, 10)} | source_id: ${doc.source_id || 'null'} | type: ${doc.document_type}`);
    });
  }

  console.log('\n✅ Check complete');
})();
