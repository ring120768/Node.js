# PDF Field Analysis - Collision & Mapping Issues

**Date**: 2025-12-15
**PDF Template**: Car-Crash-Lawyer-AI-incident-report-main.pdf
**Total Fields**: 213 AcroForm fields extracted

---

## Executive Summary

Extracted all 213 form fields from the PDF template to identify exact field names and analyze collision issues identified in the OpenAI Codex audit. Key findings reveal that the "license plate collision" is actually intentional field reuse (working as designed), and we have clear paths forward for the 5 identified fixes.

---

## Critical Field Mappings

### 1. License Plate Field (NO BUG - Working as Intended)

**PDF Field**: `vehicle_license_plate` (appears once in form)

**Usage Pattern**:
- **Page 1**: Written with signup data (user_signup.vehicle_license_plate)
- **Page 7**: Written AGAIN with incident data (incident_reports.vehicle_license_plate)
- **Behavior**: Last write wins - incident data overrides signup data ✅

**User Clarification**: "Template re-uses fields however the incident report gives the user a chance to update this information for example he may have bought or borrowed a car"

**Conclusion**: No fix needed. This is working as designed.

---

### 2. Date Fields (REQUIRES FIX #4)

**7 Date Fields Found**:
```
Date69_af_date                           - Page 17 (Declaration/Submission Date)
date_of_birth                            - Page 1 (User DOB)
accident_date                            - Accident occurrence date
other-vehicle-look-up-mot-expiry-date    - Other vehicle MOT
other-vehicle-look-up-tax-due-date       - Other vehicle tax
dvla_tax_due_date                        - User vehicle tax
subscription_start_date                  - Page 2 (Signup Date) ⚠️
```

**Current Issue**:
- `Date69_af_date` is written TWICE in pdfGenerator.js (lines 134-139 and line 527)
- Need to separate:
  - **Page 2**: `subscription_start_date` = user signup date
  - **Page 17**: `Date69_af_date` = incident submission date

**Business Logic**: Compare signup vs submission dates for premium charge detection (same-day = reactive use)

**Fix Required**: Ensure both dates are populated separately in pdfGenerator.js

---

### 3. Audio/Transcription Fields (REQUIRES FIX #2)

**2 Audio Fields Found**:
```
emergency_audio_transcription            - Main transcription field
voice_transcription                      - Alternative transcription field
```

**Current Issue**:
- Database column: `audio_account`
- lib/dataFetcher.js:278 INCORRECTLY rewrites to `audio_recording`
- pdfGenerator.js:426 expects `audio_account`

**Fix Required**: Remove the rewrite at dataFetcher.js:278 to preserve `audio_account` naming

---

### 4. Witness Fields (REQUIRES FIX #1)

**9 Witness Fields Found**:
```
witness_name                             - Witness #1 name
witness_mobile_number                    - Witness #1 phone
witness_email_address                    - Witness #1 email
witness_statement                        - Witness #1 statement

witness_statement_2                      - Witness #2 statement
witness_email_2                          - Witness #2 email
witness_number                           - Witness #2 phone
additional_witnesses                     - Additional witness info

witnesses_present                        - Checkbox (yes/no)
```

**Current Issue**:
- lib/dataFetcher.js:78-118 builds witnesses from OLD incident_reports columns
- Database now has normalized `incident_witnesses` table (migration 024)
- pdfGenerator.js:398-418 expects witness data structure

**Fix Required**: Migrate dataFetcher.js to query incident_witnesses table instead of old columns

**Schema Reference** (incident_witnesses table):
```sql
- id (uuid, primary key)
- incident_report_id (uuid, foreign key)
- witness_name (text)
- witness_phone (text)
- witness_email (text)
- witness_statement (text)
- created_at (timestamptz)
- updated_at (timestamptz)
```

---

### 5. Photo/Image URL Fields (REQUIRES FIX #5)

**16 Numbered Photo Fields Found**:

**Vehicle Damage Photos** (5 fields):
```
vehicle_damage_photo_1_url
vehicle_damage_photo_2_url
vehicle_damage_photo_3_url
vehicle_damage_photo_4_url
vehicle_damage_photo_5_url
```

**Scene Photos** (3 fields):
```
scene_photo_1_url
scene_photo_2_url
scene_photo_3_url
```

**Other Vehicle Photos** (3 fields):
```
other_vehicle_photo_1_url
other_vehicle_photo_2_url
other_vehicle_photo_3_url
```

**Personal Documentation Photos** (5 fields):
```
vehicle_picture_front
vehicle_picture_driver_side
vehicle_picture_passenger_side
vehicle_picture_back
driving_license_picture
```

**Current Issue**:
- lib/dataFetcher.js:285-289 GENERATES numbered keys (e.g., vehicle_damage_photo_1_url)
- lib/pdfGenerator.js DOES NOT consume the numbered keys
- Adobe PDF Services supports multi-photo numbering (adobePdfFormFillerService.js:1067-1072)

**Fix Required**: Update pdfGenerator.js to consume numbered photo keys and map to corresponding PDF fields

---

## Implementation Priority

1. **Fix #1 (Witness Migration)** - Breaking change, migrate to incident_witnesses table
2. **Fix #2 (Audio Naming)** - Simple rename, remove dataFetcher.js:278 rewrite
3. **Fix #3 (License Plate)** - NO FIX NEEDED, working as designed
4. **Fix #4 (Date Separation)** - Ensure subscription_start_date and Date69_af_date are both written
5. **Fix #5 (Multi-Photo)** - Update pdfGenerator.js to consume numbered photo keys

---

## Files Requiring Changes

### lib/dataFetcher.js (Lines 15-320)
- **Lines 78-118**: Witness data building (migrate to incident_witnesses table)
- **Line 278**: Audio field rewrite (remove audio_account → audio_recording)
- **Lines 285-289**: Multi-photo numbering (already generates numbered keys ✅)

### lib/pdfGenerator.js (Lines 1-566)
- **Lines 134-139**: Date69_af_date first write (Page 2 - change to subscription_start_date)
- **Line 527**: Date69_af_date second write (Page 17 - keep as declaration date)
- **Line 426**: Audio field read (expects audio_account ✅)
- **Lines 398-418**: Witness mapping (update to expect incident_witnesses rows)
- **Photo mapping**: Add logic to consume numbered photo keys

---

## Validation Strategy

After implementing fixes:
1. Run `node pdf-mapping.js` to verify field mapping correctness
2. User will perform full manual user test
3. Verify premium charge detection (same-day signup vs submission)
4. Verify multi-photo numbering works with Adobe PDF Services

---

## Notes

- All test data has been cleaned (0 records in all tables)
- Breaking changes are acceptable per user confirmation
- No backward compatibility needed
- Page detection in field extraction didn't work (all showed "Unknown"), but field names are accurate
