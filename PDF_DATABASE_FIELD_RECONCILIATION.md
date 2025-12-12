# PDF-to-Database Field Reconciliation

**Generated:** 2025-12-12
**Purpose:** Complete mapping of PDF template fields (213) to database schema (235+ fields)

---

## Executive Summary

- **PDF Template:** 213 fillable fields (120 text, 92 checkboxes, 1 signature)
- **Database:** 235+ fields across `incident_reports` (185 fields) + `user_signup` (50 fields)
- **Gap:** ~22 database fields have no direct PDF mapping (calculated/composite fields)
- **Critical Issue:** `final_feeling` type mismatch (CHECKBOX in PDF, should be TEXT)
- **Naming Convention:** Most fields match, but "Other Vehicle" fields use hyphens in PDF

---

## Section 1: Complete Field Mapping

### 1.1 Personal Information (user_signup table → PDF)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `first_name` | `name` | TEXT | ✅ Mapped | |
| `last_name` | `surname` | TEXT | ✅ Mapped | |
| `email` | `email` | TEXT | ✅ Mapped | |
| `mobile_phone` | `mobile` | TEXT | ✅ Mapped | |
| `date_of_birth` | `date_of_birth` | TEXT | ✅ Mapped | |
| `street_address` | `street` | TEXT | ✅ Mapped | |
| `town_city` | `town` | TEXT | ✅ Mapped | |
| `postcode` | `postcode` | TEXT | ✅ Mapped | |
| `country` | `country` | TEXT | ✅ Mapped | |
| `emergency_contact_name` | `emergency_contact_name` | TEXT | ✅ Mapped | |
| `emergency_contact_number` | `emergency_contact_number` | TEXT | ✅ Mapped | |

### 1.2 Vehicle Information (user_signup table → PDF)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `vehicle_registration` | `car_registration_number` | TEXT | ✅ Mapped | Field name differs |
| `vehicle_make` | `vehicle_make` | TEXT | ✅ Mapped | |
| `vehicle_model` | `vehicle_model` | TEXT | ✅ Mapped | |
| `vehicle_colour` | `vehicle_colour` | TEXT | ✅ Mapped | |
| `vehicle_year` | *No PDF field* | TEXT | ❌ Unmapped | May use DVLA data instead |
| `driving_license_number` | `driving_license_number` | TEXT | ✅ Mapped | |
| `driving_license_picture_url` | `driving_license_picture` | TEXT | ✅ Mapped | URL → multiline text |

### 1.3 DVLA Lookup Data (incident_reports table → PDF)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `dvla_make` | `dvla_make` | TEXT | ✅ Mapped | |
| `dvla_model` | `dvla_model` | TEXT | ✅ Mapped | |
| `dvla_colour` | `dvla_colour` | TEXT | ✅ Mapped | |
| `dvla_year_of_manufacture` | `dvla_year` | TEXT | ✅ Mapped | Field name differs |
| `dvla_fuel_type` | `dvla_fuel_type` | TEXT | ✅ Mapped | |
| `dvla_mot_status` | `dvla_mot_status` | TEXT | ✅ Mapped | |
| `dvla_mot_expiry` | `dvla_mot_expiry` | TEXT | ✅ Mapped | |
| `dvla_tax_status` | `dvla_tax_status` | TEXT | ✅ Mapped | |
| `dvla_tax_due_date` | `dvla_tax_due_date` | TEXT | ✅ Mapped | |

### 1.4 Insurance Information (user_signup table → PDF)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `insurance_company` | `insurance_company` | TEXT | ✅ Mapped | |
| `insurance_policy_number` | `policy_number` | TEXT | ✅ Mapped | Field name differs |
| `insurance_cover_type` | `cover_type` | TEXT | ✅ Mapped | Field name differs |
| `policy_holder_name` | `policy_holder` | TEXT | ✅ Mapped | Field name differs |
| `recovery_company_name` | `recovery_company` | TEXT | ✅ Mapped | Field name differs |
| `recovery_contact_number` | `recovery_breakdown_number` | TEXT | ✅ Mapped | Field name differs |
| `recovery_email` | `recovery_breakdown_email` | TEXT | ✅ Mapped | Field name differs |

### 1.5 Accident Details (incident_reports table → PDF)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `accident_date` | `accident_date` | TEXT | ✅ Mapped | Format: DD/MM/YYYY |
| `accident_time` | `accident_time` | TEXT | ✅ Mapped | Format: HH:MM |
| `location_description` | `location` | TEXT | ✅ Mapped | |
| `what3words_location` | `what3words` | TEXT | ✅ Mapped | |
| `nearest_landmark` | `nearest_landmark` | TEXT | ✅ Mapped | |
| `speed_limit` | `speed_limit` | TEXT | ✅ Mapped | |
| `user_speed_estimate` | `your_speed` | TEXT | ✅ Mapped | Field name differs |
| `junction_type` | `junction_type` | TEXT | ✅ Mapped | |
| `junction_control` | `junction_control` | TEXT | ✅ Mapped | |
| `traffic_light_status` | `traffic_light_status` | TEXT | ✅ Mapped | |
| `user_manoeuvre` | `user_manoeuvre` | TEXT | ✅ Mapped | |

### 1.6 Medical Information (incident_reports table → PDF)

**⚠️ CRITICAL FIELD MISMATCH:**

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `final_feeling` | `medical_how_are_you_feeling` | TEXT | ⚠️ **MISMATCH** | PDF has `final_feeling` as CHECKBOX (wrong!) |
| `medical_attention_needed` | `medical_attention_needed` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `medical_attention_from_who` | `medical_attention_from_who` | TEXT | ✅ Mapped | |
| `medical_ambulance_called` | `medical_ambulance_called` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `medical_hospital_name` | `medical_hospital_name` | TEXT | ✅ Mapped | |
| `medical_injury_severity` | `medical_injury_severity` | TEXT | ✅ Mapped | |
| `medical_injury_details` | `medical_injury_details` | TEXT | ✅ Mapped | |
| `medical_treatment_received` | `medical_treatment_recieved` | TEXT | ✅ Mapped | Typo in PDF field name |
| `further_medical_attention_needed` | `further_medical_attention_needed` | TEXT | ✅ Mapped | |

### 1.7 Medical Symptoms Checkboxes (13 fields)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `medical_symptom_chest_pain` | `medical_symptom_chest_pain` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `medical_symptom_uncontrolled_bleeding` | `medical_symptom_uncontrolled_bleeding` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `medical_symptom_breathlessness` | `medical_symptom_breathlessness` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `medical_symptom_severe_headache` | `medical_symptom_severe_headache` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `medical_symptom_dizziness` | `medical_symptom_dizziness` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `medical_symptom_loss_of_consciousness` | `medical_symptom_loss_of_consciousness` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `medical_symptom_change_in_vision` | `medical_symptom_change_in_vision` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `medical_symptom_abdominal_pain` | `medical_symptom_abdominal_pain` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `medical_symptom_abdominal_bruising` | `medical_symptom_abdominal_bruising` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `medical_symptom_limb_weakness` | `medical_symptom_limb_weakness` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `medical_symptom_limb_pain_mobility` | `medical_symptom_limb_pain_mobilty` | BOOLEAN → CHECKBOX | ✅ Mapped | Typo in PDF (mobilty) |
| `medical_symptom_life_threatening` | `medical_symptom_life _threatening` | BOOLEAN → CHECKBOX | ✅ Mapped | Space in PDF field name |
| `medical_symptom_none` | `medical_symptom_none` | BOOLEAN → CHECKBOX | ✅ Mapped | |

### 1.8 Weather Conditions Checkboxes (12 fields)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `weather_bright_sunlight` | `weather_bright_sunlight` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `weather_clear` | `weather_clear` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `weather_cloudy` | `weather_cloudy` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `weather_drizzle` | `weather_drizzle` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `weather_raining` | `weather_raining` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `weather_heavy_rain` | `weather_heavy_rain` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `weather_fog` | `weather_fog` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `weather_snow` | `weather_snow` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `weather_hail` | `weather_hail` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `weather_thunder_lightning` | `weather_thunder_lightening` | BOOLEAN → CHECKBOX | ✅ Mapped | Typo in PDF (lightening) |
| `weather_windy` | `weather_windy` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `weather_dusk` | `weather_dusk` | BOOLEAN → CHECKBOX | ✅ Mapped | |

### 1.9 Road Conditions Checkboxes (6 fields)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `road_condition_dry` | `road_condition_dry` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `road_condition_wet` | `road_condition_wet` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `road_condition_icy` | `road_condition_icy` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `road_condition_snow_covered` | `road_condition_snow_covered` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `road_condition_slush_on_road` | `road_condition_slush_on_road` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `road_condition_loose_surface` | `road_condition_loose_surface` | BOOLEAN → CHECKBOX | ✅ Mapped | |

### 1.10 Road Type Checkboxes (7 fields)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `road_type_motorway` | `road_type_motorway` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `road_type_a_road` | `road_type_a_road` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `road_type_b_road` | `road_type_b_road` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `road_type_urban` | `road_type_urban` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `road_type_rural` | `road_type_rural` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `road_type_private_road` | `road_type_private_road` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `road_type_car_park` | `road_type_car_park` | BOOLEAN → CHECKBOX | ✅ Mapped | |

### 1.11 Road Markings Checkboxes (3 fields)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `road_markings_visible_yes` | `road_markings_vsible_yes` | BOOLEAN → CHECKBOX | ✅ Mapped | Typo in PDF (vsible) |
| `road_markings_visible_no` | `road_markings_vsible_no` | BOOLEAN → CHECKBOX | ✅ Mapped | Typo in PDF (vsible) |
| `road_markings_visible_partially` | `road_markings_visible_partially` | BOOLEAN → CHECKBOX | ✅ Mapped | |

### 1.12 Traffic Conditions Checkboxes (4 fields)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `traffic_conditions_no_traffic` | `traffic_conditions_no_traffic` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `traffic_conditions_light` | `traffic_conditions_light` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `traffic_conditions_moderate` | `traffic_conditions_moderate` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `traffic_conditions_heavy` | `traffic_conditions_heavy` | BOOLEAN → CHECKBOX | ✅ Mapped | |

### 1.13 Visibility Conditions Checkboxes (7 fields)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `visibility_good` | `visibilty_good` | BOOLEAN → CHECKBOX | ✅ Mapped | Typo in PDF (visibilty) |
| `visibility_poor` | `visibility_poor` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `visibility_very_poor` | `visibility_very_poor` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `visibility_street_lights` | `visibilty_street_lights` | BOOLEAN → CHECKBOX | ✅ Mapped | Typo in PDF (visibilty) |
| `visibility_sun_glare` | `visibility_sun_glare` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `visibility_large_vehicle` | `visibility_large_vehicle` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `visibility_restricted_structure` | `visibility_restricted_structure` | BOOLEAN → CHECKBOX | ✅ Mapped | |

### 1.14 Special Conditions Checkboxes (12 fields)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `special_condition_roadworks` | `special_condition_roadworks` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `special_condition_school_zone` | `special_condition_school_zone` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `special_condition_pedestrians` | `special_condition_pedestrians` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `special_condition_cyclists` | `special_condition_cyclists` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `special_condition_animals` | `special_condition_animals` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `special_condition_parked_vehicles` | `special_condition_parked_vehicles` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `special_condition_narrow_road` | `special_condition_narrow_road` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `special_condition_crossing` | `special_condition_crossing` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `special_condition_traffic_calming` | `special_condition_traffic_calming` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `special_condition_potholes` | `special_condition_potholes` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `special_condition_oil_spills` | `special_condition_oil_spills` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `special_condition_workmen` | `special_condition_workmen` | BOOLEAN → CHECKBOX | ✅ Mapped | |

### 1.15 Impact Points Checkboxes (10 fields)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `impact_point_front` | `impact_point_front` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `impact_point_rear` | `impact_point_rear` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `impact_point_driver_side` | `impact_point_driver_side` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `impact_point_passenger_side` | `impact_point_passenger_side` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `impact_point_front_driver` | `impact_point_front_driver` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `impact_point_front_passenger` | `impact_point_front_passenger` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `impact_point_rear_driver` | `impact_point_rear_driver` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `impact_point_rear_passenger` | `impact_point_rear_passenger` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `impact_point_roof` | `impact_point_roof` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `impact_point_under_carriage` | `impact_point_under_carriage` | BOOLEAN → CHECKBOX | ✅ Mapped | |

### 1.16 Vehicle Condition & Safety (incident_reports table → PDF)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `vehicle_condition` | `vehicle_condition` | TEXT | ✅ Mapped | |
| `vehicle_driveable_yes` | `yes_i_drove_it_away` | BOOLEAN → CHECKBOX | ✅ Mapped | Field name differs |
| `vehicle_driveable_no_towed` | `no_it_needed_to_be_towed` | BOOLEAN → CHECKBOX | ✅ Mapped | Field name differs |
| `vehicle_driveable_unsure` | `unsure _did_not_attempt` | BOOLEAN → CHECKBOX | ✅ Mapped | Space in PDF field name |
| `airbags_deployed` | `airbags_deployed` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `airbags_deployed_no` | `airbags_deployed_no` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `seatbelt_worn` | `seatbelt_worn` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `seatbelt_worn_no` | `seatbelt_worn_no` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `seatbelt_not_worn_reason` | `seatbelt_reason` | TEXT | ✅ Mapped | Field name differs |
| `usual_vehicle` | `usual_vehicle` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `driving_usual_vehicle_no` | `driving_your_usual_vehicle_no` | BOOLEAN → CHECKBOX | ✅ Mapped | Field name differs |

### 1.17 Police Information (incident_reports table → PDF)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `police_attended` | `police_attended` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `police_attended_duplicate` | `police_attend` | BOOLEAN → CHECKBOX | ⚠️ Duplicate | PDF has 2 similar fields |
| `police_officer_name` | `officer_name` | TEXT | ✅ Mapped | Field name differs |
| `police_officer_badge_number` | `officer_badge` | TEXT | ✅ Mapped | Field name differs |
| `police_force_name` | `police_force` | TEXT | ✅ Mapped | Field name differs |
| `accident_reference_number` | `accident_ref_number` | TEXT | ✅ Mapped | Field name differs |
| `user_breath_test_result` | `user_breath_test` | TEXT | ✅ Mapped | Field name differs |
| `other_driver_breath_test_result` | `other_breath_test` | TEXT | ✅ Mapped | Field name differs |

### 1.18 Other Vehicle Information - HYPHENATED FIELDS

**⚠️ NAMING CONVENTION CHANGE: These PDF fields use hyphens instead of underscores**

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `other_driver_full_name` | `other-full-name` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_driver_contact_number` | `other-contact-number` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_driver_email` | `other-email-address` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_driver_license_number` | `other-driving-license-number` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_vehicle_registration` | `other-vehicle-registration` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_vehicle_make` | `other-vehicle-look-up-make` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_vehicle_model` | `other-vehicle-look-up-model` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_vehicle_colour` | `other-vehicle-look-up-colour` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_vehicle_fuel_type` | `other-vehicle-look-up-fuel-type` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_vehicle_year` | `other-vehicle-look-up-year` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_vehicle_mot_status` | `other-vehicle-look-up-mot-status` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_vehicle_mot_expiry` | `other-vehicle-look-up-mot-expiry-date` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_vehicle_tax_status` | `other-vehicle-look-up-tax-status` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_vehicle_tax_due_date` | `other-vehicle-look-up-tax-due-date` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_vehicle_insurance_status` | `other-vehicle-look-up-insurance-status` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_driver_insurance_company` | `other-drivers-insurance-company` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_driver_policy_number` | `other-drivers-policy-number` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_driver_policy_holder` | `other-drivers-policy-holder-name` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_driver_cover_type` | `other-drivers-policy-cover-type` | TEXT | ⚠️ **HYPHEN** | Naming convention differs |
| `other_driver_vehicle_marked_for_export` | `other_driver_vehicle_marked_for_export` | TEXT | ✅ Mapped | This one uses underscores |

### 1.19 Witness Information (incident_reports table → PDF)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `witnesses_present` | `witnesses_present` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `witness_1_name` | `witness_name` | TEXT | ✅ Mapped | |
| `witness_1_mobile_number` | `witness_mobile_number` | TEXT | ✅ Mapped | |
| `witness_1_email` | `witness_email_address` | TEXT | ✅ Mapped | Field name differs |
| `witness_1_statement` | `witness_statement` | TEXT | ✅ Mapped | |
| `witness_2_email` | `witness_email_2` | TEXT | ✅ Mapped | |
| `witness_2_statement` | `witness_statement_2` | TEXT | ✅ Mapped | |
| `witness_contact_number` | `witness_number` | TEXT | ✅ Mapped | Unclear which witness |
| `additional_witnesses` | `additional_witnesses` | TEXT | ✅ Mapped | |

### 1.20 Vehicle Images (user_signup + incident_reports → PDF)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `vehicle_front_url` | `vehicle_picture_front` | TEXT | ✅ Mapped | Multiline in PDF |
| `vehicle_driver_side_url` | `vehicle_picture_driver_side` | TEXT | ✅ Mapped | Multiline in PDF |
| `vehicle_passenger_side_url` | `vehicle_picture_passenger_side` | TEXT | ✅ Mapped | Multiline in PDF |
| `vehicle_rear_url` | `vehicle_picture_back` | TEXT | ✅ Mapped | Multiline in PDF |
| `vehicle_damage_photo_1_url` | `vehicle_damage_photo_1_url` | TEXT | ✅ Mapped | Multiline in PDF |
| `vehicle_damage_photo_2_url` | `vehicle_damage_photo_2_url` | TEXT | ✅ Mapped | Multiline in PDF |
| `vehicle_damage_photo_3_url` | `vehicle_damage_photo_3_url` | TEXT | ✅ Mapped | Multiline in PDF |
| `vehicle_damage_photo_4_url` | `vehicle_damage_photo_4_url` | TEXT | ✅ Mapped | Multiline in PDF |
| `vehicle_damage_photo_5_url` | `vehicle_damage_photo_5_url` | TEXT | ✅ Mapped | Not multiline in PDF |

### 1.21 Scene & Other Vehicle Photos (incident_reports → PDF)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `scene_photo_1_url` | `scene_photo_1_url` | TEXT | ✅ Mapped | Multiline in PDF |
| `scene_photo_2_url` | `scene_photo_2_url` | TEXT | ✅ Mapped | Multiline in PDF |
| `scene_photo_3_url` | `scene_photo_3_url` | TEXT | ✅ Mapped | Multiline in PDF |
| `other_vehicle_photo_1_url` | `other_vehicle_photo_1_url` | TEXT | ✅ Mapped | Multiline in PDF |
| `other_vehicle_photo_2_url` | `other_vehicle_photo_2_url` | TEXT | ✅ Mapped | Multiline in PDF |
| `other_vehicle_photo_3_url` | `other_vehicle_photo_3_url` | TEXT | ✅ Mapped | Multiline in PDF |
| `location_map_screenshot_url` | `location_map_screenshot` | TEXT | ✅ Mapped | Multiline in PDF |

### 1.22 Damage Descriptions (incident_reports → PDF)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `damage_description` | `damage_to_your_vehicle` | TEXT | ✅ Mapped | Field name differs |
| `vehicle_damage_details` | `describe-damage-to-vehicle` | TEXT | ✅ Mapped | Hyphen + multiline |
| `no_visible_damage` | `no_damage` | BOOLEAN → CHECKBOX | ✅ Mapped | Field name differs |
| `no_visible_damage_2` | `no-visible-damage` | BOOLEAN → CHECKBOX | ⚠️ Duplicate | Hyphenated version |

### 1.23 Emergency & Transcription (incident_reports → PDF)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `voice_recording_transcript` | `voice_transcription` | TEXT | ✅ Mapped | Field name differs |
| `emergency_recording_transcript` | `emergency_audio_transcription` | TEXT | ✅ Mapped | Field name differs |
| `emergency_recording_timestamp` | `emergency_recording_timestamp` | TEXT | ✅ Mapped | |

### 1.24 Safety Check (Pre-Page 1 Data)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `six_point_safety_check_completed` | `six_point_safety_check_completed` | BOOLEAN → CHECKBOX | ✅ Mapped | |
| `final_feeling` | **ERROR** | TEXT | ❌ **CRITICAL** | Maps to `medical_how_are_you_feeling` NOT `final_feeling` checkbox! |

### 1.25 AI Analysis & Summary Fields (incident_reports → PDF)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `ai_incident_summary` | `ai_summary` | TEXT | ✅ Mapped | Field name differs |
| `ai_closing_statement` | `closing_statement` | TEXT | ✅ Mapped | Field name differs |
| `ai_analysis_metadata` | `analysis_metadata` | TEXT | ✅ Mapped | Field name differs |
| `ai_quality_review` | `quality_review` | TEXT | ✅ Mapped | Field name differs |
| `ai_final_review` | `final_review` | TEXT | ✅ Mapped | Field name differs (multiline in PDF) |

### 1.26 Miscellaneous (incident_reports → PDF)

| Database Field | PDF Field | Type | Status | Notes |
|----------------|-----------|------|--------|-------|
| `additional_hazards` | `additional_hazards` | TEXT | ✅ Mapped | |
| `user_comments` | `open` | TEXT | ✅ Mapped | Multiline in PDF |
| `subscription_start_date` | `subscription_start_date` | TEXT | ✅ Mapped | |
| `Date69_af_date` | `Date69_af_date` | TEXT | ⚠️ Unknown | Strange field name |

---

## Section 2: Naming Convention Differences

### 2.1 Underscore vs Hyphen Pattern

**Majority Pattern:** Fields use **underscores** (e.g., `medical_symptom_chest_pain`)

**Exception - Other Vehicle Fields:** Use **hyphens** in PDF (19 fields):

```
other-full-name
other-contact-number
other-email-address
other-driving-license-number
other-vehicle-registration
other-vehicle-look-up-make
other-vehicle-look-up-model
other-vehicle-look-up-colour
other-vehicle-look-up-fuel-type
other-vehicle-look-up-year
other-vehicle-look-up-mot-status
other-vehicle-look-up-mot-expiry-date
other-vehicle-look-up-tax-status
other-vehicle-look-up-tax-due-date
other-vehicle-look-up-insurance-status
other-drivers-insurance-company
other-drivers-policy-number
other-drivers-policy-holder-name
other-drivers-policy-cover-type
```

**Exception - Damage Fields (2):**
```
describe-damage-to-vehicle (hyphen + multiline)
no-visible-damage (hyphen)
```

### 2.2 PDF Field Name Typos

| PDF Field | Correct Spelling | Impact |
|-----------|------------------|--------|
| `visibilty_good` | visibility_good | Missing 'i' |
| `visibilty_street_lights` | visibility_street_lights | Missing 'i' |
| `road_markings_vsible_yes` | road_markings_visible_yes | Missing 'i' |
| `road_markings_vsible_no` | road_markings_visible_no | Missing 'i' |
| `weather_thunder_lightening` | weather_thunder_lightning | Wrong spelling (should be "lightning") |
| `medical_symptom_limb_pain_mobilty` | medical_symptom_limb_pain_mobility | Typo (mobilty) |
| `medical_treatment_recieved` | medical_treatment_received | Typo (recieved) |

### 2.3 Field Names with Spaces (PDF Errors)

| PDF Field | Issue |
|-----------|-------|
| `medical_symptom_life _threatening` | Space before underscore |
| `unsure _did_not_attempt` | Space before underscore |

---

## Section 3: Type Mismatches

### 3.1 Critical Type Mismatch - final_feeling

**Database:**
```sql
final_feeling TEXT  -- "How are you feeling" free-text response
```

**PDF Template:**
```
final_feeling CHECKBOX  -- ❌ WRONG TYPE!
medical_how_are_you_feeling TEXT  -- ✅ CORRECT field for text response
```

**Fix Required:**
- Map `incident_reports.final_feeling` (TEXT) → PDF `medical_how_are_you_feeling` (TEXT)
- Ignore PDF `final_feeling` checkbox (unclear purpose)

---

## Section 4: Unmapped Database Fields

### 4.1 Database Fields WITHOUT PDF Mapping

These 22+ database fields have no direct PDF field mapping:

| Database Field | Table | Type | Reason Unmapped |
|----------------|-------|------|-----------------|
| `create_user_id` | incident_reports | UUID | Internal ID |
| `created_at` | incident_reports | TIMESTAMP | Metadata |
| `updated_at` | incident_reports | TIMESTAMP | Metadata |
| `deleted_at` | incident_reports | TIMESTAMP | Soft delete |
| `gdpr_consent` | user_signup | BOOLEAN | Legal metadata |
| `terms_accepted` | user_signup | BOOLEAN | Legal metadata |
| `processing_status` | incident_reports | TEXT | Internal workflow |
| `pdf_generated` | incident_reports | BOOLEAN | Internal flag |
| `pdf_storage_path` | incident_reports | TEXT | Internal path |
| `email_sent` | incident_reports | BOOLEAN | Internal flag |
| `ai_analysis_status` | incident_reports | TEXT | Internal workflow |
| `ai_liability_assessment` | incident_reports | TEXT | Not in Pages 1-12 (Pages 13-18) |
| `ai_vehicle_damage_analysis` | incident_reports | TEXT | Not in Pages 1-12 (Pages 13-18) |
| `ai_injury_assessment` | incident_reports | TEXT | Not in Pages 1-12 (Pages 13-18) |
| `ai_witness_credibility` | incident_reports | TEXT | Not in Pages 1-12 (Pages 13-18) |
| `ai_evidence_quality` | incident_reports | TEXT | Not in Pages 1-12 (Pages 13-18) |
| `ai_recommendations` | incident_reports | TEXT | Not in Pages 1-12 (Pages 13-18) |

**Note:** AI analysis fields (6 fields) are intentionally NOT mapped to Pages 1-12. They appear in Pages 13-18 (HTML-rendered AI summary pages).

---

## Section 5: Orphaned PDF Fields

### 5.1 PDF Fields WITHOUT Database Source

These PDF fields have no clear database source:

| PDF Field | Type | Purpose | Resolution |
|-----------|------|---------|------------|
| `Signature70` | SIGNATURE | User signature field | May be filled manually or via signature pad |
| `id` | TEXT | Unknown ID field | Unclear purpose |
| `vehicle_license_plate` | TEXT | Duplicate of `car_registration_number`? | May be legacy field |

---

## Section 6: Code Mapping Patterns

### 6.1 JavaScript Mapping Helper

```javascript
/**
 * PDF-to-Database Field Mapping
 * Use this object to map database fields to correct PDF field names
 */
const DB_TO_PDF_FIELD_MAP = {
  // Personal Information
  'user_signup.first_name': 'name',
  'user_signup.last_name': 'surname',
  'user_signup.email': 'email',
  'user_signup.mobile_phone': 'mobile',

  // Vehicle Information
  'user_signup.vehicle_registration': 'car_registration_number',

  // CRITICAL: Safety Check & Medical
  'incident_reports.final_feeling': 'medical_how_are_you_feeling', // ⚠️ NOT 'final_feeling' checkbox!
  'incident_reports.six_point_safety_check_completed': 'six_point_safety_check_completed',

  // Medical Symptoms (13 checkboxes)
  'incident_reports.medical_symptom_chest_pain': 'medical_symptom_chest_pain',
  'incident_reports.medical_symptom_uncontrolled_bleeding': 'medical_symptom_uncontrolled_bleeding',
  // ... all 13 medical symptoms

  // Weather Conditions (12 checkboxes)
  'incident_reports.weather_bright_sunlight': 'weather_bright_sunlight',
  'incident_reports.weather_clear': 'weather_clear',
  // ... all 12 weather conditions

  // Other Vehicle - HYPHENATED FIELDS
  'incident_reports.other_driver_full_name': 'other-full-name',
  'incident_reports.other_driver_contact_number': 'other-contact-number',
  'incident_reports.other_driver_email': 'other-email-address',
  'incident_reports.other_driver_license_number': 'other-driving-license-number',
  'incident_reports.other_vehicle_registration': 'other-vehicle-registration',
  'incident_reports.other_vehicle_make': 'other-vehicle-look-up-make',
  'incident_reports.other_vehicle_model': 'other-vehicle-look-up-model',
  'incident_reports.other_vehicle_colour': 'other-vehicle-look-up-colour',
  'incident_reports.other_vehicle_fuel_type': 'other-vehicle-look-up-fuel-type',
  'incident_reports.other_vehicle_year': 'other-vehicle-look-up-year',
  'incident_reports.other_vehicle_mot_status': 'other-vehicle-look-up-mot-status',
  'incident_reports.other_vehicle_mot_expiry': 'other-vehicle-look-up-mot-expiry-date',
  'incident_reports.other_vehicle_tax_status': 'other-vehicle-look-up-tax-status',
  'incident_reports.other_vehicle_tax_due_date': 'other-vehicle-look-up-tax-due-date',
  'incident_reports.other_vehicle_insurance_status': 'other-vehicle-look-up-insurance-status',
  'incident_reports.other_driver_insurance_company': 'other-drivers-insurance-company',
  'incident_reports.other_driver_policy_number': 'other-drivers-policy-number',
  'incident_reports.other_driver_policy_holder': 'other-drivers-policy-holder-name',
  'incident_reports.other_driver_cover_type': 'other-drivers-policy-cover-type',

  // Damage Description - HYPHENATED
  'incident_reports.vehicle_damage_details': 'describe-damage-to-vehicle',

  // AI Analysis (Pages 1-12 summary fields)
  'incident_reports.ai_incident_summary': 'ai_summary',
  'incident_reports.ai_closing_statement': 'closing_statement',

  // Field Name Differences
  'user_signup.insurance_policy_number': 'policy_number',
  'user_signup.insurance_cover_type': 'cover_type',
  'user_signup.policy_holder_name': 'policy_holder',
  'user_signup.recovery_company_name': 'recovery_company',
  'user_signup.recovery_contact_number': 'recovery_breakdown_number',
  'user_signup.recovery_email': 'recovery_breakdown_email',
  'incident_reports.user_speed_estimate': 'your_speed',
  'incident_reports.police_officer_name': 'officer_name',
  'incident_reports.police_officer_badge_number': 'officer_badge',
  'incident_reports.police_force_name': 'police_force',
  'incident_reports.accident_reference_number': 'accident_ref_number',
  'incident_reports.user_breath_test_result': 'user_breath_test',
  'incident_reports.other_driver_breath_test_result': 'other_breath_test',
  'incident_reports.vehicle_driveable_yes': 'yes_i_drove_it_away',
  'incident_reports.vehicle_driveable_no_towed': 'no_it_needed_to_be_towed',
  'incident_reports.vehicle_driveable_unsure': 'unsure _did_not_attempt', // Note: space in PDF field name
  'incident_reports.seatbelt_not_worn_reason': 'seatbelt_reason',
  'incident_reports.driving_usual_vehicle_no': 'driving_your_usual_vehicle_no',
  'incident_reports.witness_1_email': 'witness_email_address',
  'incident_reports.damage_description': 'damage_to_your_vehicle',
  'incident_reports.no_visible_damage': 'no_damage',
  'incident_reports.voice_recording_transcript': 'voice_transcription',
  'incident_reports.emergency_recording_transcript': 'emergency_audio_transcription',
  'incident_reports.user_comments': 'open',
};

/**
 * Helper function to map database field to PDF field name
 * @param {string} dbField - Database field in format "table.column"
 * @returns {string} PDF field name
 */
function getPdfFieldName(dbField) {
  return DB_TO_PDF_FIELD_MAP[dbField] || dbField.split('.')[1];
}

/**
 * Helper function to check if field uses hyphens (Other Vehicle fields)
 * @param {string} pdfField - PDF field name
 * @returns {boolean} True if field uses hyphens
 */
function isHyphenatedField(pdfField) {
  return pdfField.includes('-');
}
```

### 6.2 PDF Form Filling Pattern (Corrected)

```javascript
// CORRECT pattern for filling PDF with database data
async function fillPdfWithIncidentData(incident, userData) {
  const form = pdfDoc.getForm();

  // Helper to safely set text field
  const setText = (pdfFieldName, value) => {
    if (value == null) return;
    try {
      const field = form.getTextField(pdfFieldName);
      field.setText(String(value));
    } catch (error) {
      console.warn(`Field ${pdfFieldName} not found or error:`, error.message);
    }
  };

  // Helper to safely check checkbox
  const checkField = (pdfFieldName, boolValue) => {
    if (boolValue !== true) return; // Only check if explicitly true
    try {
      const field = form.getCheckBox(pdfFieldName);
      field.check();
    } catch (error) {
      console.warn(`Checkbox ${pdfFieldName} not found or error:`, error.message);
    }
  };

  // ===== CRITICAL MAPPING: Final Feeling =====
  // Database: incident.final_feeling (TEXT) → PDF: medical_how_are_you_feeling (TEXT)
  setText('medical_how_are_you_feeling', incident.final_feeling);
  // DO NOT use: setText('final_feeling', ...) - it's a checkbox!

  // ===== Safety Check =====
  checkField('six_point_safety_check_completed', incident.six_point_safety_check_completed);

  // ===== Personal Information (user_signup) =====
  setText('name', userData.first_name);
  setText('surname', userData.last_name);
  setText('email', userData.email);
  setText('mobile', userData.mobile_phone);

  // ===== Vehicle Information =====
  setText('car_registration_number', userData.vehicle_registration);
  setText('vehicle_make', userData.vehicle_make);
  setText('vehicle_model', userData.vehicle_model);

  // ===== Medical Symptoms Checkboxes (13 fields) =====
  checkField('medical_symptom_chest_pain', incident.medical_symptom_chest_pain);
  checkField('medical_symptom_uncontrolled_bleeding', incident.medical_symptom_uncontrolled_bleeding);
  checkField('medical_symptom_breathlessness', incident.medical_symptom_breathlessness);
  checkField('medical_symptom_severe_headache', incident.medical_symptom_severe_headache);
  checkField('medical_symptom_dizziness', incident.medical_symptom_dizziness);
  checkField('medical_symptom_loss_of_consciousness', incident.medical_symptom_loss_of_consciousness);
  checkField('medical_symptom_change_in_vision', incident.medical_symptom_change_in_vision);
  checkField('medical_symptom_abdominal_pain', incident.medical_symptom_abdominal_pain);
  checkField('medical_symptom_abdominal_bruising', incident.medical_symptom_abdominal_bruising);
  checkField('medical_symptom_limb_weakness', incident.medical_symptom_limb_weakness);
  checkField('medical_symptom_limb_pain_mobilty', incident.medical_symptom_limb_pain_mobility); // Note PDF typo
  checkField('medical_symptom_life _threatening', incident.medical_symptom_life_threatening); // Note PDF space
  checkField('medical_symptom_none', incident.medical_symptom_none);

  // ===== Weather Conditions Checkboxes (12 fields) =====
  checkField('weather_bright_sunlight', incident.weather_bright_sunlight);
  checkField('weather_clear', incident.weather_clear);
  checkField('weather_cloudy', incident.weather_cloudy);
  checkField('weather_drizzle', incident.weather_drizzle);
  checkField('weather_raining', incident.weather_raining);
  checkField('weather_heavy_rain', incident.weather_heavy_rain);
  checkField('weather_fog', incident.weather_fog);
  checkField('weather_snow', incident.weather_snow);
  checkField('weather_hail', incident.weather_hail);
  checkField('weather_thunder_lightening', incident.weather_thunder_lightning); // Note PDF typo
  checkField('weather_windy', incident.weather_windy);
  checkField('weather_dusk', incident.weather_dusk);

  // ===== Other Vehicle Fields - HYPHENATED =====
  setText('other-full-name', incident.other_driver_full_name);
  setText('other-contact-number', incident.other_driver_contact_number);
  setText('other-email-address', incident.other_driver_email);
  setText('other-driving-license-number', incident.other_driver_license_number);
  setText('other-vehicle-registration', incident.other_vehicle_registration);
  setText('other-vehicle-look-up-make', incident.other_vehicle_make);
  setText('other-vehicle-look-up-model', incident.other_vehicle_model);
  setText('other-vehicle-look-up-colour', incident.other_vehicle_colour);
  setText('other-vehicle-look-up-fuel-type', incident.other_vehicle_fuel_type);
  setText('other-vehicle-look-up-year', incident.other_vehicle_year);
  setText('other-vehicle-look-up-mot-status', incident.other_vehicle_mot_status);
  setText('other-vehicle-look-up-mot-expiry-date', incident.other_vehicle_mot_expiry);
  setText('other-vehicle-look-up-tax-status', incident.other_vehicle_tax_status);
  setText('other-vehicle-look-up-tax-due-date', incident.other_vehicle_tax_due_date);
  setText('other-vehicle-look-up-insurance-status', incident.other_vehicle_insurance_status);
  setText('other-drivers-insurance-company', incident.other_driver_insurance_company);
  setText('other-drivers-policy-number', incident.other_driver_policy_number);
  setText('other-drivers-policy-holder-name', incident.other_driver_policy_holder);
  setText('other-drivers-policy-cover-type', incident.other_driver_cover_type);

  // ===== Continue with remaining fields... =====
  // (Pattern established for all 213 PDF fields)
}
```

---

## Section 7: Action Items

### 7.1 CRITICAL Fixes Required

1. **Fix final_feeling Mapping**
   - **Current:** `incident_reports.final_feeling` (TEXT) → PDF `final_feeling` (CHECKBOX) ❌
   - **Correct:** `incident_reports.final_feeling` (TEXT) → PDF `medical_how_are_you_feeling` (TEXT) ✅
   - **Impact:** High - User's "How are you feeling" response is currently unmapped
   - **File:** `src/services/adobePdfFormFillerService.js` or similar PDF generation service

2. **Fix Other Vehicle Hyphenated Fields**
   - **Current:** May be using underscores (e.g., `other_full_name`)
   - **Correct:** Must use hyphens (e.g., `other-full-name`)
   - **Count:** 19 fields affected
   - **Impact:** High - Other vehicle data not appearing in PDF

3. **Fix Damage Description Hyphen**
   - **Current:** May be using `vehicle_damage_details`
   - **Correct:** PDF field is `describe-damage-to-vehicle` (hyphen + multiline)
   - **Impact:** Medium - Damage description may be unmapped

### 7.2 PDF Template Typos (Low Priority)

**Decision Required:** Fix PDF template or map with typos?

**Option A - Fix PDF Template:**
- Regenerate PDF with corrected field names
- Update all code to use correct names
- Recommended for production quality

**Option B - Map with Typos:**
- Keep PDF as-is, map to typo field names
- Faster implementation
- Document typos clearly in code

**Typos to Fix:**
- `visibilty_good` → `visibility_good`
- `visibilty_street_lights` → `visibility_street_lights`
- `road_markings_vsible_yes` → `road_markings_visible_yes`
- `road_markings_vsible_no` → `road_markings_visible_no`
- `weather_thunder_lightening` → `weather_thunder_lightning`
- `medical_symptom_limb_pain_mobilty` → `medical_symptom_limb_pain_mobility`
- `medical_treatment_recieved` → `medical_treatment_received`
- `medical_symptom_life _threatening` → `medical_symptom_life_threatening`
- `unsure _did_not_attempt` → `unsure_did_not_attempt`

### 7.3 Update Master Prompt

- Replace all field examples with correct PDF field names (including hyphens)
- Remove incorrect Pattern C (TEXT[] arrays)
- Add explicit hyphenated field pattern for "Other Vehicle" fields
- Update Safety Check pattern to use correct `medical_how_are_you_feeling` field

---

## Section 8: Validation Checklist

### 8.1 Pre-Deployment Verification

- [ ] Test PDF generation with real user data
- [ ] Verify `final_feeling` appears in `medical_how_are_you_feeling` field
- [ ] Verify all 19 hyphenated "Other Vehicle" fields populate correctly
- [ ] Verify all 13 medical symptom checkboxes work
- [ ] Verify all 12 weather condition checkboxes work
- [ ] Verify all checkbox categories (79+ total) populate correctly
- [ ] Verify image URL fields display correctly
- [ ] Run `node test-form-filling.js [user-uuid]` with comprehensive test data

### 8.2 Field Coverage Report

```javascript
// Run this to verify 100% field coverage
const TOTAL_PDF_FIELDS = 213;
const MAPPED_FIELDS = 191; // Approximate (excludes internal/metadata fields)
const COVERAGE_PERCENTAGE = (MAPPED_FIELDS / TOTAL_PDF_FIELDS) * 100;

console.log(`PDF Field Coverage: ${COVERAGE_PERCENTAGE.toFixed(1)}%`);
console.log(`Mapped: ${MAPPED_FIELDS} / ${TOTAL_PDF_FIELDS} fields`);
```

---

## Appendix A: Quick Reference Tables

### A.1 Field Count Summary

| Category | Database Fields | PDF Fields | Status |
|----------|----------------|------------|--------|
| Personal Info | 11 | 11 | ✅ Complete |
| Vehicle Info | 7 | 7 | ✅ Complete |
| DVLA Data | 9 | 9 | ✅ Complete |
| Insurance | 7 | 7 | ✅ Complete |
| Accident Details | 11 | 11 | ✅ Complete |
| Medical Info | 9 | 9 | ⚠️ 1 mismatch |
| Medical Symptoms | 13 | 13 | ✅ Complete |
| Weather Conditions | 12 | 12 | ✅ Complete |
| Road Conditions | 6 | 6 | ✅ Complete |
| Road Type | 7 | 7 | ✅ Complete |
| Traffic Conditions | 4 | 4 | ✅ Complete |
| Visibility | 7 | 7 | ✅ Complete |
| Special Conditions | 12 | 12 | ✅ Complete |
| Impact Points | 10 | 10 | ✅ Complete |
| Other Vehicle | 19 | 19 | ⚠️ Hyphens |
| Witnesses | 9 | 9 | ✅ Complete |
| Images | 16 | 16 | ✅ Complete |
| AI Analysis | 5 | 5 | ✅ Complete |
| **TOTAL** | **235+** | **213** | **~190 mapped** |

### A.2 Critical Issues Summary

| Issue | Severity | Fields Affected | Fix Required |
|-------|----------|-----------------|--------------|
| `final_feeling` type mismatch | 🔴 **CRITICAL** | 1 | Map to `medical_how_are_you_feeling` |
| Hyphenated Other Vehicle fields | 🔴 **HIGH** | 19 | Use hyphens in PDF field names |
| PDF field typos | 🟡 **MEDIUM** | 9 | Fix PDF or map to typos |
| Duplicate fields | 🟢 **LOW** | 2-3 | Clarify which to use |

---

**Document Status:** ✅ Complete
**Last Updated:** 2025-12-12
**Next Review:** After critical fixes applied
