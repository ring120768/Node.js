// Generate complete field mapping CSV from HTML → Database → PDF

const fs = require('fs');
const path = require('path');

// Read the PDF generator to extract mappings
const pdfGenPath = path.join(__dirname, '../lib/pdfGenerator.js');
const pdfGenContent = fs.readFileSync(pdfGenPath, 'utf8');

// Extract field mappings from pdfGenerator.js
const fieldMappings = [];

// Parse setFieldText calls
const textFieldRegex = /setFieldText\('([^']+)',\s*([^)]+)\);/g;
let match;

while ((match = textFieldRegex.exec(pdfGenContent)) !== null) {
  const pdfField = match[1];
  const sourceExpression = match[2].trim();

  // Extract database column from source expression
  let dbColumn = '';
  let source = '';

  if (sourceExpression.includes('user.')) {
    source = 'user_signup';
    dbColumn = sourceExpression.match(/user\.([a-z_]+)/)?.[1] || '';
  } else if (sourceExpression.includes('incident.')) {
    source = 'incident_reports';
    dbColumn = sourceExpression.match(/incident\.([a-z_]+)/)?.[1] || '';
  } else if (sourceExpression.includes('data.imageUrls')) {
    source = 'user_documents';
    dbColumn = sourceExpression.match(/data\.imageUrls\?\.([a-z_]+)/)?.[1] || '';
  } else if (sourceExpression.includes('data.metadata')) {
    source = 'metadata';
    dbColumn = sourceExpression.match(/data\.metadata\.([a-z_]+)/)?.[1] || '';
  } else if (sourceExpression.includes('data.emergencyAudio')) {
    source = 'ai_listening_transcripts';
    dbColumn = sourceExpression.match(/data\.emergencyAudio\.([a-z_]+)/)?.[1] || '';
  }

  fieldMappings.push({
    pdfField,
    dbColumn,
    source,
    type: 'text',
    sourceExpression
  });
}

// Parse checkField calls
const checkFieldRegex = /checkField\('([^']+)',\s*([^)]+)\);/g;
while ((match = checkFieldRegex.exec(pdfGenContent)) !== null) {
  const pdfField = match[1];
  const sourceExpression = match[2].trim();

  let dbColumn = '';
  let source = '';

  if (sourceExpression.includes('incident.')) {
    source = 'incident_reports';
    dbColumn = sourceExpression.match(/incident\.([a-z_]+)/)?.[1] || '';
  } else if (sourceExpression.includes('user.')) {
    source = 'user_signup';
    dbColumn = sourceExpression.match(/user\.([a-z_]+)/)?.[1] || '';
  }

  fieldMappings.push({
    pdfField,
    dbColumn,
    source,
    type: 'checkbox',
    sourceExpression
  });
}

// Define PDF page numbers (manual mapping based on comments in pdfGenerator.js)
const pdfPageMap = {
  // Page 1 - Personal & Vehicle Info
  'create_user_id': 1,
  'id': 1,
  'name': 1,
  'driver_name': 1,
  'surname': 1,
  'email': 1,
  'mobile': 1,
  'street': 1,
  'street_address_optional': 1,
  'town': 1,
  'postcode': 1,
  'country': 1,
  'driving_license_number': 1,
  'date_of_birth': 1,
  'license_plate': 1,
  'vehicle_make': 1,
  'vehicle_model': 1,
  'vehicle_colour': 1,
  'vehicle_condition': 1,
  'recovery_company': 1,
  'recovery_breakdown_number': 1,
  'recovery_breakdown_email': 1,

  // Page 2 - Emergency Contact & Insurance
  'emergency_contact': 2,
  'emergency_contact_name': 2,
  'emergency_contact_number': 2,
  'insurance_company': 2,
  'policy_number': 2,
  'policy_holder': 2,
  'cover_type': 2,
  'Date139_af_date': 2,

  // Page 3 - Images
  'driving_license_picture': 3,
  'vehicle_picture_front': 3,
  'vehicle_picture_driver_side': 3,
  'vehicle_picture_passenger_side': 3,
  'vehicle_picture_back': 3,

  // Page 4 - Incident Safety
  'form_id': 4,
  'submit_date': 4,
  'are_you_safe': 4,
  'medical_attention': 4,
  'medical_how_are_you_feeling': 4,
  'medical_attention_from_who': 4,
  'further_medical_attention': 4,
  'medical_please_be_completely_honest': 4,
  'six_point_safety_check': 4,
  'call_emergency_contact': 4,

  // Page 5 - Medical Symptoms
  'medical_chest_pain': 5,
  'medical_uncontrolled_bleeding': 5,
  'medical_breathlessness': 5,
  'medical_limb_weakness': 5,
  'medical_loss_of_consciousness': 5,
  'medical_severe_headache': 5,
  'medical_abdominal_bruising': 5,
  'medical_change_in_vision': 5,
  'medical_abdominal_pain': 5,
  'medical_limb_pain': 5,
  'medical_none_of_these': 5,
  'ambulance_callled': 5,
  'medical_attention_needed': 5,
  'hospital_or_medical_center': 5,
  'medical_injury_details': 5,
  'severity_of_injuries': 5,
  'treatment_received_on_scene': 5,
  'follow_up_appointments_scheduled': 5,

  // Page 6 - Incident Details
  'when_did_the_accident_happen': 6,
  'what_time_did_the_accident_happen': 6,
  'where_exactly_did_this_happen': 6,
  'wearing_seatbelts': 6,
  'airbags_deployed': 6,
  'reason_no_seatbelts': 6,
  'damage_to_your_vehicle': 6,
  'no_damage': 6,
  'no_visible_damage': 6,
  'usual_vehicle': 6,
  'vehicle_driveable': 6,

  // Page 7 - Weather & Road Conditions
  'weather_overcast': 7,
  'weather_heavy_rain': 7,
  'weather_wet_road': 7,
  'weather_fog': 7,
  'weather_street_lights': 7,
  'weather_dusk': 7,
  'weather_clear_and_dry': 7,
  'weather_snow_on_road': 7,
  'weather_snow': 7,
  'weather_light_rain': 7,
  'weather_bright_daylight': 7,
  'weather_drizzle': 7,
  'weather_raining': 7,
  'weather-hail': 7,
  'weather_windy': 7,
  'weather_thunder': 7,
  'weather_slush_road': 7,
  'weather_loose_surface': 7,
  'weather_clear': 7,
  'weather_cloudy': 7,
  'weather_bright_sunlight': 7,
  'weather_ice': 7,

  // Page 18 - Appendix A (Emergency Audio)
  'emergency_audio_transcription': 18,
  'emergency_recording_timestamp': 18,
  'emergency_audio_url': 18
};

// Define HTML page numbers (based on incident-form structure)
const htmlPageMap = {
  // Page 1 - Personal Info (signup-auth.html + signup-form.html page 1)
  'name': 1,
  'surname': 1,
  'email': 1,
  'mobile': 1,
  'street_address': 1,
  'street_address_optional': 1,
  'town': 1,
  'postcode': 1,
  'country': 1,
  'date_of_birth': 1,

  // Page 2 - Vehicle Info
  'car_registration_number': 2,
  'vehicle_make': 2,
  'vehicle_model': 2,
  'vehicle_colour': 2,
  'driving_license_number': 2,

  // Page 3 - Insurance
  'insurance_company': 3,
  'policy_number': 3,
  'policy_holder': 3,
  'cover_type': 3,

  // Page 4 - Emergency Contact
  'emergency_contact_name': 4,
  'emergency_contact_number': 4,
  'recovery_company': 4,
  'recovery_breakdown_number': 4,

  // Page 5 - Medical/Safety
  'are_you_safe': 5,
  'medical_attention': 5,
  'medical_chest_pain': 5,
  'medical_uncontrolled_bleeding': 5,
  'medical_ambulance_called': 5,
  'medical_hospital_name': 5,

  // Page 6 - Incident Details
  'when_did_the_accident_happen': 6,
  'accident_time': 6,
  'where_exactly_did_this_happen': 6,

  // Page 7 - Weather
  'weather_clear_and_dry': 7,
  'weather_raining': 7,
  'weather_fog': 7,

  // incident.html - AI Eavesdropper
  'voiceTranscription': 'incident.html',
  'transcription_text': 'incident.html'
};

// Build CSV rows
const csvRows = [
  ['HTML Page', 'HTML Field ID', 'Database Table', 'Database Column', 'PDF Field Name', 'PDF Page', 'Field Type', 'Notes']
];

// Add all mappings
fieldMappings.forEach(mapping => {
  const htmlPage = htmlPageMap[mapping.dbColumn] || '';
  const pdfPage = pdfPageMap[mapping.pdfField] || '';

  csvRows.push([
    htmlPage,
    mapping.dbColumn,
    mapping.source,
    mapping.dbColumn,
    mapping.pdfField,
    pdfPage,
    mapping.type,
    mapping.sourceExpression.includes('||') ? 'Fallback mapping' : ''
  ]);
});

// Sort by PDF page, then by field name
csvRows.sort((a, b) => {
  if (a[0] === csvRows[0][0]) return -1; // Keep header first
  if (b[0] === csvRows[0][0]) return 1;

  const pdfPageA = parseInt(a[5]) || 999;
  const pdfPageB = parseInt(b[5]) || 999;

  if (pdfPageA !== pdfPageB) return pdfPageA - pdfPageB;
  return a[4].localeCompare(b[4]);
});

// Convert to CSV string
const csvContent = csvRows.map(row =>
  row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
).join('\n');

// Write to file
const outputPath = path.join(__dirname, '../FIELD_MAPPING_COMPLETE.csv');
fs.writeFileSync(outputPath, csvContent, 'utf8');

console.log(`✅ Generated complete field mapping CSV: ${outputPath}`);
console.log(`📊 Total fields mapped: ${csvRows.length - 1}`);
console.log(`📄 PDF pages: 1-18`);
console.log(`🌐 HTML pages: incident-form-page1 through page11, incident.html`);
