/**
 * Comprehensive PDF Page Audit
 * Checks exactly which fields exist in DB and which pages have data
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function auditPdfPages() {
  const userId = 'adeedf9d-fe8e-43c9-80d1-30db3c226522';

  console.log('🔍 COMPREHENSIVE PDF PAGE AUDIT\n');
  console.log('='.repeat(70));

  // Fetch all data
  const { data: signup } = await supabase
    .from('user_signup')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  const { data: incident } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  // Define expected fields by page
  const pageFields = {
    'PAGE 1: Contact Information': {
      table: 'user_signup',
      fields: ['name', 'surname', 'email', 'mobile', 'street_address', 'town', 'postcode', 'country']
    },
    'PAGE 2: Vehicle & Insurance': {
      table: 'user_signup',
      fields: ['car_registration_number', 'vehicle_make', 'vehicle_model', 'vehicle_colour', 'insurance_company', 'policy_number', 'policy_holder', 'cover_type']
    },
    'PAGE 3: Accident Date/Time/Location': {
      table: 'incident_reports',
      fields: ['accident_date', 'accident_time', 'location', 'what3words', 'nearest_landmark']
    },
    'PAGE 4: Safety & Medical': {
      table: 'incident_reports',
      fields: ['airbags_deployed', 'seatbelts_worn', 'medical_attention_needed', 'medical_injury_details', 'medical_symptom_chest_pain', 'medical_symptom_uncontrolled_bleeding', 'medical_symptom_breathlessness']
    },
    'PAGE 5: Environmental Conditions': {
      table: 'incident_reports',
      fields: ['weather_bright_sunlight', 'weather_clear', 'weather_raining', 'road_condition_dry', 'road_condition_wet', 'road_type_motorway', 'road_type_a_road']
    },
    'PAGE 6: Traffic/Visibility/Junction': {
      table: 'incident_reports',
      fields: ['speed_limit', 'your_speed', 'traffic_conditions_heavy', 'visibility_good', 'junction_type', 'traffic_light_status', 'special_condition_roadworks']
    },
    'PAGE 7: Your Vehicle Details': {
      table: 'incident_reports',
      fields: ['usual_vehicle', 'vehicle_license_plate', 'dvla_make', 'dvla_model', 'impact_point_front', 'vehicle_driveable']
    },
    'PAGE 8: Other Vehicle Information': {
      table: 'incident_reports',
      fields: ['other_full_name', 'other_vehicle_registration', 'other_vehicle_look_up_make', 'other_drivers_insurance_company', 'other_drivers_policy_number']
    },
    'PAGE 9: Witnesses': {
      table: 'incident_reports',
      fields: ['witnesses_present', 'witness_name', 'witness_mobile_number', 'witness_email_address', 'witness_statement']
    },
    'PAGE 10: Police Involvement': {
      table: 'incident_reports',
      fields: ['police_attended', 'police_force', 'accident_ref_number', 'officer_name', 'officer_badge']
    },
    'PAGE 11: Medical Details': {
      table: 'incident_reports',
      fields: ['medical_attention_needed', 'medical_injury_severity', 'medical_hospital_name', 'medical_ambulance_called']
    },
    'PAGE 12: Final Statement': {
      table: 'incident_reports',
      fields: ['additional_hazards', 'final_feeling']
    }
  };

  let totalPages = 0;
  let pagesWithData = 0;
  let totalFields = 0;
  let fieldsWithData = 0;

  for (const [pageName, config] of Object.entries(pageFields)) {
    totalPages++;
    const data = config.table === 'user_signup' ? signup : incident;

    const fieldsInPage = config.fields.length;
    const fieldsPopulated = config.fields.filter(field => {
      const value = data?.[field];
      return value !== null && value !== undefined && value !== '';
    }).length;

    const percentage = fieldsInPage > 0 ? Math.round((fieldsPopulated / fieldsInPage) * 100) : 0;
    const status = percentage >= 80 ? '✅' : percentage >= 50 ? '⚠️' : '❌';

    console.log(`\n${status} ${pageName}`);
    console.log(`   Fields: ${fieldsPopulated}/${fieldsInPage} (${percentage}%)`);

    if (percentage < 100) {
      const missingFields = config.fields.filter(field => {
        const value = data?.[field];
        return value === null || value === undefined || value === '';
      });
      console.log(`   Missing: ${missingFields.join(', ')}`);
    }

    totalFields += fieldsInPage;
    fieldsWithData += fieldsPopulated;

    if (percentage >= 50) pagesWithData++;
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 OVERALL SUMMARY');
  console.log('='.repeat(70));
  console.log(`Pages with data (≥50%): ${pagesWithData}/${totalPages} (${Math.round((pagesWithData/totalPages)*100)}%)`);
  console.log(`Total fields populated: ${fieldsWithData}/${totalFields} (${Math.round((fieldsWithData/totalFields)*100)}%)`);
  console.log(`\n${pagesWithData === totalPages ? '🎉 ALL PAGES HAVE DATA!' : '⚠️ SOME PAGES NEED ATTENTION'}`);
}

auditPdfPages().catch(console.error);
