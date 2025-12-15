# PDF Field Name Corrections

Found 66 field name mismatches. Here are the suggested corrections:

## 🔧 Corrections Needed in PDF or Code

| Line | Wrong Field Name (in Code) | Correct PDF Field | Distance | DB Column |
|------|---------------------------|-------------------|----------|-----------| n| 182 | `weather_hail` | `weather-hail` | ✅ 1 | `weather_hail` |
| 210 | `visibility_poor` | `visability_poor` | ✅ 1 | `visibility_poor` |
| 211 | `visibility_very_poor` | `visability_very_poor` | ✅ 1 | `visibility_very_poor` |
| 226 | `vehicle_found_colour` | `vehicle_found_color` | ✅ 1 | `dvla_vehicle_color` |
| 265 | `police_officers_name` | `police_officer_name` | ✅ 1 | `police_officer_name` |
| 204 | `road_markings` | `road_markings_no` | ⚠️ 3 | `road_markings_yes` |
| 239 | `other_drivers_number` | `other_drivers_name` | ⚠️ 3 | `other_drivers_number` |
| 73 | `driver_name` | `driver_dob` | ⚠️ 4 | `name` |
| 191 | `road_type` | `cover_type` | ⚠️ 4 | `road_type` |
| 205 | `road_markings_partial_yes` | `road_markings_partial` | ⚠️ 4 | `road_markings_partial` |
| 218 | `impact` | `email` | ⚠️ 4 | `impact_point` |
| 243 | `other_registration_number` | `car_registration_number` | ⚠️ 4 | `vehicle_license_plate` |
| 245 | `other_insurance_company` | `other_car_insurance_company` | ⚠️ 4 | `other_insurance_company` |
| 126 | `form_id` | `email` | ❌ 5 | `id` |
| 135 | `call_emergency_contact` | `emergency_contact` | ❌ 5 | `call_emergency_contact` |
| 176 | `weather_light_rain` | `weather_heavy_rain` | ❌ 5 | `light_rain` |
| 184 | `weather_thunder` | `weather_windy` | ❌ 5 | `weather_thunder` |
| 186 | `weather_loose_surface` | `weather_loose_surface_road` | ❌ 5 | `weather_loose_surface` |
| 201 | `traffic_conditions_none` | `traffic_conditions_heavy` | ❌ 5 | `traffic_none` |
| 230 | `vehicle_found_mot_expiry_date` | `vehicle_found_mot_expiry` | ❌ 5 | `dvla_mot_expiry_date` |
| 232 | `vehicle_found_tax_due_date` | `vehicle_found_road_tax_due_date` | ❌ 5 | `dvla_tax_due_date` |
| 69 | `create_user_id` | `NOT FOUND` | ❌ Infinity | `metadata` |
| 78 | `street_address_optional` | `NOT FOUND` | ❌ Infinity | `street_address_optional` |
| 86 | `license_plate` | `NOT FOUND` | ❌ Infinity | `car_registration_number` |
| 127 | `submit_date` | `NOT FOUND` | ❌ Infinity | `created_at` |
| 133 | `medical_please_be_completely_honest` | `NOT FOUND` | ❌ Infinity | `medical_please_be_completely_honest` |
| 154 | `treatment_received_on_scene` | `NOT FOUND` | ❌ Infinity | `treatment_received` |
| 155 | `follow_up_appointments_scheduled` | `NOT FOUND` | ❌ Infinity | `medical_follow_up_needed` |
| 161 | `damage_to_your_vehicle` | `NOT FOUND` | ❌ Infinity | `was_your_vehicle_damaged` |
| 164 | `where_exactly_did_this_happen` | `NOT FOUND` | ❌ Infinity | `where_exactly_did_this_happen` |
| 188 | `weather_conditions` | `NOT FOUND` | ❌ Infinity | `weather_conditions_summary` |
| 193 | `junction_information` | `NOT FOUND` | ❌ Infinity | `junction_information` |
| 194 | `special_conditions` | `NOT FOUND` | ❌ Infinity | `special_conditions` |
| 195 | `detailed_account_of_what_happened` | `NOT FOUND` | ❌ Infinity | `describe_what_happened` |
| 209 | `visibility` | `NOT FOUND` | ❌ Infinity | `visibility_good` |
| 214 | `make_of_car` | `NOT FOUND` | ❌ Infinity | `make_of_car` |
| 215 | `model_of_car` | `NOT FOUND` | ❌ Infinity | `model_of_car` |
| 216 | `license_plate` | `NOT FOUND` | ❌ Infinity | `license_plate_incident` |
| 217 | `direction_and_speed` | `NOT FOUND` | ❌ Infinity | `direction_of_travel_and_estimated_speed` |
| 219 | `damage_caused_by_accident` | `NOT FOUND` | ❌ Infinity | `damage_caused_by_accident` |
| 220 | `any_damage_prior_to_accident` | `NOT FOUND` | ❌ Infinity | `damage_prior_to_accident` |
| 229 | `vehicle_found_mot_status` | `NOT FOUND` | ❌ Infinity | `dvla_mot_status` |
| 231 | `vehicle_found_tax_status` | `NOT FOUND` | ❌ Infinity | `dvla_tax_status` |
| 240 | `other_drivers_address` | `NOT FOUND` | ❌ Infinity | `other_drivers_address` |
| 241 | `other_make_of_vehicle` | `NOT FOUND` | ❌ Infinity | `other_make_of_vehicle` |
| 242 | `other_model_of_vehicle` | `NOT FOUND` | ❌ Infinity | `other_model_of_vehicle` |
| 244 | `other_policy_number` | `NOT FOUND` | ❌ Infinity | `other_policy_number` |
| 246 | `other_policy_cover` | `NOT FOUND` | ❌ Infinity | `other_policy_cover_type` |
| 247 | `other_policy_holder` | `NOT FOUND` | ❌ Infinity | `other_policy_holder` |
| 277 | `anything_else` | `NOT FOUND` | ❌ Infinity | `anything_else_important` |
| 279 | `witness_contact_information` | `NOT FOUND` | ❌ Infinity | `witness_information` |
| 287 | `call_your_recovery` | `NOT FOUND` | ❌ Infinity | `call_recovery` |
| 288 | `upgrade_to_premium` | `NOT FOUND` | ❌ Infinity | `upgrade_to_premium` |
| 291 | `file_url_documents` | `NOT FOUND` | ❌ Infinity | `imageUrls` |
| 292 | `file_url_documents_1` | `NOT FOUND` | ❌ Infinity | `imageUrls` |
| 293 | `file_url_record_detailed_account_of_what_happened` | `NOT FOUND` | ❌ Infinity | `imageUrls` |
| 294 | `file_url_what3words` | `NOT FOUND` | ❌ Infinity | `imageUrls` |
| 295 | `file_url_scene_overview` | `NOT FOUND` | ❌ Infinity | `imageUrls` |
| 296 | `file_url_scene_overview_1` | `NOT FOUND` | ❌ Infinity | `imageUrls` |
| 297 | `file_url_other_vehicle` | `NOT FOUND` | ❌ Infinity | `imageUrls` |
| 298 | `file_url_other_vehicle_1` | `NOT FOUND` | ❌ Infinity | `imageUrls` |
| 299 | `file_url_vehicle_damage` | `NOT FOUND` | ❌ Infinity | `imageUrls` |
| 300 | `file_url_vehicle_damage_1` | `NOT FOUND` | ❌ Infinity | `imageUrls` |
| 301 | `file_url_vehicle_damage_2` | `NOT FOUND` | ❌ Infinity | `imageUrls` |
| 304 | `ai_summary_of_accident_data` | `NOT FOUND` | ❌ Infinity | `ai_summary_of_data_collected` |
| 305 | `ai_summary_of_accident_data_transcription` | `NOT FOUND` | ❌ Infinity | `detailed_account_of_what_happened` |

**Legend**:
- ✅ Distance 0-2: Very close match (likely typo)
- ⚠️ Distance 3-4: Possible match
- ❌ Distance 5+: May need manual review

