const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('🔍 Checking for Typeform source data...\n');

  // Check user_documents with source_id='Typeform'
  const { data: typeformDocs, error: docsError } = await supabase
    .from('user_documents')
    .select('id, create_user_id, document_type, source_id, created_at, status')
    .eq('source_id', 'Typeform')
    .order('created_at', { ascending: false });

  if (docsError) {
    console.error('❌ Error querying user_documents:', docsError);
    return;
  }

  console.log(`📄 Found ${typeformDocs?.length || 0} user_documents with source='Typeform'\n`);

  if (typeformDocs && typeformDocs.length > 0) {
    // Group by user
    const byUser = {};
    typeformDocs.forEach(doc => {
      if (!byUser[doc.create_user_id]) {
        byUser[doc.create_user_id] = [];
      }
      byUser[doc.create_user_id].push(doc);
    });

    console.log('📊 Breakdown by user:');
    for (const [userId, docs] of Object.entries(byUser)) {
      console.log(`\n  User: ${userId}`);
      console.log(`  Count: ${docs.length} documents`);
      console.log(`  Oldest: ${new Date(docs[docs.length - 1].created_at).toLocaleDateString()}`);
      console.log(`  Newest: ${new Date(docs[0].created_at).toLocaleDateString()}`);
      console.log(`  Types: ${[...new Set(docs.map(d => d.document_type))].join(', ')}`);
    }

    console.log('\n\n📅 Date range:');
    const oldest = typeformDocs[typeformDocs.length - 1];
    const newest = typeformDocs[0];
    console.log(`  Oldest: ${new Date(oldest.created_at).toISOString()}`);
    console.log(`  Newest: ${new Date(newest.created_at).toISOString()}`);
  }

  // Check if any other tables reference Typeform
  console.log('\n\n🔍 Checking other tables for Typeform references...');

  const { data: incidents } = await supabase
    .from('incident_reports')
    .select('id, source_id')
    .eq('source_id', 'Typeform')
    .limit(5);

  if (incidents && incidents.length > 0) {
    console.log(`  ⚠️ incident_reports: ${incidents.length} records with source='Typeform'`);
  } else {
    console.log(`  ✅ incident_reports: No Typeform source data`);
  }

  console.log('\n✅ Check complete');
})();
