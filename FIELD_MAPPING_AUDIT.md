# Field Mapping Audit Report

Generated: 02/11/2025, 21:32:58

## Summary

- ✅ **Perfect Matches**: 70
- ❌ **PDF Typos**: 66
- ❌ **Missing DB Columns**: 15
- ⚠️  **Unmapped PDF Fields**: 122
- ⚠️  **Unmapped DB Columns**: 118

## ❌ PDF Field Typos (CRITICAL)

Mappings in pdfGenerator.js that point to non-existent PDF fields:

| Line | PDF Field (Code) | DB Column | Status |
|------|-----------------|-----------|--------|
| 69 | `create_user_id` | `metadata` | ❌ Not in PDF |
| 73 | `driver_name` | `name` | ❌ Not in PDF |
| 78 | `street_address_optional` | `street_address_optional` | ❌ Not in PDF |
| 86 | `license_plate` | `car_registration_number` | ❌ Not in PDF |
| 126 | `form_id` | `id` | ❌ Not in PDF |
| 127 | `submit_date` | `created_at` | ❌ Not in PDF |
| 133 | `medical_please_be_completely_honest` | `medical_please_be_completely_honest` | ❌ Not in PDF |
| 135 | `call_emergency_contact` | `call_emergency_contact` | ❌ Not in PDF |
| 154 | `treatment_received_on_scene` | `treatment_received` | ❌ Not in PDF |
| 155 | `follow_up_appointments_scheduled` | `medical_follow_up_needed` | ❌ Not in PDF |
| 161 | `damage_to_your_vehicle` | `was_your_vehicle_damaged` | ❌ Not in PDF |
| 164 | `where_exactly_did_this_happen` | `where_exactly_did_this_happen` | ❌ Not in PDF |
| 176 | `weather_light_rain` | `light_rain` | ❌ Not in PDF |
| 182 | `weather_hail` | `weather_hail` | ❌ Not in PDF |
| 184 | `weather_thunder` | `weather_thunder` | ❌ Not in PDF |
| 186 | `weather_loose_surface` | `weather_loose_surface` | ❌ Not in PDF |
| 188 | `weather_conditions` | `weather_conditions_summary` | ❌ Not in PDF |
| 191 | `road_type` | `road_type` | ❌ Not in PDF |
| 193 | `junction_information` | `junction_information` | ❌ Not in PDF |
| 194 | `special_conditions` | `special_conditions` | ❌ Not in PDF |
| 195 | `detailed_account_of_what_happened` | `describe_what_happened` | ❌ Not in PDF |
| 201 | `traffic_conditions_none` | `traffic_none` | ❌ Not in PDF |
| 204 | `road_markings` | `road_markings_yes` | ❌ Not in PDF |
| 205 | `road_markings_partial_yes` | `road_markings_partial` | ❌ Not in PDF |
| 209 | `visibility` | `visibility_good` | ❌ Not in PDF |
| 210 | `visibility_poor` | `visibility_poor` | ❌ Not in PDF |
| 211 | `visibility_very_poor` | `visibility_very_poor` | ❌ Not in PDF |
| 214 | `make_of_car` | `make_of_car` | ❌ Not in PDF |
| 215 | `model_of_car` | `model_of_car` | ❌ Not in PDF |
| 216 | `license_plate` | `license_plate_incident` | ❌ Not in PDF |
| 217 | `direction_and_speed` | `direction_of_travel_and_estimated_speed` | ❌ Not in PDF |
| 218 | `impact` | `impact_point` | ❌ Not in PDF |
| 219 | `damage_caused_by_accident` | `damage_caused_by_accident` | ❌ Not in PDF |
| 220 | `any_damage_prior_to_accident` | `damage_prior_to_accident` | ❌ Not in PDF |
| 226 | `vehicle_found_colour` | `dvla_vehicle_color` | ❌ Not in PDF |
| 229 | `vehicle_found_mot_status` | `dvla_mot_status` | ❌ Not in PDF |
| 230 | `vehicle_found_mot_expiry_date` | `dvla_mot_expiry_date` | ❌ Not in PDF |
| 231 | `vehicle_found_tax_status` | `dvla_tax_status` | ❌ Not in PDF |
| 232 | `vehicle_found_tax_due_date` | `dvla_tax_due_date` | ❌ Not in PDF |
| 239 | `other_drivers_number` | `other_drivers_number` | ❌ Not in PDF |
| 240 | `other_drivers_address` | `other_drivers_address` | ❌ Not in PDF |
| 241 | `other_make_of_vehicle` | `other_make_of_vehicle` | ❌ Not in PDF |
| 242 | `other_model_of_vehicle` | `other_model_of_vehicle` | ❌ Not in PDF |
| 243 | `other_registration_number` | `vehicle_license_plate` | ❌ Not in PDF |
| 244 | `other_policy_number` | `other_policy_number` | ❌ Not in PDF |
| 245 | `other_insurance_company` | `other_insurance_company` | ❌ Not in PDF |
| 246 | `other_policy_cover` | `other_policy_cover_type` | ❌ Not in PDF |
| 247 | `other_policy_holder` | `other_policy_holder` | ❌ Not in PDF |
| 265 | `police_officers_name` | `police_officer_name` | ❌ Not in PDF |
| 277 | `anything_else` | `anything_else_important` | ❌ Not in PDF |
| 279 | `witness_contact_information` | `witness_information` | ❌ Not in PDF |
| 287 | `call_your_recovery` | `call_recovery` | ❌ Not in PDF |
| 288 | `upgrade_to_premium` | `upgrade_to_premium` | ❌ Not in PDF |
| 291 | `file_url_documents` | `imageUrls` | ❌ Not in PDF |
| 292 | `file_url_documents_1` | `imageUrls` | ❌ Not in PDF |
| 293 | `file_url_record_detailed_account_of_what_happened` | `imageUrls` | ❌ Not in PDF |
| 294 | `file_url_what3words` | `imageUrls` | ❌ Not in PDF |
| 295 | `file_url_scene_overview` | `imageUrls` | ❌ Not in PDF |
| 296 | `file_url_scene_overview_1` | `imageUrls` | ❌ Not in PDF |
| 297 | `file_url_other_vehicle` | `imageUrls` | ❌ Not in PDF |
| 298 | `file_url_other_vehicle_1` | `imageUrls` | ❌ Not in PDF |
| 299 | `file_url_vehicle_damage` | `imageUrls` | ❌ Not in PDF |
| 300 | `file_url_vehicle_damage_1` | `imageUrls` | ❌ Not in PDF |
| 301 | `file_url_vehicle_damage_2` | `imageUrls` | ❌ Not in PDF |
| 304 | `ai_summary_of_accident_data` | `ai_summary_of_data_collected` | ❌ Not in PDF |
| 305 | `ai_summary_of_accident_data_transcription` | `detailed_account_of_what_happened` | ❌ Not in PDF |

**Action**: Correct these field names in lib/pdfGenerator.js or fix typos in PDF.

## ❌ Missing Database Columns

| Line | PDF Field | DB Column | Status |
|------|-----------|-----------|--------|
| 70 | `id` | `metadata` | ❌ Not in DB |
| 83 | `driver_dob` | `driver_dob` | ❌ Not in DB |
| 160 | `reason_no_seatbelts` | `why_werent_seat_belts_being_worn` | ❌ Not in DB |
| 167 | `weather_overcast` | `overcast_dull` | ❌ Not in DB |
| 168 | `weather_heavy_rain` | `heavy_rain` | ❌ Not in DB |
| 169 | `weather_wet_road` | `wet_road` | ❌ Not in DB |
| 170 | `weather_fog` | `fog_poor_visibility` | ❌ Not in DB |
| 171 | `weather_street_lights` | `street_lights` | ❌ Not in DB |
| 172 | `weather_dusk` | `dusk` | ❌ Not in DB |
| 173 | `weather_clear_and_dry` | `clear_and_dry` | ❌ Not in DB |
| 174 | `weather_snow_on_road` | `snow_ice_on_road` | ❌ Not in DB |
| 175 | `weather_snow` | `snow` | ❌ Not in DB |
| 177 | `weather_bright_daylight` | `bright_daylight` | ❌ Not in DB |
| 263 | `did_police_attend` | `did_the_police_attend_the_scene` | ❌ Not in DB |
| 278 | `any_witness` | `witness_present` | ❌ Not in DB |

## ⚠️ Unmapped PDF Fields (122)

PDF fields with no data source:

| PDF Field | Type |
|-----------|------|
| `ai_model_used` | TextField |
| `ai_narrative_text` | TextField |
| `ai_summary` | TextField |
| `ai_transcription` | TextField |
| `airbags_deployed_no` | CheckBox |
| `any_witness_no` | CheckBox |
| `anything_else_important` | TextField |
| `car_registration_number` | TextField |
| `Date69_af_date` | TextField |
| `describe_the_damage_to_the_other_vehicle` | TextField |
| `did_police_attend_no` | CheckBox |
| `driving_your_usual_vehicle_no` | CheckBox |
| `driving_your_usual_vehicle_yes` | CheckBox |
| `full_address_location_description` | TextField |
| `my_vehicle_has_no_visible_damage` | CheckBox |
| `nearest_landmark` | TextField |
| `no_it_needed_to_be_towed` | CheckBox |
| `other_car_colour` | TextField |
| `other_car_colour_policy holder` | TextField |
| `other_car_colour_policy number` | TextField |
| `other_car_colour_policy_cover_type` | TextField |
| `other_car_colour_vehicle_license_plate` | TextField |
| `other_car_insurance_company` | TextField |
| `other_car_insurance_status` | TextField |
| `other_car_mot_expiry` | TextField |
| `other_car_mot_status` | TextField |
| `other_car_no_visible_damage` | CheckBox |
| `other_car_tax_due_date` | TextField |
| `other_car_tax_status` | TextField |
| `other_car_vehicle_fuel_type` | TextField |

_... and 92 more_

## ⚠️ Unmapped Database Columns (118)

Database columns not being used:

| Table | Column |
|-------|--------|
| `user_signup` | `uid` |
| `user_signup` | `date_of_birth` |
| `user_signup` | `emergency_contact_name` |
| `user_signup` | `emergency_contact_number` |
| `user_signup` | `vehicle_registration` |
| `user_signup` | `insurance_policy_number` |
| `user_signup` | `product_id` |
| `user_signup` | `typeform_completed` |
| `user_signup` | `typeform_completion_date` |
| `user_signup` | `auth_user_id` |
| `user_signup` | `auth_code` |
| `user_signup` | `gdpr_consent` |
| `user_signup` | `time_stamp` |
| `user_signup` | `emergency_company` |
| `user_signup` | `emergency_email` |
| `user_signup` | `form_id` |
| `user_signup` | `form_responses` |
| `user_signup` | `legal_support` |
| `user_signup` | `submit_date` |
| `user_signup` | `user_id` |
| `user_signup` | `company_name` |
| `user_signup` | `license_plate` |
| `user_signup` | `phone_number` |
| `user_signup` | `signup_date` |
| `user_signup` | `i_agree_to_share_my_data` |
| `user_signup` | `subscription_start_date` |
| `user_signup` | `subscription_end_date` |
| `user_signup` | `subscription_status` |
| `user_signup` | `auto_renewal` |
| `user_signup` | `retention_until` |

_... and 88 more_

