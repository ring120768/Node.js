require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkActualValues() {
  const userId = 'adeedf9d-fe8e-43c9-80d1-30db3c226522';

  console.log('🔍 Checking actual database values for fields that are empty in PDF...\n');

  const { data: incident } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  // Check the empty fields that user says they selected
  const fieldsToCheck = {
    // Airbag/Safety
    'airbags_deployed': incident?.airbags_deployed,
    'six_point_safety_check_completed': incident?.six_point_safety_check_completed,
    'seatbelt_worn': incident?.seatbelt_worn,

    // Vehicle Drivability
    'vehicle_drivable': incident?.vehicle_drivable,

    // Medical
    'medical_how_are_you_feeling': incident?.medical_how_are_you_feeling,
    'medical_attention_from_who': incident?.medical_attention_from_who,
    'further_medical_attention_needed': incident?.further_medical_attention_needed,

    // Police
    'police_attended': incident?.police_attended,

    // Road markings
    'road_markings_visible': incident?.road_markings_visible,

    // Road type
    'road_type': incident?.road_type,

    // Visibility
    'visibility_conditions': incident?.visibility_conditions,

    // Weather
    'weather_conditions': incident?.weather_conditions,

    // Emergency contact
    'emergency_contact_name': incident?.emergency_contact_name,
    'emergency_contact_number': incident?.emergency_contact_number,

    // Witnesses
    'additional_witnesses': incident?.additional_witnesses,
    'witness_number': incident?.witness_number,
  };

  console.log('📊 DATABASE VALUES:\n');

  let hasDataCount = 0;
  let nullCount = 0;

  Object.entries(fieldsToCheck).forEach(([field, value]) => {
    const hasData = value !== null && value !== undefined && value !== '';
    if (hasData) {
      console.log(`✅ ${field}: ${JSON.stringify(value)}`);
      hasDataCount++;
    } else {
      console.log(`❌ ${field}: NULL/EMPTY`);
      nullCount++;
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Fields with data: ${hasDataCount}`);
  console.log(`   Fields empty: ${nullCount}`);

  // Also check for array fields that might be stored differently
  console.log('\n🔍 Checking ARRAY fields (weather, medical symptoms, etc):\n');

  const arrayFields = {
    'weather_conditions': incident?.weather_conditions,
    'medical_symptoms': incident?.medical_symptoms,
    'road_features': incident?.road_features,
    'traffic_conditions': incident?.traffic_conditions,
    'visibility_conditions': incident?.visibility_conditions,
  };

  Object.entries(arrayFields).forEach(([field, value]) => {
    if (Array.isArray(value) && value.length > 0) {
      console.log(`✅ ${field}: [${value.join(', ')}]`);
    } else {
      console.log(`❌ ${field}: ${JSON.stringify(value) || 'NULL'}`);
    }
  });
}

checkActualValues().catch(console.error);
