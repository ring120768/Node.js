# Over-Engineered Fields: Complete Analysis

**Date**: 2025-12-12
**PDF Template Reality**: 213 fields (120 text, 92 checkbox, 1 signature)
**CORRECTED_MASTER_PROMPT Claims**: 235+ fields
**Discrepancy**: 22+ fabricated/incorrect fields

---

## FABRICATED FIELDS (Don't Exist in PDF)

### 1. Visibility Fields - WRONG PREFIX (10 fields)

**❌ Documented (DON'T EXIST):**
```
visibility_condition_very_good
visibility_condition_good
visibility_condition_moderate
visibility_condition_poor
visibility_condition_very_poor
visibility_condition_fog
visibility_condition_heavy_rain
visibility_condition_snow
visibility_condition_dusk
visibility_condition_darkness
```

**✅ ACTUAL PDF (7 checkboxes):**
```
visibility_large_vehicle
visibility_poor
visibility_restricted_structure
visibility_sun_glare
visibility_very_poor
visibilty_good               # ⚠️ Typo in PDF
visibilty_street_lights      # ⚠️ Typo in PDF
```

---

### 2. Road Marking Fields - COMPLETELY WRONG (3 fields)

**❌ Documented (DON'T EXIST):**
```
road_marking_single_white_line     # Wrong: singular + made-up
road_marking_double_white_lines    # Wrong: singular + made-up
road_marking_none_visible          # Wrong: singular + made-up
```

**✅ ACTUAL PDF (3 checkboxes):**
```
road_markings_visible_partially    # Plural + different options
road_markings_vsible_no            # ⚠️ Typo: "vsible"
road_markings_vsible_yes           # ⚠️ Typo: "vsible"
```

---

### 3. Special Conditions - 8 FABRICATED, 8 CORRECT (partial)

**❌ Documented (DON'T EXIST):**
```
special_condition_pedestrian_crossing   # PDF has "crossing" not "pedestrian_crossing"
special_condition_traffic_lights
special_condition_railway_crossing
special_condition_bridge
special_condition_tunnel
special_condition_bend
special_condition_junction
special_condition_hill
```

**✅ ACTUAL PDF (12 checkboxes):**
```
special_condition_animals
special_condition_crossing           # NOT "pedestrian_crossing"
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
```

---

### 4. Damage/Impact Points - WRONG PREFIX (11 fields)

**❌ Documented (DON'T EXIST):**
```
damage_front
damage_front_driver
damage_front_passenger
damage_rear
damage_rear_driver
damage_rear_passenger
damage_driver_side
damage_passenger_side
damage_roof
damage_undercarriage
damage_multiple
```

**✅ ACTUAL PDF (10 checkboxes):**
```
impact_point_driver_side       # "impact_point_" NOT "damage_"
impact_point_front
impact_point_front_driver
impact_point_front_passenger
impact_point_passenger_side
impact_point_rear
impact_point_rear_driver
impact_point_rear_passenger
impact_point_roof
impact_point_under_carriage    # Underscore, not "undercarriage"
```

**Note**: No `damage_multiple` field exists.

---

### 5. Image/Photo URL Fields - 9 FABRICATED

**❌ Documented (DON'T EXIST):**
```
your_vehicle_damage_photo_1_url        # Should be "vehicle_damage_photo_1_url"
your_vehicle_damage_photo_2_url        # Should be "vehicle_damage_photo_2_url"
your_vehicle_damage_photo_3_url        # Should be "vehicle_damage_photo_3_url"
injuries_photo_url                     # FABRICATED
police_report_photo_url                # FABRICATED
insurance_documents_photo_url          # FABRICATED
witness_statement_photo_url            # FABRICATED
road_sign_photo_url                    # FABRICATED
skid_marks_photo_url                   # FABRICATED
debris_photo_url                       # FABRICATED
```

**✅ ACTUAL PDF (11 text fields):**
```
vehicle_damage_photo_1_url      # NO "your_" prefix
vehicle_damage_photo_2_url
vehicle_damage_photo_3_url
vehicle_damage_photo_4_url      # Has 4 and 5 (not in documented list!)
vehicle_damage_photo_5_url
other_vehicle_photo_1_url       # Different name than documented
other_vehicle_photo_2_url
other_vehicle_photo_3_url
scene_photo_1_url               # ✓ Correct
scene_photo_2_url               # ✓ Correct
scene_photo_3_url               # ✓ Correct
```

---

### 6. AI Analysis Fields - NOT IN PDF (8 fields)

**❌ Documented (exist in DB, NOT in PDF):**
```
ai_incident_summary
ai_liability_assessment
ai_vehicle_damage_analysis
ai_injury_assessment
ai_witness_credibility
ai_evidence_quality
ai_recommendations
ai_closing_statement
```

**✅ ACTUAL PDF (2 text fields related to AI):**
```
ai_summary              # Different name
closing_statement       # No "ai_" prefix
analysis_metadata       # Not documented
```

**Note**: The 8 `ai_*` fields exist in database schema but have NO corresponding fields in the PDF template. PDF only has `ai_summary` and `closing_statement`.

---

### 7. Text Field Name Errors

**❌ Documented (WRONG NAMES):**
```
incident_description           # Actual: See below for variations
incident_location              # Actual: "location"
incident_road_name             # Actual: "street_name_optional"
incident_what3words            # Actual: "what3words"
accident_description           # Actual: See actual fields
your_vehicle_damage_description  # Actual: "damage_to_your_vehicle"
scene_description              # Actual: See actual fields
police_incident_number         # Actual: "accident_ref_number"
police_officer_name            # Actual: "officer_name"
police_station                 # Actual: "police_force"
road_name_number               # Actual: "street_name_optional"
nearest_junction               # Actual: "junction_type" or "junction_control"
```

**✅ ACTUAL PDF text fields include:**
```
accident_ref_number            # NOT "police_incident_number"
officer_name                   # NOT "police_officer_name"
officer_badge                  # NOT "police_officer_badge_number"
location                       # NOT "incident_location"
damage_to_your_vehicle         # NOT "your_vehicle_damage_description"
medical_how_are_you_feeling    # ⚠️ TEXT field, not checkbox!
final_feeling                  # ⚠️ CHECKBOX field, not text!
```

---

## CORRECT FIELD CATEGORIES

### ✅ Weather Conditions (13 checkboxes) - ALL CORRECT
```
weather_bright_sunlight
weather_clear
weather_cloudy
weather_drizzle
weather_raining
weather_heavy_rain
weather_fog
weather_snow
weather_hail
weather_thunder_lightening     # ⚠️ Typo: "lightening"
weather_windy
weather_dusk
```

Missing from PDF but documented: NONE (all 13 are correct!)

---

### ✅ Medical Symptoms (13 checkboxes) - ALL CORRECT
```
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
medical_symptom_limb_pain_mobilty     # ⚠️ Typo: "mobilty"
medical_symptom_life _threatening     # ⚠️ Space: "life _threatening"
medical_symptom_none
```

---

### ✅ Road Conditions (6 checkboxes) - ALL CORRECT
```
road_condition_dry
road_condition_wet
road_condition_icy
road_condition_snow_covered
road_condition_slush_on_road
road_condition_loose_surface
```

---

### ✅ Road Types (7 checkboxes) - ALL CORRECT
```
road_type_motorway
road_type_a_road
road_type_b_road
road_type_urban
road_type_rural
road_type_private_road
road_type_car_park
```

---

### ✅ Traffic Conditions (4 checkboxes) - ALL CORRECT
```
traffic_conditions_no_traffic
traffic_conditions_light
traffic_conditions_moderate
traffic_conditions_heavy
```

---

## FIELD NAME TYPOS IN PDF (Documented Correctly)

These typos exist in the actual PDF template:

```
medical_symptom_limb_pain_mobilty      # "mobilty" not "mobility"
medical_symptom_life _threatening      # Space before underscore
weather_thunder_lightening             # "lightening" not "lightning"
visibilty_good                         # "visibilty" not "visibility"
visibilty_street_lights                # "visibilty" not "visibility"
road_markings_vsible_yes               # "vsible" not "visible"
road_markings_vsible_no                # "vsible" not "visible"
unsure _did_not_attempt                # Space before underscore
```

---

## SUMMARY OF OVER-ENGINEERING

**Total Fabricated/Incorrect Fields**: ~50+ fields

**Categories:**
1. Visibility: 10 fields with wrong `_condition` suffix
2. Road Markings: 3 fields with wrong singular prefix and descriptors
3. Special Conditions: 8 fabricated fields
4. Impact Points: 11 fields with wrong `damage_` prefix instead of `impact_point_`
5. Photo URLs: 9 completely fabricated image fields + wrong prefixes on 3 others
6. AI Analysis: 8 fields exist in DB but NOT in PDF (only 2 AI-related fields in PDF)
7. Text Field Names: ~15+ field names don't match actual PDF field names

**Correct Categories:**
- Weather Conditions: 13/13 ✅
- Medical Symptoms: 13/13 ✅
- Road Conditions: 6/6 ✅
- Road Types: 7/7 ✅
- Traffic Conditions: 4/4 ✅

---

## ACTION REQUIRED

1. Remove all fabricated field references from CORRECTED_MASTER_PROMPT.md
2. Correct all field name mismatches
3. Create simple database → PDF field mapping (only real fields)
4. Remove AI analysis field mappings (they don't exist in PDF)
5. Update photo URL field names to match actual PDF
6. Strip out all over-engineered patterns

**Target**: Reduce from 235+ documented fields to 213 actual PDF fields with correct names.
