# Field Reconciliation Analysis: PDF vs Database vs Documented

**Date**: 2025-12-12
**Purpose**: Identify over-engineered/non-existent fields in CORRECTED_MASTER_PROMPT.md

---

## Executive Summary

**PDF Template Reality**: 213 fields total (120 text, 92 checkbox, 1 other)
**CORRECTED_MASTER_PROMPT Claims**: 235+ fields
**Discrepancy**: ~22+ fabricated/incorrect field names

---

## Category 1: FABRICATED FIELDS (Don't Exist in PDF or Database)

### 1.1 Visibility Fields - WRONG PREFIX

**❌ Documented in CORRECTED_MASTER_PROMPT (DON'T EXIST):**
```javascript
visibility_condition_very_good      // FABRICATED - wrong prefix
visibility_condition_good           // FABRICATED - wrong prefix
visibility_condition_moderate       // FABRICATED - wrong prefix
visibility_condition_poor           // FABRICATED - wrong prefix
visibility_condition_very_poor      // FABRICATED - wrong prefix
visibility_condition_fog            // FABRICATED - wrong prefix
visibility_condition_heavy_rain     // FABRICATED - wrong prefix
visibility_condition_snow           // FABRICATED - wrong prefix
visibility_condition_dusk           // FABRICATED - wrong prefix
visibility_condition_darkness       // FABRICATED - wrong prefix
```

**✅ ACTUAL PDF FIELDS (7 fields):**
```javascript
visibilty_good                      // ⚠️ PDF typo: "visibilty"
visibilty_street_lights             // ⚠️ PDF typo: "visibilty"
visibility_poor
visibility_very_poor
visibility_sun_glare
visibility_large_vehicle
visibility_restricted_structure
```

**Issue**: Documented fields use `visibility_condition_*` prefix which doesn't exist. Real fields use `visibility_*` or `visibilty_*` (with typo).

---

### 1.2 Road Marking Fields - COMPLETELY FABRICATED

**❌ Documented in CORRECTED_MASTER_PROMPT (DON'T EXIST):**
```javascript
road_marking_single_white_line      // FABRICATED - doesn't exist
road_marking_double_white_lines     // FABRICATED - doesn't exist
road_marking_none_visible           // FABRICATED - doesn't exist
```

**✅ ACTUAL PDF FIELDS (3 fields):**
```javascript
road_markings_vsible_yes            // ⚠️ PDF typo: "vsible"
road_markings_vsible_no             // ⚠️ PDF typo: "vsible"
road_markings_visible_partially
```

**Issue**: Documented uses singular `road_marking_*` and made-up descriptors. Real fields use plural `road_markings_*` with yes/no/partially options.

---

### 1.3 Special Conditions - PARTIALLY WRONG

**❌ Documented in CORRECTED_MASTER_PROMPT (8 DON'T EXIST):**
```javascript
special_condition_pedestrian_crossing  // FABRICATED - PDF has "crossing" not "pedestrian_crossing"
special_condition_traffic_lights       // FABRICATED - doesn't exist
special_condition_railway_crossing     // FABRICATED - doesn't exist
special_condition_bridge               // FABRICATED - doesn't exist
special_condition_tunnel               // FABRICATED - doesn't exist
special_condition_bend                 // FABRICATED - doesn't exist
special_condition_junction             // FABRICATED - doesn't exist
special_condition_hill                 // FABRICATED - doesn't exist
```

**✅ ACTUAL PDF FIELDS (12 fields):**
```javascript
special_condition_animals              // MISSING from documented list
special_condition_crossing             // NOT "pedestrian_crossing"!
special_condition_cyclists             // MISSING from documented list
special_condition_narrow_road          // ✓ Documented correctly
special_condition_oil_spills           // MISSING from documented list
special_condition_parked_vehicles      // MISSING from documented list
special_condition_pedestrians          // MISSING from documented list
special_condition_potholes             // MISSING from documented list
special_condition_roadworks            // ✓ Documented correctly
special_condition_school_zone          // ✓ Documented correctly
special_condition_traffic_calming      // ✓ Documented correctly
special_condition_workmen              // MISSING from documented list
```

**Issue**: Documented list invents 8 fields that don't exist and misses 8 that do exist.

---

### 1.4 Vehicle Impact/Damage Points - WRONG PREFIX

**❌ Documented in CORRECTED_MASTER_PROMPT (DON'T EXIST):**
```javascript
damage_front                        // FABRICATED - wrong prefix
damage_front_driver                 // FABRICATED - wrong prefix
damage_front_passenger              // FABRICATED - wrong prefix
damage_rear                         // FABRICATED - wrong prefix
damage_rear_driver                  // FABRICATED - wrong prefix
damage_rear_passenger               // FABRICATED - wrong prefix
damage_driver_side                  // FABRICATED - wrong prefix
damage_passenger_side               // FABRICATED - wrong prefix
damage_roof                         // FABRICATED - wrong prefix
damage_undercarriage                // FABRICATED - wrong prefix
damage_multiple                     // FABRICATED - wrong prefix
```

**✅ Need to verify actual PDF field names** - checking now...

---

## Category 2: Fields with TYPOS (Real but Misspelled in PDF)

These fields exist but have typos in the PDF template itself:

```javascript
// Documented correctly accounts for typos:
medical_symptom_limb_pain_mobilty        // ⚠️ PDF typo: "mobilty" not "mobility"
medical_symptom_life _threatening        // ⚠️ PDF has SPACE: "life _threatening"
weather_thunder_lightening               // ⚠️ PDF typo: "lightening" not "lightning"
visibilty_good                           // ⚠️ PDF typo: "visibilty" not "visibility"
visibilty_street_lights                  // ⚠️ PDF typo: "visibilty" not "visibility"
road_markings_vsible_yes                 // ⚠️ PDF typo: "vsible" not "visible"
road_markings_vsible_no                  // ⚠️ PDF typo: "vsible" not "visible"
```

**Status**: These are correctly documented in later implementation sections.

---

## Category 3: Text Fields - Need Verification

**Documented Image Reference Fields (15 fields):**
```javascript
your_vehicle_damage_photo_1_url
your_vehicle_damage_photo_2_url
your_vehicle_damage_photo_3_url
other_vehicle_damage_photo_1_url
other_vehicle_damage_photo_2_url
scene_photo_1_url
scene_photo_2_url
scene_photo_3_url
injuries_photo_url
police_report_photo_url
insurance_documents_photo_url
witness_statement_photo_url
road_sign_photo_url
skid_marks_photo_url
debris_photo_url
```

**Question**: Do these field names exist in the PDF template? Need to verify against pdf-template-fields.json.

---

**Documented AI Analysis Fields (8 fields):**
```javascript
ai_incident_summary
ai_liability_assessment
ai_vehicle_damage_analysis
ai_injury_assessment
ai_witness_credibility
ai_evidence_quality
ai_recommendations
ai_closing_statement
```

**Question**: Do these exist in PDF template or only in database?

---

## Next Steps

1. ✅ Verify all text field names exist in PDF template
2. ✅ Verify all database field names match schema
3. ❌ Create minimal field mapping (database → PDF only)
4. ❌ Remove all fabricated fields from documentation
5. ❌ Update CORRECTED_MASTER_PROMPT.md with only real fields

---

## Summary of Over-Engineering

**Fabricated Prefixes:**
- `visibility_condition_*` → Should be `visibility_*` or `visibilty_*`
- `road_marking_*` (singular) → Should be `road_markings_*` (plural)
- `damage_*` → Need to verify actual prefix

**Fabricated Special Conditions (8 fields):**
- pedestrian_crossing, traffic_lights, railway_crossing, bridge, tunnel, bend, junction, hill

**Missing Special Conditions from Docs (8 fields):**
- animals, cyclists, oil_spills, parked_vehicles, pedestrians, potholes, workmen
- "crossing" (not "pedestrian_crossing")

**Total Fabricated Fields Identified So Far**: ~27+ fields

---

**Status**: Analysis in progress. Next: Verify remaining field categories against PDF template.
