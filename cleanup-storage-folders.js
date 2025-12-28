/**
 * Cleanup folder markers from storage buckets
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupFolderMarkers() {
  console.log('🧹 Removing folder markers from storage buckets...\n');

  const buckets = ['user-documents', 'ai-analysis', 'gdpr-exports', 'temp-uploads'];

  for (const bucket of buckets) {
    const { data: files, error: listError } = await supabase
      .storage
      .from(bucket)
      .list('', { limit: 1000 });

    if (listError) {
      console.log(`⚠️  Could not access ${bucket}: ${listError.message}`);
      continue;
    }

    if (files && files.length > 0) {
      const fileNames = files.map(f => f.name);
      console.log(`🗑️  Deleting ${fileNames.length} file(s) from ${bucket}...`);

      const { error: deleteError } = await supabase
        .storage
        .from(bucket)
        .remove(fileNames);

      if (deleteError) {
        console.log(`❌ Error deleting from ${bucket}: ${deleteError.message}`);
      } else {
        console.log(`✅ Deleted ${fileNames.length} file(s) from ${bucket}`);
      }
    } else {
      console.log(`✅ ${bucket}: already empty`);
    }
  }

  console.log('\n✅ Cleanup complete!');
}

cleanupFolderMarkers().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
