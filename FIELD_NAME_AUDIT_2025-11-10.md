# Field Name Audit - 2025-11-10

## Executive Summary

Comprehensive audit of field name mismatches between controller expectations and database schema.

**Status**: ✅ Critical mismatches fixed (13 fields corrected)

## Audit Methodology

1. Extracted 187 field names from controller (`buildIncidentData` function)
2. Extracted 104 column names from database migrations
3. Cross-referenced to identify mismatches

## Critical Fixes Applied

### 1. Date/Time Fields ✅
**Issue**: Controller used old field names from Typeform era

| Controller (Old) | Database (Actual) | Status |
|------------------|-------------------|---------|
| `incident_date`  | `accident_date`   | ✅ Fixed |
| `incident_time`  | `accident_time`   | ✅ Fixed |

**File**: `src/controllers/incidentForm.controller.js:410-411`  
**Migration**: `016_add_page3_fields.sql` (lines 13-14)

### 2. Medical Symptoms ✅
**Issue**: Controller used `medical_symptom_*` prefix, database has `medical_*`

| Controller (Old) | Database (Actual) | Status |
|------------------|-------------------|---------|
| `medical_symptom_chest_pain` | `medical_chest_pain` | ✅ Fixed |
| `medical_symptom_uncontrolled_bleeding` | `medical_uncontrolled_bleeding` | ✅ Fixed |
| `medical_symptom_breathlessness` | `medical_breathlessness` | ✅ Fixed |
| `medical_symptom_limb_weakness` | `medical_limb_weakness` | ✅ Fixed |
| `medical_symptom_loss_of_consciousness` | `medical_loss_of_consciousness` | ✅ Fixed |
| `medical_symptom_severe_headache` | `medical_severe_headache` | ✅ Fixed |
| `medical_symptom_abdominal_bruising` | `medical_abdominal_bruising` | ✅ Fixed |
| `medical_symptom_change_in_vision` | `medical_change_in_vision` | ✅ Fixed |
| `medical_symptom_abdominal_pain` | `medical_abdominal_pain` | ✅ Fixed |
| `medical_symptom_limb_pain_mobility` | `medical_limb_pain` | ✅ Fixed |
| `medical_symptom_none` | `medical_none_of_these` | ✅ Fixed |

**File**: `src/controllers/incidentForm.controller.js:427-437`  
**Migration**: `013_recreate_incident_reports_from_csv.sql` (lines 47-57)

### 3. Seatbelt Fields ✅
**Issue**: Field name mismatch for seatbelt usage

| Controller (Old) | Database (Actual) | Status |
|------------------|-------------------|---------|
| `seatbelts_worn` | `wearing_seatbelts` | ✅ Fixed |
| `seatbelt_reason` | `why_werent_seat_belts_being_worn` | ✅ Fixed |

**File**: `src/controllers/incidentForm.controller.js:628-629`  
**Migration**: `013_recreate_incident_reports_from_csv.sql` (lines 78-80)

## Fields Requiring Further Investigation

### Potentially Missing Columns

These controller fields may need database migrations:

1. **Police Information** (Page 10):
   - `police_attended`, `police_force`, `officer_name`, `officer_badge`
   - `user_breath_test`, `other_breath_test`
   
2. **Vehicle Damage Descriptions**:
   - `damage_to_your_vehicle` (text description)
   - `describe_damage_to_vehicle` (text description)
   - DB only has boolean fields: `was_your_vehicle_damaged`, `no_damage`, `no_visible_damage`

3. **Location Fields**:
   - `location_address`, `location_city`, `location_postcode`
   - DB has: `where_exactly_did_this_happen` (single text field)

4. **Other Vehicle Data**:
   - `other_vehicle_registration`, `other_full_name`, etc.
   - May be stored in separate `incident_other_vehicles` table

5. **Witness Data**:
   - `witness_number`, `witness_name`, etc.
   - May be stored in separate `incident_witnesses` table

## Metadata Fields (Not DB Columns)

These are response/session fields, not database columns (expected):
- `auth`, `code`, `data`, `error`, `errors`, `failed`
- `form_data`, `incident_id`, `last_completed_page`
- `message`, `saved`, `stack`, `success`

## Impact Assessment

**Before Fixes**: Form submissions would fail with PGRST204 errors for 13+ fields

**After Fixes**: Core fields now map correctly, form submission should succeed for basic scenarios

**Remaining Risk**: Submissions with police data, detailed vehicle damage descriptions, or complex location data may encounter missing columns

## Recommendations

1. ✅ **DONE**: Fix critical field name mismatches (date/time, medical, seatbelt)
2. 🔄 **Test**: Submit full form with all pages to discover remaining mismatches
3. 📋 **Review**: Investigate police, damage description, and location field mappings
4. 🗂️ **Verify**: Check if other_vehicle and witness data uses separate tables
5. 📚 **Document**: Update CLAUDE.md with field mapping patterns

## Test Results

**Next Step**: User should test form submission end-to-end to verify fixes and identify any remaining PGRST204 errors.

---

**Audit Conducted**: 2025-11-10  
**Analyst**: Claude Code  
**Files Modified**: `src/controllers/incidentForm.controller.js`  
**Migrations Reviewed**: 013, 016, 023, 026
