# Comprehensive PDF Field Mapping (207 Fields)

**PDF File**: `Car-Crash-Lawyer-AI-incident-report 02112025.pdf`
**Total Fields**: 207
**Extracted**: 2025-11-02
**Previous Version**: 146 fields (increase of 61 fields)

---

## Executive Summary

### Key Findings

1. **User ID Field Found**: Field #207 `id` - exactly what was requested for tracking
2. **61 New Fields**: 207 total vs 146 planned (42% increase)
3. **10 DVLA Lookup Fields**: Vehicle MOT, tax, and registration data from UK DVLA API
4. **Second Witness Support**: Complete fields for witness_2
5. **15 Image URL Fields**: Separate URL fields for embedding images in PDF
6. **Expanded Categories**:
   - Weather: 18 fields (7 new conditions)
   - Traffic: 4 new fields (heavy, moderate, light, no traffic)
   - Visibility: 3 new fields (good, poor, very poor)
   - Medical: 20 fields (5 new hospital/treatment fields)

### Database Impact

**New columns needed**: Approximately **35 new columns** across 4 tables:
- `user_signup`: 0 new (all fields exist)
- `incident_reports`: 25 new columns (traffic, visibility, DVLA, expanded weather/medical)
- `incident_other_vehicles`: 9 new columns (DVLA lookup results)
- `incident_witnesses`: 1 new table or expand existing (witness_2 support)

---

## Field Categories & Database Mapping

### 1. Personal/User Information (18 fields)
**Database Table**: `user_signup`
**UI Page**: signup-form.html (Pages 2-9) and signup-auth.html (Page 1)

| PDF Field Name | Type | Index | DB Column | Status | Notes |
|----------------|------|-------|-----------|--------|-------|
| `name` | TextField | 204 | `name` | ✅ Exists | First name |
| `surname` | TextField | 205 | `surname` | ✅ Exists | Last name |
| `driver_dob` | TextField | 1 | `date_of_birth` | ✅ Exists | Format: DD/MM/YYYY |
| `email` | TextField | 2 | `email` | ✅ Exists | Primary contact |
| `mobile` | TextField | 3 | `mobile` | ✅ Exists | UK format: +44 |
| `street` | TextField | 4 | `street` | ✅ Exists | Address line 1 |
| `street_name_optional` | TextField | 6 | `street_name_optional` | ✅ Exists | Address line 2 |
| `town` | TextField | 5 | `town` | ✅ Exists | City/town |
| `postcode` | TextField | 7 | `postcode` | ✅ Exists | UK postcode |
| `country` | TextField | 8 | `country` | ✅ Exists | Default: United Kingdom |
| `driving_license_number` | TextField | 9 | `driving_license_number` | ✅ Exists | UK license format |
| `emergency_contact` | TextField | 17 | `emergency_contact` | ✅ Exists | Emergency contact name |
| `car_registration_number` | TextField | 10 | `car_registration_number` | ✅ Exists | UK reg plate |
| `vehicle_make` | TextField | 11 | `vehicle_make` | ✅ Exists | e.g., PORSCHE |
| `vehicle_model` | TextField | 12 | `vehicle_model` | ✅ Exists | e.g., 911 |
| `vehicle_colour` | TextField | 13 | `vehicle_colour` | ✅ Exists | e.g., BLACK |
| `vehicle_condition` | TextField | 14 | `vehicle_condition` | ✅ Exists | Pre-accident condition |
| `policy_holder` | TextField | 23 | `policy_holder` | ✅ Exists | Insurance policy holder name |

**All 18 fields map to existing columns** ✅

---

### 2. Insurance Information (5 fields)
**Database Table**: `user_signup`
**UI Page**: signup-form.html (Insurance page)

| PDF Field Name | Type | Index | DB Column | Status | Notes |
|----------------|------|-------|-----------|--------|-------|
| `insurance_company` | TextField | 18 | `insurance_company` | ✅ Exists | e.g., Beat the Bookie ltd |
| `policy_number` | TextField | 19 | `policy_number` | ✅ Exists | Insurance policy number |
| `cover_type` | TextField | 21 | `cover_type` | ✅ Exists | Comprehensive/Third Party |

**Recovery/Breakdown** (user_signup or incident_reports):
| `recovery_company` | TextField | 15 | `recovery_company` | ✅ Exists | e.g., AA, RAC |
| `recovery_breakdown_number` | TextField | 16 | `recovery_breakdown_number` | ✅ Exists | Membership number |
| `recovery_breakdown_email` | TextField | 22 | `recovery_breakdown_email` | ✅ Exists | Recovery company email |

**All 5 fields exist** ✅

---

### 3. Medical & Safety (20 fields)
**Database Table**: `incident_reports`
**UI Page**: incident-form-page2.html (Medical & Safety Check)

#### Safety Checks (2 fields)
| PDF Field Name | Type | Index | DB Column | Status | Notes |
|----------------|------|-------|-----------|--------|-------|
| `six_point_safety_check` | CheckBox | 29 | `six_point_safety_check` | ✅ Exists | Scene safety confirmed |
| `are_you_safe` | CheckBox | 36 | `are_you_safe` | ✅ Exists | Personal safety check |

#### Medical Attention (8 fields - **5 NEW**)
| PDF Field Name | Type | Index | DB Column | Status | Notes |
|----------------|------|-------|-----------|--------|-------|
| `ambulance_callled` | CheckBox | 30 | `ambulance_called` | 🆕 NEW | Typo in PDF: "callled" |
| `medical_attention` | CheckBox | 37 | `medical_attention` | ✅ Exists | Received medical help |
| `medical_how_are_you_feeling` | TextField | 31 | `medical_how_feeling` | ✅ Exists | Self-assessment |
| `medical_attention_from_who` | TextField | 32 | `medical_attention_from_who` | ✅ Exists | Paramedic/doctor name |
| `hospital_or_medical_center` | TextField | 33 | `hospital_name` | 🆕 NEW | Hospital/GP name |
| `severity_of_injuries` | TextField | 34 | `injury_severity` | 🆕 NEW | Minor/Moderate/Severe |
| `treatment_recieved` | TextField | 35 | `treatment_received` | 🆕 NEW | Description of treatment |
| `further_medical_attention` | TextField | 38 | `further_medical_attention` | ✅ Exists | Follow-up needed |
| `please_provide_details_of_any_injuries` | TextField | 50 | `injury_details` | ✅ Exists | Detailed injury description |

**Typo note**: PDF field is `ambulance_callled` (3 L's) but should map to `ambulance_called` (2 L's)

#### Injury Symptoms (10 checkboxes - all exist)
| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `medical_chest_pain` | CheckBox | 39 | `symptom_chest_pain` | ✅ Exists |
| `medical_abdominal_pain` | CheckBox | 46 | `symptom_abdominal_pain` | ✅ Exists |
| `medical_abdominal_bruising` | CheckBox | 40 | `symptom_abdominal_bruising` | ✅ Exists |
| `medical_severe_headache` | CheckBox | 44 | `symptom_severe_headache` | ✅ Exists |
| `medical_change_in_vision` | CheckBox | 45 | `symptom_vision_change` | ✅ Exists |
| `medical_uncontrolled_bleeding` | CheckBox | 41 | `symptom_uncontrolled_bleeding` | ✅ Exists |
| `medical_limb_pain` | CheckBox | 42 | `symptom_limb_pain` | ✅ Exists |
| `medical_limb_weakness` | CheckBox | 47 | `symptom_limb_weakness` | ✅ Exists |
| `medical_loss_of_consciousness` | CheckBox | 48 | `symptom_loss_consciousness` | ✅ Exists |
| `medical_breathlessness` | CheckBox | 49 | `symptom_breathlessness` | ✅ Exists |
| `medical_none_of_these` | CheckBox | 43 | `symptom_none` | ✅ Exists |

**Summary**: 5 new medical fields needed in `incident_reports` table

---

### 4. Accident Date/Time (2 fields)
**Database Table**: `incident_reports`
**UI Page**: incident-form-page3.html (When & Where)

| PDF Field Name | Type | Index | DB Column | Status | Notes |
|----------------|------|-------|-----------|--------|-------|
| `when_did_the_accident_happen` | TextField | 51 | `accident_date` | ✅ Exists | Format: DD/MM/YYYY |
| `what_time_did_the_accident_happen` | TextField | 52 | `accident_time` | ✅ Exists | Format: HH:MM (24hr) |

**All fields exist** ✅

---

### 5. Weather Conditions (18 fields - **7 NEW**)
**Database Table**: `incident_reports`
**UI Page**: incident-form-page4.html (Weather & Conditions)

#### Original Weather Fields (11 existing)
| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `weather_clear_and_dry` | CheckBox | 54 | `weather_clear_dry` | ✅ Exists |
| `weather_bright_daylight` | CheckBox | 55 | `weather_bright_daylight` | ✅ Exists |
| `weather_overcast` | CheckBox | 53 | `weather_overcast` | ✅ Exists |
| `weather_heavy_rain` | CheckBox | 56 | `weather_heavy_rain` | ✅ Exists |
| `weather_fog` | CheckBox | 57 | `weather_fog` | ✅ Exists |
| `weather_snow` | CheckBox | 58 | `weather_snow` | ✅ Exists |
| `weather_dusk` | CheckBox | 68 | `weather_dusk` | ✅ Exists |
| `weather_street_lights` | CheckBox | 61 | `weather_street_lights` | ✅ Exists |

#### NEW Weather Fields (7 new)
| PDF Field Name | Type | Index | DB Column | Status | Notes |
|----------------|------|-------|-----------|--------|-------|
| `weather_thunder_lightening` | CheckBox | 59 | `weather_thunder_lightning` | 🆕 NEW | Typo: "lightening" |
| `weather_drizzle` | CheckBox | 64 | `weather_drizzle` | 🆕 NEW | Light rain |
| `weather_raining` | CheckBox | 65 | `weather_raining` | 🆕 NEW | Moderate rain |
| `weather-hail` | CheckBox | 66 | `weather_hail` | 🆕 NEW | Hail/sleet |
| `weather_windy` | CheckBox | 67 | `weather_windy` | 🆕 NEW | Strong wind |

#### Road Surface Conditions (7 fields - **2 NEW**)
| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `weather_road_dry` | CheckBox | 69 | `road_surface_dry` | ✅ Exists |
| `weather_wet_road` | CheckBox | 70 | `road_surface_wet` | ✅ Exists |
| `weather_ice_on_road` | CheckBox | 60 | `road_surface_ice` | ✅ Exists |
| `weather_snow_on_road` | CheckBox | 73 | `road_surface_snow` | ✅ Exists |
| `weather_slush_road` | CheckBox | 71 | `road_surface_slush` | 🆕 NEW |
| `weather_loose_surface_road` | CheckBox | 72 | `road_surface_loose` | 🆕 NEW |

**Summary**: 7 new weather/road condition fields needed

---

### 6. Road Type & Traffic (11 fields - **7 NEW**)
**Database Table**: `incident_reports`
**UI Page**: incident-form-page4.html (Road Conditions)

#### Road Type (6 fields - all exist)
| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `road_type_motorway` | CheckBox | 74 | `road_type_motorway` | ✅ Exists |
| `road_type_a_road` | CheckBox | 81 | `road_type_a_road` | ✅ Exists |
| `road_type_b_road` | CheckBox | 82 | `road_type_b_road` | ✅ Exists |
| `road_type_urban` | CheckBox | 75 | `road_type_urban` | ✅ Exists |
| `road_type_rural` | CheckBox | 76 | `road_type_rural` | ✅ Exists |
| `road_type_car_park` | CheckBox | 77 | `road_type_car_park` | ✅ Exists |
| `road_type_private_road` | CheckBox | 79 | `road_type_private_road` | ✅ Exists |

#### 🆕 Traffic Conditions (4 NEW fields)
| PDF Field Name | Type | Index | DB Column | Status | Notes |
|----------------|------|-------|-----------|--------|-------|
| `traffic_conditions_heavy` | CheckBox | 78 | `traffic_heavy` | 🆕 NEW | Heavy traffic |
| `traffic_conditions_moderate` | CheckBox | 80 | `traffic_moderate` | 🆕 NEW | Moderate traffic |
| `traffic_conditions_light` | CheckBox | 86 | `traffic_light` | 🆕 NEW | Light traffic |
| `traffic_conditions_no_traffic` | CheckBox | 87 | `traffic_none` | 🆕 NEW | No traffic |

#### 🆕 Road Markings (3 NEW fields)
| PDF Field Name | Type | Index | DB Column | Status | Notes |
|----------------|------|-------|-----------|--------|-------|
| `road_markings_yes` | CheckBox | 85 | `road_markings_present` | 🆕 NEW | Clear markings |
| `road_markings_partial` | CheckBox | 83 | `road_markings_partial` | 🆕 NEW | Faded/partial |
| `road_markings_no` | CheckBox | 84 | `road_markings_absent` | 🆕 NEW | No markings |

**Summary**: 7 new road/traffic fields needed

---

### 7. Visibility (3 fields - **ALL NEW**)
**Database Table**: `incident_reports`
**UI Page**: incident-form-page4.html (Visibility Conditions)

| PDF Field Name | Type | Index | DB Column | Status | Notes |
|----------------|------|-------|-----------|--------|-------|
| `visabilty_good` | CheckBox | 88 | `visibility_good` | 🆕 NEW | Typo: "visabilty" |
| `visability_poor` | CheckBox | 200 | `visibility_poor` | 🆕 NEW | Typo: "visability" |
| `visability_very_poor` | CheckBox | 89 | `visibility_very_poor` | 🆕 NEW | Typo: "visability" |

**Typo note**: PDF uses inconsistent spelling "visabilty" and "visability" (should be "visibility")

**Summary**: 3 new visibility fields needed

---

### 8. Speed & Location (5 fields)
**Database Table**: `incident_reports`
**UI Page**: incident-form-page4.html & page5.html

| PDF Field Name | Type | Index | DB Column | Status | Notes |
|----------------|------|-------|-----------|--------|-------|
| `speed_limit` | TextField | 62 | `speed_limit` | ✅ Exists | mph |
| `your_estimated_speed_mph` | TextField | 63 | `estimated_speed` | ✅ Exists | mph |
| `what3words_address` | TextField | 90 | `what3words` | ✅ Exists | ///word.word.word |
| `nearest_landmark` | TextField | 91 | `nearest_landmark` | ✅ Exists | e.g., Tesco, Post Office |
| `full_address_location_description` | TextField | 92 | `location_description` | ✅ Exists | Full address/description |

**All fields exist** ✅

---

### 9. Junction & Traffic Control (4 fields)
**Database Table**: `incident_reports`
**UI Page**: incident-form-page5.html (Location Details)

| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `what_type_of_junction_was_it` | TextField | 93 | `junction_type` | ✅ Exists |
| `what_controlled_this_junction` | TextField | 94 | `junction_control` | ✅ Exists |
| `what_were_you_doing_when_the_collision_occurred` | TextField | 95 | `action_at_collision` | ✅ Exists |
| `what _color_were_traffic _lights` | TextField | 96 | `traffic_light_color` | ✅ Exists |

**Note**: Field 96 has extra spaces in name: `"what _color_were_traffic _lights"` (PDF inconsistency)

**All fields exist** ✅

---

### 10. Special Hazards/Conditions (15 checkboxes)
**Database Table**: `incident_reports`
**UI Page**: incident-form-page6.html (Special Conditions)

| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `special_conditions_workman` | CheckBox | 97 | `hazard_workman` | ✅ Exists |
| `special_conditions_roadworks` | CheckBox | 106 | `hazard_roadworks` | ✅ Exists |
| `special_conditions_pedestrians` | CheckBox | 98 | `hazard_pedestrians` | ✅ Exists |
| `special_conditions_pedestrian_crossing` | CheckBox | 104 | `hazard_ped_crossing` | ✅ Exists |
| `special_conditions_cyclists` | CheckBox | 107 | `hazard_cyclists` | ✅ Exists |
| `special_conditions_school` | CheckBox | 108 | `hazard_school` | ✅ Exists |
| `special_conditions_traffic_calming` | CheckBox | 99 | `hazard_traffic_calming` | ✅ Exists |
| `special_conditions_sun_glare` | CheckBox | 100 | `hazard_sun_glare` | ✅ Exists |
| `special_conditions_oil_spills` | CheckBox | 101 | `hazard_oil_spill` | ✅ Exists |
| `special_conditions_defective_road` | CheckBox | 102 | `hazard_defective_road` | ✅ Exists |
| `special_conditions_pot_holes` | CheckBox | 103 | `hazard_pot_holes` | ✅ Exists |
| `special_conditions_hedgerow` | CheckBox | 105 | `hazard_hedgerow` | ✅ Exists |
| `special_conditions_narrow_road` | CheckBox | 110 | `hazard_narrow_road` | ✅ Exists |
| `special_conditions_large_vehicle` | CheckBox | 111 | `hazard_large_vehicle` | ✅ Exists |
| `special_conditions_none_of_these` | CheckBox | 109 | `hazard_none` | ✅ Exists |

**Additional Hazards** (text field):
| `special_conditions_additional_hazards` | TextField | 112 | `hazard_additional` | ✅ Exists |

**All 15 fields exist** ✅

---

### 11. Vehicle DVLA Lookup (10 fields - **ALL NEW**)
**Database Table**: `incident_reports` OR new table `dvla_lookup_results`
**UI Page**: incident-form-page7.html (Vehicle Details with DVLA lookup)

| PDF Field Name | Type | Index | DB Column | Status | Notes |
|----------------|------|-------|-----------|--------|-------|
| `uk_licence_plate_look_up` | TextField | 115 | `dvla_lookup_reg` | 🆕 NEW | Registration searched |
| `vehicle_found_make` | TextField | 116 | `dvla_vehicle_make` | 🆕 NEW | From DVLA API |
| `vehicle_found_model` | TextField | 117 | `dvla_vehicle_model` | 🆕 NEW | From DVLA API |
| `vehicle_found_color` | TextField | 118 | `dvla_vehicle_color` | 🆕 NEW | From DVLA API |
| `vehicle_found_year` | TextField | 119 | `dvla_vehicle_year` | 🆕 NEW | From DVLA API |
| `vehicle_found_fuel_type` | TextField | 120 | `dvla_fuel_type` | 🆕 NEW | Petrol/Diesel/Electric |
| `vehicle_found_mot` | TextField | 121 | `dvla_mot_status` | 🆕 NEW | Valid/Expired |
| `vehicle_found_mot_expiry` | TextField | 122 | `dvla_mot_expiry_date` | 🆕 NEW | DD/MM/YYYY |
| `vehicle_found_road_tax` | TextField | 123 | `dvla_tax_status` | 🆕 NEW | Taxed/SORN/Untaxed |
| `vehicle_found_road_tax_due_date` | TextField | 124 | `dvla_tax_due_date` | 🆕 NEW | DD/MM/YYYY |

**Data Source**: UK DVLA API
**Implementation**: Backend service calls DVLA API when user enters registration
**UI Flow**: User enters reg → API lookup → Auto-fill these fields

**Summary**: 10 new DVLA fields needed

---

### 12. Your Vehicle Damage (13 fields)
**Database Table**: `incident_reports`
**UI Page**: incident-form-page8.html (Your Vehicle Damage)

#### Vehicle Driveable Status (3 checkboxes)
| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `yes_i_drove_it_away` | CheckBox | 138 | `vehicle_driveable_yes` | ✅ Exists |
| `no_it_needed_to_be_towed` | CheckBox | 126 | `vehicle_driveable_no` | ✅ Exists |
| `unsure _did_not_attempt` | CheckBox | 127 | `vehicle_driveable_unsure` | ✅ Exists |

**Note**: Field 127 has space in name: `"unsure _did_not_attempt"` (PDF inconsistency)

#### Damage Locations (10 checkboxes)
| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `my_vehicle_has_no_visible_damage` | CheckBox | 125 | `damage_none` | ✅ Exists |
| `vehicle_damage_front` | CheckBox | 136 | `damage_front` | ✅ Exists |
| `vehicle_damage_rear` | CheckBox | 137 | `damage_rear` | ✅ Exists |
| `vehicle_damage_driver_side` | CheckBox | 135 | `damage_driver_side` | ✅ Exists |
| `vehicle_damage_passenger_side` | CheckBox | 132 | `damage_passenger_side` | ✅ Exists |
| `vehicle_damage_front_driver_side` | CheckBox | 128 | `damage_front_driver` | ✅ Exists |
| `vehicle_damage_rear_driver_side` | CheckBox | 129 | `damage_rear_driver` | ✅ Exists |
| `vehicle_damage_front_assenger_side` | CheckBox | 130 | `damage_front_passenger` | ✅ Exists |
| `vehicle_damage_rear_passenger_side` | CheckBox | 131 | `damage_rear_passenger` | ✅ Exists |
| `vehicle_damage_under-carriage` | CheckBox | 133 | `damage_undercarriage` | ✅ Exists |
| `vehicle_damage_roof` | CheckBox | 134 | `damage_roof` | ✅ Exists |

**Typo note**: Field 130 has typo `"front_assenger_side"` (should be "passenger")

**All 13 fields exist** ✅

---

### 13. Your Vehicle - Usual Vehicle Check (2 fields)
**Database Table**: `incident_reports`
**UI Page**: incident-form-page8.html

| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `driving_your_usual_vehicle_yes` | CheckBox | 113 | `usual_vehicle_yes` | ✅ Exists |
| `driving_your_usual_vehicle_no` | CheckBox | 114 | `usual_vehicle_no` | ✅ Exists |

**All fields exist** ✅

---

### 14. Other Vehicle Information (25 fields - **9 NEW**)
**Database Table**: `incident_other_vehicles`
**UI Page**: incident-form-page9.html (Other Vehicle Details)

#### Driver Details (4 fields - all exist)
| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `other_drivers_name` | TextField | 139 | `driver_name` | ✅ Exists |
| `other_driver_email_address` | TextField | 156 | `driver_email` | ✅ Exists |
| `other_driver_mobile_number` | TextField | 158 | `driver_mobile` | ✅ Exists |
| `other_driver_license_number` | TextField | 157 | `driver_license_number` | ✅ Exists |

#### Vehicle Details (6 fields - all exist)
| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `other_car_colour_vehicle_license_plate` | TextField | 153 | `vehicle_registration` | ✅ Exists |
| `other_make_of_car` | TextField | 198 | `vehicle_make` | ✅ Exists |
| `other_car_vehicle_model` | TextField | 154 | `vehicle_model` | ✅ Exists |
| `other_car_colour` | TextField | 140 | `vehicle_color` | ✅ Exists |
| `other_car_vehicle_year` | TextField | 155 | `vehicle_year` | ✅ Exists |
| `other_car_vehicle_fuel_type` | TextField | 141 | `vehicle_fuel_type` | ✅ Exists |

#### 🆕 DVLA Lookup Results for Other Vehicle (9 NEW fields)
| PDF Field Name | Type | Index | DB Column | Status | Notes |
|----------------|------|-------|-----------|--------|-------|
| `other_car_mot_status` | TextField | 142 | `mot_status` | 🆕 NEW | From DVLA API |
| `other_car_mot_expiry` | TextField | 144 | `mot_expiry_date` | 🆕 NEW | From DVLA API |
| `other_car_tax_status` | TextField | 143 | `tax_status` | 🆕 NEW | From DVLA API |
| `other_car_tax_due_date` | TextField | 145 | `tax_due_date` | 🆕 NEW | From DVLA API |
| `other_car_insurance_status` | TextField | 150 | `insurance_status` | 🆕 NEW | From MIB database |
| `other_driver_vehicle_marked_for_export` | TextField | 151 | `marked_for_export` | 🆕 NEW | From DVLA API |

#### Insurance Details (4 fields - **3 NEW**)
| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `other_car_insurance_company` | TextField | 146 | `insurance_company` | ✅ Exists |
| `other_car_colour_policy number` | TextField | 147 | `insurance_policy_number` | 🆕 NEW |
| `other_car_colour_policy holder` | TextField | 148 | `insurance_policy_holder` | 🆕 NEW |
| `other_car_colour_policy_cover_type` | TextField | 149 | `insurance_cover_type` | 🆕 NEW |

**Note**: Fields 147-149 all have odd prefix `"other_car_colour_policy"` (PDF inconsistency - should be just `"other_car_policy"`)

#### Damage Information (2 fields)
| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `other_car_no_visible_damage` | CheckBox | 159 | `no_visible_damage` | ✅ Exists |
| `describe_the_damage_to_the_other_vehicle` | TextField (multiline) | 152 | `damage_description` | ✅ Exists |

**Summary**: 9 new fields needed in `incident_other_vehicles` table (mostly DVLA lookup results)

---

### 15. Witness Information (10 fields - **5 NEW for witness_2**)
**Database Table**: `incident_witnesses` (needs to support 2 witnesses)
**UI Page**: incident-form-page10.html (Witnesses)

#### Witness Presence (2 checkboxes)
| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `any_witness` | CheckBox | 174 | `witnesses_present_yes` | ✅ Exists |
| `any_witness_no` | CheckBox | 175 | `witnesses_present_no` | ✅ Exists |

#### Witness 1 (4 fields - all exist)
| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `witness_name` | TextField | 160 | `witness_1_name` | ✅ Exists |
| `witness_mobile_number` | TextField | 161 | `witness_1_mobile` | ✅ Exists |
| `witness_email_address` | TextField | 162 | `witness_1_email` | ✅ Exists |
| `witness_statement` | TextField (multiline) | 163 | `witness_1_statement` | ✅ Exists |

#### 🆕 Witness 2 (4 NEW fields)
| PDF Field Name | Type | Index | DB Column | Status | Notes |
|----------------|------|-------|-----------|--------|-------|
| `witness_name_2` | TextField | 164 | `witness_2_name` | 🆕 NEW | Second witness |
| `witness_mobile_number_2` | TextField | 165 | `witness_2_mobile` | 🆕 NEW | Second witness |
| `witness_email_address_2` | TextField | 166 | `witness_2_email` | 🆕 NEW | Second witness |
| `witness_statement_2` | TextField (multiline) | 167 | `witness_2_statement` | 🆕 NEW | Second witness |

**Implementation Options**:
1. Add 4 new columns to `incident_witnesses` table
2. OR use existing structure with `witness_number` field (1 or 2) and create 2 rows

**Summary**: 4 new fields for witness_2 support

---

### 16. Police Information (8 fields)
**Database Table**: `incident_reports`
**UI Page**: incident-form-page11.html (Police & Alcohol Tests)

#### Police Attendance (2 checkboxes)
| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `did_police_attend` | CheckBox | 176 | `police_attended_yes` | ✅ Exists |
| `did_police_attend_no` | CheckBox | 206 | `police_attended_no` | ✅ Exists |

#### Police Details (4 text fields)
| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `police_officer_name` | TextField | 168 | `police_officer_name` | ✅ Exists |
| `police_officer_badge_number` | TextField | 170 | `police_badge_number` | ✅ Exists |
| `police_force_details` | TextField | 171 | `police_force` | ✅ Exists |
| `accident_reference_number` | TextField | 169 | `police_reference_number` | ✅ Exists |

#### Breath Tests (2 text fields)
| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `breath_test` | TextField | 172 | `breath_test_result_you` | ✅ Exists |
| `other_breath_test` | TextField | 173 | `breath_test_result_other` | ✅ Exists |

**All 8 fields exist** ✅

---

### 17. Safety Equipment (4 fields)
**Database Table**: `incident_reports`
**UI Page**: incident-form-page12.html (Safety Features)

#### Seatbelts (3 fields)
| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `wearing_seatbelts` | CheckBox | 178 | `seatbelt_yes` | ✅ Exists |
| `wearing_seatbelts_no` | CheckBox | 179 | `seatbelt_no` | ✅ Exists |
| `reason_no_seatbelts` | TextField (multiline) | 177 | `seatbelt_reason_not_worn` | ✅ Exists |

#### Airbags (2 checkboxes)
| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `airbags_deployed` | CheckBox | 181 | `airbags_deployed_yes` | ✅ Exists |
| `airbags_deployed_no` | CheckBox | 180 | `airbags_deployed_no` | ✅ Exists |

**All 4 fields exist** ✅

---

### 18. Image File Paths (5 fields)
**Database Table**: `user_documents` (file paths)
**UI Page**: signup-form.html (Vehicle images) and incident forms (scene/other vehicle images)

| PDF Field Name | Type | Index | DB Column | Status | Notes |
|----------------|------|-------|-----------|--------|-------|
| `vehicle_picture_front` | TextField (multiline) | 24 | N/A | ✅ Exists | File path from storage |
| `vehicle_picture_driver_side` | TextField (multiline) | 26 | N/A | ✅ Exists | File path |
| `vehicle_picture_passenger_side` | TextField (multiline) | 27 | N/A | ✅ Exists | File path |
| `vehicle_picture_back` | TextField (multiline) | 28 | N/A | ✅ Exists | File path |
| `driving_license_picture` | TextField (multiline) | 25 | N/A | ✅ Exists | File path |

**Mapping**: These are populated from `user_documents.storage_path` column
**Format**: File system paths or Supabase Storage URLs

**All fields exist** ✅

---

### 19. 🆕 Image URLs for Embedding (15 NEW fields)
**Database Table**: Generated URLs (not stored)
**Purpose**: Embed actual images in PDF (different from file paths)

| PDF Field Name | Type | Index | DB Column | Status | Notes |
|----------------|------|-------|-----------|--------|-------|
| **Vehicle Images** (6 URLs) |
| `vehicle_images_file_1_url` | TextField (multiline) | 182 | N/A | 🆕 NEW | Signed URL for embedding |
| `vehicle_images_file_2_url` | TextField (multiline) | 183 | N/A | 🆕 NEW | Signed URL |
| `vehicle_images_file_3_url` | TextField (multiline) | 184 | N/A | 🆕 NEW | Signed URL |
| `vehicle_images_file_4_url` | TextField (multiline) | 185 | N/A | 🆕 NEW | Signed URL |
| `vehicle_images_file_5_url` | TextField (multiline) | 186 | N/A | 🆕 NEW | Signed URL |
| `vehicle_images_file_6_url` | TextField (multiline) | 187 | N/A | 🆕 NEW | Signed URL |
| **Scene Images** (3 URLs) |
| `scene_images_file_1_url` | TextField (multiline) | 189 | N/A | 🆕 NEW | Signed URL |
| `scene_images_file_2_url` | TextField (multiline) | 190 | N/A | 🆕 NEW | Signed URL |
| `scene_images_file_3_url` | TextField (multiline) | 191 | N/A | 🆕 NEW | Signed URL |
| **Other Vehicle Images** (3 URLs) |
| `other_vehicle_images_1_url` | TextField (multiline) | 192 | N/A | 🆕 NEW | Signed URL |
| `other_vehicle_images_2_url` | TextField (multiline) | 193 | N/A | 🆕 NEW | Signed URL |
| `other_vehicle_images_3_url` | TextField (multiline) | 194 | N/A | 🆕 NEW | Signed URL |
| **Location Map** (3 URLs) |
| `what3Words_map_image_url` | TextField (multiline) | 188 | N/A | 🆕 NEW | what3words map image |

**Implementation**:
- Generate temporary signed URLs from Supabase Storage at PDF creation time
- URLs expire after 1 hour but are embedded as images in PDF (permanent)
- Different from file paths which are just text references

**Summary**: 15 new URL fields (not stored in DB, generated on-demand)

---

### 20. AI/Transcription (4 fields)
**Database Table**: `ai_transcription` and `ai_summary`
**UI Page**: transcription-status.html (AI processing results)

| PDF Field Name | Type | Index | DB Column | Status | Notes |
|----------------|------|-------|-----------|--------|-------|
| `ai_transcription` | TextField | 195 | `ai_transcription.transcript_text` | ✅ Exists | OpenAI Whisper output |
| `ai_model_used` | TextField | 196 | `ai_transcription.model` | ✅ Exists | e.g., "whisper-1" |
| `ai_summary` | TextField | 197 | `ai_summary.summary_text` | ✅ Exists | Legal summary |
| `ai_narrative_text` | TextField | 201 | `ai_summary.narrative` | ✅ Exists | Plain English version |

**All 4 fields exist** ✅

---

### 21. Additional Comments (1 field)
**Database Table**: `incident_reports`
**UI Page**: incident-form-page13.html (Additional Information)

| PDF Field Name | Type | Index | DB Column | Status |
|----------------|------|-------|-----------|--------|
| `anything_else_important` | TextField (multiline) | 199 | `additional_comments` | ✅ Exists |

**Field exists** ✅

---

### 22. Declaration/Signature (3 fields)
**Database Table**: `incident_reports`
**UI Page**: declaration.html (Final page)

| PDF Field Name | Type | Index | DB Column | Status | Notes |
|----------------|------|-------|-----------|--------|-------|
| `Signature70` | PDFSignature | 203 | `signature_data` | ✅ Exists | Base64 signature image |
| `Date69_af_date` | TextField | 202 | `signature_date` | ✅ Exists | DD/MM/YYYY |
| `time_stamp` | PDFSignature | 20 | `timestamp` | ✅ Exists | Auto-generated timestamp |

**All 3 fields exist** ✅

---

### 23. 🎯 User ID Field (CRITICAL - REQUESTED FIELD)
**Database Table**: `user_signup` (foreign key reference)
**Purpose**: Tracking and linking all data to user

| PDF Field Name | Type | Index | DB Column | Status | Notes |
|----------------|------|-------|-----------|--------|-------|
| `id` | TextField | 207 | `user_signup.create_user_id` | 🆕 NEW | **This is the field requested** |

**Recommendation**:
- **Value**: `create_user_id` (UUID) from `user_signup` table
- **Format**: Standard UUID (e.g., `4be91117-ca01-48f8-b5ec-aceca952cc4c`)
- **Purpose**: Unique identifier for Supabase queries and GDPR compliance
- **Placement**: Suggested footer on all pages or Page 1 header
- **Security**: Not sensitive (UUID is not PII)

**This is field #207 - the tracking field you requested!** ✅

---

## Summary Tables

### New Fields Summary

| Category | New Fields | DB Table | UI Page |
|----------|-----------|----------|---------|
| Medical | 5 | `incident_reports` | page2.html |
| Weather/Road Surface | 7 | `incident_reports` | page4.html |
| Traffic Conditions | 4 | `incident_reports` | page4.html |
| Road Markings | 3 | `incident_reports` | page4.html |
| Visibility | 3 | `incident_reports` | page4.html |
| DVLA Lookup (Your Vehicle) | 10 | `incident_reports` | page7.html |
| DVLA Lookup (Other Vehicle) | 9 | `incident_other_vehicles` | page9.html |
| Other Vehicle Insurance | 3 | `incident_other_vehicles` | page9.html |
| Witness 2 | 4 | `incident_witnesses` | page10.html |
| Image URLs | 15 | Generated (not stored) | Various |
| User ID Tracking | 1 | `user_signup` (reference) | Footer/Header |
| **TOTAL** | **64** | **4 tables** | **10 pages** |

---

### Database Schema Changes Required

#### 1. `incident_reports` table (25 new columns)

```sql
-- Medical (5 new)
ALTER TABLE incident_reports ADD COLUMN ambulance_called BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN hospital_name TEXT;
ALTER TABLE incident_reports ADD COLUMN injury_severity TEXT;
ALTER TABLE incident_reports ADD COLUMN treatment_received TEXT;

-- Weather/Road (7 new)
ALTER TABLE incident_reports ADD COLUMN weather_thunder_lightning BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN weather_drizzle BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN weather_raining BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN weather_hail BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN weather_windy BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN road_surface_slush BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN road_surface_loose BOOLEAN DEFAULT FALSE;

-- Traffic (4 new)
ALTER TABLE incident_reports ADD COLUMN traffic_heavy BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN traffic_moderate BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN traffic_light BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN traffic_none BOOLEAN DEFAULT FALSE;

-- Road Markings (3 new)
ALTER TABLE incident_reports ADD COLUMN road_markings_present BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN road_markings_partial BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN road_markings_absent BOOLEAN DEFAULT FALSE;

-- Visibility (3 new)
ALTER TABLE incident_reports ADD COLUMN visibility_good BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN visibility_poor BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN visibility_very_poor BOOLEAN DEFAULT FALSE;

-- DVLA Lookup (10 new)
ALTER TABLE incident_reports ADD COLUMN dvla_lookup_reg TEXT;
ALTER TABLE incident_reports ADD COLUMN dvla_vehicle_make TEXT;
ALTER TABLE incident_reports ADD COLUMN dvla_vehicle_model TEXT;
ALTER TABLE incident_reports ADD COLUMN dvla_vehicle_color TEXT;
ALTER TABLE incident_reports ADD COLUMN dvla_vehicle_year INTEGER;
ALTER TABLE incident_reports ADD COLUMN dvla_fuel_type TEXT;
ALTER TABLE incident_reports ADD COLUMN dvla_mot_status TEXT;
ALTER TABLE incident_reports ADD COLUMN dvla_mot_expiry_date DATE;
ALTER TABLE incident_reports ADD COLUMN dvla_tax_status TEXT;
ALTER TABLE incident_reports ADD COLUMN dvla_tax_due_date DATE;
```

#### 2. `incident_other_vehicles` table (9 new columns)

```sql
-- DVLA Lookup Results
ALTER TABLE incident_other_vehicles ADD COLUMN mot_status TEXT;
ALTER TABLE incident_other_vehicles ADD COLUMN mot_expiry_date DATE;
ALTER TABLE incident_other_vehicles ADD COLUMN tax_status TEXT;
ALTER TABLE incident_other_vehicles ADD COLUMN tax_due_date DATE;
ALTER TABLE incident_other_vehicles ADD COLUMN insurance_status TEXT;
ALTER TABLE incident_other_vehicles ADD COLUMN marked_for_export BOOLEAN DEFAULT FALSE;

-- Insurance Details
ALTER TABLE incident_other_vehicles ADD COLUMN insurance_policy_number TEXT;
ALTER TABLE incident_other_vehicles ADD COLUMN insurance_policy_holder TEXT;
ALTER TABLE incident_other_vehicles ADD COLUMN insurance_cover_type TEXT;
```

#### 3. `incident_witnesses` table (4 new columns OR restructure)

**Option A - Add columns for witness 2**:
```sql
ALTER TABLE incident_witnesses ADD COLUMN witness_2_name TEXT;
ALTER TABLE incident_witnesses ADD COLUMN witness_2_mobile TEXT;
ALTER TABLE incident_witnesses ADD COLUMN witness_2_email TEXT;
ALTER TABLE incident_witnesses ADD COLUMN witness_2_statement TEXT;
```

**Option B - Use normalized structure** (recommended):
```sql
-- Existing structure already supports multiple witnesses
-- Just create 2 rows per incident instead of 1
-- witness_number field distinguishes witness 1 from witness 2
```

---

## PDF Typos & Inconsistencies

### Spelling Errors
1. `ambulance_callled` - 3 L's (should be `ambulance_called`)
2. `visabilty_good`, `visability_poor`, `visability_very_poor` - inconsistent spelling (should be `visibility`)
3. `weather-hail` - uses hyphen instead of underscore
4. `vehicle_damage_front_assenger_side` - typo: "assenger" (should be "passenger")
5. `unsure _did_not_attempt` - extra space before underscore
6. `what _color_were_traffic _lights` - spaces around underscores

### Naming Inconsistencies
1. **Other vehicle fields**: Many use odd prefix `other_car_colour_policy` (fields 147-149, 153)
   - Should be: `other_car_policy_number`, `other_car_policy_holder`, etc.
2. **Weather vs Road Surface**: Some road conditions use `weather_` prefix (e.g., `weather_wet_road`, `weather_slush_road`)
   - Inconsistent with other road fields

**Recommendation**: Document these for PDF creator, but map correctly in code (handle typos gracefully)

---

## Implementation Checklist

### Phase 1: Database Updates
- [ ] Add 25 new columns to `incident_reports`
- [ ] Add 9 new columns to `incident_other_vehicles`
- [ ] Decide on witness_2 structure (4 columns OR normalized rows)
- [ ] Add indexes for new DVLA lookup fields
- [ ] Update RLS policies for new columns

### Phase 2: DVLA Integration
- [ ] Create DVLA API service (`src/services/dvlaService.js`)
- [ ] Add API endpoint: `POST /api/dvla/lookup`
- [ ] Handle rate limiting (DVLA API has strict limits)
- [ ] Cache DVLA results to minimize API calls
- [ ] Error handling for invalid reg plates

### Phase 3: UI Updates
- [ ] Add DVLA lookup button to vehicle forms (page 7 & 9)
- [ ] Add traffic condition checkboxes (page 4)
- [ ] Add visibility checkboxes (page 4)
- [ ] Add road markings checkboxes (page 4)
- [ ] Add expanded weather options (page 4)
- [ ] Add witness_2 fields (page 10)
- [ ] Add new medical fields (page 2)

### Phase 4: PDF Generation Service
- [ ] Update `pdfService.fillForm()` to handle 207 fields (up from 146)
- [ ] Generate signed URLs for 15 image URL fields
- [ ] Map `create_user_id` to `id` field (tracking)
- [ ] Handle missing DVLA data gracefully (optional fields)
- [ ] Test with real user data (use user_signup_rows.csv)

### Phase 5: Testing
- [ ] Unit tests for DVLA service
- [ ] Integration test for full PDF generation (207 fields)
- [ ] Test witness_2 UI flow
- [ ] Test DVLA auto-fill behavior
- [ ] Test image URL generation and embedding
- [ ] Manual test with production user data

---

## Field Type Statistics

| Type | Count | Percentage |
|------|-------|------------|
| PDFTextField | 119 | 57.5% |
| PDFCheckBox | 86 | 41.5% |
| PDFSignature | 2 | 1.0% |
| **Total** | **207** | **100%** |

**Multiline TextFields**: 20 fields (URLs, statements, descriptions)

---

## Next Steps Recommendation

1. **Immediate**: Update database schema (Phase 1)
2. **High Priority**: Implement DVLA API integration (Phase 2)
3. **Medium Priority**: Update UI forms with new fields (Phase 3)
4. **Before Production**: Update PDF filling service (Phase 4)
5. **Before Launch**: Comprehensive testing with real data (Phase 5)

---

**Document Created**: 2025-11-02
**PDF Analyzed**: Car-Crash-Lawyer-AI-incident-report 02112025.pdf
**Status**: Ready for implementation
**Estimated Work**: 3-4 days (1 day DB + 1 day DVLA + 1 day UI + 1 day PDF service + testing)
