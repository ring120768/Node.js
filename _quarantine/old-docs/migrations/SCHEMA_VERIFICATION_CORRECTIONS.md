# Schema Verification & Master Prompt Corrections

## Critical Findings

After analyzing the actual database schemas (`incident_reports` and `user_signup`), I've identified **critical discrepancies** in the master prompt that must be corrected.

---

## ❌ CRITICAL ERROR #1: No TEXT[] Array Fields

**Master Prompt Claims (INCORRECT):**
```javascript
// Pattern C: Array fields (TEXT[] columns)
const medicalSymptoms = incident.medical_symptoms || [];
const weatherConditions = incident.weather_conditions || [];
```

**Actual Schema (CORRECT):**
```sql
-- Medical symptoms are INDIVIDUAL BOOLEAN columns, NOT arrays
medical_symptom_chest_pain BOOLEAN DEFAULT false
medical_symptom_breathlessness BOOLEAN DEFAULT false
medical_symptom_severe_headache BOOLEAN DEFAULT false
-- ... 13 total medical symptom booleans

-- Weather conditions are INDIVIDUAL BOOLEAN columns, NOT arrays
weather_bright_sunlight BOOLEAN DEFAULT false
weather_clear BOOLEAN DEFAULT false
weather_raining BOOLEAN DEFAULT false
-- ... 13 total weather booleans
```

**Impact:** Pattern C in the master prompt is **completely wrong**. There are NO TEXT[] array fields in `incident_reports`.

**Correction Required:** Remove Pattern C entirely. All multi-select fields are already individual booleans and should use Pattern B (Boolean Checkboxes).

---

## ✅ CORRECTED Pattern: Boolean Checkbox Fields

### Medical Symptoms (13 fields)
```javascript
// All stored as individual BOOLEAN columns
const medicalSymptomMappings = {
  'symptom_chest_pain': incident.medical_symptom_chest_pain,
  'symptom_uncontrolled_bleeding': incident.medical_symptom_uncontrolled_bleeding,
  'symptom_breathlessness': incident.medical_symptom_breathlessness,
  'symptom_limb_weakness': incident.medical_symptom_limb_weakness,
  'symptom_dizziness': incident.medical_symptom_dizziness,
  'symptom_loss_of_consciousness': incident.medical_symptom_loss_of_consciousness,
  'symptom_severe_headache': incident.medical_symptom_severe_headache,
  'symptom_change_in_vision': incident.medical_symptom_change_in_vision,
  'symptom_abdominal_pain': incident.medical_symptom_abdominal_pain,
  'symptom_abdominal_bruising': incident.medical_symptom_abdominal_bruising,
  'symptom_limb_pain_mobility': incident.medical_symptom_limb_pain_mobility,
  'symptom_life_threatening': incident.medical_symptom_life_threatening,
  'symptom_none': incident.medical_symptom_none
};
```

### Weather Conditions (13 fields)
```javascript
const weatherMappings = {
  'weather_bright_sunlight': incident.weather_bright_sunlight,
  'weather_clear': incident.weather_clear,
  'weather_cloudy': incident.weather_cloudy,
  'weather_raining': incident.weather_raining,
  'weather_heavy_rain': incident.weather_heavy_rain,
  'weather_drizzle': incident.weather_drizzle,
  'weather_fog': incident.weather_fog,
  'weather_snow': incident.weather_snow,
  'weather_ice': incident.weather_ice,
  'weather_windy': incident.weather_windy,
  'weather_hail': incident.weather_hail,
  'weather_thunder_lightning': incident.weather_thunder_lightning,
  'weather_dusk': incident.weather_dusk
};
```

### Road Conditions (6 fields)
```javascript
const roadConditionMappings = {
  'road_condition_dry': incident.road_condition_dry,
  'road_condition_wet': incident.road_condition_wet,
  'road_condition_icy': incident.road_condition_icy,
  'road_condition_snow_covered': incident.road_condition_snow_covered,
  'road_condition_loose_surface': incident.road_condition_loose_surface,
  'road_condition_slush_on_road': incident.road_condition_slush_on_road
};
```

### Road Types (7 fields)
```javascript
const roadTypeMappings = {
  'road_type_motorway': incident.road_type_motorway,
  'road_type_a_road': incident.road_type_a_road,
  'road_type_b_road': incident.road_type_b_road,
  'road_type_urban_street': incident.road_type_urban_street,
  'road_type_rural_road': incident.road_type_rural_road,
  'road_type_car_park': incident.road_type_car_park,
  'road_type_private_road': incident.road_type_private_road
};
```

### Traffic Conditions (4 fields)
```javascript
const trafficMappings = {
  'traffic_conditions_heavy': incident.traffic_conditions_heavy,
  'traffic_conditions_moderate': incident.traffic_conditions_moderate,
  'traffic_conditions_light': incident.traffic_conditions_light,
  'traffic_conditions_no_traffic': incident.traffic_conditions_no_traffic
};
```

### Visibility Conditions (10 fields)
```javascript
const visibilityMappings = {
  'visibility_good': incident.visibility_good,
  'visibility_poor': incident.visibility_poor,
  'visibility_very_poor': incident.visibility_very_poor,
  'visibility_street_lights': incident.visibility_street_lights,
  'visibility_clear': incident.visibility_clear,
  'visibility_restricted_structure': incident.visibility_restricted_structure,
  'visibility_restricted_bend': incident.visibility_restricted_bend,
  'visibility_large_vehicle': incident.visibility_large_vehicle,
  'visibility_sun_glare': incident.visibility_sun_glare
};
```

### Road Markings (3 fields)
```javascript
const roadMarkingsMappings = {
  'road_markings_visible_yes': incident.road_markings_visible_yes,
  'road_markings_visible_no': incident.road_markings_visible_no,
  'road_markings_visible_partially': incident.road_markings_visible_partially
};
```

### Special Conditions (12 fields)
```javascript
const specialConditionMappings = {
  'special_condition_roadworks': incident.special_condition_roadworks,
  'special_condition_workmen': incident.special_condition_workmen,
  'special_condition_cyclists': incident.special_condition_cyclists,
  'special_condition_pedestrians': incident.special_condition_pedestrians,
  'special_condition_traffic_calming': incident.special_condition_traffic_calming,
  'special_condition_parked_vehicles': incident.special_condition_parked_vehicles,
  'special_condition_crossing': incident.special_condition_crossing,
  'special_condition_school_zone': incident.special_condition_school_zone,
  'special_condition_narrow_road': incident.special_condition_narrow_road,
  'special_condition_potholes': incident.special_condition_potholes,
  'special_condition_oil_spills': incident.special_condition_oil_spills,
  'special_condition_animals': incident.special_condition_animals
};
```

### Vehicle Impact Points (11 fields)
```javascript
const impactPointMappings = {
  'no_damage': incident.no_damage,
  'impact_point_front': incident.impact_point_front,
  'impact_point_front_driver': incident.impact_point_front_driver,
  'impact_point_front_passenger': incident.impact_point_front_passenger,
  'impact_point_driver_side': incident.impact_point_driver_side,
  'impact_point_passenger_side': incident.impact_point_passenger_side,
  'impact_point_rear_driver': incident.impact_point_rear_driver,
  'impact_point_rear_passenger': incident.impact_point_rear_passenger,
  'impact_point_rear': incident.impact_point_rear,
  'impact_point_roof': incident.impact_point_roof,
  'impact_point_undercarriage': incident.impact_point_undercarriage
};
```

### Other Vehicle Damage
```javascript
const otherVehicleDamageMappings = {
  'no_visible_damage': incident.no_visible_damage
};
```

---

## ✅ CORRECTED Pattern: Text Fields

### Accident Details
```javascript
const accidentDetailMappings = {
  'accident_date': formatUKDate(incident.accident_date),
  'accident_time': incident.accident_time,
  'location': incident.location,
  'what3words': incident.what3words,
  'nearest_landmark': incident.nearest_landmark
};
```

### Junction & Traffic Control
```javascript
const junctionMappings = {
  'junction_type': incident.junction_type,
  'junction_control': incident.junction_control,
  'traffic_light_status': incident.traffic_light_status,
  'user_manoeuvre': incident.user_manoeuvre
};
```

### Speed & Additional Hazards
```javascript
const speedHazardMappings = {
  'speed_limit': incident.speed_limit,
  'your_speed': incident.your_speed?.toString(),
  'additional_hazards': incident.additional_hazards
};
```

### Medical Details
```javascript
const medicalDetailMappings = {
  'medical_attention_needed': incident.medical_attention_needed ? 'Yes' : 'No',
  'medical_injury_details': incident.medical_injury_details,
  'medical_injury_severity': incident.medical_injury_severity,
  'medical_hospital_name': incident.medical_hospital_name,
  'medical_ambulance_called': incident.medical_ambulance_called ? 'Yes' : 'No',
  'medical_treatment_received': incident.medical_treatment_received,
  'final_feeling': incident.final_feeling // ← KEY FIELD: "How are you feeling"
};
```

### User Vehicle Details
```javascript
const userVehicleMappings = {
  'usual_vehicle': incident.usual_vehicle,
  'vehicle_license_plate': incident.vehicle_license_plate,
  'manual_make': incident.manual_make,
  'manual_model': incident.manual_model,
  'manual_colour': incident.manual_colour,
  'manual_year': incident.manual_year?.toString(),
  'damage_to_your_vehicle': incident.damage_to_your_vehicle,
  'vehicle_driveable': incident.vehicle_driveable,
  'describle_the_damage': incident.describle_the_damage // Note: typo in schema
};
```

### DVLA Data
```javascript
const dvlaMappings = {
  'dvla_make': incident.dvla_make,
  'dvla_model': incident.dvla_model,
  'dvla_colour': incident.dvla_colour,
  'dvla_year': incident.dvla_year?.toString(),
  'dvla_fuel_type': incident.dvla_fuel_type,
  'dvla_mot_status': incident.dvla_mot_status,
  'dvla_mot_expiry': formatUKDate(incident.dvla_mot_expiry),
  'dvla_tax_status': incident.dvla_tax_status,
  'dvla_tax_due_date': formatUKDate(incident.dvla_tax_due_date),
  'dvla_insurance_status': incident.dvla_insurance_status
};
```

### Other Driver/Vehicle (Embedded in incident_reports)
```javascript
const otherDriverVehicleMappings = {
  'other_full_name': incident.other_full_name,
  'other_contact_number': incident.other_contact_number,
  'other_email_address': incident.other_email_address,
  'other_driving_license_number': incident.other_driving_license_number,
  'other_vehicle_registration': incident.other_vehicle_registration,
  'other_vehicle_look_up_make': incident.other_vehicle_look_up_make,
  'other_vehicle_look_up_model': incident.other_vehicle_look_up_model,
  'other_vehicle_look_up_colour': incident.other_vehicle_look_up_colour,
  'other_vehicle_look_up_year': incident.other_vehicle_look_up_year?.toString(),
  'other_vehicle_look_up_fuel_type': incident.other_vehicle_look_up_fuel_type,
  'other_vehicle_look_up_mot_status': incident.other_vehicle_look_up_mot_status,
  'other_vehicle_look_up_mot_expiry_date': formatUKDate(incident.other_vehicle_look_up_mot_expiry_date),
  'other_vehicle_look_up_tax_status': incident.other_vehicle_look_up_tax_status,
  'other_vehicle_look_up_tax_due_date': formatUKDate(incident.other_vehicle_look_up_tax_due_date),
  'other_vehicle_look_up_insurance_status': incident.other_vehicle_look_up_insurance_status,
  'other_drivers_insurance_company': incident.other_drivers_insurance_company,
  'other_drivers_policy_number': incident.other_drivers_policy_number,
  'other_drivers_policy_holder_name': incident.other_drivers_policy_holder_name,
  'other_drivers_policy_cover_type': incident.other_drivers_policy_cover_type,
  'describe_damage_to_vehicle': incident.describe_damage_to_vehicle
};
```

### Witness Details (Embedded in incident_reports)
```javascript
const witnessMappings = {
  'witnesses_present': incident.witnesses_present,
  'any_witness': incident.any_witness,
  'witness_name': incident.witness_name,
  'witness_mobile_number': incident.witness_mobile_number,
  'witness_email_address': incident.witness_email_address,
  'witness_statement': incident.witness_statement
};
```

### Police Details
```javascript
const policeMappings = {
  'police_attended': incident.police_attended,
  'accident_ref_number': incident.accident_ref_number,
  'police_force': incident.police_force,
  'officer_name': incident.officer_name,
  'officer_badge': incident.officer_badge,
  'user_breath_test': incident.user_breath_test,
  'other_breath_test': incident.other_breath_test
};
```

### Safety Equipment
```javascript
const safetyEquipmentMappings = {
  'airbags_deployed': incident.airbags_deployed,
  'seatbelts_worn': incident.seatbelts_worn,
  'seatbelt_reason': incident.seatbelt_reason
};
```

### Image URLs (14 fields)
```javascript
const imageUrlMappings = {
  'scene_photo_1_url': incident.scene_photo_1_url,
  'scene_photo_2_url': incident.scene_photo_2_url,
  'scene_photo_3_url': incident.scene_photo_3_url,
  'other_vehicle_photo_1_url': incident.other_vehicle_photo_1_url,
  'other_vehicle_photo_2_url': incident.other_vehicle_photo_2_url,
  'other_vehicle_photo_3_url': incident.other_vehicle_photo_3_url,
  'vehicle_damage_photo_1_url': incident.vehicle_damage_photo_1_url,
  'vehicle_damage_photo_2_url': incident.vehicle_damage_photo_2_url,
  'vehicle_damage_photo_3_url': incident.vehicle_damage_photo_3_url,
  'vehicle_damage_photo_4_url': incident.vehicle_damage_photo_4_url,
  'vehicle_damage_photo_5_url': incident.vehicle_damage_photo_5_url,
  'vehicle_damage_photo_6_url': incident.vehicle_damage_photo_6_url,
  'audio_recording_url': incident.audio_recording_url,
  'file_url_other_vehicle': incident.file_url_other_vehicle,
  'file_url_other_vehicle_1': incident.file_url_other_vehicle_1
};
```

---

## ✅ CORRECTED Pattern: Safety Check Summary

```javascript
/**
 * Generate six-point safety check summary
 * Maps to PDF field: safety_check_summary (or similar)
 */
function generateSafetyCheckSummary(incident, userData) {
  const parts = [];

  // From incident_reports
  if (incident.six_point_safety_check_completed) {
    parts.push('✓ Six-Point Safety Check Completed');
  }

  if (incident.final_feeling) {
    parts.push(`Current Feeling: ${incident.final_feeling}`);
  }

  // From user_signup (if needed)
  if (userData.are_you_safe !== null) {
    parts.push(userData.are_you_safe ? 'User confirmed safe' : 'User requires assistance');
  }

  return parts.join('\n') || 'Safety check not completed';
}
```

---

## ✅ CORRECTED Pattern: User Signup Data

The master prompt didn't account for `user_signup` table fields. Many personal/vehicle details come from this table, NOT incident_reports.

### Personal Details (from user_signup)
```javascript
const userPersonalMappings = {
  'name': userData.name,
  'surname': userData.surname,
  'email': userData.email,
  'mobile': userData.mobile,
  'phone_number': userData.phone_number,
  'date_of_birth': formatUKDate(userData.date_of_birth),
  'driving_license_number': userData.driving_license_number,
  'street_address': userData.street_address,
  'street_address_optional': userData.street_address_optional,
  'town': userData.town,
  'postcode': userData.postcode,
  'country': userData.country
};
```

### User Vehicle Details (from user_signup)
```javascript
const userVehicleDetailsMappings = {
  'license_plate': userData.license_plate || userData.car_registration_number,
  'vehicle_make': userData.vehicle_make,
  'vehicle_model': userData.vehicle_model,
  'vehicle_colour': userData.vehicle_colour,
  'vehicle_condition': userData.vehicle_condition
};
```

### Insurance Details (from user_signup)
```javascript
const insuranceMappings = {
  'insurance_company': userData.insurance_company,
  'policy_number': userData.policy_number,
  'policy_holder': userData.policy_holder,
  'cover_type': userData.cover_type
};
```

### Emergency & Recovery (from user_signup)
```javascript
const emergencyRecoveryMappings = {
  'emergency_contact': userData.emergency_contact,
  'emergency_company': userData.emergency_company,
  'emergency_email': userData.emergency_email,
  'recovery_company': userData.recovery_company,
  'recovery_breakdown_number': userData.recovery_breakdown_number,
  'recovery_breakdown_email': userData.recovery_breakdown_email
};
```

### Image References (from user_signup)
```javascript
const userImageMappings = {
  'driving_license_picture': userData.driving_license_picture,
  'vehicle_picture_front': userData.vehicle_picture_front,
  'vehicle_picture_driver_side': userData.vehicle_picture_driver_side,
  'vehicle_picture_passenger_side': userData.vehicle_picture_passenger_side,
  'vehicle_picture_back': userData.vehicle_picture_back
};
```

---

## ⚠️ IMPORTANT: Pattern F Clarification

The master prompt mentions "normalized tables" for witnesses and other vehicles. However, the `incident_reports` schema shows **embedded fields** for ONE witness and ONE other vehicle.

**Clarification needed:**
- Do the separate tables `incident_other_vehicles` and `incident_witnesses` exist?
- If yes, they handle MULTIPLE witnesses/vehicles (beyond the first one)
- If no, only use the embedded fields in `incident_reports`

**Current schema shows:**
- `incident_reports` has embedded fields for 1 witness + 1 other vehicle
- Separate normalized tables (mentioned in /db output) handle additional entries

**Recommendation:** Pattern F should handle BOTH:
1. Embedded fields (first witness, first other vehicle)
2. Normalized table records (additional witnesses, additional vehicles)

---

## 📊 Complete Field Count

### incident_reports Table
| Category | Field Count | Type |
|----------|-------------|------|
| Medical Symptoms | 13 | BOOLEAN |
| Weather Conditions | 13 | BOOLEAN |
| Road Conditions | 6 | BOOLEAN |
| Road Types | 7 | BOOLEAN |
| Traffic Conditions | 4 | BOOLEAN |
| Visibility | 10 | BOOLEAN |
| Road Markings | 3 | BOOLEAN |
| Special Conditions | 12 | BOOLEAN |
| Vehicle Impact Points | 11 | BOOLEAN |
| Medical Details | 7 | TEXT/BOOLEAN |
| Accident Details | 5 | TEXT/DATE |
| Junction Details | 4 | TEXT |
| Speed & Hazards | 3 | TEXT/INTEGER |
| User Vehicle | 8 | TEXT/INTEGER |
| DVLA Data | 10 | TEXT/DATE/INTEGER |
| Other Driver/Vehicle | 19 | TEXT/DATE/INTEGER |
| Witnesses | 6 | TEXT |
| Police | 7 | TEXT |
| Safety Equipment | 3 | TEXT |
| Image URLs | 15 | TEXT |
| Safety Check | 2 | TEXT/BOOLEAN |
| AI Analysis (Pages 13-22) | 7 | TEXT/JSONB |
| System/Metadata | 11 | UUID/TIMESTAMP |
| **TOTAL** | **~185 fields** | **Mixed** |

### user_signup Table
| Category | Field Count | Type |
|----------|-------------|------|
| Personal Details | 11 | TEXT/DATE |
| Vehicle Details | 5 | TEXT |
| Insurance | 4 | TEXT |
| Emergency/Recovery | 6 | TEXT |
| Image References | 5 | TEXT |
| Safety Status | 4 | BOOLEAN/TEXT/TIMESTAMP |
| Subscription | 5 | TIMESTAMP/TEXT/BOOLEAN |
| System/Metadata | 10 | UUID/TIMESTAMP/TEXT |
| **TOTAL** | **~50 fields** | **Mixed** |

---

## 🎯 Corrected Implementation Summary

### Remove From Master Prompt:
- ❌ **Pattern C:** Array checkbox fields (TEXT[] columns don't exist)

### Keep From Master Prompt:
- ✅ **Pattern A:** Single text fields (with additions from user_signup)
- ✅ **Pattern B:** Boolean checkboxes (expanded to 79+ boolean fields)
- ✅ **Pattern D:** Date fields (UK format DD/MM/YYYY)
- ✅ **Pattern E:** Safety check summary
- ✅ **Pattern F:** Normalized tables (clarify if they exist)
- ✅ **Pattern G:** Image references (expanded to include user_signup images)
- ✅ **Pattern H:** DVLA data

### Add To Master Prompt:
- ✅ **Pattern I:** User signup data (personal, vehicle, insurance, emergency)

---

## ✅ Final Verification Checklist

- [x] Identified all 185 fields in `incident_reports`
- [x] Identified all 50 fields in `user_signup`
- [x] Corrected Pattern C (no TEXT[] arrays)
- [x] Expanded Pattern B (79+ boolean fields)
- [x] Added user_signup field mappings
- [x] Clarified safety check summary fields
- [x] Documented image URL fields (15 in incident_reports + 5 in user_signup)
- [x] Verified AI analysis fields (pages 13-22) are NOT affected
- [ ] Confirm existence of `incident_other_vehicles` table
- [ ] Confirm existence of `incident_witnesses` table

---

**Next Step:** Update the master prompt with these corrections before implementation.
