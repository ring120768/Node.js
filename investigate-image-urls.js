const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('=== IMAGE-RELATED TABLES INVESTIGATION ===\n');

  const userId = 'ee7cfcaf-5810-4c62-b99b-ab0f2291733e';

  // Check user_documents
  console.log('📊 USER_DOCUMENTS TABLE:');
  const { data: docs, error: docsError } = await supabase
    .from('user_documents')
    .select('*')
    .eq('create_user_id', userId);

  if (docs && docs.length > 0) {
    console.log('  Total records:', docs.length);
    console.log('  Sample record:');
    const sample = docs[0];
    console.log('    id:', sample.id);
    console.log('    document_type:', sample.document_type);
    console.log('    file_name:', sample.file_name);
    console.log('    public_url:', sample.public_url ? sample.public_url.substring(0, 80) + '...' : 'NULL');
    console.log('    storage_path:', sample.storage_path);
    console.log('    status:', sample.status);

    // Check how many have URLs
    const withUrls = docs.filter(d => d.public_url).length;
    const withoutUrls = docs.filter(d => !d.public_url).length;
    console.log('  With URLs:', withUrls);
    console.log('  Without URLs:', withoutUrls);

    console.log('\n  Document types present:');
    const types = [...new Set(docs.map(d => d.document_type))];
    types.forEach(type => {
      const count = docs.filter(d => d.document_type === type).length;
      const withUrl = docs.filter(d => d.document_type === type && d.public_url).length;
      console.log('    ' + type + ':', count + ' total, ' + withUrl + ' with URLs');
    });

    console.log('\n  All records detail:');
    docs.forEach((doc, i) => {
      console.log('    [' + (i + 1) + '] ' + doc.document_type + ':');
      console.log('        file_name:', doc.file_name);
      console.log('        storage_path:', doc.storage_path);
      console.log('        public_url:', doc.public_url ? 'YES' : 'NO');
      console.log('        status:', doc.status);
    });
  } else {
    console.log('  No records found');
    if (docsError) console.log('  Error:', docsError.message);
  }

  // Check user_signup for legacy image fields
  console.log('\n📊 USER_SIGNUP TABLE (image fields):');
  const { data: signup } = await supabase
    .from('user_signup')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (signup) {
    const imageFields = Object.keys(signup).filter(key =>
      key.includes('image') || key.includes('photo') || key.includes('picture') || key.includes('what3words')
    );

    console.log('  Image-related fields found:', imageFields.length);
    imageFields.forEach(field => {
      const value = signup[field];
      if (value) {
        const display = typeof value === 'string' ? value.substring(0, 80) + '...' : value;
        console.log('    ' + field + ':', display);
      } else {
        console.log('    ' + field + ': NULL');
      }
    });
  }

  // Check incident_images (legacy)
  console.log('\n📊 INCIDENT_IMAGES TABLE (legacy):');
  const { data: incidentImages } = await supabase
    .from('incident_images')
    .select('*')
    .eq('create_user_id', userId);

  console.log('  Total records:', incidentImages ? incidentImages.length : 0);
  if (incidentImages && incidentImages.length > 0) {
    console.log('  Sample:');
    const sample = incidentImages[0];
    console.log('    image_type:', sample.image_type);
    console.log('    file_url:', sample.file_url ? sample.file_url.substring(0, 80) + '...' : 'NULL');
  }
})();
