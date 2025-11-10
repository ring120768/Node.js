# Field Name Audit - 2025-11-10

## Executive Summary

Comprehensive audit of field name mismatches between controller expectations and actual Supabase database schema.

**Status**: ✅ Critical mismatches fixed (date/time fields corrected)

**CRITICAL DISCOVERY**: Migration files (013, 016, 023, 026) do NOT reflect the actual production database schema. Only migration 016 (date/time fields) was successfully applied.

## Audit Methodology

1. Extracted 187 field names from controller (`buildIncidentData` function)
2. Extracted 104 column names from migration files
3. **Obtained actual Supabase database schema** (revealed migration vs reality gap)
4. Cross-referenced to identify ACTUAL mismatches

## Critical Fixes Applied

### 1. Date/Time Fields ✅

**Issue**: Controller used old field names from Typeform era, database has migration 016 names

| Controller (Old) | Database (Actual) | Status |
|------------------|-------------------|--------|
| `incident_date`  | `accident_date`   | ✅ Fixed |
| `incident_time`  | `accident_time`   | ✅ Fixed |

**File**: `src/controllers/incidentForm.controller.js:440-441`
**Migration**: `016_add_page3_fields.sql` (lines 13-14) - **SUCCESSFULLY APPLIED**

### 2. Medical Symptoms - NO CHANGES NEEDED ✅

**Discovery**: Migration 013 proposed removing "symptom_" prefix, but this migration was NEVER applied to production database.

**Actual Database Schema**:
```sql
medical_symptom_chest_pain BOOLEAN DEFAULT false,
medical_symptom_uncontrolled_bleeding BOOLEAN DEFAULT false,
medical_symptom_breathlessness BOOLEAN DEFAULT false,
medical_symptom_limb_weakness BOOLEAN DEFAULT false,
medical_symptom_loss_of_consciousness BOOLEAN DEFAULT false,
medical_symptom_severe_headache BOOLEAN DEFAULT false,
medical_symptom_change_in_vision BOOLEAN DEFAULT false,
medical_symptom_abdominal_pain BOOLEAN DEFAULT false,
medical_symptom_abdominal_bruising BOOLEAN DEFAULT false,
medical_symptom_limb_pain_mobility BOOLEAN DEFAULT false,
medical_symptom_none BOOLEAN DEFAULT false,
```

**Controller**: Uses `medical_symptom_*` ✅ CORRECT (matches actual DB)
**PDF Generator**: Uses `medical_symptom_*` ✅ CORRECT (matches actual DB)

**File**: `src/controllers/incidentForm.controller.js:427-437`
**Migration**: `013_recreate_incident_reports_from_csv.sql` (lines 47-57) - **NOT APPLIED**

### 3. Seatbelt Fields - NO CHANGES NEEDED ✅

**Discovery**: Migration 013 proposed new field names, but this migration was NEVER applied.

**Actual Database Schema**:
```sql
seatbelts_worn TEXT,
seatbelt_reason TEXT,
```

**Controller**: Uses `seatbelts_worn`, `seatbelt_reason` ✅ CORRECT (matches actual DB)
**PDF Generator**: Uses `seatbelts_worn`, `seatbelt_reason` ✅ CORRECT (matches actual DB)

**File**: `src/controllers/incidentForm.controller.js:628-629`
**Migration**: `013_recreate_incident_reports_from_csv.sql` (lines 78-80) - **NOT APPLIED**

## Migration Status Analysis

### Applied Migrations ✅

| Migration | Applied | Evidence |
|-----------|---------|----------|
| 016_add_page3_fields.sql | ✅ YES | Database has `accident_date`, `accident_time` |
| 023_add_any_witness.sql | ✅ YES | User confirmed this fixed previous error |
| 026_add_final_feeling.sql | ✅ YES | User confirmed this fixed previous error |

### Unapplied Migrations ❌

| Migration | Applied | Impact |
|-----------|---------|--------|
| 013_recreate_incident_reports_from_csv.sql | ❌ NO | Database retains old field names (`medical_symptom_*`, `seatbelts_worn`) |

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

**Before Fixes**: Form submissions failed with PGRST204 error for `incident_date` column

**After Fixes**: Date/time fields now map correctly. Core data persistence should succeed for basic scenarios.

**Remaining Risk**: Submissions with police data, detailed vehicle damage descriptions, or complex location data may encounter missing columns if those fields aren't in the actual database schema.

## Lessons Learned

1. **Migration Files ≠ Production Schema**: Never assume migration files reflect the actual database state
2. **Always Verify Against Production**: Must check actual Supabase schema, not migration intentions
3. **Schema Drift**: Production database can diverge from migrations if they weren't applied
4. **Testing Critical**: End-to-end testing would have revealed schema mismatches earlier

## Recommendations

1. ✅ **DONE**: Fix date/time field name mismatches
2. ✅ **VERIFIED**: Medical symptoms and seatbelt fields already correct (no migration needed)
3. 🔄 **Test**: Submit full form with all pages to discover remaining mismatches
4. 📋 **Review**: Investigate police, damage description, and location field mappings
5. 🗂️ **Verify**: Check if other_vehicle and witness data uses separate tables
6. 📚 **Document**: Update CLAUDE.md with field mapping patterns
7. 🔧 **Migration Audit**: Review all migrations to determine which were actually applied to production

## Correct Architecture (Verified)

```
HTML Forms (UI Layer)
  ↓ Field names: medical_symptom_chest_pain, seatbelts_worn
Controller (Mapping Layer)
  ↓ Maps UI → DB (direct pass-through for these fields)
Database (Storage Layer)
  ↓ Columns: medical_symptom_chest_pain, seatbelts_worn
DataFetcher (Retrieval Layer)
  ↓ Queries with actual column names
PDF Generator (Presentation Layer)
  ↓ Reads: incident.medical_symptom_chest_pain, incident.seatbelts_worn
```

## Test Results

**Next Step**: User should test form submission end-to-end to verify fixes and identify any remaining PGRST204 errors.

---

**Audit Conducted**: 2025-11-10
**Analyst**: Claude Code
**Files Modified**:
- `src/controllers/incidentForm.controller.js` (date/time fields only)
- `lib/pdfGenerator.js` (date/time fields only)

**Migrations Reviewed**: 013 (not applied), 016 (applied), 023 (applied), 026 (applied)
**Actual Database Schema**: Verified via user-provided DDL export
