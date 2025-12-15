// Test PDF generation and email delivery for recent incident report
const { createClient } = require('@supabase/supabase-js');
const logger = require('./src/utils/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testPdfEmailPipeline() {
  const userId = '35a7475f-60ca-4c5d-bc48-d13a299f4309'; // ian.ring@sky.com

  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 TESTING PDF & EMAIL PIPELINE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Step 1: Check if user exists
    console.log('Step 1: Checking user exists...');
    const { data: userData, error: userError } = await supabase
      .from('user_signup')
      .select('create_user_id, email')
      .eq('create_user_id', userId)
      .limit(1);

    if (userError || !userData || userData.length === 0) {
      console.error('❌ User not found:', userError?.message);
      return;
    }
    console.log('✅ User found:', userData[0].email, '\n');

    // Step 2: Check incident report
    console.log('Step 2: Checking incident report...');
    const { data: incidents, error: incidentError } = await supabase
      .from('incident_reports')
      .select('id, created_at, accident_date')
      .eq('create_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (incidentError || !incidents || incidents.length === 0) {
      console.error('❌ Incident report not found:', incidentError?.message);
      return;
    }
    const incident = incidents[0];
    console.log('✅ Incident report found:', {
      id: incident.id,
      created_at: incident.created_at,
      accident_date: incident.accident_date
    });
    console.log('');

    // Step 3: Check if PDF was generated
    console.log('Step 3: Checking PDF generation records...');

    // Try to query completed_incident_forms directly with PostgreSQL
    const { data: pdfData, error: pdfError } = await supabase.rpc('exec_sql', {
      query: `SELECT id, create_user_id, generated_at, sent_to_user, sent_to_accounts, pdf_url, email_status
              FROM completed_incident_forms
              WHERE create_user_id = '${userId}'
              ORDER BY generated_at DESC
              LIMIT 1;`
    });

    if (pdfError) {
      console.error('❌ Error querying PDF records:', pdfError.message);
      console.log('\nℹ️  This might indicate the table doesn\'t exist or RLS is blocking access\n');
    } else if (!pdfData || pdfData.length === 0) {
      console.log('❌ No PDF generation record found');
      console.log('⚠️  This means PDF was never generated or storage failed\n');
    } else {
      console.log('✅ PDF record found:');
      console.log(JSON.stringify(pdfData[0], null, 2));
      console.log('');
    }

    // Step 4: Trigger PDF generation manually
    console.log('Step 4: Triggering PDF generation now...');
    console.log('ℹ️  This will generate a new PDF and attempt email delivery\n');

    const pdfController = require('./src/controllers/pdf.controller');
    const result = await pdfController.generateUserPDF(userId, 'manual-test');

    console.log('\n📊 PDF Generation Result:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ SUCCESS: PDF generated and email sent!');
    } else {
      console.log('\n❌ FAILURE: PDF generation or email failed');
    }

  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    console.error('Stack:', error.stack);
  }

  process.exit(0);
}

testPdfEmailPipeline();
