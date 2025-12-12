# PDF Field Mapping: Minimal Implementation (213 Fields)

**Version**: 3.0 - Stripped Down
**Date**: 2025-12-12
**Purpose**: Map database data to actual PDF fields only (no fabricated fields)

---

## Overview

**PDF Template Reality**: 213 total fields
- Text fields: 120
- Checkboxes: 92
- Signature: 1

**Data Sources**:
- `user_signup` table - Personal info, vehicle, insurance
- `incident_reports` table - Accident details
- `dvla_vehicle_info_new` table - DVLA vehicle lookups
- `incident_images` table - Image URLs
- `ai_transcription` table - Voice transcription
- `ai_summary` table - AI analysis

---

## TEXT FIELDS (120)

### User Information (from `user_signup`)

```javascript
// Personal details
name                        → driver_name
surname                     → driver_surname
email                       → driver_email
mobile                      → driver_mobile
date_of_birth              → driver_date_of_birth

// Address
street                      → driver_street
town                        → driver_town
postcode                    → driver_postcode
country                     → driver_country

// Vehicle
vehicle_license_plate       → license_plate
vehicle_make                → vehicle_make
vehicle_model               → vehicle_model
vehicle_colour              → vehicle_colour
vehicle_condition           → vehicle_condition

// Insurance
insurance_company           → insurance_company
policy_number               → policy_number
policy_holder               → policy_holder
cover_type                  → cover_type

// Emergency
emergency_contact_name      → emergency_contact
emergency_contact_number    → emergency_contact_number

// Recovery
recovery_company            → recovery_company
recovery_breakdown_number   → recovery_breakdown_number
recovery_breakdown_email    → recovery_breakdown_email

// Driving license
driving_license_number      → license_number
driving_license_picture     → (incident_images: image_type='driving_license')
```

### Vehicle Photos (from `incident_images`)

```javascript
vehicle_picture_front       → (image_type='vehicle_front')
vehicle_picture_back        → (image_type='vehicle_back')
vehicle_picture_driver_side → (image_type='vehicle_driver_side')
vehicle_picture_passenger_side → (image_type='vehicle_passenger_side')
```

### DVLA Lookup (from `dvla_vehicle_info_new` - user's vehicle)

```javascript
car_registration_number     → registration_number
dvla_make                   → make
dvla_model                  → model
dvla_colour                 → colour
dvla_year                   → year_of_manufacture
dvla_fuel_type              → fuel_type
dvla_mot_status             → mot_status
dvla_mot_expiry             → mot_expiry_date
dvla_tax_status             → road_tax_status
dvla_tax_due_date           → tax_due_date
```

### Incident Details (from `incident_reports`)

```javascript
// Date/time
accident_date               → when_did_the_accident_happen
accident_time               → what_time_did_the_accident_happen
Date69_af_date              → (formatted accident_date)

// Location
location                    → where_exactly_did_the_accident_happen
street_name_optional        → (parsed from location)
nearest_landmark            → nearest_landmark
what3words                  → what3words
location_map_screenshot     → (incident_images: image_type='map_screenshot')

// Junction details
junction_type               → junction_type
junction_control            → junction_control
traffic_light_status        → traffic_light_status

// Speed
speed_limit                 → speed_limit
your_speed                  → estimated_speed

// Road
additional_hazards          → additional_hazards

// Description
describe-damage-to-vehicle  → describe_damage_to_vehicle
damage_to_your_vehicle      → damage_to_your_vehicle

// Seatbelt
seatbelt_reason             → seatbelt_reason

// User manoeuvre
user_manoeuvre              → user_manoeuvre

// Breath test
user_breath_test            → breath_test
```

### Police Information (from `incident_reports`)

```javascript
accident_ref_number         → accident_reference_number
officer_name                → police_officer_name
officer_badge               → police_officer_badge
police_force                → police_force
```

### Other Vehicle (from `incident_reports` or separate table)

```javascript
other-vehicle-registration              → other_vehicle_registration
other-full-name                         → other_driver_name
other-contact-number                    → other_driver_number
other-email-address                     → other_driver_email
other-driving-license-number            → other_driver_license_number
other-drivers-insurance-company         → other_insurance_company
other-drivers-policy-number             → other_insurance_policy_number
other-drivers-policy-holder-name        → other_insurance_policy_holder
other-drivers-policy-cover-type         → other_insurance_cover_type

// DVLA lookup (other vehicle)
other-vehicle-look-up-make              → (dvla_vehicle_info_new: make, where registration = other_vehicle_registration)
other-vehicle-look-up-model             → (dvla_vehicle_info_new: model)
other-vehicle-look-up-colour            → (dvla_vehicle_info_new: colour)
other-vehicle-look-up-year              → (dvla_vehicle_info_new: year_of_manufacture)
other-vehicle-look-up-fuel-type         → (dvla_vehicle_info_new: fuel_type)
other-vehicle-look-up-mot-status        → (dvla_vehicle_info_new: mot_status)
other-vehicle-look-up-mot-expiry-date   → (dvla_vehicle_info_new: mot_expiry_date)
other-vehicle-look-up-tax-status        → (dvla_vehicle_info_new: road_tax_status)
other-vehicle-look-up-tax-due-date      → (dvla_vehicle_info_new: tax_due_date)
other-vehicle-look-up-insurance-status  → (dvla_vehicle_info_new: insurance_status)

other_breath_test                       → other_driver_breath_test
other_driver_vehicle_marked_for_export  → (dvla_vehicle_info_new: marked_for_export)
```

### Witness Information (from `incident_reports`)

```javascript
witness_name                → witness_name
witness_number              → witness_mobile_number
witness_mobile_number       → witness_mobile_number
witness_email_address       → witness_email
witness_email_2             → witness_email_2
witness_statement           → witness_statement
witness_statement_2         → witness_statement_2
additional_witnesses        → additional_witnesses
```

### Medical Information (from `incident_reports`)

```javascript
medical_how_are_you_feeling         → medical_how_feeling (TEXT field, NOT checkbox)
medical_injury_details              → medical_injury_details
medical_injury_severity             → medical_injury_severity
medical_treatment_recieved          → medical_treatment_received
medical_attention_from_who          → medical_attention_from_who
medical_hospital_name               → medical_hospital_name
further_medical_attention_needed    → further_medical_attention_needed
```

### Photo URLs (from `incident_images`)

```javascript
// Vehicle damage photos (5 fields in PDF)
vehicle_damage_photo_1_url  → (image_type='vehicle_damage_1')
vehicle_damage_photo_2_url  → (image_type='vehicle_damage_2')
vehicle_damage_photo_3_url  → (image_type='vehicle_damage_3')
vehicle_damage_photo_4_url  → (image_type='vehicle_damage_4')
vehicle_damage_photo_5_url  → (image_type='vehicle_damage_5')

// Other vehicle photos
other_vehicle_photo_1_url   → (image_type='other_vehicle_1')
other_vehicle_photo_2_url   → (image_type='other_vehicle_2')
other_vehicle_photo_3_url   → (image_type='other_vehicle_3')

// Scene photos
scene_photo_1_url           → (image_type='scene_1')
scene_photo_2_url           → (image_type='scene_2')
scene_photo_3_url           → (image_type='scene_3')
```

### Transcription & AI Analysis

```javascript
// Voice transcription (from `ai_transcription`)
voice_transcription                 → transcription
emergency_audio_transcription       → emergency_transcription
emergency_recording_timestamp       → emergency_recording_timestamp

// AI analysis (from `ai_summary` or `incident_reports` if stored there)
ai_summary                  → summary (AI-generated summary)
closing_statement           → closing_statement

// Metadata
analysis_metadata           → analysis_metadata
```

### Admin/Review Fields

```javascript
id                          → create_user_id
open                        → (status field if exists)
subscription_start_date     → created_at
quality_review              → quality_review
final_review                → final_review
```

---

## CHECKBOX FIELDS (92)

### Medical Symptoms (13 checkboxes)

**NOTE: These exact field names include PDF typos - use AS-IS:**

```javascript
medical_symptom_chest_pain
medical_symptom_uncontrolled_bleeding
medical_symptom_breathlessness
medical_symptom_limb_weakness
medical_symptom_dizziness
medical_symptom_loss_of_consciousness
medical_symptom_severe_headache
medical_symptom_change_in_vision
medical_symptom_abdominal_pain
medical_symptom_abdominal_bruising
medical_symptom_limb_pain_mobilty      // PDF typo: "mobilty"
medical_symptom_life _threatening      // PDF typo: space before underscore
medical_symptom_none

// Map from incident_reports boolean columns or TEXT[] array
```

### Medical Attention

```javascript
medical_ambulance_called
medical_attention_needed
```

### Weather Conditions (13 checkboxes)

**NOTE: One field has PDF typo - use AS-IS:**

```javascript
weather_bright_sunlight
weather_clear
weather_cloudy
weather_drizzle
weather_raining
weather_heavy_rain
weather_fog
weather_snow
weather_hail
weather_thunder_lightening     // PDF typo: "lightening"
weather_windy
weather_dusk

// Map from incident_reports boolean columns or TEXT[] array
```

### Road Conditions (6 checkboxes)

```javascript
road_condition_dry
road_condition_wet
road_condition_icy
road_condition_snow_covered
road_condition_slush_on_road
road_condition_loose_surface

// Map from incident_reports boolean columns or TEXT[] array
```

### Road Types (7 checkboxes)

```javascript
road_type_motorway
road_type_a_road
road_type_b_road
road_type_urban
road_type_rural
road_type_private_road
road_type_car_park

// Map from incident_reports: road_type field
```

### Traffic Conditions (4 checkboxes)

```javascript
traffic_conditions_no_traffic
traffic_conditions_light
traffic_conditions_moderate
traffic_conditions_heavy

// Map from incident_reports: traffic_conditions field
```

### Visibility Conditions (7 checkboxes)

**NOTE: Two fields have PDF typo - use AS-IS:**

```javascript
visibilty_good                     // PDF typo: "visibilty"
visibilty_street_lights            // PDF typo: "visibilty"
visibility_poor
visibility_very_poor
visibility_sun_glare
visibility_large_vehicle
visibility_restricted_structure

// Map from incident_reports: visibility_conditions field or boolean columns
```

### Road Markings (3 checkboxes)

**NOTE: Two fields have PDF typo - use AS-IS:**

```javascript
road_markings_vsible_yes           // PDF typo: "vsible"
road_markings_vsible_no            // PDF typo: "vsible"
road_markings_visible_partially

// Map from incident_reports: road_markings field
```

### Special Conditions (12 checkboxes)

```javascript
special_condition_animals
special_condition_crossing         // NOT "pedestrian_crossing"
special_condition_cyclists
special_condition_narrow_road
special_condition_oil_spills
special_condition_parked_vehicles
special_condition_pedestrians
special_condition_potholes
special_condition_roadworks
special_condition_school_zone
special_condition_traffic_calming
special_condition_workmen

// Map from incident_reports: special_conditions TEXT[] array or boolean columns
```

### Impact Points (10 checkboxes)

**NOTE: Prefix is "impact_point_" NOT "damage_":**

```javascript
impact_point_front
impact_point_front_driver
impact_point_front_passenger
impact_point_rear
impact_point_rear_driver
impact_point_rear_passenger
impact_point_driver_side
impact_point_passenger_side
impact_point_roof
impact_point_under_carriage        // Underscore, NOT "undercarriage"

// Map from incident_reports: impact_points TEXT[] array or boolean columns
```

### Vehicle Condition

```javascript
no_damage
no-visible-damage
```

### Police

```javascript
police_attend
police_attended

// Map from incident_reports: did_police_attend boolean
```

### Airbags

```javascript
airbags_deployed
airbags_deployed_no
```

### Seatbelt

```javascript
seatbelt_worn
seatbelt_worn_no
```

### Vehicle Status

```javascript
yes_i_drove_it_away
no_it_needed_to_be_towed
unsure _did_not_attempt            // PDF typo: space before underscore
```

### Witnesses

```javascript
witnesses_present
```

### User Vehicle

```javascript
usual_vehicle
driving_your_usual_vehicle_no
```

### Safety Check

```javascript
six_point_safety_check_completed
```

### Final Feeling

```javascript
final_feeling                      // CHECKBOX field, NOT text
```

---

## SIGNATURE FIELD (1)

```javascript
Signature70                         // User signature field
```

---

## Implementation Pattern

**Simple approach - no over-engineering:**

```javascript
// 1. Fetch data from database
const userData = await fetchUserData(userId);
const incidentData = await fetchIncidentData(userId);
const images = await fetchImages(userId);
const dvla = await fetchDVLAData(userId);

// 2. Map to PDF fields (exact field names)
const pdfData = {
  // Text fields
  name: userData.driver_name,
  surname: userData.driver_surname,
  email: userData.driver_email,
  // ... map all 120 text fields

  // Checkbox fields (true/false)
  medical_symptom_chest_pain: incidentData.chest_pain || false,
  weather_clear: incidentData.weather_clear || false,
  // ... map all 92 checkboxes

  // Signature
  Signature70: userData.signature_data
};

// 3. Fill PDF using pdf-lib
const form = pdfDoc.getForm();

// Text fields
Object.entries(pdfData).forEach(([fieldName, value]) => {
  if (typeof value === 'string') {
    const field = form.getTextField(fieldName);
    field.setText(value || '');
  }
});

// Checkboxes
Object.entries(pdfData).forEach(([fieldName, value]) => {
  if (typeof value === 'boolean') {
    const checkbox = form.getCheckBox(fieldName);
    if (value) checkbox.check();
  }
});
```

---

## Database → PDF Field Type Mappings

**TEXT[] Arrays → Multiple Checkboxes:**

```javascript
// Example: medical_symptoms TEXT[] → 13 checkboxes
const medicalSymptoms = incidentData.medical_symptoms || [];

const symptomMappings = {
  'chest_pain': 'medical_symptom_chest_pain',
  'bleeding': 'medical_symptom_uncontrolled_bleeding',
  'breathless': 'medical_symptom_breathlessness',
  // ... map all symptoms
};

medicalSymptoms.forEach(symptom => {
  const checkboxName = symptomMappings[symptom];
  if (checkboxName) {
    pdfData[checkboxName] = true;
  }
});
```

**Single Value → One Checkbox:**

```javascript
// Example: boolean column → checkbox
pdfData.police_attended = incidentData.did_police_attend || false;
```

**Image References → URLs:**

```javascript
// Find image by type
const drivingLicenseImage = images.find(img => img.image_type === 'driving_license');
pdfData.driving_license_picture = drivingLicenseImage?.file_url || '';
```

---

## Summary

**Total Fields Mapped**: 213 (exactly matches PDF template)

**Removed**:
- ❌ All fabricated visibility_condition_* fields (10)
- ❌ All fabricated road_marking_* fields (3)
- ❌ All fabricated special_condition_* fields (8)
- ❌ All fabricated damage_* fields (11)
- ❌ All fabricated photo URL fields (9+)
- ❌ All fabricated AI analysis fields (6)
- ❌ All incorrect text field names (15+)

**Added**: Nothing. Only map fields that actually exist in PDF template.

**Result**: Simple, working implementation mapping database data to real PDF fields.
