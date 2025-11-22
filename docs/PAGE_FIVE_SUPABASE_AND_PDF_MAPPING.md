# Page 5 - Supabase & PDF Mapping Guide

**Date**: 2025-11-03
**Source**: `docs/PAGE_FIVE_FIELD_TYPES.csv`
**Purpose**: Clear instructions for adding fields to Supabase and PDF template

---

## Part 1: Supabase Schema (incident_reports table)

### Columns to Add/Verify

```sql
-- TEXT fields (single value)
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS usual_vehicle TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_lookup_reg TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_make TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_model TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_color TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_year TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_fuel_type TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_mot_status TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_mot_expiry TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_tax_status TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_tax_due_date TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_insurance_status TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS damage_to_your_vehicle TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS vehicle_driveable TEXT;

-- BOOLEAN field
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS no_damage BOOLEAN;

-- TEXT[] array field (Migration 008)
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS impact_point TEXT[];
```

### Data Type Summary

| Database Column | Data Type | Possible Values |
|----------------|-----------|-----------------|
| `usual_vehicle` | TEXT | 'yes', 'no' |
| `dvla_lookup_reg` | TEXT | UK license plate (e.g., 'AB12 CDE') |
| `dvla_vehicle_lookup_make` | TEXT | Vehicle make (e.g., 'FORD', 'BMW') |
| `dvla_vehicle_lookup_model` | TEXT | Vehicle model (e.g., 'Focus', '3 Series') |
| `dvla_vehicle_lookup_color` | TEXT | Colour (e.g., 'Blue', 'Silver') |
| `dvla_vehicle_lookup_year` | TEXT | Year (e.g., '2020') |
| `dvla_vehicle_lookup_fuel_type` | TEXT | Fuel type (e.g., 'Petrol', 'Diesel', 'Electric') |
| `dvla_vehicle_lookup_mot_status` | TEXT | Status (e.g., 'Valid', 'Expired') |
| `dvla_vehicle_lookup_mot_expiry` | TEXT | Date (e.g., '2025-06-15') |
| `dvla_vehicle_lookup_tax_status` | TEXT | Status (e.g., 'Taxed', 'SORN') |
| `dvla_vehicle_lookup_tax_due_date` | TEXT | Date (e.g., '2025-03-01') |
| `dvla_vehicle_lookup_insurance_status` | TEXT | Status (e.g., 'Insured', 'Not insured') |
| `no_damage` | BOOLEAN | true, false |
| `impact_point` | TEXT[] | Array of: 'front', 'front_driver', 'front_passenger', 'driver_side', 'passenger_side', 'rear_driver', 'rear_passenger', 'rear', 'roof', 'undercarriage' |
| `damage_to_your_vehicle` | TEXT | Free text description |
| `vehicle_driveable` | TEXT | 'yes', 'no', 'unsure' |

---

## Part 2: PDF Template Fields

### Fields to Add to MOJ_Accident_Report_Form.pdf

#### Section 1: Usual Vehicle (CheckBox Group)

| PDF Field Name | Type | Source Data | Mapping Logic |
|---------------|------|-------------|---------------|
| `usual_vehicle_yes` | CheckBox | `incident_reports.usual_vehicle` | `data.usual_vehicle === 'yes'` |
| `usual_vehicle_no` | CheckBox | `incident_reports.usual_vehicle` | `data.usual_vehicle === 'no'` |

**Example Code:**
```javascript
pdfFields.usual_vehicle_yes = (data.usual_vehicle === 'yes');
pdfFields.usual_vehicle_no = (data.usual_vehicle === 'no');
```

---

#### Section 2: DVLA Lookup Fields (Text Fields)

| PDF Field Name | Type | Source Data | Notes |
|---------------|------|-------------|-------|
| `dvla_lookup_reg` | TextField | `incident_reports.dvla_lookup_reg` | UK license plate |
| `dvla_vehicle_lookup_make` | TextField | `incident_reports.dvla_vehicle_lookup_make` | Auto or manual |
| `dvla_vehicle_lookup_model` | TextField | `incident_reports.dvla_vehicle_lookup_model` | Auto or manual |
| `dvla_vehicle_lookup_color` | TextField | `incident_reports.dvla_vehicle_lookup_color` | Auto or manual |
| `dvla_vehicle_lookup_year` | TextField | `incident_reports.dvla_vehicle_lookup_year` | Auto or manual |
| `dvla_vehicle_lookup_fuel_type` | TextField | `incident_reports.dvla_vehicle_lookup_fuel_type` | Auto or manual |
| `dvla_vehicle_lookup_mot_status` | TextField | `incident_reports.dvla_vehicle_lookup_mot_status` | Auto or manual |
| `dvla_vehicle_lookup_mot_expiry` | TextField | `incident_reports.dvla_vehicle_lookup_mot_expiry` | Auto or manual |
| `dvla_vehicle_lookup_tax_status` | TextField | `incident_reports.dvla_vehicle_lookup_tax_status` | Auto or manual |
| `dvla_vehicle_lookup_tax_due_date` | TextField | `incident_reports.dvla_vehicle_lookup_tax_due_date` | Auto or manual |
| `dvla_vehicle_lookup_insurance_status` | TextField | `incident_reports.dvla_vehicle_lookup_insurance_status` | Auto or manual |

**Example Code:**
```javascript
pdfFields.dvla_lookup_reg = data.dvla_lookup_reg || '';
pdfFields.dvla_vehicle_lookup_make = data.dvla_vehicle_lookup_make || '';
pdfFields.dvla_vehicle_lookup_model = data.dvla_vehicle_lookup_model || '';
// ... etc
```

---

#### Section 3: Damage Details (CheckBox + Text)

| PDF Field Name | Type | Source Data | Mapping Logic |
|---------------|------|-------------|---------------|
| `no_damage` | CheckBox | `incident_reports.no_damage` | Direct boolean |
| `damage_to_your_vehicle` | TextField (Multi-line) | `incident_reports.damage_to_your_vehicle` | Free text |

**Example Code:**
```javascript
pdfFields.no_damage = data.no_damage || false;
pdfFields.damage_to_your_vehicle = data.damage_to_your_vehicle || '';
```

---

#### Section 4: Impact Points (CheckBox Array → Multiple CheckBoxes)

**IMPORTANT**: Database stores as TEXT[] array, but PDF has individual checkboxes.

| PDF Field Name | Type | Source Data | Mapping Logic |
|---------------|------|-------------|---------------|
| `impact_point_front` | CheckBox | `incident_reports.impact_point` | `data.impact_point?.includes('front')` |
| `impact_point_front_driver` | CheckBox | `incident_reports.impact_point` | `data.impact_point?.includes('front_driver')` |
| `impact_point_front_passenger` | CheckBox | `incident_reports.impact_point` | `data.impact_point?.includes('front_passenger')` |
| `impact_point_driver_side` | CheckBox | `incident_reports.impact_point` | `data.impact_point?.includes('driver_side')` |
| `impact_point_passenger_side` | CheckBox | `incident_reports.impact_point` | `data.impact_point?.includes('passenger_side')` |
| `impact_point_rear_driver` | CheckBox | `incident_reports.impact_point` | `data.impact_point?.includes('rear_driver')` |
| `impact_point_rear_passenger` | CheckBox | `incident_reports.impact_point` | `data.impact_point?.includes('rear_passenger')` |
| `impact_point_rear` | CheckBox | `incident_reports.impact_point` | `data.impact_point?.includes('rear')` |
| `impact_point_roof` | CheckBox | `incident_reports.impact_point` | `data.impact_point?.includes('roof')` |
| `impact_point_undercarriage` | CheckBox | `incident_reports.impact_point` | `data.impact_point?.includes('undercarriage')` |

**Example Code:**
```javascript
// Array handling for impact points
const impactPoints = data.impact_point || [];
pdfFields.impact_point_front = impactPoints.includes('front');
pdfFields.impact_point_front_driver = impactPoints.includes('front_driver');
pdfFields.impact_point_front_passenger = impactPoints.includes('front_passenger');
pdfFields.impact_point_driver_side = impactPoints.includes('driver_side');
pdfFields.impact_point_passenger_side = impactPoints.includes('passenger_side');
pdfFields.impact_point_rear_driver = impactPoints.includes('rear_driver');
pdfFields.impact_point_rear_passenger = impactPoints.includes('rear_passenger');
pdfFields.impact_point_rear = impactPoints.includes('rear');
pdfFields.impact_point_roof = impactPoints.includes('roof');
pdfFields.impact_point_undercarriage = impactPoints.includes('undercarriage');
```

---

#### Section 5: Vehicle Driveability (CheckBox Group - Mutually Exclusive)

| PDF Field Name | Type | Source Data | Mapping Logic |
|---------------|------|-------------|---------------|
| `vehicle_driveable_yes` | CheckBox | `incident_reports.vehicle_driveable` | `data.vehicle_driveable === 'yes'` |
| `vehicle_driveable_no` | CheckBox | `incident_reports.vehicle_driveable` | `data.vehicle_driveable === 'no'` |
| `vehicle_driveable_unsure` | CheckBox | `incident_reports.vehicle_driveable` | `data.vehicle_driveable === 'unsure'` |

**Example Code:**
```javascript
pdfFields.vehicle_driveable_yes = (data.vehicle_driveable === 'yes');
pdfFields.vehicle_driveable_no = (data.vehicle_driveable === 'no');
pdfFields.vehicle_driveable_unsure = (data.vehicle_driveable === 'unsure');
```

---

## Part 3: PDF Field Summary

### Quick Counts

| Type | Count | Fields |
|------|-------|--------|
| **CheckBox** | 17 | usual_vehicle (2), no_damage (1), impact_point (10), vehicle_driveable (3), no_damage (1) |
| **TextField** | 12 | dvla_lookup_reg (1), dvla_vehicle_lookup_* (10), damage_to_your_vehicle (1) |
| **TOTAL** | **29** | All Page 5 fields |

### Field Groups

1. **Usual Vehicle**: 2 checkboxes (yes/no)
2. **DVLA Lookup**: 1 text field + 10 auto-populated text fields
3. **Damage Details**: 1 checkbox (no_damage) + 10 checkboxes (impact points) + 1 textarea (description)
4. **Driveability**: 3 checkboxes (yes/no/unsure)

---

## Part 4: Complete PDF Mapping Code

```javascript
// src/services/adobePdfService.js or similar

function mapPage5DataToPdf(data) {
  const pdfFields = {};

  // 1. Usual Vehicle (2 checkboxes)
  pdfFields.usual_vehicle_yes = (data.usual_vehicle === 'yes');
  pdfFields.usual_vehicle_no = (data.usual_vehicle === 'no');

  // 2. DVLA Lookup Fields (11 text fields)
  pdfFields.dvla_lookup_reg = data.dvla_lookup_reg || '';
  pdfFields.dvla_vehicle_lookup_make = data.dvla_vehicle_lookup_make || '';
  pdfFields.dvla_vehicle_lookup_model = data.dvla_vehicle_lookup_model || '';
  pdfFields.dvla_vehicle_lookup_color = data.dvla_vehicle_lookup_color || '';
  pdfFields.dvla_vehicle_lookup_year = data.dvla_vehicle_lookup_year || '';
  pdfFields.dvla_vehicle_lookup_fuel_type = data.dvla_vehicle_lookup_fuel_type || '';
  pdfFields.dvla_vehicle_lookup_mot_status = data.dvla_vehicle_lookup_mot_status || '';
  pdfFields.dvla_vehicle_lookup_mot_expiry = data.dvla_vehicle_lookup_mot_expiry || '';
  pdfFields.dvla_vehicle_lookup_tax_status = data.dvla_vehicle_lookup_tax_status || '';
  pdfFields.dvla_vehicle_lookup_tax_due_date = data.dvla_vehicle_lookup_tax_due_date || '';
  pdfFields.dvla_vehicle_lookup_insurance_status = data.dvla_vehicle_lookup_insurance_status || '';

  // 3. No Damage Checkbox (1 checkbox)
  pdfFields.no_damage = data.no_damage || false;

  // 4. Impact Points (10 checkboxes from array)
  const impactPoints = data.impact_point || [];
  pdfFields.impact_point_front = impactPoints.includes('front');
  pdfFields.impact_point_front_driver = impactPoints.includes('front_driver');
  pdfFields.impact_point_front_passenger = impactPoints.includes('front_passenger');
  pdfFields.impact_point_driver_side = impactPoints.includes('driver_side');
  pdfFields.impact_point_passenger_side = impactPoints.includes('passenger_side');
  pdfFields.impact_point_rear_driver = impactPoints.includes('rear_driver');
  pdfFields.impact_point_rear_passenger = impactPoints.includes('rear_passenger');
  pdfFields.impact_point_rear = impactPoints.includes('rear');
  pdfFields.impact_point_roof = impactPoints.includes('roof');
  pdfFields.impact_point_undercarriage = impactPoints.includes('undercarriage');

  // 5. Damage Description (1 text field)
  pdfFields.damage_to_your_vehicle = data.damage_to_your_vehicle || '';

  // 6. Vehicle Driveability (3 mutually exclusive checkboxes)
  pdfFields.vehicle_driveable_yes = (data.vehicle_driveable === 'yes');
  pdfFields.vehicle_driveable_no = (data.vehicle_driveable === 'no');
  pdfFields.vehicle_driveable_unsure = (data.vehicle_driveable === 'unsure');

  return pdfFields;
}

module.exports = { mapPage5DataToPdf };
```

---

## Part 5: Testing Checklist

### Supabase Testing
- [ ] All 16 columns exist in `incident_reports` table
- [ ] `impact_point` is TEXT[] (not TEXT)
- [ ] `usual_vehicle` and `vehicle_driveable` are TEXT (not BOOLEAN)
- [ ] Test INSERT with sample data
- [ ] Test SELECT and verify data types

### PDF Testing
- [ ] All 29 PDF fields added to template
- [ ] Checkbox fields are properly aligned
- [ ] Text fields have appropriate sizes
- [ ] Multi-line textarea for `damage_to_your_vehicle`
- [ ] Test with sample data (run `node test-form-filling.js [user-uuid]`)
- [ ] Verify checkboxes populate correctly
- [ ] Verify text fields populate correctly
- [ ] Verify arrays expand to multiple checkboxes

---

## Part 6: Known Collision Preventions

**✅ These Page 5 fields DO NOT collide with Page 1 (user_signup):**

| Page 1 Field | Page 5 Field | Safe? |
|--------------|--------------|-------|
| `vehicle_make` | `dvla_vehicle_lookup_make` | ✅ Different names |
| `vehicle_model` | `dvla_vehicle_lookup_model` | ✅ Different names |
| `vehicle_colour` | `dvla_vehicle_lookup_color` | ✅ Different names |
| `recovery_company` | *(removed from Page 5)* | ✅ No collision |

**✅ These Page 5 fields will NOT collide with Page 7 (other vehicle):**

| Page 5 Field | Page 7 Field (future) | Safe? |
|--------------|----------------------|-------|
| `dvla_vehicle_lookup_make` | `other_vehicle_make` | ✅ Different names |
| `damage_to_your_vehicle` | `other_damage_description` | ✅ Different names |
| `impact_point` | `other_impact_point` | ✅ Different names |

---

**Status**: Ready for implementation
**Next Steps**:
1. Add columns to Supabase (SQL above)
2. Add 29 fields to PDF template
3. Implement mapping code in PDF service
4. Test end-to-end with real data

**Last Updated**: 2025-11-03
