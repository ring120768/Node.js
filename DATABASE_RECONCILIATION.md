# Complete Database Reconciliation Report

Generated: 02/11/2025, 21:38:53

## Summary

| Table | Total Columns | Mapped | Unmapped | Coverage |
|-------|---------------|--------|----------|----------|
| `user_signup` | 65 | 30 | 35 | 46% |
| `incident_reports` | 138 | 82 | 56 | 59% |
| `incident_other_vehicles` | 39 | 12 | 27 | 31% |
| `incident_witnesses` | 16 | 2 | 14 | 13% |
| `ai_transcription` | 0 | 0 | 0 | 0% |
| `user_documents` | 0 | 0 | 0 | 0% |

**TOTAL** | 258 | 126 | 132 | 49% |

## user_signup

### ✅ Mapped Columns

| Column | PDF Field | Type | Code Line |
|--------|-----------|------|----------|
| `id` | `form_id` | TextField | 126 |
| `postcode` | `postcode` | TextField | 80 |
| `vehicle_make` | `vehicle_make` | TextField | 87 |
| `vehicle_model` | `vehicle_model` | TextField | 88 |
| `vehicle_colour` | `vehicle_colour` | TextField | 89 |
| `insurance_company` | `insurance_company` | TextField | 99 |
| `created_at` | `submit_date` | TextField | 127 |
| `name` | `name` | TextField | 72 |
| `surname` | `surname` | TextField | 74 |
| `mobile` | `mobile` | TextField | 76 |
| `street_address` | `street` | TextField | 77 |
| `town` | `town` | TextField | 79 |
| `street_address_optional` | `street_address_optional` | TextField | 78 |
| `country` | `country` | TextField | 81 |
| `driving_license_number` | `driving_license_number` | TextField | 82 |
| `car_registration_number` | `license_plate` | TextField | 86 |
| `vehicle_condition` | `vehicle_condition` | TextField | 90 |
| `recovery_company` | `recovery_company` | TextField | 91 |
| `recovery_breakdown_number` | `recovery_breakdown_number` | TextField | 92 |
| `recovery_breakdown_email` | `recovery_breakdown_email` | TextField | 93 |
| `emergency_contact` | `emergency_contact` | TextField | 96 |
| `policy_number` | `policy_number` | TextField | 100 |
| `policy_holder` | `policy_holder` | TextField | 101 |
| `cover_type` | `cover_type` | TextField | 102 |
| `driving_license_picture` | `driving_license_picture` | TextField | 116 |
| `vehicle_picture_front` | `vehicle_picture_front` | TextField | 117 |
| `vehicle_picture_driver_side` | `vehicle_picture_driver_side` | TextField | 118 |
| `vehicle_picture_passenger_side` | `vehicle_picture_passenger_side` | TextField | 119 |
| `vehicle_picture_back` | `vehicle_picture_back` | TextField | 120 |
| `email` | `email` | TextField | 75 |

### ❌ Unmapped Columns

- `uid`
- `create_user_id`
- `date_of_birth`
- `emergency_contact_name`
- `emergency_contact_number`
- `vehicle_registration`
- `insurance_policy_number`
- `product_id`
- `typeform_completed`
- `typeform_completion_date`
- `updated_at`
- `auth_user_id`
- `auth_code`
- `gdpr_consent`
- `time_stamp`
- `emergency_company`
- `emergency_email`
- `form_id`
- `form_responses`
- `legal_support`
- `submit_date`
- `user_id`
- `company_name`
- `license_plate`
- `phone_number`
- `signup_date`
- `i_agree_to_share_my_data`
- `subscription_start_date`
- `subscription_end_date`
- `subscription_status`
- `auto_renewal`
- `retention_until`
- `deleted_at`
- `images_status`
- `missing_images`

---

## incident_reports

### ✅ Mapped Columns

| Column | PDF Field | Type | Code Line |
|--------|-----------|------|----------|
| `id` | `form_id` | TextField | 126 |
| `created_at` | `submit_date` | TextField | 127 |
| `medical_how_are_you_feeling` | `medical_how_are_you_feeling` | TextField | 130 |
| `medical_attention_from_who` | `medical_attention_from_who` | TextField | 131 |
| `further_medical_attention` | `further_medical_attention` | TextField | 132 |
| `are_you_safe` | `are_you_safe` | CheckBox | 128 |
| `medical_attention` | `medical_attention` | CheckBox | 129 |
| `six_point_safety_check` | `six_point_safety_check` | CheckBox | 134 |
| `call_emergency_contact` | `call_emergency_contact` | CheckBox | 135 |
| `medical_chest_pain` | `medical_chest_pain` | CheckBox | 138 |
| `medical_breathlessness` | `medical_breathlessness` | CheckBox | 140 |
| `medical_abdominal_bruising` | `medical_abdominal_bruising` | CheckBox | 144 |
| `medical_uncontrolled_bleeding` | `medical_uncontrolled_bleeding` | CheckBox | 139 |
| `medical_severe_headache` | `medical_severe_headache` | CheckBox | 143 |
| `medical_change_in_vision` | `medical_change_in_vision` | CheckBox | 145 |
| `medical_abdominal_pain` | `medical_abdominal_pain` | CheckBox | 146 |
| `medical_limb_pain` | `medical_limb_pain` | CheckBox | 147 |
| `medical_limb_weakness` | `medical_limb_weakness` | CheckBox | 141 |
| `medical_loss_of_consciousness` | `medical_loss_of_consciousness` | CheckBox | 142 |
| `medical_none_of_these` | `medical_none_of_these` | CheckBox | 148 |
| `medical_please_be_completely_honest` | `medical_please_be_completely_honest` | TextField | 133 |
| `when_did_the_accident_happen` | `when_did_the_accident_happen` | TextField | 162 |
| `what_time_did_the_accident_happen` | `what_time_did_the_accident_happen` | TextField | 163 |
| `where_exactly_did_this_happen` | `where_exactly_did_this_happen` | TextField | 164 |
| `wearing_seatbelts` | `wearing_seatbelts` | CheckBox | 158 |
| `airbags_deployed` | `airbags_deployed` | CheckBox | 159 |
| `road_type` | `road_type` | TextField | 191 |
| `speed_limit` | `speed_limit` | TextField | 192 |
| `junction_information` | `junction_information` | TextField | 193 |
| `detailed_account_of_what_happened` | `ai_summary_of_accident_data_transcription` | TextField | 305 |
| `special_conditions` | `special_conditions` | TextField | 194 |
| `make_of_car` | `make_of_car` | TextField | 214 |
| `model_of_car` | `model_of_car` | TextField | 215 |
| `damage_caused_by_accident` | `damage_caused_by_accident` | TextField | 219 |
| `other_drivers_name` | `other_drivers_name` | TextField | 238 |
| `other_drivers_number` | `other_drivers_number` | TextField | 239 |
| `other_drivers_address` | `other_drivers_address` | TextField | 240 |
| `other_make_of_vehicle` | `other_make_of_vehicle` | TextField | 241 |
| `other_model_of_vehicle` | `other_model_of_vehicle` | TextField | 242 |
| `vehicle_license_plate` | `other_registration_number` | TextField | 243 |
| `other_policy_number` | `other_policy_number` | TextField | 244 |
| `other_insurance_company` | `other_insurance_company` | TextField | 245 |
| `other_policy_holder` | `other_policy_holder` | TextField | 247 |
| `accident_reference_number` | `accident_reference_number` | TextField | 264 |
| `police_officer_badge_number` | `police_officer_badge_number` | TextField | 266 |
| `police_force_details` | `police_force_details` | TextField | 267 |
| `breath_test` | `breath_test` | CheckBox | 268 |
| `other_breath_test` | `other_breath_test` | CheckBox | 269 |
| `call_recovery` | `call_your_recovery` | CheckBox | 287 |
| `upgrade_to_premium` | `upgrade_to_premium` | CheckBox | 288 |
| `ambulance_called` | `ambulance_callled` | CheckBox | 151 |
| `hospital_name` | `hospital_or_medical_center` | TextField | 152 |
| `injury_severity` | `severity_of_injuries` | TextField | 153 |
| `treatment_received` | `treatment_received_on_scene` | TextField | 154 |
| `medical_follow_up_needed` | `follow_up_appointments_scheduled` | TextField | 155 |
| `dvla_lookup_reg` | `uk_licence_plate_look_up` | TextField | 223 |
| `dvla_vehicle_make` | `vehicle_found_make` | TextField | 224 |
| `dvla_vehicle_model` | `vehicle_found_model` | TextField | 225 |
| `dvla_vehicle_color` | `vehicle_found_colour` | TextField | 226 |
| `dvla_vehicle_year` | `vehicle_found_year` | TextField | 227 |
| `dvla_vehicle_fuel_type` | `vehicle_found_fuel_type` | TextField | 228 |
| `dvla_mot_status` | `vehicle_found_mot_status` | TextField | 229 |
| `dvla_mot_expiry_date` | `vehicle_found_mot_expiry_date` | TextField | 230 |
| `dvla_tax_status` | `vehicle_found_tax_status` | TextField | 231 |
| `dvla_tax_due_date` | `vehicle_found_tax_due_date` | TextField | 232 |
| `weather_drizzle` | `weather_drizzle` | CheckBox | 180 |
| `weather_raining` | `weather_raining` | CheckBox | 181 |
| `weather_hail` | `weather_hail` | CheckBox | 182 |
| `weather_windy` | `weather_windy` | CheckBox | 183 |
| `weather_thunder` | `weather_thunder` | CheckBox | 184 |
| `weather_slush_road` | `weather_slush_road` | CheckBox | 185 |
| `weather_loose_surface` | `weather_loose_surface` | CheckBox | 186 |
| `traffic_heavy` | `traffic_conditions_heavy` | CheckBox | 198 |
| `traffic_moderate` | `traffic_conditions_moderate` | CheckBox | 199 |
| `traffic_light` | `traffic_conditions_light` | CheckBox | 200 |
| `traffic_none` | `traffic_conditions_none` | CheckBox | 201 |
| `road_markings_yes` | `road_markings` | CheckBox | 204 |
| `road_markings_partial` | `road_markings_partial_yes` | CheckBox | 205 |
| `road_markings_no` | `road_markings_no` | CheckBox | 206 |
| `visibility_good` | `visibility` | CheckBox | 209 |
| `visibility_poor` | `visibility_poor` | CheckBox | 210 |
| `visibility_very_poor` | `visibility_very_poor` | CheckBox | 211 |

### ❌ Unmapped Columns

- `auth_user_id`
- `create_user_id`
- `transcription_id`
- `updated_at`
- `date`
- `form_id`
- `weather_conditions`
- `damage_to_your_vehicle`
- `weather_overcast`
- `weather_street_lights`
- `weather_heavy_rain`
- `weather_wet_road`
- `weather_fog`
- `weather_snow_on_road`
- `weather_bright_daylight`
- `weather_light_rain`
- `weather_clear_and_dry`
- `weather_dusk`
- `weather_snow`
- `reason_no_seatbelts`
- `special_conditions_roadworks`
- `junction_information_roundabout`
- `special_conditions_defective_road`
- `special_conditions_oil_spills`
- `special_conditions_workman`
- `junction_information_t_junction`
- `junction_information_traffic_lights`
- `junction_information_crossroads`
- `license_plate_number`
- `direction_and_speed`
- `impact`
- `any_damage_prior`
- `other_policy_cover`
- `other_damage_accident`
- `other_damage_prior`
- `police_officers_name`
- `did_police_attend`
- `anything_else`
- `witness_contact_information`
- `any_witness`
- `file_url_documents`
- `file_url_documents_1`
- `file_url_record_detailed_account_of_what_happened`
- `file_url_what3words`
- `file_url_scene_overview`
- `file_url_scene_overview_1`
- `file_url_other_vehicle`
- `file_url_other_vehicle_1`
- `file_url_vehicle_damage`
- `file_url_vehicle_damage_1`
- `file_url_vehicle_damage_2`
- `submit_date`
- `user_id`
- `deleted_at`
- `retention_until`
- `special_conditions_animals`

---

## incident_other_vehicles

### ✅ Mapped Columns

| Column | PDF Field | Type | Code Line |
|--------|-----------|------|----------|
| `id` | `form_id` | TextField | 126 |
| `vehicle_license_plate` | `other_registration_number` | TextField | 243 |
| `vehicle_make` | `vehicle_make` | TextField | 87 |
| `vehicle_model` | `vehicle_model` | TextField | 88 |
| `insurance_company` | `insurance_company` | TextField | 99 |
| `policy_number` | `policy_number` | TextField | 100 |
| `policy_holder` | `policy_holder` | TextField | 101 |
| `created_at` | `submit_date` | TextField | 127 |
| `dvla_mot_status` | `vehicle_found_mot_status` | TextField | 229 |
| `dvla_mot_expiry_date` | `vehicle_found_mot_expiry_date` | TextField | 230 |
| `dvla_tax_status` | `vehicle_found_tax_status` | TextField | 231 |
| `dvla_tax_due_date` | `vehicle_found_tax_due_date` | TextField | 232 |

### ❌ Unmapped Columns

- `incident_id`
- `create_user_id`
- `driver_name`
- `driver_phone`
- `driver_address`
- `driver_email`
- `vehicle_color`
- `vehicle_year_of_manufacture`
- `policy_cover`
- `last_v5c_issued`
- `damage_description`
- `mot_status`
- `mot_expiry_date`
- `tax_status`
- `tax_due_date`
- `fuel_type`
- `engine_capacity`
- `dvla_lookup_successful`
- `dvla_lookup_timestamp`
- `dvla_error_message`
- `updated_at`
- `deleted_at`
- `gdpr_consent`
- `dvla_insurance_status`
- `dvla_export_marker`
- `insurance_policy_number`
- `insurance_policy_holder`

---

## incident_witnesses

### ✅ Mapped Columns

| Column | PDF Field | Type | Code Line |
|--------|-----------|------|----------|
| `id` | `form_id` | TextField | 126 |
| `created_at` | `submit_date` | TextField | 127 |

### ❌ Unmapped Columns

- `incident_id`
- `create_user_id`
- `witness_name`
- `witness_phone`
- `witness_email`
- `witness_address`
- `witness_statement`
- `updated_at`
- `deleted_at`
- `gdpr_consent`
- `witness_2_name`
- `witness_2_mobile`
- `witness_2_email`
- `witness_2_statement`

---

## ai_transcription

---

## user_documents

---

