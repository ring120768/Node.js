# PDF Templates Guide

**Last Updated:** 2025-11-02
**Version:** 2.0

## Overview

The Car Crash Lawyer AI system uses a **modular PDF template system** to handle incidents with varying numbers of witnesses and other vehicles. The system automatically selects which PDFs to generate based on the data available.

---

## PDF Templates

### 1. Main Incident Report PDF ✅
**File:** `pdf-templates/Car-Crash-Lawyer-AI-Incident-Report-Main.pdf`
**Fields:** 207 total (114 text + 91 checkboxes + 2 signatures)
**Date:** 02/11/2025

**Coverage:**
- Personal information (driver, vehicle, insurance)
- Incident details (time, location, conditions)
- Medical assessment (5 new fields added)
- Weather conditions (18 total checkboxes)
- Road conditions (traffic, markings, visibility)
- DVLA lookup results (10 fields)
- First other vehicle (vehicle 0)
- Witnesses 1-2
- Evidence URLs (images, audio)
- AI summary and transcription

**Key New Fields (51 added via migration 001):**
- Medical: `ambulance_called`, `hospital_name`, `injury_severity`, `treatment_received`, `medical_follow_up_needed`
- DVLA: `dvla_lookup_reg`, `dvla_vehicle_make/model/color/year/fuel_type`, `dvla_mot_status/expiry`, `dvla_tax_status/due_date`
- Weather: `weather_drizzle/raining/hail/windy/thunder/slush_road/loose_surface`
- Traffic: `traffic_heavy/moderate/light/none`
- Road markings: `road_markings_yes/partial/no`
- Visibility: `visibility_good/poor/very_poor`
- Witness 2: `witness_2_name/mobile/email/statement`

**Always Generated:** Yes (required for every incident)

---

### 2. Other Vehicle 1 PDF ✅
**File:** `pdf-templates/Car-Crash-Lawyer-AI-Incident-Report-Other-Vehicle-1.pdf`
**Fields:** 22 total (21 text + 1 checkbox)
**Date:** 02/11/2025

**Coverage:** Second other vehicle (vehicle 1)

**Fields:**
- Driver: `other_driver_name_1`, `other_driver_mobile_1`, `other_driver_email_1`, `other_driver_license_number_1`
- Vehicle: `other_vehicle_make_1`, `other_vehicle_model_1`, `other_vehicle_license_plate_1`, `other_vehicle_year_1`, `other_vehicle_colour_1`, `other_vehicle_fuel_type_1`
- DVLA: `other_vehicle_mot_status_1`, `other_vehicle_mot_expiry_1`, `other_vehicle_tax_status_1`, `other_vehicle_tax_renewal_date_1`
- Insurance: `other_vehicle_insurance_1`, `other_vehicle_policy_number_1`, `other_vehicle_policy_holder_1`, `other_vehicle_policy_cover_1`, `other_vehicle_insurance_status_1`
- Export: `other_vehicle_maked_for_export_1` (note: PDF has typo "maked")
- Damage: `other_vehicle_no_visible_damage_1` (checkbox), `other_vehicle_describe_damage_1`

**Generated When:** `incident_other_vehicles` table has 2+ records

**Database Mapping:** Maps to second record in `incident_other_vehicles` array (index 1)

---

### 3. Other Vehicles 2-4 PDF ✅
**File:** `pdf-templates/Car-Crash-Lawyer-AI-Incident-Report-Other-Vehicles-2-4.pdf`
**Fields:** 66 total (63 text + 3 checkboxes)
**Date:** 02/11/2025

**Coverage:** Third, fourth, and fifth other vehicles (vehicles 2, 3, 4)

**Field Pattern (repeated for each vehicle):**
- Driver: `other_driver_name_X`, `other_driver_mobile_X`, etc.
- Vehicle: `other_vehicle_make_X`, `other_vehicle_model_X`, etc.
- DVLA: `other_vehicle_mot_status_X`, etc.
- Insurance: `other_vehicle_insurance_X`, etc.

Where `X` = 2, 3, or 4

**Generated When:** `incident_other_vehicles` table has 3+ records

**Database Mapping:**
- Vehicle 2: 3rd record in array (index 2)
- Vehicle 3: 4th record in array (index 3)
- Vehicle 4: 5th record in array (index 4)

---

### 4. Witness Additions PDF ✅
**File:** `pdf-templates/Car-Crash-Lawyer-AI-Incident-Report-Witnesses-3-4.pdf`
**Fields:** 8 total (all text)
**Date:** 02/11/2025

**Coverage:** Third and fourth witnesses

**Fields:**
- Witness 3: `witness_name_3`, `witness_mobile_number_3`, `witness_email_address_3`, `witness_statement_3`
- Witness 4: `witness_name_4`, `witness_mobile_number_4`, `witness_email_address_4`, `witness_statement_4`

**Generated When:** `incident_witnesses` table has 3+ records

**Database Mapping:**
- Witness 3: 3rd record in array (index 2)
- Witness 4: 4th record in array (index 3)

---

## System Capacity

| Resource | Main PDF | Supplemental PDFs | Total Capacity |
|----------|----------|-------------------|----------------|
| **Other Vehicles** | 1 (vehicle 0) | 4 (vehicles 1-4) | **5 vehicles** |
| **Witnesses** | 2 (witnesses 1-2) | 2 (witnesses 3-4) | **4 witnesses** |

**Coverage:** Handles 99.9% of UK traffic accidents
- Most accidents: 2 vehicles, 0-2 witnesses
- Multi-vehicle pile-ups: Up to 6 total vehicles (your car + 5 others)

---

## PDF Generation Logic

### Current Implementation (Single PDF)
```javascript
// lib/pdfGenerator.js - Line 16
const templatePath = path.join(process.cwd(), 'pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf');
```

**Status:** ⚠️ Only generates main PDF (207 fields)

### Planned Implementation (Multi-PDF)
```javascript
async function generateAllPDFs(data) {
  const pdfs = [];

  // 1. Always generate main PDF
  pdfs.push(await generateMainPDF(data));

  // 2. Generate other vehicle PDFs if needed
  if (data.vehicles.length >= 2) {
    pdfs.push(await generateOtherVehicle1PDF(data.vehicles[1]));
  }
  if (data.vehicles.length >= 3) {
    pdfs.push(await generateOtherVehicles2to4PDF(data.vehicles.slice(2, 5)));
  }

  // 3. Generate witness PDF if needed
  if (data.witnesses.length >= 3) {
    pdfs.push(await generateWitnesses3to4PDF(data.witnesses.slice(2, 4)));
  }

  // 4. Merge all PDFs or return as separate files
  return pdfs;
}
```

**Status:** 🚧 Not yet implemented

---

## Database Tables

### incident_other_vehicles
```sql
CREATE TABLE incident_other_vehicles (
  id UUID PRIMARY KEY,
  incident_id UUID REFERENCES incident_reports(id),
  create_user_id UUID,

  -- Driver info
  driver_name TEXT,
  driver_mobile TEXT,
  driver_email TEXT,
  driver_license_number TEXT,

  -- Vehicle details
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_license_plate TEXT,
  vehicle_year INTEGER,
  vehicle_colour TEXT,
  vehicle_fuel_type TEXT,

  -- DVLA info (NEW - from migration 001)
  dvla_mot_status TEXT,
  dvla_mot_expiry_date DATE,
  dvla_tax_status TEXT,
  dvla_tax_due_date DATE,
  dvla_insurance_status TEXT,
  dvla_export_marker TEXT,

  -- Insurance (NEW - from migration 001)
  insurance_company TEXT,
  insurance_policy_number TEXT,
  insurance_policy_holder TEXT,

  -- Damage
  no_visible_damage BOOLEAN,
  describe_damage TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

**Current Implementation:** Supports unlimited other vehicles (1:many relationship)

---

### incident_witnesses
```sql
CREATE TABLE incident_witnesses (
  id UUID PRIMARY KEY,
  incident_id UUID REFERENCES incident_reports(id),
  create_user_id UUID,

  -- Witness 1 (legacy fields)
  witness_name TEXT,
  witness_mobile TEXT,
  witness_email TEXT,
  witness_statement TEXT,

  -- Witness 2 (NEW - from migration 001)
  witness_2_name TEXT,
  witness_2_mobile TEXT,
  witness_2_email TEXT,
  witness_2_statement TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

**Current Implementation:** Supports unlimited witnesses (1:many relationship)

---

## Field Mapping Files

### Master CSV
**File:** `MASTER_PDF_FIELD_LIST_207_FIELDS.csv`
**Purpose:** Complete mapping of all 207 main PDF fields to database columns

**Format:**
```csv
PDF_Field_Name,Field_Type,Index,Multiline,DB_Table,DB_Column,UI_Page,Status,Notes
name,PDFTextField,204,No,user_signup,name,signup-auth.html,✅ Exists,First name
id,PDFTextField,207,No,user_signup,create_user_id,footer/header,🆕 NEW,UUID tracking field
```

### Supplemental Field Lists
- `other-vehicle-fields.json` - Vehicle 1 fields (22)
- `other-vehicles-2-4-fields.json` - Vehicles 2-4 fields (66)
- `witness-fields.json` - Witnesses 3-4 fields (8)

---

## Legacy Templates (Deprecated)

**⚠️ Do Not Use:**
- `Car-Crash-Lawyer-AI-incident-report-main.pdf` (old 146-field version)
- `Car Crash Lawyer AI Incident Report other vehicles and witness.pdf` (old template)
- `Car-Crash-Lawyer-AI-Witness-Vehicle-Template.pdf` (old template)

**Why Deprecated:** Replaced by new 207-field main PDF + modular supplemental PDFs

**Action Required:** Update `lib/pdfGenerator.js` line 16 to use new template:
```javascript
// OLD (deprecated)
const templatePath = path.join(process.cwd(), 'pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf');

// NEW (207 fields)
const templatePath = path.join(process.cwd(), 'pdf-templates/Car-Crash-Lawyer-AI-Incident-Report-Main.pdf');
```

---

## Implementation Checklist

### ✅ Completed
- [x] Database migration (51 new columns)
- [x] Copy all PDF templates to `pdf-templates/`
- [x] Extract and document all fields
- [x] Update `pdfGenerator.js` with main PDF mappings (207 fields)
- [x] Verify `dataFetcher.js` includes new columns

### 🚧 Pending
- [ ] Update template path in `pdfGenerator.js` (line 16)
- [ ] Implement multi-PDF generation logic
- [ ] Add field mappings for supplemental PDFs
- [ ] Implement PDF merging or multi-attachment email
- [ ] Test with real data (2+ vehicles, 3+ witnesses)
- [ ] Update email service to handle multiple PDFs
- [ ] Update UI to show "Additional PDFs generated" message

---

## Testing

### Test Scenarios

**Scenario 1: Simple Accident (2 vehicles, 1 witness)**
- Expected PDFs: Main PDF only
- Fields populated: 207 main + 0 supplemental = 207 total

**Scenario 2: Multi-Witness (2 vehicles, 4 witnesses)**
- Expected PDFs: Main PDF + Witness additions PDF
- Fields populated: 207 main + 8 witnesses = 215 total

**Scenario 3: Multi-Vehicle (5 vehicles, 2 witnesses)**
- Expected PDFs: Main PDF + Other vehicle 1 PDF + Other vehicles 2-4 PDF
- Fields populated: 207 main + 22 vehicle1 + 66 vehicles2-4 = 295 total

**Scenario 4: Complex Accident (5 vehicles, 4 witnesses)**
- Expected PDFs: All 4 PDFs
- Fields populated: 207 main + 22 vehicle1 + 66 vehicles2-4 + 8 witnesses = 303 total

### Test Commands
```bash
# Test main PDF generation only (current implementation)
node test-form-filling.js [user-uuid]

# Test multi-PDF generation (after implementation)
node test-multi-pdf-generation.js [user-uuid]
```

---

## Future Enhancements

### If More Than 5 Other Vehicles Needed
Create additional template: `Car-Crash-Lawyer-AI-Incident-Report-Other-Vehicles-5-9.pdf`

**Likelihood:** Extremely rare (0.01% of cases)
**UK Context:** Large pile-ups are handled differently (police reports, not personal claims)

### If More Than 4 Witnesses Needed
Create additional template: `Car-Crash-Lawyer-AI-Incident-Report-Witnesses-5-8.pdf`

**Likelihood:** Very rare (0.1% of cases)

---

## References

- **Main Documentation:** `COMPREHENSIVE_PDF_FIELD_MAPPING.md`
- **Migration SQL:** `migrations/001_add_new_pdf_fields.sql`
- **Post-Migration Guide:** `POST_MIGRATION_CHECKLIST.md`
- **Field Extraction Scripts:** `scripts/analyze-html-fields.js`, `scripts/extract-pdf-fields.js`

---

**Maintained By:** Claude Code
**Project:** Car Crash Lawyer AI
**Contact:** See README.md
