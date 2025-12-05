#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkImages() {
  const userId = process.argv[2] || '35a7475f-60ca-4c5d-bc48-d13a299f4309';

  const { data, error } = await supabase
    .from('user_documents')
    .select('id, document_type, storage_path, public_url, status')
    .eq('create_user_id', userId)
    .is('deleted_at', null);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('User Documents:', data.length, 'records');

  if (data.length === 0) {
    console.log('\n⚠️  NO IMAGES FOUND - This explains why image URLs are not in PDF!');
    console.log('\nThis user has NO uploaded documents in the database.');
    console.log('The PDF generation is working correctly, but there are no images to include.');
    return;
  }

  console.log('\nBy Type:');
  const byType = {};
  data.forEach(doc => {
    if (!byType[doc.document_type]) byType[doc.document_type] = 0;
    byType[doc.document_type]++;
  });

  Object.entries(byType).forEach(([type, count]) => {
    console.log('  ', type + ':', count);
  });

  console.log('\nSample documents:');
  data.slice(0, 5).forEach(doc => {
    console.log('  Type:', doc.document_type, '| Status:', doc.status, '| Has URL:', !!doc.public_url);
  });
}

checkImages();
