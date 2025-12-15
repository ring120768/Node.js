/**
 * Diagnose Incident Submission Error
 * Makes a direct Supabase insert to see the exact error
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function diagnoseError() {
  try {
    console.log('🔍 Testing direct database insert...\n');

    // Minimal incident data (matching what the controller sends)
    const testIncidentData = {
      create_user_id: '9db03736-74ac-4d00-9ae2-3639b58360a3', // Ian Ring's UUID

      // Page 2: Medical
      medical_attention_needed: false,

      // Page 3: Date/Time
      accident_date: '2025-11-15',
      accident_time: '14:30',

      // Page 4: Location
      location: 'Test Location',

      // Page 5: Vehicle (the field we care about)
      vehicle_driveable: 'yes',

      // Page 12: Final
      final_feeling: 'fine',

      // Metadata
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📦 Test data:', JSON.stringify(testIncidentData, null, 2));
    console.log('\n🚀 Inserting into incident_reports table...\n');

    const { data: incident, error: insertError } = await supabase
      .from('incident_reports')
      .insert([testIncidentData])
      .select()
      .single();

    if (insertError) {
      console.error('❌ DATABASE INSERT FAILED\n');
      console.error('Error Message:', insertError.message);
      console.error('Error Code:', insertError.code);
      console.error('Error Details:', insertError.details);
      console.error('Error Hint:', insertError.hint);
      console.error('\nFull Error Object:', JSON.stringify(insertError, null, 2));

      // Parse the error for common issues
      if (insertError.message.includes('null value')) {
        console.error('\n💡 This is a NOT NULL constraint violation');
        console.error('   A required field is missing or null');
      }
      if (insertError.message.includes('does not exist')) {
        console.error('\n💡 Column does not exist in database');
        console.error('   Field name mismatch between code and schema');
      }
      if (insertError.code === '23502') {
        console.error('\n💡 PostgreSQL Error 23502: NOT NULL violation');
      }

      process.exit(1);
    }

    console.log('✅ SUCCESS! Incident created:', {
      id: incident.id,
      created_at: incident.created_at,
      vehicle_driveable: incident.vehicle_driveable
    });

    // Clean up - delete the test record
    const { error: deleteError } = await supabase
      .from('incident_reports')
      .delete()
      .eq('id', incident.id);

    if (!deleteError) {
      console.log('🧹 Test record cleaned up');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

diagnoseError();
