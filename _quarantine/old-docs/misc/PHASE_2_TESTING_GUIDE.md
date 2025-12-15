# Phase 2 Testing Guide

## Quick Reference

**What was fixed**: 5 PDF field name mismatches
**Status**: ✅ Code verified, ready for real data testing
**Verification**: ✅ All 13 checks passed (8 Phase 1 + 5 Phase 2)

---

## Testing Steps

### 1. Find a Test User

```bash
# Option A: Use existing test script
node scripts/find-test-user.js

# Option B: Query database directly
# Look for a user with:
# - date_of_birth populated
# - emergency_contact_name and emergency_contact_number
# - incident_reports with weather/visibility/vehicle/police data
```

### 2. Generate PDF

```bash
node test-form-filling.js <user-uuid>
```

### 3. Verify Phase 2 Fixes in Generated PDF

Open the generated PDF and search for these fields to confirm they're now filled:

#### Weather Condition (Hyphen Fix)
- **Field**: `weather-hail` ← Note the hyphen!
- **What to check**: If user's incident had hail weather, this checkbox should be ticked
- **Why this matters**: Was failing before because code used `weather_hail` (underscore)

#### Visibility Conditions (PDF Typo Accommodation)
- **Field**: `visability_poor` ← Note the typo (missing 'i')!
- **What to check**: If user selected poor visibility, this checkbox should be ticked
- **Why this matters**: Was failing because code used correct spelling `visibility_poor`

- **Field**: `visability_very_poor` ← Note the typo (missing 'i')!
- **What to check**: If user selected very poor visibility, this checkbox should be ticked
- **Why this matters**: Same typo issue as above

#### Vehicle Information (US Spelling)
- **Field**: `vehicle_found_color` ← US spelling
- **What to check**: Should show vehicle color from DVLA (e.g., "Blue", "Red")
- **Why this matters**: Was failing because code used UK spelling `vehicle_found_colour`

#### Police Information (Singular)
- **Field**: `police_officer_name` ← Singular
- **What to check**: Should show police officer's name if police attended
- **Why this matters**: Was failing because code used plural `police_officers_name`

---

## What to Look For

### ✅ Success Indicators

1. **Weather data appears**: If incident had hail, `weather-hail` is checked
2. **Visibility data appears**: If poor/very poor visibility selected, fields are filled
3. **Vehicle color appears**: DVLA color data shows in PDF
4. **Police officer appears**: Officer name shows if police attended
5. **No field errors**: No "field not found" warnings in console during generation

### ❌ Failure Indicators

1. Fields are empty when data exists in database
2. Console shows "Warning: PDF field 'X' not found"
3. PDF shows incorrect data in these fields

---

## Expected Results

Based on verification script results, **all 5 fields should now fill correctly**:

```
✅ Weather: hail (hyphen fix)
   Fixed: weather_hail → weather-hail (PDF uses hyphen, not underscore)

✅ Visibility: poor (typo)
   Fixed: visibility_poor → visability_poor (PDF has actual typo - missing "i")

✅ Visibility: very poor (typo)
   Fixed: visibility_very_poor → visability_very_poor (PDF has actual typo - missing "i")

✅ Vehicle: colour (US spelling)
   Fixed: vehicle_found_colour → vehicle_found_color (PDF uses US spelling)

✅ Police: officer name (singular)
   Fixed: police_officers_name → police_officer_name (PDF uses singular)
```

---

## Combined Phase 1 + 2 Testing

While testing, also verify Phase 1 fixes are working:

### User Data (Phase 1)
- `date_of_birth` - User's date of birth
- `emergency_contact_name` - Emergency contact full name
- `emergency_contact_number` - Emergency contact phone

### Witness 1 Data (Phase 1 - Previously Missing!)
- `witness_name` - First witness name
- `witness_mobile_number` - First witness phone
- `witness_email_address` - First witness email
- `witness_statement` - First witness statement

### Witness 2 Data (Phase 1 - Email Fixed)
- `witness_email_address_2` - Second witness email (was failing before)

---

## If You Find Issues

### Field Still Empty
1. Check database: Does the data exist?
   ```sql
   SELECT weather_hail, visibility_poor, visibility_very_poor,
          dvla_vehicle_color, police_officer_name
   FROM incident_reports
   WHERE create_user_id = '<user-uuid>';
   ```
2. Check console: Any "field not found" warnings?
3. Re-run verification: `node scripts/verify-field-mappings.js`

### Wrong Data Appears
1. Check code mapping in `lib/pdfGenerator.js` (lines 184, 212, 213, 228, 267)
2. Verify database column names match expectations
3. Check for data type mismatches (boolean vs string)

### Console Warnings
If you see warnings like:
```
Warning: PDF field 'weather_hail' not found
```

This means:
- The field name in code doesn't match PDF template
- Review PHASE_2_FIXES_SUMMARY.md for correct field names
- Verify you're using the latest PDF template from git

---

## Coverage After Phase 2

**Main PDF Fields**: 138 of 208 mapped (66.3%)

**New in Phase 2**: 5 additional fields now working
**Fixed in Phase 1**: 8 fields (user + witnesses)
**Total improvement**: +12 fields since starting these fixes

---

## Next Testing Phase (Future)

After confirming Phase 1 + 2 work correctly:

### Optional: Test Remaining 61 PDF Typos
- Medium confidence matches (distance 3-5)
- Requires manual review
- See `PDF_FIELD_CORRECTIONS.csv` for full list

### Optional: Test Separate PDF Templates
- Other Vehicle 1 PDF (22 fields)
- Witnesses 3-4 PDF (8 fields)
- Other Vehicles 2-4 PDF (66 fields)
- See `COMPLETE_PDF_ANALYSIS.md` for details

---

## Success Criteria

✅ **Phase 2 is successful if:**

1. All 5 corrected fields now appear in generated PDF when data exists
2. No console warnings about missing PDF fields for these 5 fields
3. Data matches what's in the database
4. Combined with Phase 1, all 13 fixed fields work correctly

---

**Ready to Test**: All code changes complete and verified. Just need real user data!

**Command**: `node test-form-filling.js <user-uuid>`

**Expect**: PDF with 138 filled fields (up from 126 before fixes)
