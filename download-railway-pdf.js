require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const fs = require('fs');

(async () => {
  // Get the PDF URL from completed forms
  const { data, error } = await supabase
    .from('completed_incident_forms')
    .select('pdf_url, pdf_storage_path')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.log('Error:', error?.message || 'No data');
    return;
  }

  console.log('PDF URL:', data.pdf_url);
  console.log('Storage Path:', data.pdf_storage_path);

  // Try to download from storage
  if (data.pdf_storage_path) {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('generated_reports')
      .download(data.pdf_storage_path);

    if (downloadError) {
      console.log('Download error:', downloadError.message);
    } else {
      const buffer = Buffer.from(await fileData.arrayBuffer());
      fs.writeFileSync('test-output/railway-generated.pdf', buffer);
      console.log('Downloaded PDF to test-output/railway-generated.pdf');
      console.log('Size:', (buffer.length / 1024).toFixed(2), 'KB');
    }
  } else if (data.pdf_url) {
    // Try to fetch from URL
    console.log('No storage path, trying URL...');
    const fetch = require('node-fetch');
    const response = await fetch(data.pdf_url);
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync('test-output/railway-generated.pdf', buffer);
      console.log('Downloaded PDF to test-output/railway-generated.pdf');
      console.log('Size:', (buffer.length / 1024).toFixed(2), 'KB');
    } else {
      console.log('Failed to fetch:', response.status);
    }
  }

  process.exit(0);
})();
