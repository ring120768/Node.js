# Incident Form Field Audit List

**Purpose:** Review all field names being submitted to `incident_reports` table to identify any that don't exist in your database schema.

**Generated:** 2025-11-10
**Source:** `src/controllers/incidentForm.controller.js` - `buildIncidentData()` function

---

## How to Use This List

1. **Review each field name** - Do you recognize it from your database?
2. **Mark unknown fields** - Highlight any fields you don't remember creating
3. **Check against schema** - Run `/db` slash command or query Supabase to verify
4. **Report findings** - Let me know which fields look suspicious

---

## Field List by Page (160 fields total)

### 🔧 System Fields (4 fields)
- [ ] `create_user_id` - UUID of user submitting form
- [ ] `submission_source` - Always set to "in_house_form"
- [ ] `created_at` - Timestamp of submission
- [ ] `updated_at` - Last updated timestamp

---

### 📍 Page 1: Date, Time, Location (6 fields)
- [ ] `accident_date` - Date of incident (mapped from page1.incident_date)
- [ ] `accident_time` - Time of incident (mapped from page1.incident_time)
- [ ] `location_address` - Street address
- [ ] `location_postcode` - UK postcode
- [ ] `location_city` - City name
- [ ] `location_what3words` - what3words location reference
- [ ] ~~`incident_description`~~ - **REMOVED** (doesn't exist in schema)

---

### 🏥 Page 2: Medical Information (26 fields)

#### Basic Medical Fields (6)
- [ ] `medical_attention_needed` - Boolean: Did they need medical attention?
- [ ] `medical_injury_details` - Text description of injuries
- [ ] `medical_injury_severity` - Severity level (minor/moderate/severe)
- [ ] `medical_hospital_name` - Name of hospital if attended
- [ ] `medical_ambulance_called` - Boolean: Was ambulance called?
- [ ] `medical_treatment_received` - Description of treatment

#### Medical Symptoms (13 booleans)
- [ ] `medical_symptom_chest_pain`
- [ ] `medical_symptom_uncontrolled_bleeding`
- [ ] `medical_symptom_breathlessness`
- [ ] `medical_symptom_limb_weakness`
- [ ] `medical_symptom_loss_of_consciousness`
- [ ] `medical_symptom_severe_headache`
- [ ] `medical_symptom_change_in_vision`
- [ ] `medical_symptom_abdominal_pain`
- [ ] `medical_symptom_abdominal_bruising`
- [ ] `medical_symptom_limb_pain_mobility`
- [ ] `medical_symptom_dizziness`
- [ ] `medical_symptom_life_threatening`
- [ ] `medical_symptom_none` - User confirmed no symptoms

---

### 🌦️ Page 3: Weather & Road Conditions (41 fields)

#### Weather Conditions (12 booleans)
- [ ] `weather_bright_sunlight`
- [ ] `weather_clear`
- [ ] `weather_cloudy`
- [ ] `weather_raining`
- [ ] `weather_heavy_rain`
- [ ] `weather_drizzle`
- [ ] `weather_fog`
- [ ] `weather_snow`
- [ ] `weather_ice`
- [ ] `weather_windy`
- [ ] `weather_hail`
- [ ] `weather_thunder_lightning`

#### Road Conditions (6 booleans)
- [ ] `road_condition_dry`
- [ ] `road_condition_wet`
- [ ] `road_condition_icy`
- [ ] `road_condition_snow_covered`
- [ ] `road_condition_loose_surface`
- [ ] `road_condition_slush_on_road`

#### Road Types (7 booleans)
- [ ] `road_type_motorway`
- [ ] `road_type_a_road`
- [ ] `road_type_b_road`
- [ ] `road_type_urban_street`
- [ ] `road_type_rural_road`
- [ ] `road_type_car_park`
- [ ] `road_type_private_road`

#### Speed Fields (2)
- [ ] `speed_limit` - Posted speed limit
- [ ] `your_speed` - User's estimated speed

#### Traffic Conditions (4 booleans)
- [ ] `traffic_conditions_heavy`
- [ ] `traffic_conditions_moderate`
- [ ] `traffic_conditions_light`
- [ ] `traffic_conditions_no_traffic`

#### Visibility (4 booleans)
- [ ] `visibility_good`
- [ ] `visibility_poor`
- [ ] `visibility_very_poor`
- [ ] `visibility_street_lights`

#### Road Markings (3 booleans)
- [ ] `road_markings_visible_yes`
- [ ] `road_markings_visible_no`
- [ ] `road_markings_visible_partially`

---

### 🛣️ Page 4: Location Details & Hazards (30 fields)

#### Location Fields (3)
- [ ] `location` - General location description
- [ ] `what3words` - what3words reference (duplicate of page1?)
- [ ] `nearest_landmark` - Nearby landmark description

#### Junction Information (4)
- [ ] `junction_type` - Type of junction (T-junction, roundabout, etc.)
- [ ] `junction_control` - Traffic control method (lights, signs, etc.)
- [ ] `traffic_light_status` - Status of traffic lights if present
- [ ] `user_manoeuvre` - What user was doing (turning, straight, etc.)

#### Additional Context (1)
- [ ] `additional_hazards` - Free text for other hazards

#### Visibility Factors (5 booleans)
- [ ] `visibility_clear` - Clear visibility
- [ ] `visibility_restricted_structure` - Blocked by building/structure
- [ ] `visibility_restricted_bend` - Blocked by road bend
- [ ] `visibility_large_vehicle` - Blocked by large vehicle
- [ ] `visibility_sun_glare` - Sun glare affecting visibility

#### Special Conditions (12 booleans)
- [ ] `special_condition_roadworks` - Roadworks present
- [ ] `special_condition_workmen` - Workers in road
- [ ] `special_condition_cyclists` - Cyclists in road
- [ ] `special_condition_pedestrians` - Pedestrians in road
- [ ] `special_condition_traffic_calming` - Speed bumps, etc.
- [ ] `special_condition_parked_vehicles` - Parked cars obstructing
- [ ] `special_condition_crossing` - Pedestrian crossing present
- [ ] `special_condition_school_zone` - School zone
- [ ] `special_condition_narrow_road` - Narrow road
- [ ] `special_condition_potholes` - Potholes or road defects
- [ ] `special_condition_oil_spills` - Oil or fluid spills
- [ ] `special_condition_animals` - Animals in road

---

### 🚗 Page 5: Your Vehicle Details (34 fields)

#### Basic Vehicle Info (2)
- [ ] `usual_vehicle` - Is this your usual vehicle? (yes/no)
- [ ] `vehicle_license_plate` - Registration number (formerly dvla_lookup_reg)

#### DVLA Lookup Data (10 fields)
- [ ] `dvla_make` - Vehicle make from DVLA
- [ ] `dvla_model` - Vehicle model from DVLA
- [ ] `dvla_colour` - Vehicle colour from DVLA (British spelling)
- [ ] `dvla_year` - Year of manufacture from DVLA
- [ ] `dvla_fuel_type` - Fuel type from DVLA
- [ ] `dvla_mot_status` - MOT status from DVLA
- [ ] `dvla_mot_expiry` - MOT expiry date from DVLA
- [ ] `dvla_tax_status` - Tax status from DVLA
- [ ] `dvla_tax_due_date` - Tax due date from DVLA
- [ ] `dvla_insurance_status` - Insurance status from DVLA

#### Damage Information (2)
- [ ] `no_damage` - Boolean: No damage to vehicle
- [ ] `damage_to_your_vehicle` - Text description of damage

#### Impact Points (10 booleans)
- [ ] `impact_point_front` - Front of vehicle hit
- [ ] `impact_point_front_driver` - Front driver side hit
- [ ] `impact_point_front_passenger` - Front passenger side hit
- [ ] `impact_point_driver_side` - Driver side hit
- [ ] `impact_point_passenger_side` - Passenger side hit
- [ ] `impact_point_rear_driver` - Rear driver side hit
- [ ] `impact_point_rear_passenger` - Rear passenger side hit
- [ ] `impact_point_rear` - Rear of vehicle hit
- [ ] `impact_point_roof` - Roof hit
- [ ] `impact_point_undercarriage` - Undercarriage hit

#### Driveability (1)
- [ ] `vehicle_driveable` - Can vehicle be driven? (yes/no)

#### Manual Entry Fallback (4)
- [ ] `manual_make` - Manually entered make (if DVLA lookup failed)
- [ ] `manual_model` - Manually entered model
- [ ] `manual_colour` - Manually entered colour
- [ ] `manual_year` - Manually entered year

#### Legacy Fields (5) - Backward compatibility with old Typeform
⚠️ **Note:** These might be redundant with DVLA fields above
- [ ] `your_vehicle_make` - Legacy: Vehicle make
- [ ] `your_vehicle_model` - Legacy: Vehicle model
- [ ] `your_vehicle_color` - Legacy: Vehicle color (American spelling)
- [ ] `your_vehicle_registration` - Legacy: Registration
- [ ] `your_vehicle_year` - Legacy: Year

---

### 🚙 Page 7: Other Driver & Vehicle (20 fields)

#### Driver Information (4)
- [ ] `other_full_name` - Other driver's full name
- [ ] `other_contact_number` - Other driver's phone number
- [ ] `other_email_address` - Other driver's email
- [ ] `other_driving_license_number` - Other driver's license number

#### Vehicle Registration (1)
- [ ] `other_vehicle_registration` - Other vehicle's registration

#### DVLA Lookup Data for Other Vehicle (10 fields)
⚠️ **Note:** Check if these have different column names from your vehicle's DVLA fields
- [ ] `other_vehicle_look_up_make`
- [ ] `other_vehicle_look_up_model`
- [ ] `other_vehicle_look_up_colour`
- [ ] `other_vehicle_look_up_year`
- [ ] `other_vehicle_look_up_fuel_type`
- [ ] `other_vehicle_look_up_mot_status`
- [ ] `other_vehicle_look_up_mot_expiry_date`
- [ ] `other_vehicle_look_up_tax_status`
- [ ] `other_vehicle_look_up_tax_due_date`
- [ ] `other_vehicle_look_up_insurance_status`

#### Insurance Information (4)
- [ ] `other_drivers_insurance_company` - Insurance company name
- [ ] `other_drivers_policy_number` - Policy number
- [ ] `other_drivers_policy_holder_name` - Policy holder name
- [ ] `other_drivers_policy_cover_type` - Type of cover (comprehensive, etc.)

#### Damage Information (2)
- [ ] `no_visible_damage` - Boolean: No visible damage to other vehicle
- [ ] `describe_damage_to_vehicle` - Description of damage to other vehicle

---

### 👥 Page 9: Witnesses (1 field)
⚠️ **Note:** Witness details are saved to separate `incident_witnesses` table
- [ ] `witnesses_present` - Were witnesses present? (yes/no/unsure)

---

### 👮 Page 10: Police & Safety Equipment (10 fields)

#### Police Information (5)
- [ ] `police_attended` - Boolean: Did police attend?
- [ ] `accident_ref_number` - Police CAD/reference number
- [ ] `police_force` - Police force name (e.g., "Metropolitan Police")
- [ ] `officer_name` - Attending officer's name
- [ ] `officer_badge` - Officer's badge/collar number

#### Breath Tests (2)
- [ ] `user_breath_test` - User's breath test result (positive/negative/not_tested)
- [ ] `other_breath_test` - Other driver's breath test result

#### Safety Equipment (3)
- [ ] `airbags_deployed` - Boolean: Were airbags deployed?
- [ ] `seatbelts_worn` - Were seatbelts worn? (yes/no/some)
- [ ] `seatbelt_reason` - Reason if seatbelt not worn (only if seatbelts_worn = 'no')

---

### ✅ Page 12: Final Medical Check (2 fields)
- [ ] `final_feeling` - How user feels now (fine/shaken/minor_pain/significant_pain/emergency)
- [ ] `form_completed_at` - Timestamp when form was completed

---

## Summary Statistics

- **Total Fields:** 160
- **Boolean Fields:** ~100 (checkboxes)
- **Text Fields:** ~30
- **Date/Time Fields:** ~5
- **Numeric Fields:** ~2 (speed fields)
- **Removed Fields:** 1 (`incident_description`)

---

## Fields to Double-Check

### 🔍 Potential Duplicates
1. **what3words vs location_what3words** (Page 1 & Page 4)
   - Are these the same field? Should they be merged?

2. **DVLA fields vs Legacy fields** (Page 5)
   - Do you need both `dvla_make` AND `your_vehicle_make`?
   - Same question for model, color, registration, year

3. **location vs location_address** (Page 1 & Page 4)
   - Are these different fields or duplicates?

### ⚠️ Suspicious Naming
1. **other_vehicle_look_up_*** (Page 7)
   - Very long column names with "look_up" in them
   - Check if these match your actual column names (might be missing underscores or have different format)

2. **dvla_mot_expiry** vs **other_vehicle_look_up_mot_expiry_date**
   - One has "_date" suffix, the other doesn't
   - Should they be consistent?

3. **your_vehicle_color** vs **dvla_colour**
   - American vs British spelling
   - Will these map to the same column or different columns?

---

## Next Steps

1. **Review this list** - Mark any fields you don't recognize
2. **Check database schema** - Compare against your actual table columns
3. **Run test submission** - Try submitting the form to see which fields fail
4. **Report back** - Tell me which fields look wrong

Would you like me to:
- Generate a SQL query to check which of these columns actually exist?
- Compare this list against your database schema file?
- Create a migration to add any missing columns?
