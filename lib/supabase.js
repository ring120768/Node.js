const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create completed forms table if it doesn't exist
async function ensureCompletedFormsTable() {
  // This SQL should be run in Supabase dashboard
  const tableSchema = `
    CREATE TABLE IF NOT EXISTS completed_incident_forms (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      create_user_id TEXT NOT NULL,
      form_data JSONB NOT NULL,
      pdf_base64 TEXT,
      pdf_url TEXT,
      generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      sent_to_user BOOLEAN DEFAULT FALSE,
      sent_to_accounts BOOLEAN DEFAULT FALSE,
      sent_at TIMESTAMP WITH TIME ZONE,
      email_status JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_completed_forms_user 
    ON completed_incident_forms(create_user_id);

    CREATE INDEX IF NOT EXISTS idx_completed_forms_generated 
    ON completed_incident_forms(generated_at);
  `;

  console.log('📋 Table schema ready for Supabase SQL editor');
  return tableSchema;
}

async function storeCompletedForm(create_user_id, pdfBuffer, formData) {
  try {
    // Convert PDF to base64
    const pdfBase64 = pdfBuffer.toString('base64');

    // Store PDF in storage bucket
    const fileName = `completed-forms/${create_user_id}/report-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('incident-reports-pdf')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    let pdfUrl = null;
    if (!uploadError && uploadData) {
      const { data: urlData } = supabase.storage
        .from('incident-reports-pdf')
        .getPublicUrl(fileName);
      pdfUrl = urlData.publicUrl;
    }

    // Store form record
    const { data, error } = await supabase
      .from('completed_incident_forms')
      .insert({
        create_user_id,
        form_data: formData,
        pdf_base64: pdfBase64.substring(0, 50000), // Store first 50k chars as sample
        pdf_url: pdfUrl,
        generated_at: new Date().toISOString(),
        sent_to_user: false,
        sent_to_accounts: false
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Form stored with ID: ${data.id}`);
    return data;

  } catch (error) {
    console.error('Error storing form:', error);
    throw error;
  }
}

module.exports = {
  supabase,
  ensureCompletedFormsTable,
  storeCompletedForm
};