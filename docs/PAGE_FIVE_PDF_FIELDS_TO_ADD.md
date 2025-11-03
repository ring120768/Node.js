# Page 5 - PDF Fields To Add

**Date**: 2025-11-03
**Purpose**: Specification for 5 missing PDF fields that need to be added to `MOJ_Accident_Report_Form.pdf`
**Context**: User will amend PDF template to match HTML form inputs

---

## PDF Fields That Need To Be Added (5 total)

### 1. usual_vehicle (CheckBox Group - 2 checkboxes)

**HTML Source** (incident-form-page5-vehicle.html, lines 559-583):
```html
<label>Were you driving your usual vehicle?</label>
<div class="radio-group">
  <input type="radio" name="usual_vehicle" value="yes" required>
  <label for="usual-yes">Yes, my usual vehicle</label>

  <input type="radio" name="usual_vehicle" value="no">
  <label for="usual-no">No, a different vehicle</label>
</div>
```

**⚠️ UX NOTE**: HTML currently uses radio buttons, but **checkboxes are preferred** for visibility and ease of use (especially for stressed users). PDF should use CheckBox fields to align with overall UX philosophy.

**Database Column**: `incident_reports.usual_vehicle` (will be TEXT after Migration 008)

**PDF Field Specification**:
- **Type**: CheckBox (2 separate checkboxes, mutually exclusive)
- **Suggested Field Names**:
  - `usual_vehicle_yes` (CheckBox) - "Yes, my usual vehicle"
  - `usual_vehicle_no` (CheckBox) - "No, a different vehicle"
- **Data Source**: `usual_vehicle` column (values: "yes" or "no")
- **Mapping Logic**:
  ```javascript
  pdfFields.usual_vehicle_yes = (data.usual_vehicle === "yes");
  pdfFields.usual_vehicle_no = (data.usual_vehicle === "no");
  ```
- **Location in PDF**: Suggest near "Your Vehicle Details" section (near existing vehicle_found_* fields)
- **Priority**: MEDIUM (helpful context, not critical for claim)
- **Design Note**: Use CheckBox (☐) not RadioButton (○) - easier to see for stressed users

---

### 2. damage_to_your_vehicle (Text Area - Multi-line)

**HTML Source** (incident-form-page5-vehicle.html, lines 758-764):
```html
<label>Please describe the damage to your vehicle in detail:</label>
<textarea
  name="damage_description"
  rows="4"
  placeholder="e.g., Large dent on driver door approximately 15cm wide, front bumper cracked on passenger side, headlight smashed..."
  required
></textarea>
```

**Database Column**: `incident_reports.damage_to_your_vehicle` (TEXT)

**PDF Field Specification**:
- **Type**: TextField (Multi-line)
- **Suggested Field Name**: `damage_description_text` or `vehicle_damage_narrative`
- **Data Source**: `damage_to_your_vehicle` column (free text)
- **Mapping Logic**: Direct copy
- **Location in PDF**: Suggest near damage checkboxes (vehicle_damage_front, etc.)
- **Size**: Large text box (4-6 lines minimum)
- **Priority**: 🔴 CRITICAL - This is the user's narrative description of damage, essential for insurance claim

**Example Content**:
> "Large dent on driver door approximately 15cm wide, front bumper cracked on passenger side with plastic hanging off, passenger headlight completely smashed and hanging by wires, scratches along entire passenger side from door to rear bumper."

---

### 3. recovery_phone (Text Field - Phone Number)

**HTML Source** (incident-form-page5-vehicle.html, lines 824-832):
```html
<label>Recovery Company Phone Number:</label>
<input
  type="tel"
  name="recovery_phone"
  placeholder="e.g., 0800 123 4567"
  pattern="[0-9\s\-\+\(\)]+"
>
```

**Database Column**: `incident_reports.recovery_phone` (TEXT)

**PDF Field Specification**:
- **Type**: TextField (single line)
- **Suggested Field Name**: `recovery_phone_number`
- **Data Source**: `recovery_phone` column
- **Format**: UK phone number (supports: 0800 123 4567, +44 800 123 4567, (0800) 123-4567)
- **Mapping Logic**: Direct copy
- **Location in PDF**: Group with `recovery_company` (currently at index 15)
- **Priority**: HIGH - Evidence chain (who to contact for vehicle recovery details)

**Example**: "0800 887 766" (AA), "+44 800 828 282" (RAC)

---

### 4. recovery_location (Text Field - Address/Location)

**HTML Source** (incident-form-page5-vehicle.html, lines 834-842):
```html
<label>Where was your vehicle taken?</label>
<input
  type="text"
  name="recovery_location"
  placeholder="e.g., ABC Motors, 123 High Street, London, SW1A 1AA"
>
```

**Database Column**: `incident_reports.recovery_location` (TEXT)

**PDF Field Specification**:
- **Type**: TextField (single line, or multi-line if space allows)
- **Suggested Field Name**: `recovery_destination` or `vehicle_taken_to`
- **Data Source**: `recovery_location` column
- **Mapping Logic**: Direct copy
- **Location in PDF**: Group with `recovery_company` and `recovery_phone`
- **Priority**: 🔴 CRITICAL - Evidence chain (where vehicle is located for inspection)

**Example**: "ABC Motors, 123 High Street, London, SW1A 1AA" or "Home address: 45 Oak Lane, Manchester M1 2AB"

---

### 5. recovery_notes (Text Area - Multi-line)

**HTML Source** (incident-form-page5-vehicle.html, lines 844-862):
```html
<label>Additional Recovery Notes:</label>
<textarea
  name="recovery_notes"
  rows="3"
  placeholder="e.g., Took 2 hours for recovery truck to arrive, vehicle had to be winched onto flatbed, driver said front axle appeared damaged..."
></textarea>
```

**Database Column**: `incident_reports.recovery_notes` (TEXT)

**PDF Field Specification**:
- **Type**: TextField (Multi-line)
- **Suggested Field Name**: `recovery_additional_notes` or `recovery_details`
- **Data Source**: `recovery_notes` column (free text)
- **Mapping Logic**: Direct copy
- **Location in PDF**: Group with other recovery fields
- **Size**: Medium text box (3-4 lines)
- **Priority**: MEDIUM-HIGH - Contextual evidence (timing, condition, special circumstances)

**Example Content**:
> "Recovery truck took 2 hours to arrive (called at 14:30, arrived 16:30). Driver said vehicle couldn't be driven due to front axle damage. Had to be winched onto flatbed. Police were still on scene when recovery arrived."

---

## Summary Table

| # | PDF Field Name (suggested) | Type | DB Column | Priority | Notes |
|---|---------------------------|------|-----------|----------|-------|
| 1 | `usual_vehicle_yes` | CheckBox | `usual_vehicle` | MEDIUM | 2-button radio group |
| 1 | `usual_vehicle_no` | CheckBox | `usual_vehicle` | MEDIUM | (part of same group) |
| 2 | `damage_description_text` | TextField (multi) | `damage_to_your_vehicle` | 🔴 CRITICAL | User's damage narrative |
| 3 | `recovery_phone_number` | TextField | `recovery_phone` | HIGH | Contact for recovery company |
| 4 | `recovery_destination` | TextField | `recovery_location` | 🔴 CRITICAL | Where vehicle is now |
| 5 | `recovery_additional_notes` | TextField (multi) | `recovery_notes` | MEDIUM-HIGH | Recovery circumstances |

**Total**: 6 PDF form fields to add (usual_vehicle counts as 2 checkboxes)

---

## Suggested PDF Layout

**Section: Your Vehicle Details** (near existing vehicle_found_* fields at index 115-124)
```
[Existing: uk_licence_plate_look_up - Index 115]
[Existing: vehicle_found_make - Index 116]
[Existing: vehicle_found_model - Index 117]
... (other DVLA fields)

[NEW: usual_vehicle_yes] ☐ Yes, my usual vehicle
[NEW: usual_vehicle_no]  ☐ No, a different vehicle
```

**Section: Damage Details** (near existing damage checkboxes at index 125-137)
```
[Existing: my_vehicle_has_no_visible_damage - Index 125]
[Existing: vehicle_damage_front - Index 136]
... (other damage checkboxes)

[NEW: damage_description_text]
┌─────────────────────────────────────────────┐
│ Describe damage in detail:                 │
│                                             │
│                                             │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

**Section: Recovery Details** (near existing recovery_company at index 15)
```
[Existing: recovery_company - Index 15]
[NEW: recovery_phone_number] ___________________
[NEW: recovery_destination] ____________________
[NEW: recovery_additional_notes]
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Phase 1: Add Fields to PDF Template
- [ ] Open `MOJ_Accident_Report_Form.pdf` in Adobe Acrobat DC
- [ ] Add 2 checkboxes for `usual_vehicle` (yes/no)
- [ ] Add multi-line text field for `damage_description_text`
- [ ] Add text field for `recovery_phone_number`
- [ ] Add text field for `recovery_destination`
- [ ] Add multi-line text field for `recovery_additional_notes`
- [ ] Save updated PDF template

### Phase 2: Update Database Schema
- [ ] Run Migration 008 (fixes data types)
- [ ] Verify all columns exist with correct types
- [ ] Test data flow: HTML → Database

### Phase 3: Update PDF Mapping Documentation
- [ ] Update `COMPREHENSIVE_PDF_FIELD_MAPPING.md` with:
  - Correct page numbers (incident-form-page5-vehicle.html, not page7/page8)
  - New field mappings (6 new fields)
  - Updated field indexes
- [ ] Mark all 5 issues as RESOLVED

### Phase 4: Update PDF Service Code
- [ ] Update `src/services/adobePdfService.js` or PDF filling logic
- [ ] Add mappings for 6 new PDF fields:
  ```javascript
  // New mappings to add
  usual_vehicle_yes: data.usual_vehicle === 'yes',
  usual_vehicle_no: data.usual_vehicle === 'no',
  damage_description_text: data.damage_to_your_vehicle,
  recovery_phone_number: data.recovery_phone,
  recovery_destination: data.recovery_location,
  recovery_additional_notes: data.recovery_notes
  ```
- [ ] Update `impact_point` array handling (loop through array, populate checkboxes)
- [ ] Update `vehicle_driveable` 3-way split (yes/no/unsure)

### Phase 5: End-to-End Testing
- [ ] Test with real data: `node test-form-filling.js [user-uuid]`
- [ ] Verify all 6 new fields appear in generated PDF
- [ ] Verify damage checkboxes populate correctly (array handling)
- [ ] Verify vehicle_driveable splits correctly (3 options)
- [ ] Verify recovery_company comes from incident_reports (not user_signup)

---

**Status**: Ready for PDF template editing
**Next**: User will add 6 fields to PDF template, then proceed with Phases 2-5

**Last Updated**: 2025-11-03
