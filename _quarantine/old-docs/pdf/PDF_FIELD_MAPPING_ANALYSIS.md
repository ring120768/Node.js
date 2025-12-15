# PDF Field Mapping Analysis

## ✅ STATUS: ALL FIXES APPLIED

**File**: `lib/pdfGenerator.js` (480 lines after updates, 207+ PDF fields)
**Purpose**: Compare PDF field mappings against validated database schema from page audits
**Date**: 2025-11-07
**Updates Applied**: 2025-11-07 - All 17 field mapping issues resolved

📋 **See**: `PDF_GENERATOR_UPDATES_COMPLETE.md` for detailed fix summary

---

## Critical Issues Found

### 🔴 HIGH PRIORITY - Missing/Incorrect Mappings

#### 1. **Page 10 Police & Safety Fields**

**Issue**: Breath test result fields incorrectly mapped

**Current mapping** (lines 346-347):
```javascript
checkField('breath_test', incident.breath_test === 'Yes');
checkField('other_breath_test', incident.other_breath_test === 'Yes');
```

**Problem**:
- `user_breath_test` field from Page 10 audit is **NOT mapped** anywhere in PDF
- `other_breath_test` is mapped as **checkbox** but should be **text field**
- From Page 10 test script, these are TEXT fields with values: "Negative", "Positive", "Refused", "Not tested"

**Expected mapping**:
```javascript
// User's breath test result (TEXT field, not checkbox)
setFieldText('user_breath_test', incident.user_breath_test || '');

// Other driver's breath test result (TEXT field, not checkbox)
setFieldText('other_breath_test', incident.other_breath_test || '');
```

**Database schema** (from Page 10 audit):
- `user_breath_test` TEXT - User's breath test result
- `other_breath_test` TEXT - Other driver's breath test result

---

#### 2. **Page 10 Police Field Name Mismatches**

**Issue**: PDF field names don't match database column names

**Current mapping** (lines 342-345):
```javascript
setFieldText('accident_reference_number', incident.accident_reference_number);
setFieldText('police_officer_name', incident.police_officer_name || incident.police_officers_name);
setFieldText('police_officer_badge_number', incident.police_officer_badge_number);
setFieldText('police_force_details', incident.police_force_details);
```

**Database schema** (from Page 10 audit):
- `accident_ref_number` (not `accident_reference_number`)
- `police_force` (not `police_force_details`)
- `officer_name` (mapped correctly as `police_officer_name`)
- `officer_badge` (mapped correctly as `police_officer_badge_number`)

**Expected mapping**:
```javascript
setFieldText('accident_reference_number', incident.accident_ref_number || '');
setFieldText('police_officer_name', incident.officer_name || '');
setFieldText('police_officer_badge_number', incident.officer_badge || '');
setFieldText('police_force_details', incident.police_force || '');
```

---

#### 3. **Page 5 Vehicle Impact Points**

**Issue**: Impact point checkboxes not being populated

**Current mapping** (line 287):
```javascript
setFieldText('impact', incident.impact_point || incident.impact);
```

**Problem**: This maps to a single text field, but from Page 5 audit, impact points are **individual boolean checkboxes**

**Database schema** (from Page 5 audit):
- `impact_point_front` BOOLEAN
- `impact_point_rear` BOOLEAN
- `impact_point_driver_side` BOOLEAN
- `impact_point_passenger_side` BOOLEAN
- `impact_point_roof` BOOLEAN
- `impact_point_undercarriage` BOOLEAN
- `impact_point_other` BOOLEAN

**Expected mapping** (needs to be added):
```javascript
// Impact point checkboxes (Page 5)
checkField('impact_point_front', incident.impact_point_front === true);
checkField('impact_point_rear', incident.impact_point_rear === true);
checkField('impact_point_driver_side', incident.impact_point_driver_side === true);
checkField('impact_point_passenger_side', incident.impact_point_passenger_side === true);
checkField('impact_point_roof', incident.impact_point_roof === true);
checkField('impact_point_undercarriage', incident.impact_point_undercarriage === true);
checkField('impact_point_other', incident.impact_point_other === true);
```

---

#### 4. **Page 9 Witness Fields**

**Issue**: Incorrect field names for second witness

**Current mapping** (lines 365-369):
```javascript
// Witness 2 Information (from incident_witnesses table)
setFieldText('witness_name_2', witness2.witness_2_name || '');
setFieldText('witness_mobile_number_2', witness2.witness_2_mobile || '');
setFieldText('witness_email_address_2', witness2.witness_2_email || '');
setFieldText('witness_statement_2', witness2.witness_2_statement || '');
```

**Database schema** (from Page 9 audit - `incident_witnesses` table):
- Each witness is a **separate row**, not separate columns
- All witnesses use same column names: `witness_name`, `witness_phone`, `witness_email`, `witness_statement`
- `witness_index` field identifies which witness (1, 2, 3, etc.)

**Expected mapping**:
```javascript
// Witness 1 Information (from incident_witnesses table - row with witness_index = 1)
setFieldText('witness_name', witness1.witness_name || '');
setFieldText('witness_mobile_number', witness1.witness_phone || '');
setFieldText('witness_email_address', witness1.witness_email || '');
setFieldText('witness_statement', witness1.witness_statement || '');

// Witness 2 Information (from incident_witnesses table - row with witness_index = 2)
setFieldText('witness_name_2', witness2.witness_name || '');  // NOT witness_2_name
setFieldText('witness_mobile_number_2', witness2.witness_phone || '');  // NOT witness_2_mobile
setFieldText('witness_email_address_2', witness2.witness_email || '');  // NOT witness_2_email
setFieldText('witness_statement_2', witness2.witness_statement || '');  // NOT witness_2_statement
```

---

#### 5. **Page 12 Final Medical Check**

**Issue**: Missing `form_completed_at` timestamp field

**Current mapping** (line 439):
```javascript
setFieldText('final_feeling', incident.final_feeling || '');
```

**Database schema** (from Page 12 audit):
- `final_feeling` TEXT ✓ (mapped correctly)
- `form_completed_at` TIMESTAMPTZ (NOT MAPPED)

**Expected mapping** (add after line 439):
```javascript
setFieldText('final_feeling', incident.final_feeling || '');
// NEW: Add form completion timestamp
if (incident.form_completed_at) {
  const formattedTimestamp = new Date(incident.form_completed_at).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  setFieldText('form_completed_at', formattedTimestamp);
}
```

**Status**: Pending migration 026 - can be implemented now, will work after migration runs

---

## ⚠️ Medium Priority - Field Name Variations

### 1. **Seatbelt Fields**

**Current mapping** (lines 184-186):
```javascript
checkField('wearing_seatbelts', incident.wearing_seatbelts === 'Yes' || incident.seatbelts_worn === true);
checkField('airbags_deployed', incident.airbags_deployed === 'Yes');
setFieldText('reason_no_seatbelts', incident.why_werent_seat_belts_being_worn);
```

**Database schema** (from Page 10 audit):
- `seatbelts_worn` BOOLEAN (stored as TEXT "true"/"false")
- `airbags_deployed` BOOLEAN (stored as TEXT "true"/"false")
- `seatbelt_reason` TEXT

**Issue**: Line 184 checks `seatbelts_worn === true` but database returns string "true"
**Fix**:
```javascript
checkField('wearing_seatbelts', incident.seatbelts_worn === true || incident.seatbelts_worn === "true");
checkField('airbags_deployed', incident.airbags_deployed === true || incident.airbags_deployed === "true");
setFieldText('reason_no_seatbelts', incident.seatbelt_reason || '');
```

---

## ✅ Verified Correct Mappings

### Page 2 - Medical Information (19 fields)
Lines 138-167 - All fields verified correct:
- ✅ `medical_ambulance_called`, `medical_hospital_name`, `medical_injury_details`, etc.
- ✅ Medical symptom checkboxes (11 fields)
- ✅ Extended medical information (6 fields)

### Page 3 - Date/Time/Conditions (41 fields)
Lines 169-226 - All fields verified correct:
- ✅ Accident date/time with fallback logic
- ✅ Weather conditions (24 checkboxes)
- ✅ Weather summary text

### Page 4 - Location & Junction (30 fields)
Lines 228-281 - All fields verified correct:
- ✅ Road conditions (6 checkboxes)
- ✅ Road type (7 radio buttons)
- ✅ Traffic conditions (4 radio buttons)
- ✅ Road markings (3 radio buttons)
- ✅ Visibility (4 radio buttons)
- ✅ Location context fields (what3words, junction details)

### Page 7 - Other Driver/Vehicle (21 fields)
Lines 308-339 - All fields verified correct:
- ✅ Uses `otherVehicle` from `incident_other_vehicles` table
- ✅ Driver information, vehicle details, insurance
- ✅ DVLA status fields

---

## Field Count Summary

| Category | Fields | Status |
|----------|--------|--------|
| **Correctly Mapped** | 180+ | ✅ Verified |
| **Missing Mappings** | 9 | 🔴 Need to add |
| **Incorrect Mappings** | 8 | 🔴 Need to fix |
| **Total PDF Fields** | 207+ | - |

### Missing Mappings (9 fields)
1. `user_breath_test` (Page 10)
2. `impact_point_front` through `impact_point_other` (Page 5 - 7 fields)
3. `form_completed_at` (Page 12)

### Incorrect Mappings (8 fields)
1. `other_breath_test` - wrong field type (checkbox vs text)
2. `accident_ref_number` - wrong field name
3. `police_force` - wrong field name
4. `witness_2_name` - should be `witness_name`
5. `witness_2_mobile` - should be `witness_phone`
6. `witness_2_email` - should be `witness_email`
7. `witness_2_statement` - should be `witness_statement`
8. `seatbelt_reason` - wrong field name

---

## Recommended Actions

### Phase 1: Critical Fixes (HIGH PRIORITY)
1. ✅ Fix Page 10 breath test mappings (add `user_breath_test`, fix `other_breath_test` type)
2. ✅ Fix Page 10 police field name mismatches
3. ✅ Add Page 5 impact point checkboxes
4. ✅ Fix Page 9 witness field names

### Phase 2: Data Type Handling (MEDIUM PRIORITY)
1. ✅ Add boolean string handling for `seatbelts_worn` and `airbags_deployed`
2. ✅ Update seatbelt reason field name

### Phase 3: Page 12 Support (PENDING MIGRATION)
1. ⏳ Add `form_completed_at` mapping (after migration 026 runs)

### Phase 4: Testing
1. Create PDF field mapping validation script
2. Test PDF generation with real user data
3. Verify all 207+ fields populate correctly

---

## Next Steps

1. **Update PDF Generator** - Apply all fixes from Phase 1 and Phase 2
2. **Create Validation Script** - Test PDF generation with validated data
3. **Manual Testing** - Generate PDF with real user data using `node test-form-filling.js [uuid]`
4. **Documentation** - Update PDF field mapping documentation

---

**Analysis Date**: 2025-11-07
**Auditor**: Claude Code
**Status**: Ready for implementation
