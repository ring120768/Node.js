# Claude Code: Complete PDF Field Implementation Prompt

**Task**: Implement complete database → PDF field mapping for all 213 PDF fields with 100% data capture.

---

## Context

**PDF Template**: `pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf`
**Total Fields**: 213 (120 text, 92 checkbox, 1 signature)
**Authoritative Field List**: `pdf-fields-complete-list.txt`
**Field Mappings**: `CORRECTED_MASTER_PROMPT_V3_MINIMAL.md`

**Critical**: Use EXACT field names from PDF template (including typos like `visibilty`, `mobilty`, `vsible`, `life _threatening`).

---

## Database Schema (6 tables)

### 1. `user_signup` - Personal info, vehicle, insurance
```sql
-- Key columns:
create_user_id, driver_name, driver_surname, driver_email, driver_mobile, driver_date_of_birth
driver_street, driver_town, driver_postcode, driver_country
license_number, license_plate, vehicle_make, vehicle_model, vehicle_colour
insurance_company, policy_number, policy_holder, cover_type
emergency_contact, emergency_contact_number
recovery_company, recovery_breakdown_number, recovery_breakdown_email
created_at, updated_at
```

### 2. `incident_reports` - Accident details (170+ columns)
```sql
-- Key columns:
id, create_user_id
when_did_the_accident_happen, what_time_did_the_accident_happen
where_exactly_did_the_accident_happen, street_name, nearest_landmark, what3words
junction_type, junction_control, traffic_light_status
speed_limit, estimated_speed
describe_what_happened, describe_damage_to_vehicle, damage_to_your_vehicle
user_manoeuvre, seatbelt_reason

-- Medical (booleans or TEXT[])
chest_pain, breathlessness, severe_headache, limb_pain_impeding_mobility
medical_how_feeling, medical_injury_details, medical_injury_severity
medical_treatment_received, medical_attention_from_who, medical_hospital_name

-- Weather/Road/Traffic (booleans or TEXT[])
weather_clear, heavy_rain, fog_poor_visibility, bright_daylight, etc.
road_type, road_condition_dry, road_condition_wet, road_condition_icy, etc.
traffic_conditions, visibility_conditions, road_markings
special_conditions (TEXT[] array)
impact_points (TEXT[] array)

-- Police
did_police_attend, accident_reference_number, police_officer_name
police_officer_badge, police_force, breath_test

-- Other vehicle
other_vehicle_registration, other_driver_name, other_driver_number
other_driver_email, other_driver_license_number
other_insurance_company, other_insurance_policy_number
other_insurance_policy_holder, other_insurance_cover_type
other_driver_breath_test

-- Witnesses
witness_present, witness_name, witness_mobile_number, witness_email
witness_statement, witness_email_2, witness_statement_2, additional_witnesses

-- Vehicle status
vehicle_drivable, vehicle_towed
usual_vehicle, six_point_safety_check_completed

-- AI analysis (if stored here)
ai_summary, closing_statement, analysis_metadata
```

### 3. `incident_images` - Image URLs
```sql
-- Key columns:
id, create_user_id, image_type, file_name, file_url, uploaded_at
-- image_type values: 'driving_license', 'vehicle_front', 'vehicle_back',
-- 'vehicle_driver_side', 'vehicle_passenger_side', 'vehicle_damage_1-5',
-- 'other_vehicle_1-3', 'scene_1-3', 'map_screenshot'
```

### 4. `dvla_vehicle_info_new` - DVLA lookups
```sql
-- Key columns (can have 2+ records per user):
id, create_user_id, registration_number
make, model, colour, year_of_manufacture, fuel_type
mot_status, mot_expiry_date
road_tax_status, tax_due_date
marked_for_export, insurance_status
```

### 5. `ai_transcription` - Voice recordings
```sql
-- Key columns:
id, create_user_id, transcription, audio_url, duration_seconds, created_at
-- May have emergency_transcription and emergency_recording_timestamp
```

### 6. `ai_summary` - AI analysis
```sql
-- Key columns:
id, create_user_id, summary, analysis_type, created_at
```

---

## Implementation Requirements

### 1. Fetch ALL Database Data
```javascript
// Fetch from all 6 tables for given userId
const userData = await fetchUserSignup(userId);
const incidentData = await fetchIncidentReports(userId);
const images = await fetchIncidentImages(userId);
const dvlaRecords = await fetchDVLAData(userId); // Array: [user vehicle, other vehicle(s)]
const transcription = await fetchLatestTranscription(userId);
const aiSummary = await fetchLatestAISummary(userId);
```

### 2. Load PDF Template
```javascript
const pdfBytes = await fs.readFile('pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf');
const pdfDoc = await PDFDocument.load(pdfBytes);
const form = pdfDoc.getForm();
```

### 3. Map ALL 120 Text Fields

**CRITICAL MAPPINGS** (use exact field names including typos):

```javascript
const textFieldMappings = {
  // Personal (from user_signup)
  'name': userData.driver_name || '',
  'surname': userData.driver_surname || '',
  'email': userData.driver_email || '',
  'mobile': userData.driver_mobile || '',
  'date_of_birth': userData.driver_date_of_birth || '',

  // Address
  'street': userData.driver_street || '',
  'town': userData.driver_town || '',
  'postcode': userData.driver_postcode || '',
  'country': userData.driver_country || '',

  // Vehicle
  'vehicle_license_plate': userData.license_plate || '',
  'vehicle_make': userData.vehicle_make || '',
  'vehicle_model': userData.vehicle_model || '',
  'vehicle_colour': userData.vehicle_colour || '',
  'vehicle_condition': userData.vehicle_condition || '',

  // Insurance
  'insurance_company': userData.insurance_company || '',
  'policy_number': userData.policy_number || '',
  'policy_holder': userData.policy_holder || '',
  'cover_type': userData.cover_type || '',

  // Emergency
  'emergency_contact_name': userData.emergency_contact || '',
  'emergency_contact_number': userData.emergency_contact_number || '',

  // Recovery
  'recovery_company': userData.recovery_company || '',
  'recovery_breakdown_number': userData.recovery_breakdown_number || '',
  'recovery_breakdown_email': userData.recovery_breakdown_email || '',

  // Driving license
  'driving_license_number': userData.license_number || '',
  'driving_license_picture': findImageURL(images, 'driving_license'),

  // Vehicle photos (from incident_images)
  'vehicle_picture_front': findImageURL(images, 'vehicle_front'),
  'vehicle_picture_back': findImageURL(images, 'vehicle_back'),
  'vehicle_picture_driver_side': findImageURL(images, 'vehicle_driver_side'),
  'vehicle_picture_passenger_side': findImageURL(images, 'vehicle_passenger_side'),

  // DVLA (user's vehicle - first record)
  'car_registration_number': dvlaRecords[0]?.registration_number || '',
  'dvla_make': dvlaRecords[0]?.make || '',
  'dvla_model': dvlaRecords[0]?.model || '',
  'dvla_colour': dvlaRecords[0]?.colour || '',
  'dvla_year': dvlaRecords[0]?.year_of_manufacture || '',
  'dvla_fuel_type': dvlaRecords[0]?.fuel_type || '',
  'dvla_mot_status': dvlaRecords[0]?.mot_status || '',
  'dvla_mot_expiry': formatDate(dvlaRecords[0]?.mot_expiry_date),
  'dvla_tax_status': dvlaRecords[0]?.road_tax_status || '',
  'dvla_tax_due_date': formatDate(dvlaRecords[0]?.tax_due_date),

  // Incident details (from incident_reports)
  'accident_date': formatDate(incidentData.when_did_the_accident_happen),
  'accident_time': incidentData.what_time_did_the_accident_happen || '',
  'Date69_af_date': formatDate(incidentData.when_did_the_accident_happen),

  // Location
  'location': incidentData.where_exactly_did_the_accident_happen || '',
  'street_name_optional': incidentData.street_name || '',
  'nearest_landmark': incidentData.nearest_landmark || '',
  'what3words': incidentData.what3words || '',
  'location_map_screenshot': findImageURL(images, 'map_screenshot'),

  // Junction
  'junction_type': incidentData.junction_type || '',
  'junction_control': incidentData.junction_control || '',
  'traffic_light_status': incidentData.traffic_light_status || '',

  // Speed
  'speed_limit': incidentData.speed_limit || '',
  'your_speed': incidentData.estimated_speed || '',

  // Road
  'additional_hazards': incidentData.additional_hazards || '',

  // Description
  'describe-damage-to-vehicle': incidentData.describe_damage_to_vehicle || '',
  'damage_to_your_vehicle': incidentData.damage_to_your_vehicle || '',

  // Seatbelt
  'seatbelt_reason': incidentData.seatbelt_reason || '',

  // User manoeuvre
  'user_manoeuvre': incidentData.user_manoeuvre || '',

  // Breath test
  'user_breath_test': incidentData.breath_test || '',

  // Police
  'accident_ref_number': incidentData.accident_reference_number || '',
  'officer_name': incidentData.police_officer_name || '',
  'officer_badge': incidentData.police_officer_badge || '',
  'police_force': incidentData.police_force || '',

  // Other vehicle
  'other-vehicle-registration': incidentData.other_vehicle_registration || '',
  'other-full-name': incidentData.other_driver_name || '',
  'other-contact-number': incidentData.other_driver_number || '',
  'other-email-address': incidentData.other_driver_email || '',
  'other-driving-license-number': incidentData.other_driver_license_number || '',
  'other-drivers-insurance-company': incidentData.other_insurance_company || '',
  'other-drivers-policy-number': incidentData.other_insurance_policy_number || '',
  'other-drivers-policy-holder-name': incidentData.other_insurance_policy_holder || '',
  'other-drivers-policy-cover-type': incidentData.other_insurance_cover_type || '',

  // DVLA (other vehicle - second record if exists)
  'other-vehicle-look-up-make': dvlaRecords[1]?.make || '',
  'other-vehicle-look-up-model': dvlaRecords[1]?.model || '',
  'other-vehicle-look-up-colour': dvlaRecords[1]?.colour || '',
  'other-vehicle-look-up-year': dvlaRecords[1]?.year_of_manufacture || '',
  'other-vehicle-look-up-fuel-type': dvlaRecords[1]?.fuel_type || '',
  'other-vehicle-look-up-mot-status': dvlaRecords[1]?.mot_status || '',
  'other-vehicle-look-up-mot-expiry-date': formatDate(dvlaRecords[1]?.mot_expiry_date),
  'other-vehicle-look-up-tax-status': dvlaRecords[1]?.road_tax_status || '',
  'other-vehicle-look-up-tax-due-date': formatDate(dvlaRecords[1]?.tax_due_date),
  'other-vehicle-look-up-insurance-status': dvlaRecords[1]?.insurance_status || '',
  'other_breath_test': incidentData.other_driver_breath_test || '',
  'other_driver_vehicle_marked_for_export': dvlaRecords[1]?.marked_for_export ? 'Yes' : 'No',

  // Witnesses
  'witness_name': incidentData.witness_name || '',
  'witness_number': incidentData.witness_mobile_number || '',
  'witness_mobile_number': incidentData.witness_mobile_number || '',
  'witness_email_address': incidentData.witness_email || '',
  'witness_email_2': incidentData.witness_email_2 || '',
  'witness_statement': incidentData.witness_statement || '',
  'witness_statement_2': incidentData.witness_statement_2 || '',
  'additional_witnesses': incidentData.additional_witnesses || '',

  // Medical
  'medical_how_are_you_feeling': incidentData.medical_how_feeling || '', // TEXT field
  'medical_injury_details': incidentData.medical_injury_details || '',
  'medical_injury_severity': incidentData.medical_injury_severity || '',
  'medical_treatment_recieved': incidentData.medical_treatment_received || '',
  'medical_attention_from_who': incidentData.medical_attention_from_who || '',
  'medical_hospital_name': incidentData.medical_hospital_name || '',
  'further_medical_attention_needed': incidentData.further_medical_attention_needed || '',

  // Photo URLs (11 fields - NO "your_" prefix)
  'vehicle_damage_photo_1_url': findImageURL(images, 'vehicle_damage_1'),
  'vehicle_damage_photo_2_url': findImageURL(images, 'vehicle_damage_2'),
  'vehicle_damage_photo_3_url': findImageURL(images, 'vehicle_damage_3'),
  'vehicle_damage_photo_4_url': findImageURL(images, 'vehicle_damage_4'),
  'vehicle_damage_photo_5_url': findImageURL(images, 'vehicle_damage_5'),
  'other_vehicle_photo_1_url': findImageURL(images, 'other_vehicle_1'),
  'other_vehicle_photo_2_url': findImageURL(images, 'other_vehicle_2'),
  'other_vehicle_photo_3_url': findImageURL(images, 'other_vehicle_3'),
  'scene_photo_1_url': findImageURL(images, 'scene_1'),
  'scene_photo_2_url': findImageURL(images, 'scene_2'),
  'scene_photo_3_url': findImageURL(images, 'scene_3'),

  // Transcription & AI
  'voice_transcription': transcription?.transcription || '',
  'emergency_audio_transcription': transcription?.emergency_transcription || '',
  'emergency_recording_timestamp': transcription?.emergency_recording_timestamp || '',
  'ai_summary': aiSummary?.summary || '',
  'closing_statement': incidentData.closing_statement || '',
  'analysis_metadata': incidentData.analysis_metadata || '',

  // Admin
  'id': userData.create_user_id || '',
  'subscription_start_date': formatDate(userData.created_at),
  'quality_review': incidentData.quality_review || '',
  'final_review': incidentData.final_review || '',
  'open': incidentData.status || ''
};

// Fill all text fields
Object.entries(textFieldMappings).forEach(([fieldName, value]) => {
  try {
    const field = form.getTextField(fieldName);
    field.setText(String(value));
  } catch (error) {
    console.warn(`Text field not found: ${fieldName}`);
  }
});
```

### 4. Map ALL 92 Checkbox Fields

**CRITICAL**: Use exact PDF field names including typos (`visibilty`, `mobilty`, `vsible`, `life _threatening`, etc.)

```javascript
const checkboxMappings = {
  // Medical Symptoms (13 - exact PDF names with typos)
  'medical_symptom_chest_pain': incidentData.chest_pain || false,
  'medical_symptom_uncontrolled_bleeding': incidentData.uncontrolled_bleeding || false,
  'medical_symptom_breathlessness': incidentData.breathlessness || false,
  'medical_symptom_limb_weakness': incidentData.limb_weakness || false,
  'medical_symptom_dizziness': incidentData.dizziness || false,
  'medical_symptom_loss_of_consciousness': incidentData.loss_of_consciousness || false,
  'medical_symptom_severe_headache': incidentData.severe_headache || false,
  'medical_symptom_change_in_vision': incidentData.change_in_vision || false,
  'medical_symptom_abdominal_pain': incidentData.abdominal_pain || false,
  'medical_symptom_abdominal_bruising': incidentData.abdominal_bruising || false,
  'medical_symptom_limb_pain_mobilty': incidentData.limb_pain_impeding_mobility || false, // PDF typo: "mobilty"
  'medical_symptom_life _threatening': incidentData.life_threatening || false, // PDF typo: space
  'medical_symptom_none': incidentData.medical_symptom_none || false,

  // Medical Attention
  'medical_ambulance_called': incidentData.ambulance_called || false,
  'medical_attention_needed': incidentData.medical_attention_required || false,

  // Weather (13 - with PDF typo)
  'weather_bright_sunlight': incidentData.bright_daylight || false,
  'weather_clear': incidentData.weather_clear || false,
  'weather_cloudy': incidentData.overcast_dull || false,
  'weather_drizzle': incidentData.drizzle || false,
  'weather_raining': incidentData.raining || false,
  'weather_heavy_rain': incidentData.heavy_rain || false,
  'weather_fog': incidentData.fog_poor_visibility || false,
  'weather_snow': incidentData.snow || false,
  'weather_hail': incidentData.hail || false,
  'weather_thunder_lightening': incidentData.thunder_lightning || false, // PDF typo: "lightening"
  'weather_windy': incidentData.windy || false,
  'weather_dusk': incidentData.dusk || false,

  // Road Conditions (6)
  'road_condition_dry': incidentData.road_condition_dry || false,
  'road_condition_wet': incidentData.wet_road || false,
  'road_condition_icy': incidentData.road_condition_icy || false,
  'road_condition_snow_covered': incidentData.road_condition_snow_covered || false,
  'road_condition_slush_on_road': incidentData.road_condition_slush || false,
  'road_condition_loose_surface': incidentData.road_condition_loose_surface || false,

  // Road Types (7)
  'road_type_motorway': incidentData.road_type === 'motorway',
  'road_type_a_road': incidentData.road_type === 'a_road',
  'road_type_b_road': incidentData.road_type === 'b_road',
  'road_type_urban': incidentData.road_type === 'urban',
  'road_type_rural': incidentData.road_type === 'rural',
  'road_type_private_road': incidentData.road_type === 'private_road',
  'road_type_car_park': incidentData.road_type === 'car_park',

  // Traffic Conditions (4)
  'traffic_conditions_no_traffic': incidentData.traffic_conditions === 'no_traffic',
  'traffic_conditions_light': incidentData.traffic_conditions === 'light',
  'traffic_conditions_moderate': incidentData.traffic_conditions === 'moderate',
  'traffic_conditions_heavy': incidentData.traffic_conditions === 'heavy',

  // Visibility (7 - with PDF typos)
  'visibilty_good': incidentData.visibility_good || false, // PDF typo: "visibilty"
  'visibilty_street_lights': incidentData.visibility_street_lights || false, // PDF typo: "visibilty"
  'visibility_poor': incidentData.visibility_poor || false,
  'visibility_very_poor': incidentData.visibility_very_poor || false,
  'visibility_sun_glare': incidentData.visibility_sun_glare || false,
  'visibility_large_vehicle': incidentData.visibility_large_vehicle || false,
  'visibility_restricted_structure': incidentData.visibility_restricted_structure || false,

  // Road Markings (3 - with PDF typos)
  'road_markings_vsible_yes': incidentData.road_markings_visible === 'yes', // PDF typo: "vsible"
  'road_markings_vsible_no': incidentData.road_markings_visible === 'no', // PDF typo: "vsible"
  'road_markings_visible_partially': incidentData.road_markings_visible === 'partially',

  // Special Conditions (12)
  'special_condition_animals': arrayIncludes(incidentData.special_conditions, 'animals'),
  'special_condition_crossing': arrayIncludes(incidentData.special_conditions, 'crossing'),
  'special_condition_cyclists': arrayIncludes(incidentData.special_conditions, 'cyclists'),
  'special_condition_narrow_road': arrayIncludes(incidentData.special_conditions, 'narrow_road'),
  'special_condition_oil_spills': arrayIncludes(incidentData.special_conditions, 'oil_spills'),
  'special_condition_parked_vehicles': arrayIncludes(incidentData.special_conditions, 'parked_vehicles'),
  'special_condition_pedestrians': arrayIncludes(incidentData.special_conditions, 'pedestrians'),
  'special_condition_potholes': arrayIncludes(incidentData.special_conditions, 'potholes'),
  'special_condition_roadworks': arrayIncludes(incidentData.special_conditions, 'roadworks'),
  'special_condition_school_zone': arrayIncludes(incidentData.special_conditions, 'school_zone'),
  'special_condition_traffic_calming': arrayIncludes(incidentData.special_conditions, 'traffic_calming'),
  'special_condition_workmen': arrayIncludes(incidentData.special_conditions, 'workmen'),

  // Impact Points (10 - "impact_point_" prefix, NOT "damage_")
  'impact_point_front': arrayIncludes(incidentData.impact_points, 'front'),
  'impact_point_front_driver': arrayIncludes(incidentData.impact_points, 'front_driver'),
  'impact_point_front_passenger': arrayIncludes(incidentData.impact_points, 'front_passenger'),
  'impact_point_rear': arrayIncludes(incidentData.impact_points, 'rear'),
  'impact_point_rear_driver': arrayIncludes(incidentData.impact_points, 'rear_driver'),
  'impact_point_rear_passenger': arrayIncludes(incidentData.impact_points, 'rear_passenger'),
  'impact_point_driver_side': arrayIncludes(incidentData.impact_points, 'driver_side'),
  'impact_point_passenger_side': arrayIncludes(incidentData.impact_points, 'passenger_side'),
  'impact_point_roof': arrayIncludes(incidentData.impact_points, 'roof'),
  'impact_point_under_carriage': arrayIncludes(incidentData.impact_points, 'under_carriage'),

  // Vehicle Condition
  'no_damage': incidentData.no_damage || false,
  'no-visible-damage': incidentData.no_visible_damage || false,

  // Police
  'police_attend': incidentData.did_police_attend || false,
  'police_attended': incidentData.did_police_attend || false,

  // Airbags
  'airbags_deployed': incidentData.airbags_deployed === true,
  'airbags_deployed_no': incidentData.airbags_deployed === false,

  // Seatbelt
  'seatbelt_worn': incidentData.seatbelt_worn === true,
  'seatbelt_worn_no': incidentData.seatbelt_worn === false,

  // Vehicle Status
  'yes_i_drove_it_away': incidentData.vehicle_drivable === true,
  'no_it_needed_to_be_towed': incidentData.vehicle_towed === true,
  'unsure _did_not_attempt': incidentData.vehicle_status_unsure || false, // PDF typo: space

  // Witnesses
  'witnesses_present': incidentData.witness_present || false,

  // User Vehicle
  'usual_vehicle': incidentData.usual_vehicle === true,
  'driving_your_usual_vehicle_no': incidentData.usual_vehicle === false,

  // Safety
  'six_point_safety_check_completed': incidentData.six_point_safety_check_completed || false,

  // Final Feeling (CHECKBOX, not text)
  'final_feeling': incidentData.final_feeling_checkbox || false
};

// Fill all checkboxes
Object.entries(checkboxMappings).forEach(([fieldName, isChecked]) => {
  try {
    const checkbox = form.getCheckBox(fieldName);
    if (isChecked) {
      checkbox.check();
    } else {
      checkbox.uncheck();
    }
  } catch (error) {
    console.warn(`Checkbox not found: ${fieldName}`);
  }
});
```

### 5. Helper Functions

```javascript
// Find image URL by type
function findImageURL(images, imageType) {
  const image = images.find(img => img.image_type === imageType);
  return image?.file_url || '';
}

// Format dates to DD/MM/YYYY
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Check if array includes value (handles TEXT[] columns)
function arrayIncludes(array, value) {
  if (!array) return false;
  if (Array.isArray(array)) return array.includes(value);
  return false;
}
```

### 6. Validation Requirements

After filling all fields:

```javascript
// Validate all 213 fields were processed
const allPdfFields = form.getFields();
console.log(`Total PDF fields: ${allPdfFields.length}`); // Should be 213

// Check for unfilled required fields
const textFields = form.getTextField();
const emptyTextFields = textFields.filter(field => !field.getText());
console.log(`Empty text fields: ${emptyTextFields.length}`);

// Check checkbox states
const checkboxes = form.getCheckBox();
const checkedCount = checkboxes.filter(cb => cb.isChecked()).length;
console.log(`Checked boxes: ${checkedCount}/92`);
```

### 7. Save & Return PDF

```javascript
// Flatten form (make non-editable)
form.flatten();

// Save PDF
const filledPdfBytes = await pdfDoc.save();

// Return or store
return filledPdfBytes;
```

---

## Edge Cases to Handle

### NULL/Missing Data
```javascript
// ALWAYS provide fallback to empty string
'field_name': incidentData.column_name || ''

// NEVER let undefined/null reach PDF field
```

### TEXT[] Arrays in Database
```javascript
// Database: special_conditions = ['animals', 'roadworks', 'potholes']
// PDF: 12 individual checkboxes

incidentData.special_conditions?.forEach(condition => {
  const fieldName = `special_condition_${condition}`;
  checkboxMappings[fieldName] = true;
});
```

### Multiple DVLA Records
```javascript
// dvlaRecords[0] = user's vehicle
// dvlaRecords[1] = other vehicle (if exists)
// dvlaRecords[2+] = additional vehicles (if multiple other parties)

const userVehicle = dvlaRecords.find(r => r.registration_number === userData.license_plate);
const otherVehicle = dvlaRecords.find(r => r.registration_number === incidentData.other_vehicle_registration);
```

### Boolean vs String Checkboxes
```javascript
// Database stores: TRUE/FALSE
// PDF expects: checked/unchecked

// Boolean
'police_attended': incidentData.did_police_attend === true

// String comparison
'road_type_motorway': incidentData.road_type === 'motorway'
```

### PDF Field Name Typos
```javascript
// MUST use exact PDF names (including typos):
'visibilty_good'               // NOT 'visibility_good'
'medical_symptom_limb_pain_mobilty'  // NOT 'mobility'
'weather_thunder_lightening'   // NOT 'lightning'
'road_markings_vsible_yes'     // NOT 'visible'
'medical_symptom_life _threatening'  // Space before underscore
'unsure _did_not_attempt'      // Space before underscore
```

---

## Testing & Validation

### 1. Field Coverage Test
```javascript
const expectedFields = 213;
const filledFields = Object.keys(textFieldMappings).length + Object.keys(checkboxMappings).length + 1; // +1 for signature

if (filledFields !== expectedFields) {
  console.error(`Missing fields: Expected ${expectedFields}, got ${filledFields}`);
}
```

### 2. Data Integrity Test
```javascript
// Verify no data loss
const originalDataPoints = countDataPoints(userData, incidentData, images, dvla, transcription, aiSummary);
const pdfDataPoints = countFilledFields(form);

console.log(`Database data points: ${originalDataPoints}`);
console.log(`PDF filled fields: ${pdfDataPoints}`);
```

### 3. Visual Inspection
```javascript
// Generate test PDF with known data
const testUserId = 'test-user-uuid';
const pdfBytes = await generateCompletePDF(testUserId);
await fs.writeFile('test-output/complete-field-test.pdf', pdfBytes);

// Open PDF and manually verify:
// - All 120 text fields populated
// - All 92 checkboxes correctly checked/unchecked
// - All image URLs present
// - No "undefined" or "null" text
// - All dates formatted DD/MM/YYYY
```

---

## Implementation Checklist

- [ ] Fetch data from all 6 database tables
- [ ] Map all 120 text fields (exact names including typos)
- [ ] Map all 92 checkboxes (exact names including typos)
- [ ] Handle TEXT[] array columns → multiple checkboxes
- [ ] Handle multiple DVLA records (user + other vehicle)
- [ ] Find and map all 11 image URLs
- [ ] Format all dates as DD/MM/YYYY
- [ ] Handle NULL/missing data (fallback to empty string)
- [ ] Validate 213 total fields processed
- [ ] Test with real user data
- [ ] Visual inspection of generated PDF
- [ ] Verify no data loss from database to PDF

---

## Files to Modify

1. **`src/services/pdfGenerator.js`** (or similar)
   - Implement complete field mapping logic
   - Add helper functions (findImageURL, formatDate, arrayIncludes)
   - Add validation checks

2. **Test file**: Create `test-complete-pdf-mapping.js`
   - Test with real user UUID
   - Verify all 213 fields filled
   - Check for data integrity

---

## Success Criteria

✅ All 213 PDF fields mapped to database columns
✅ All user data captured (zero data loss)
✅ Correct field names (including PDF typos)
✅ NULL/missing data handled gracefully
✅ TEXT[] arrays correctly expand to multiple checkboxes
✅ All dates formatted DD/MM/YYYY
✅ All image URLs populated
✅ PDF generates without errors
✅ Manual visual inspection passes

---

## Reference Files

- **Field List**: `pdf-fields-complete-list.txt` (213 fields)
- **Mappings**: `CORRECTED_MASTER_PROMPT_V3_MINIMAL.md`
- **Analysis**: `OVER_ENGINEERED_FIELDS_COMPLETE.md`
- **Schema**: Use `/db` slash command
- **PDF Template**: `pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf`

---

**CRITICAL REMINDERS**:

1. Use EXACT PDF field names (including typos like `visibilty`, `mobilty`, `vsible`)
2. NO fabricated fields (only the 213 actual fields)
3. Handle NULL/missing data with `|| ''` or `|| false`
4. TEXT[] arrays must expand to individual checkboxes
5. Format dates as DD/MM/YYYY (UK format)
6. Validate 213 total fields processed
7. Test with real user data before deploying
