# Car Crash Lawyer AI - Field Mapping Document

**Generated:** 2025-12-16
**Source:** `src/services/adobePdfFormFillerService.js`
**PDF Template:** `pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf`
**Total Pages:** 18 (+ dynamic witness/vehicle pages)
**Total Fields:** 170+

---

## Overview

This document maps Supabase database columns to PDF form field names. Key notes:

1. **PDF field names often differ from database columns** - Some use hyphens, some have typos
2. **Pages 13-16 are HTML-rendered** - AI analysis pages use Puppeteer/HTML, not form fields
3. **Dynamic pages** - Witness and vehicle pages are appended dynamically
4. **checkFieldPair()** - Yes/No checkbox pairs where only one should be checked

---

## Database Tables Used

| Table | Purpose |
|-------|---------|
| `user_signup` | Personal info, vehicle, insurance |
| `incident_reports` | Accident details (170+ columns) |
| `incident_witnesses` | Witness information |
| `incident_other_vehicles` | Other vehicles involved |
| `user_documents` | Image URLs and processing status |
| `ai_listening_transcripts` | Emergency audio transcriptions |

---

## Page 1: Personal Information

| Database Column | PDF Field | Type | Notes |
|-----------------|-----------|------|-------|
| `user.name` | `name` | text | First name |
| `user.surname` | `surname` | text | Last name |
| `user.email` | `email` | text | Email address |
| `user.mobile` | `mobile` | text | Mobile phone |
| `user.street_address` | `street` | text | Street address |
| `user.street_address_optional` | `street_name_optional` | text | Address label |
| `user.town` | `town` | text | Town/City |
| `user.postcode` | `postcode` | text | Postcode |
| `user.country` | `country` | text | Country |
| `user.driving_license_number` | `driving_license_number` | text | Driving license |
| `user.date_of_birth` | `date_of_birth` | text | Date of birth |
| `user.car_registration_number` | `car_registration_number` | text | Vehicle registration |
| `user.vehicle_make` | `vehicle_make` | text | Vehicle make |
| `user.vehicle_model` | `vehicle_model` | text | Vehicle model |
| `user.vehicle_colour` | `vehicle_colour` | text | Vehicle colour |
| `user.vehicle_condition` | `vehicle_condition` | text | Vehicle condition |
| `user.recovery_company` | `recovery_company` | text | Recovery company |
| `user.recovery_breakdown_number` | `recovery_breakdown_number` | text | Breakdown number |
| `user.recovery_breakdown_email` | `recovery_breakdown_email` | text | Breakdown email |

---

## Page 2: Emergency Contact & Insurance

| Database Column | PDF Field | Type | Notes |
|-----------------|-----------|------|-------|
| `user.emergency_contact` | `emergency_contact_name` | text | Parsed from pipe-delimited format |
| `user.emergency_contact` | `emergency_contact_number` | text | Parsed from pipe-delimited format |
| `user.insurance_company` | `insurance_company` | text | |
| `user.policy_number` | `policy_number` | text | |
| `user.policy_holder` | `policy_holder` | text | |
| `user.cover_type` | `cover_type` | text | |
| `user.subscription_start_date` | `Date69_af_date` | text | DD/MM/YYYY format |
| `user.subscription_start_date` | `subscription_start_date` | text | Was "time_stamp" |

**Note:** Emergency contact is stored as `Name | Phone | Email | Relationship` and parsed at runtime.

---

## Page 3: Personal Documentation (Images)

| Database Column | PDF Field | Type | Notes |
|-----------------|-----------|------|-------|
| `driving_license_picture` | `driving_license_picture` | text | URL, 6pt font |
| `vehicle_front_image` | `vehicle_picture_front` | text | URL, 6pt font |
| `vehicle_driver_side_image` | `vehicle_picture_driver_side` | text | URL, 6pt font |
| `vehicle_passenger_side_image` | `vehicle_picture_passenger_side` | text | URL, 6pt font |
| `vehicle_back_image` | `vehicle_picture_back` | text | URL, 6pt font |

**Note:** Image URLs come from `user_documents` table via `dataFetcher.js` using SHORT keys (e.g., `driving_license`, not `driving_license_picture`).

---

## Page 4: Form Metadata & Safety Assessment

| Database Column | PDF Field | Type | Notes |
|-----------------|-----------|------|-------|
| `metadata.create_user_id` | `id` | text | User UUID |
| `incident.id` | `form_id` | text | Incident report UUID |
| `incident.created_at` | `submit_date` | text | Submission date |
| `incident.final_feeling` | `final_feeling` | checkbox | Derived from text content |
| `user.safety_status_timestamp` | `emergency_recording_timestamp` | text | |
| `incident.medical_attention_required` | `medical_attention_needed` | checkbox | Boolean or "Yes" |
| `incident.final_feeling` | `medical_how_are_you_feeling` | text | |
| `incident.medical_attention_from_who` | `medical_attention_from_who` | text | |
| `incident.medical_further_attention` | `further_medical_attention_needed` | text | |
| `incident.six_point_safety_check_completed` | `six_point_safety_check_completed` | checkbox | |
| `incident.emergency_contact_made` | `emergency_contact_made` | checkbox | |

### Medical Symptoms (Page 4)

| Database Column | PDF Field | Type | Notes |
|-----------------|-----------|------|-------|
| `medical_symptom_chest_pain` | `medical_symptom_chest_pain` | checkbox | |
| `medical_symptom_uncontrolled_bleeding` | `medical_symptom_uncontrolled_bleeding` | checkbox | |
| `medical_symptom_breathlessness` | `medical_symptom_breathlessness` | checkbox | |
| `medical_symptom_limb_weakness` | `medical_symptom_limb_weakness` | checkbox | |
| `medical_symptom_loss_of_consciousness` | `medical_symptom_loss_of_consciousness` | checkbox | |
| `medical_symptom_severe_headache` | `medical_symptom_severe_headache` | checkbox | |
| `medical_symptom_abdominal_bruising` | `medical_symptom_abdominal_bruising` | checkbox | |
| `medical_symptom_change_in_vision` | `medical_symptom_change_in_vision` | checkbox | |
| `medical_symptom_abdominal_pain` | `medical_symptom_abdominal_pain` | checkbox | |
| `medical_symptom_limb_pain_mobility` | `medical_symptom_limb_pain_mobilty` | checkbox | **PDF typo: "mobilty"** |
| `medical_symptom_life_threatening` | `medical_symptom_life _threatening` | checkbox | **PDF typo: space before underscore** |
| `medical_symptom_dizziness` | `medical_symptom_dizziness` | checkbox | |
| `medical_symptom_none` | `medical_symptom_none` | checkbox | |

---

## Page 5: Environmental Conditions

### Weather (12 checkboxes)

| Database Column | PDF Field | Notes |
|-----------------|-----------|-------|
| `weather_bright_sunlight` | `weather_bright_sunlight` | |
| `weather_clear` | `weather_clear` | |
| `weather_cloudy` | `weather_cloudy` | |
| `weather_raining` | `weather_raining` | |
| `weather_heavy_rain` | `weather_heavy_rain` | |
| `weather_drizzle` | `weather_drizzle` | |
| `weather_fog` | `weather_fog` | |
| `weather_snow` | `weather_snow` | |
| `weather_ice` | `weather_ice` | |
| `weather_windy` | `weather_windy` | |
| `weather_hail` | `weather_hail` | |
| `weather_thunder_lightning` | `weather_thunder_lightening` | **PDF typo: "lightening"** |
| `weather_dusk` | `weather_dusk` | Requires NeedAppearances flag |

### Road Conditions (6 checkboxes)

| Database Column | PDF Field |
|-----------------|-----------|
| `road_condition_dry` | `road_condition_dry` |
| `road_condition_wet` | `road_condition_wet` |
| `road_condition_icy` | `road_condition_icy` |
| `road_condition_snow_covered` | `road_condition_snow_covered` |
| `road_condition_loose_surface` | `road_condition_loose_surface` |
| `road_condition_slush_on_road` | `road_condition_slush_on_road` |

### Road Type (7 checkboxes)

| Database Column | PDF Field | Notes |
|-----------------|-----------|-------|
| `road_type_motorway` | `road_type_motorway` | |
| `road_type_a_road` | `road_type_a_road` | |
| `road_type_b_road` | `road_type_b_road` | |
| `road_type_urban_street` | `road_type_urban` | **DB has _street suffix** |
| `road_type_rural_road` | `road_type_rural` | **DB has _road suffix** |
| `road_type_car_park` | `road_type_car_park` | |
| `road_type_private_road` | `road_type_private_road` | |

---

## Page 6: Traffic, Visibility, Junction

### Speed & Traffic

| Database Column | PDF Field | Type |
|-----------------|-----------|------|
| `speed_limit` | `speed_limit` | text |
| `your_speed` | `your_speed` | text |
| `traffic_conditions_heavy` | `traffic_conditions_heavy` | checkbox |
| `traffic_conditions_moderate` | `traffic_conditions_moderate` | checkbox |
| `traffic_conditions_light` | `traffic_conditions_light` | checkbox |
| `traffic_conditions_no_traffic` | `traffic_conditions_no_traffic` | checkbox |

### Visibility

| Database Column | PDF Field | Notes |
|-----------------|-----------|-------|
| `visibility_good` | `visibilty_good` | **PDF typo: "visibilty"** |
| `visibility_poor` | `visibility_poor` | |
| `visibility_very_poor` | `visibility_very_poor` | |
| `visibility_street_lights` | `visibilty_street_lights` | **PDF typo: "visibilty"** |

### Road Markings

| Database Column | PDF Field | Notes |
|-----------------|-----------|-------|
| `road_markings_visible_yes` | `road_markings_vsible_yes` | **PDF typo: "vsible"** |
| `road_markings_visible_no` | `road_markings_vsible_no` | **PDF typo: "vsible"** |
| `road_markings_visible_partially` | `road_markings_visible_partially` | |

### Junction Details

| Database Column | PDF Field | Type |
|-----------------|-----------|------|
| `junction_type` | `junction_type` | text |
| `junction_control` | `junction_control` | text |
| `traffic_light_status` | `traffic_light_status` | text |
| `user_manoeuvre` | `user_manoeuvre` | text |

### Special Conditions (12 checkboxes)

| Database Column | PDF Field |
|-----------------|-----------|
| `special_condition_roadworks` | `special_condition_roadworks` |
| `special_condition_workmen` | `special_condition_workmen` |
| `special_condition_cyclists` | `special_condition_cyclists` |
| `special_condition_pedestrians` | `special_condition_pedestrians` |
| `special_condition_traffic_calming` | `special_condition_traffic_calming` |
| `special_condition_parked_vehicles` | `special_condition_parked_vehicles` |
| `special_condition_crossing` | `special_condition_crossing` |
| `special_condition_school_zone` | `special_condition_school_zone` |
| `special_condition_narrow_road` | `special_condition_narrow_road` |
| `special_condition_potholes` | `special_condition_potholes` |
| `special_condition_oil_spills` | `special_condition_oil_spills` |
| `special_condition_animals` | `special_condition_animals` |
| `additional_hazards` | `additional_hazards` | text |

---

## Page 7: Your Vehicle Details

### DVLA Lookup Data

| Database Column | PDF Field | Type |
|-----------------|-----------|------|
| `usual_vehicle` | `usual_vehicle` | checkbox (yes) |
| `usual_vehicle` | `driving_your_usual_vehicle_no` | checkbox (no) |
| `vehicle_license_plate` | `vehicle_license_plate` | text |
| `dvla_make` | `dvla_make` | text |
| `dvla_model` | `dvla_model` | text |
| `dvla_colour` | `dvla_colour` | text |
| `dvla_year` | `dvla_year` | text |
| `dvla_fuel_type` | `dvla_fuel_type` | text |
| `dvla_mot_status` | `dvla_mot_status` | text |
| `dvla_mot_expiry` | `dvla_mot_expiry` | text |
| `dvla_tax_status` | `dvla_tax_status` | text |
| `dvla_tax_due_date` | `dvla_tax_due_date` | text |
| `dvla_insurance_status` | `dvla_insurance_status` | text |

### Manual Entry (Fallback)

| Database Column | PDF Field |
|-----------------|-----------|
| `manual_make` | `manual_make` |
| `manual_model` | `manual_model` |
| `manual_colour` | `manual_colour` |
| `manual_year` | `manual_year` |

### Impact Points (10 checkboxes)

| Database Column | PDF Field | Notes |
|-----------------|-----------|-------|
| `impact_point_front` | `impact_point_front` | |
| `impact_point_front_driver` | `impact_point_front_driver` | |
| `impact_point_front_passenger` | `impact_point_front_passenger` | |
| `impact_point_driver_side` | `impact_point_driver_side` | |
| `impact_point_passenger_side` | `impact_point_passenger_side` | |
| `impact_point_rear_driver` | `impact_point_rear_driver` | |
| `impact_point_rear_passenger` | `impact_point_rear_passenger` | |
| `impact_point_rear` | `impact_point_rear` | |
| `impact_point_roof` | `impact_point_roof` | |
| `impact_point_undercarriage` | `impact_point_under_carriage` | **PDF: underscore position changed** |

### Damage & Driveability

| Database Column | PDF Field | Notes |
|-----------------|-----------|-------|
| `no_damage` | `no_damage` | checkbox |
| `no_visible_damage` | `no-visible-damage` | **PDF uses hyphen** |
| `damage_to_your_vehicle` | `damage_to_your_vehicle` | text |
| `describe_damage_to_vehicle` | `describe-damage-to-vehicle` | **PDF uses hyphens** |
| `describle_the_damage` | `describle_the_damage` | **DB has typo** |
| `vehicle_driveable` = 'yes' | `yes_i_drove_it_away` | checkbox |
| `vehicle_driveable` = 'no' | `no_it_needed_to_be_towed` | checkbox |
| `vehicle_driveable` = 'unsure' | `unsure _did_not_attempt` | **PDF: space before underscore** |

---

## Page 8: Other Vehicle Information

**IMPORTANT:** Page 8 PDF fields use **HYPHENS** instead of underscores!

### Other Driver Details

| Database Column | PDF Field |
|-----------------|-----------|
| `other_full_name` | `other-full-name` |
| `other_contact_number` | `other-contact-number` |
| `other_email_address` | `other-email-address` |
| `other_driving_license_number` | `other-driving-license-number` |

### Other Vehicle DVLA Data

| Database Column | PDF Field |
|-----------------|-----------|
| `other_vehicle_registration` | `other-vehicle-registration` |
| `other_vehicle_look_up_make` | `other-vehicle-look-up-make` |
| `other_vehicle_look_up_model` | `other-vehicle-look-up-model` |
| `other_vehicle_look_up_colour` | `other-vehicle-look-up-colour` |
| `other_vehicle_look_up_year` | `other-vehicle-look-up-year` |
| `other_vehicle_look_up_fuel_type` | `other-vehicle-look-up-fuel-type` |
| `other_vehicle_look_up_mot_status` | `other-vehicle-look-up-mot-status` |
| `other_vehicle_look_up_mot_expiry_date` | `other-vehicle-look-up-mot-expiry-date` |
| `other_vehicle_look_up_tax_status` | `other-vehicle-look-up-tax-status` |
| `other_vehicle_look_up_tax_due_date` | `other-vehicle-look-up-tax-due-date` |
| `other_vehicle_look_up_insurance_status` | `other-vehicle-look-up-insurance-status` |

### Other Driver Insurance

| Database Column | PDF Field |
|-----------------|-----------|
| `other_drivers_insurance_company` | `other-drivers-insurance-company` |
| `other_drivers_policy_number` | `other-drivers-policy-number` |
| `other_drivers_policy_holder_name` | `other-drivers-policy-holder-name` |
| `other_drivers_policy_cover_type` | `other-drivers-policy-cover-type` |

---

## Page 9: Witnesses

| Database Column | PDF Field | Notes |
|-----------------|-----------|-------|
| `witnesses_present` | `witnesses_present` | checkbox (yes) - checkFieldPair |
| `witnesses_present` | `witnesses_present_no` | checkbox (no) - checkFieldPair |

### Witness 1

| Database Column | PDF Field |
|-----------------|-----------|
| `witness_name` | `witness_name` |
| `witness_mobile_number` | `witness_mobile_number` |
| `witness_email_address` | `witness_email_address` |
| `witness_statement` | `witness_statement` |

### Witness 2

| Database Column | PDF Field |
|-----------------|-----------|
| `witness_name` | `witness_name_2` |
| `witness_mobile_number` | `witness_mobile_number_2` |
| `witness_email_address` | `witness_email_address_2` |
| `witness_email_address` | `witness_email_2` |
| `witness_statement` | `witness_statement_2` |

---

## Page 10: Police Involvement

| Database Column | PDF Field | Notes |
|-----------------|-----------|-------|
| `police_attended` | `police_attended` | checkbox (yes) - checkFieldPair |
| `police_attended` | `police_attended_no` | checkbox (no) - checkFieldPair |
| `police_attended` | `police_attend` | alternate field name |
| `police_force` | `police_force` | text |
| `accident_ref_number` | `accident_ref_number` | text |
| `officer_name` | `officer_name` | text |
| `officer_badge` | `officer_badge` | text |
| `user_breath_test` | `user_breath_test` | text |
| `other_breath_test` | `other_breath_test` | text |

---

## Pages 11-12: Evidence Collection

| Database Column | PDF Field | Notes |
|-----------------|-----------|-------|
| `file_url_record_detailed_account_of_what_happened` | `file_url_record_detailed_account_of_what_happened` | Audio URL |
| `what3words` | `location_map_screenshot` | Location map |
| `scene_photo_1_url` | `scene_photo_1_url` | |
| `scene_photo_2_url` | `scene_photo_2_url` | |
| `scene_photo_3_url` | `scene_photo_3_url` | |
| `other_vehicle_photo_1_url` | `other_vehicle_photo_1_url` | |
| `other_vehicle_photo_2_url` | `other_vehicle_photo_2_url` | |
| `other_vehicle_photo_3_url` | `other_vehicle_photo_3_url` | |
| `other_vehicle_photo_4_url` | `other_vehicle_photo_4_url` | |
| `other_vehicle_photo_5_url` | `other_vehicle_photo_5_url` | |
| `vehicle_damage_photo_1_url` | `vehicle_damage_photo_1_url` | |
| `vehicle_damage_photo_2_url` | `vehicle_damage_photo_2_url` | |
| `vehicle_damage_photo_3_url` | `vehicle_damage_photo_3_url` | |
| `vehicle_damage_photo_4_url` | `vehicle_damage_photo_4_url` | |
| `vehicle_damage_photo_5_url` | `vehicle_damage_photo_5_url` | |

---

## Pages 13-16: AI Analysis (HTML Rendered)

These pages are **NOT** form fields - they are rendered from HTML templates using Puppeteer and merged into the PDF.

| Database Column | HTML Template | Notes |
|-----------------|---------------|-------|
| `voice_transcription` | Page 13 | User's voice transcription |
| `analysis_metadata` | Page 13 | Model, timestamp, version |
| `quality_review` | Page 13 | AI quality review |
| `ai_summary` | Page 14 | AI-generated summary |
| `closing_statement` | Page 15 | AI closing statement (may span 2 pages) |
| `final_review` | Page 16 | AI final review |

**Source:** `src/services/aiAnalysisHtmlRenderer.js`

---

## Page 17: Legal Declaration

| Database Column | PDF Field | Notes |
|-----------------|-----------|-------|
| `user.name + user.surname` | `Signature70` | Digital signature |
| (current date) | `Date69_af_date` | Declaration date (DD/MM/YYYY) |

---

## Page 18: Emergency Audio (AI Eavesdropper)

| Database Column | PDF Field | Source Table |
|-----------------|-----------|--------------|
| `transcription_text` | `emergency_audio_transcription` | `ai_listening_transcripts` |
| `recorded_at` | `emergency_recording_timestamp` | `ai_listening_transcripts` |

---

## Known PDF Field Name Issues

### Typos in PDF Template

| Expected | Actual PDF Field | Location |
|----------|------------------|----------|
| `visibility_good` | `visibilty_good` | Page 6 |
| `visibility_street_lights` | `visibilty_street_lights` | Page 6 |
| `road_markings_visible_yes` | `road_markings_vsible_yes` | Page 6 |
| `road_markings_visible_no` | `road_markings_vsible_no` | Page 6 |
| `weather_thunder_lightning` | `weather_thunder_lightening` | Page 5 |
| `medical_symptom_limb_pain_mobility` | `medical_symptom_limb_pain_mobilty` | Page 4 |
| `medical_symptom_life_threatening` | `medical_symptom_life _threatening` | Page 4 (space!) |
| `medical_treatment_received` | `medical_treatment_recieved` | Page 4 |
| `vehicle_driveable_unsure` | `unsure _did_not_attempt` | Page 7 (space!) |
| `impact_point_undercarriage` | `impact_point_under_carriage` | Page 7 |

### Hyphen vs Underscore Differences

- **Page 8 (Other Vehicle):** All fields use **hyphens** (e.g., `other-full-name`)
- **Page 7 (Your Vehicle):** Some damage fields use **hyphens** (e.g., `describe-damage-to-vehicle`)
- **Other pages:** Use **underscores**

---

## Helper Functions Used

| Function | Purpose |
|----------|---------|
| `setFieldText(fieldName, value)` | Set text field value |
| `setFieldTextWithMaxFont(fieldName, value, maxSize)` | Set text with maximum font size |
| `setFieldTextWithFixedFont(fieldName, value, size)` | Set text with fixed font size |
| `setUrlFieldWithAutoFitFont(fieldName, value)` | Auto-fit font for URL fields |
| `checkField(fieldName, shouldCheck)` | Set checkbox value |
| `checkFieldPair(yesField, noField, value)` | Ensure only one of yes/no pair is checked |

---

## Data Flow

```
dataFetcher.js
     ↓
Fetches from 6+ tables:
- user_signup
- incident_reports
- incident_witnesses
- incident_other_vehicles
- user_documents
- ai_listening_transcripts
     ↓
adobePdfFormFillerService.js
     ↓
fillFormFields() maps DB → PDF
     ↓
Pages 1-12, 17-18: pdf-lib form filling
Pages 13-16: HTML → Puppeteer → PDF
     ↓
Merged final PDF
```

---

**Last Updated:** 2025-12-16
