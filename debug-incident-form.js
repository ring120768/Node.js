
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugIncidentForm() {
  console.log('🔍 DEBUGGING INCIDENT REPORTS FROM FORM: WvM2ejru');
  console.log('================================================');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials');
    return;
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Check for incident reports from the specific form
    const { data: incidentReports, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('typeform_form_id', 'WvM2ejru')
      .order('created_at', { ascending: false })
      .limit(10);

    if (incidentError) {
      console.error('❌ Error querying incident reports:', incidentError);
      return;
    }

    console.log(`📊 Found ${incidentReports?.length || 0} incident reports from form WvM2ejru`);

    if (incidentReports && incidentReports.length > 0) {
      console.log('\n✅ RECENT INCIDENT REPORTS FROM WvM2ejru:');
      incidentReports.forEach((report, index) => {
        console.log(`\n${index + 1}. Report ID: ${report.id}`);
        console.log(`   User ID: ${report.create_user_id}`);
        console.log(`   Form ID: ${report.typeform_form_id}`);
        console.log(`   Submitted: ${report.submitted_at}`);
        console.log(`   Driver Name: ${report.driver_name || 'Not provided'}`);
        console.log(`   Location: ${report.incident_location || 'Not provided'}`);
      });
    } else {
      console.log('\n⚠️ NO INCIDENT REPORTS FOUND FROM FORM WvM2ejru');
      
      // Check for any incident reports at all
      const { data: allReports, error: allError } = await supabase
        .from('incident_reports')
        .select('typeform_form_id, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!allError && allReports && allReports.length > 0) {
        console.log('\n📋 Recent incident reports from other forms:');
        allReports.forEach(report => {
          console.log(`   Form ID: ${report.typeform_form_id || 'Unknown'} - ${report.created_at}`);
        });
      }
    }

    // Check webhook failures for this form
    const { data: failures, error: failError } = await supabase
      .from('webhook_failures')
      .select('*')
      .eq('endpoint', '/webhook/incident-report')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!failError && failures && failures.length > 0) {
      console.log(`\n⚠️ Found ${failures.length} recent webhook failures:`);
      failures.forEach((failure, index) => {
        console.log(`\n${index + 1}. ${failure.created_at}`);
        console.log(`   Error: ${failure.error_message}`);
        
        // Check if the failure data contains our form ID
        try {
          const webhookData = JSON.parse(failure.payload);
          const formId = webhookData?.form_response?.form_id;
          if (formId === 'WvM2ejru') {
            console.log(`   🎯 THIS FAILURE WAS FROM FORM WvM2ejru!`);
            console.log(`   User ID: ${webhookData?.form_response?.hidden?.create_user_id || 'Not found'}`);
          }
        } catch (parseError) {
          console.log(`   Unable to parse failure payload`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run if called directly
if (require.main === module) {
  debugIncidentForm().catch(console.error);
}

module.exports = { debugIncidentForm };
