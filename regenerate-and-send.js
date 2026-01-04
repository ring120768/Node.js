const { createClient } = require('@supabase/supabase-js');
const adobePdfFormFillerService = require('./src/services/adobePdfFormFillerService');
const { sendEmails } = require('./lib/emailService');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function regenerateAndSend() {
  const formId = 'aef065c0-5901-44f5-9c0c-2be70e594a0f';
  const userEmail = 'ian.ring@sky.com';
  const userId = '94d80b2d-e77c-4b90-b3ad-544a20a13571';

  console.log('📥 Loading form data...');
  const { data: form, error } = await supabase
    .from('completed_incident_forms')
    .select('form_data')
    .eq('id', formId)
    .single();

  if (error) throw new Error(error.message);

  console.log('🔄 Regenerating PDF with AI pages (using local Puppeteer)...');
  const { pdfBuffer, aiPagesRendered } = await adobePdfFormFillerService.fillPdfForm(form.form_data);

  console.log('');
  console.log('✅ PDF Generated:');
  console.log('   Size:', (pdfBuffer.length / 1024).toFixed(1), 'KB');
  console.log('   AI Pages Rendered:', aiPagesRendered);

  if (!aiPagesRendered) {
    console.error('❌ AI pages did NOT render - aborting send');
    return;
  }

  // Update storage with new PDF
  const storagePath = 'completed_forms/' + userId + '/report_regenerated_' + Date.now() + '.pdf';
  console.log('');
  console.log('📤 Uploading to Supabase storage...');
  const { error: uploadError } = await supabase.storage
    .from('generated_reports')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });

  if (uploadError) throw new Error('Upload failed: ' + uploadError.message);
  console.log('✅ Uploaded to:', storagePath);

  // Send email
  console.log('');
  console.log('📧 Sending email with AI-rendered PDF...');
  const result = await sendEmails(userEmail, pdfBuffer, 'Ian_Ring');

  console.log('');
  console.log('========== EMAIL RESULT ==========');
  console.log(JSON.stringify(result, null, 2));
  console.log('==================================');

  // Update database
  if (result.success) {
    await supabase
      .from('completed_incident_forms')
      .update({
        pdf_storage_path: storagePath,
        sent_to_user: true,
        email_status: { success: true, sent_at: new Date().toISOString(), method: 'regenerated-with-ai-pages' },
        email_attempts: 1
      })
      .eq('id', formId);
    console.log('✅ Database updated');
  }
}

regenerateAndSend().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
