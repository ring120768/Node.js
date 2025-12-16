/**
 * PDF vs Database Reconciliation Tool
 * Compares PDF report data against database records for user e6708c56-f9bb-46f1-94d5-d5bea8db1d71
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = 'e6708c56-f9bb-46f1-94d5-d5bea8db1d71';

// PDF Data extracted from the report
const pdfData = {
  // Page 1 - Personal Information
  personal: {
    driver_name: 'Ian',
    driver_surname: 'Ring',
    driver_dob: '1968-07-12',
    driver_email: 'ian.ring@sky.com',
    driver_mobile: '07411005390',
    driver_street: '14 Priory Drive',
    driver_town: 'Stansted Mountfitchet',
    driver_postcode: 'CM24 8NR',
    driver_country: 'United Kingdom',
    license_number: 'RING9607128I99AK'
  },

  // Page 1 - Vehicle Information
  vehicle: {
    vehicle_make: 'MERCEDES-BENZ',
    vehicle_model: '', // Empty in PDF
    vehicle_colour: 'BLACK',
    vehicle_condition: 'good',
    recovery_company: 'RAC',
    recovery_breakdown_number: '03330702697',
    recovery_breakdown_email: 'care@rac.co.uk'
  },

  // Page 2 - Emergency Contact & Insurance
  emergency: {
    emergency_contact_name: 'Sarah Gilbert',
    emergency_contact_phone: '07864009810'
  },

  insurance: {
    insurance_company: 'Sheilas Wheels',
    policy_number: '91774748',
    policy_holder: 'Ian Ring',
    cover_type: 'comprehensive',
    sign_up_date: '15/12/2025'
  },

  // Page 4 - Medical Assessment
  medical: {
    medical_attention_required: 'Yes',
    ambulance_called: 'Yes',
    six_point_safety_check: 'Yes',
    injury_details: 'whiplash and some chest pain'
  },

  // Page 5 - Accident Details
  accident: {
    accident_date: '2025-12-15',
    accident_time: '18:55:00',
    weather_conditions: ['Raining', 'Windy'],
    road_conditions: ['Wet'],
    road_type: 'A-Road',
    traffic_conditions: 'Moderate',
    speed_limit: '50',
    road_markings_visible: 'No'
  },

  // Page 6 - Location
  location: {
    what3words: '///bypassed.thin.explores',
    full_address: 'Priory Drive Forest Hall Park, Uttlesford Essex, CM24 8NR GB',
    coordinates: {
      latitude: 51.898267,
      longitude: 0.199741
    }
  },

  // Page 7 - Vehicle Damage
  damage: {
    point_of_impact: ['Driver side'],
    driveable: 'Yes, I drove it away' // Checkmark shown in PDF
  },

  // Page 9 - Witness Information
  witness: {
    witness_name: 'Sarah Gilbert',
    witness_mobile: '07864009810',
    witness_email: 'sarahlgilbert70@gmail.com',
    witness_statement: 'the lady at the bustop saw everything and the van driver told her to mind her own business'
  },

  // Page 10 - Police Involvement
  police: {
    police_attended: 'No', // "No" checkbox visible
    breath_test: 'negative_0mg',
    other_breath_test: 'refused'
  },

  // Page 13 - Voice Transcription
  transcription: {
    text: 'This evening, about half seven, I was approaching the roundabout at the junction of chapel hill and church Road in stansted...'
  },

  // Page 20 - Declaration
  declaration: {
    driver_name: 'Ian Ring',
    date: '15/12/2025'
  }
};

async function reconcile() {
  console.log('🔍 PDF vs Database Reconciliation Report\n');
  console.log(`User ID: ${userId}\n`);

  let totalFields = 0;
  let matchedFields = 0;
  let mismatchedFields = 0;
  let missingFields = 0;

  const issues = [];

  // Fetch all database data
  console.log('📊 Fetching database records...\n');

  // 1. User Signup Data
  const { data: signup, error: signupError } = await supabase
    .from('user_signup')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (signupError) {
    console.error('❌ Error fetching user_signup:', signupError.message);
    process.exit(1);
  }

  // 2. Incident Report Data
  const { data: incident, error: incidentError } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (incidentError) {
    console.error('❌ Error fetching incident_reports:', incidentError.message);
    process.exit(1);
  }

  // 3. Witness Data
  const { data: witnesses, error: witnessError } = await supabase
    .from('incident_witnesses')
    .select('*')
    .eq('create_user_id', userId);

  // 4. AI Transcription Data
  const { data: transcription, error: transcriptionError } = await supabase
    .from('ai_transcription')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('✅ Database records fetched\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Helper function to compare fields
  function compareField(category, fieldName, pdfValue, dbValue) {
    totalFields++;

    // Normalize values for comparison
    const normalizePdf = String(pdfValue || '').trim().toLowerCase();
    const normalizeDb = String(dbValue || '').trim().toLowerCase();

    if (normalizePdf === normalizeDb) {
      matchedFields++;
      console.log(`✅ ${category} → ${fieldName}: MATCH`);
      console.log(`   PDF: "${pdfValue}" | DB: "${dbValue}"\n`);
    } else if (!dbValue || dbValue === null) {
      missingFields++;
      console.log(`⚠️  ${category} → ${fieldName}: MISSING IN DATABASE`);
      console.log(`   PDF: "${pdfValue}" | DB: NULL\n`);
      issues.push({
        category,
        field: fieldName,
        type: 'MISSING',
        pdfValue,
        dbValue: null
      });
    } else {
      mismatchedFields++;
      console.log(`❌ ${category} → ${fieldName}: MISMATCH`);
      console.log(`   PDF: "${pdfValue}"`);
      console.log(`   DB:  "${dbValue}"\n`);
      issues.push({
        category,
        field: fieldName,
        type: 'MISMATCH',
        pdfValue,
        dbValue
      });
    }
  }

  // ========================================
  // PERSONAL INFORMATION (Page 1)
  // ========================================
  console.log('📋 SECTION 1: PERSONAL INFORMATION\n');

  compareField('Personal', 'Driver First Name', pdfData.personal.driver_name, signup.name);
  compareField('Personal', 'Driver Surname', pdfData.personal.driver_surname, signup.surname);
  compareField('Personal', 'Driver DOB', pdfData.personal.driver_dob, signup.date_of_birth);
  compareField('Personal', 'Driver Email', pdfData.personal.driver_email, signup.email);
  compareField('Personal', 'Driver Mobile', pdfData.personal.driver_mobile, signup.mobile);
  compareField('Personal', 'Driver Street', pdfData.personal.driver_street, signup.street_address);
  compareField('Personal', 'Driver Town', pdfData.personal.driver_town, signup.town);
  compareField('Personal', 'Driver Postcode', pdfData.personal.driver_postcode, signup.postcode);
  compareField('Personal', 'License Number', pdfData.personal.license_number, signup.driving_license_number);

  // ========================================
  // VEHICLE INFORMATION (Page 1)
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('🚗 SECTION 2: VEHICLE INFORMATION\n');

  compareField('Vehicle', 'Make', pdfData.vehicle.vehicle_make, signup.vehicle_make);
  compareField('Vehicle', 'Colour', pdfData.vehicle.vehicle_colour, signup.vehicle_colour);
  compareField('Vehicle', 'Condition', pdfData.vehicle.vehicle_condition, signup.vehicle_condition);
  compareField('Vehicle', 'Recovery Company', pdfData.vehicle.recovery_company, signup.recovery_company);
  compareField('Vehicle', 'Recovery Phone', pdfData.vehicle.recovery_breakdown_number, signup.recovery_breakdown_number);
  compareField('Vehicle', 'Recovery Email', pdfData.vehicle.recovery_breakdown_email, signup.recovery_breakdown_email);

  // ========================================
  // EMERGENCY CONTACT (Page 2)
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('🚨 SECTION 3: EMERGENCY CONTACT\n');

  // Parse pipe-delimited emergency_contact: "Name | Phone | Email | Company"
  const emergencyParts = signup.emergency_contact ? signup.emergency_contact.split(' | ') : [];
  const emergencyName = emergencyParts[0] || null;
  const emergencyPhone = emergencyParts[1] || null;

  compareField('Emergency', 'Contact Name', pdfData.emergency.emergency_contact_name, emergencyName);
  compareField('Emergency', 'Contact Phone', pdfData.emergency.emergency_contact_phone, emergencyPhone);

  // ========================================
  // INSURANCE (Page 2)
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('🛡️  SECTION 4: INSURANCE DETAILS\n');

  compareField('Insurance', 'Company', pdfData.insurance.insurance_company, signup.insurance_company);
  compareField('Insurance', 'Policy Number', pdfData.insurance.policy_number, signup.policy_number);
  compareField('Insurance', 'Policy Holder', pdfData.insurance.policy_holder, signup.policy_holder);
  compareField('Insurance', 'Cover Type', pdfData.insurance.cover_type, signup.cover_type);

  // ========================================
  // ACCIDENT DETAILS (Page 5)
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('💥 SECTION 5: ACCIDENT DETAILS\n');

  compareField('Accident', 'Date', pdfData.accident.accident_date, incident.accident_date);
  compareField('Accident', 'Time', pdfData.accident.accident_time, incident.accident_time);
  compareField('Accident', 'Road Type', pdfData.accident.road_type, incident.road_type);
  compareField('Accident', 'Traffic Conditions', pdfData.accident.traffic_conditions, incident.traffic_conditions);
  compareField('Accident', 'Speed Limit', pdfData.accident.speed_limit, incident.speed_limit);

  // ========================================
  // LOCATION (Page 6)
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('📍 SECTION 6: LOCATION DETAILS\n');

  compareField('Location', 'what3words', pdfData.location.what3words, incident.what3words);
  compareField('Location', 'Full Address', pdfData.location.full_address, incident.location);
  compareField('Location', 'Latitude', pdfData.location.coordinates.latitude, incident.latitude);
  compareField('Location', 'Longitude', pdfData.location.coordinates.longitude, incident.longitude);

  // ========================================
  // WITNESS INFORMATION (Page 9)
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('👁️  SECTION 7: WITNESS INFORMATION\n');

  if (witnesses && witnesses.length > 0) {
    const witness1 = witnesses[0];
    compareField('Witness', 'Name', pdfData.witness.witness_name, witness1.witness_name);
    compareField('Witness', 'Mobile', pdfData.witness.witness_mobile, witness1.witness_mobile);
    compareField('Witness', 'Email', pdfData.witness.witness_email, witness1.witness_email);
    compareField('Witness', 'Statement', pdfData.witness.witness_statement, witness1.witness_statement);
  } else {
    console.log('⚠️  No witness records found in database\n');
    missingFields += 4;
    totalFields += 4;
  }

  // ========================================
  // POLICE INVOLVEMENT (Page 10)
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('👮 SECTION 8: POLICE INVOLVEMENT\n');

  compareField('Police', 'Breath Test Result', pdfData.police.breath_test, incident.breath_test);

  // ========================================
  // TRANSCRIPTION (Page 13)
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('🎤 SECTION 9: VOICE TRANSCRIPTION\n');

  if (transcription) {
    const pdfTranscriptSnippet = pdfData.transcription.text.substring(0, 100);
    const dbTranscriptSnippet = transcription.transcript_text?.substring(0, 100) || '';

    console.log(`📝 Transcription exists in database`);
    console.log(`   PDF snippet: "${pdfTranscriptSnippet}..."`);
    console.log(`   DB snippet:  "${dbTranscriptSnippet}..."`);
    console.log(`   ✅ Transcription present\n`);
    totalFields++;
    matchedFields++;
  } else {
    console.log('⚠️  No transcription found in database\n');
    missingFields++;
    totalFields++;
  }

  // ========================================
  // SUMMARY REPORT
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('📊 RECONCILIATION SUMMARY\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const accuracy = ((matchedFields / totalFields) * 100).toFixed(2);

  console.log(`Total Fields Checked: ${totalFields}`);
  console.log(`✅ Matched:          ${matchedFields}`);
  console.log(`❌ Mismatched:       ${mismatchedFields}`);
  console.log(`⚠️  Missing in DB:    ${missingFields}`);
  console.log(`\n📈 Data Accuracy:     ${accuracy}%\n`);

  if (issues.length > 0) {
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('⚠️  ISSUES REQUIRING ATTENTION\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.category} → ${issue.field}`);
      console.log(`   Type: ${issue.type}`);
      console.log(`   PDF:  "${issue.pdfValue}"`);
      console.log(`   DB:   "${issue.dbValue}"`);
      console.log('');
    });
  }

  console.log('═══════════════════════════════════════════════════════════════\n');

  if (accuracy >= 95) {
    console.log('🎉 EXCELLENT: PDF and database are highly consistent!\n');
  } else if (accuracy >= 85) {
    console.log('✅ GOOD: Minor discrepancies found, review recommended\n');
  } else if (accuracy >= 70) {
    console.log('⚠️  WARNING: Significant discrepancies detected\n');
  } else {
    console.log('❌ CRITICAL: Major data inconsistencies found!\n');
  }
}

reconcile().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
