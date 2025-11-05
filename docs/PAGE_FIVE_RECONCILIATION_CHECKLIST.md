# Page 5 - Complete Reconciliation Checklist

**Date**: 2025-11-03
**Purpose**: Verify HTML, Database, and PDF are all aligned
**Status**: Post-implementation verification

---

## 1️⃣ HTML Form Fields ✅ (Already Complete)

**File**: `public/incident-form-page5-vehicle.html`

| HTML Field Name | Field Type | Values/Options | Status |
|----------------|------------|----------------|--------|
| `usual_vehicle` | Radio/Checkbox group | "yes", "no" | ✅ Implemented |
| `vehicle_license_plate` | Text input | UK license plate | ✅ Implemented |
| `no_damage` | Checkbox | boolean | ✅ Implemented |
| `impact_point` | Checkbox group (10) | "front", "front_driver", "front_passenger", "driver_side", "passenger_side", "rear_driver", "rear_passenger", "rear", "roof", "undercarriage" | ✅ Implemented |
| `damage_description` | Textarea | Free text | ✅ Implemented |
| `vehicle_driveable` | Checkbox group (3) | "yes", "no", "unsure" | ✅ Implemented |

**DVLA Auto-Populated Fields** (Display only, stored in `vehicleData` object):
- vehicle-make, vehicle-model, vehicle-colour, vehicle-year, vehicle-fuel
- vehicle-mot-status, vehicle-mot-expiry
- vehicle-tax-status, vehicle-tax-due
- vehicle-insurance-status

---

## 2️⃣ Supabase Database Columns (Verify These Exist)

**Table**: `incident_reports`

Run this query in Supabase SQL Editor to verify:

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'incident_reports'
  AND column_name IN (
    'usual_vehicle',
    'dvla_lookup_reg',
    'dvla_vehicle_lookup_make',
    'dvla_vehicle_lookup_model',
    'dvla_vehicle_lookup_color',
    'dvla_vehicle_lookup_year',
    'dvla_vehicle_lookup_fuel_type',
    'dvla_vehicle_lookup_mot_status',
    'dvla_vehicle_lookup_mot_expiry',
    'dvla_vehicle_lookup_tax_status',
    'dvla_vehicle_lookup_tax_due_date',
    'dvla_vehicle_lookup_insurance_status',
    'no_damage',
    'damage_to_your_vehicle',
    'impact_point',
    'vehicle_driveable'
  )
ORDER BY column_name;
```

**Expected Result**: 16 rows

### Checklist

- [ ] `usual_vehicle` - TEXT
- [ ] `dvla_lookup_reg` - TEXT
- [ ] `dvla_vehicle_lookup_make` - TEXT
- [ ] `dvla_vehicle_lookup_model` - TEXT
- [ ] `dvla_vehicle_lookup_color` - TEXT
- [ ] `dvla_vehicle_lookup_year` - TEXT
- [ ] `dvla_vehicle_lookup_fuel_type` - TEXT
- [ ] `dvla_vehicle_lookup_mot_status` - TEXT
- [ ] `dvla_vehicle_lookup_mot_expiry` - TEXT
- [ ] `dvla_vehicle_lookup_tax_status` - TEXT
- [ ] `dvla_vehicle_lookup_tax_due_date` - TEXT
- [ ] `dvla_vehicle_lookup_tax_due_date` - TEXT
- [ ] `dvla_vehicle_lookup_insurance_status` - TEXT
- [ ] `no_damage` - BOOLEAN
- [ ] `damage_to_your_vehicle` - TEXT
- [ ] `impact_point` - ARRAY (text[])
- [ ] `vehicle_driveable` - TEXT

---

## 3️⃣ PDF Template Fields (Verify These Exist in Adobe Acrobat)

**File**: `MOJ_Accident_Report_Form.pdf`

Open PDF in Adobe Acrobat Pro → Tools → Prepare Form → Check these fields exist:

### Section A: Usual Vehicle (2 checkboxes)

- [ ] `usual_vehicle_yes` (CheckBox)
- [ ] `usual_vehicle_no` (CheckBox)

### Section B: DVLA Lookup (12 text fields)

- [ ] `dvla_lookup_reg` (TextField)
- [ ] `dvla_vehicle_lookup_make` (TextField)
- [ ] `dvla_vehicle_lookup_model` (TextField)
- [ ] `dvla_vehicle_lookup_color` (TextField)
- [ ] `dvla_vehicle_lookup_year` (TextField)
- [ ] `dvla_vehicle_lookup_fuel_type` (TextField)
- [ ] `dvla_vehicle_lookup_mot_status` (TextField)
- [ ] `dvla_vehicle_lookup_mot_expiry` (TextField)
- [ ] `dvla_vehicle_lookup_tax_status` (TextField)
- [ ] `dvla_vehicle_lookup_tax_due_date` (TextField)
- [ ] `dvla_vehicle_lookup_insurance_status` (TextField)

### Section C: Damage Details (12 checkboxes + 1 text field)

- [ ] `no_damage` (CheckBox)
- [ ] `impact_point_front` (CheckBox)
- [ ] `impact_point_front_driver` (CheckBox)
- [ ] `impact_point_front_passenger` (CheckBox)
- [ ] `impact_point_driver_side` (CheckBox)
- [ ] `impact_point_passenger_side` (CheckBox)
- [ ] `impact_point_rear_driver` (CheckBox)
- [ ] `impact_point_rear_passenger` (CheckBox)
- [ ] `impact_point_rear` (CheckBox)
- [ ] `impact_point_roof` (CheckBox)
- [ ] `impact_point_undercarriage` (CheckBox)
- [ ] `damage_to_your_vehicle` (TextField - Multi-line)

### Section D: Vehicle Driveability (3 checkboxes)

- [ ] `vehicle_driveable_yes` (CheckBox)
- [ ] `vehicle_driveable_no` (CheckBox)
- [ ] `vehicle_driveable_unsure` (CheckBox)

**Total PDF Fields**: 29

---

## 4️⃣ Backend Mapping Code (Needs Implementation)

**File**: `src/services/adobePdfService.js` (or wherever PDF filling happens)

### Check if this function exists:

```javascript
function mapPage5DataToPdf(data) {
  const pdfFields = {};

  // 1. Usual Vehicle (2 checkboxes from 1 database field)
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

  // 6. Vehicle Driveability (3 mutually exclusive checkboxes from 1 database field)
  pdfFields.vehicle_driveable_yes = (data.vehicle_driveable === 'yes');
  pdfFields.vehicle_driveable_no = (data.vehicle_driveable === 'no');
  pdfFields.vehicle_driveable_unsure = (data.vehicle_driveable === 'unsure');

  return pdfFields;
}
```

### Checklist

- [ ] Function `mapPage5DataToPdf()` exists
- [ ] All 29 PDF fields are mapped
- [ ] Array handling for `impact_point` uses `.includes()`
- [ ] Single-value fields use `===` comparison
- [ ] Text fields have `|| ''` fallback
- [ ] Boolean fields have `|| false` fallback

---

## 5️⃣ Form Submission Code (Needs Implementation/Verification)

**File**: `public/incident-form-page5-vehicle.html` or submission controller

### Check JavaScript submission includes all fields:

```javascript
async function submitPage5() {
  // Collect impact points array
  const impactPoints = Array.from(
    document.querySelectorAll('input[name="impact_point"]:checked')
  ).map(cb => cb.value);

  const formData = {
    usual_vehicle: document.querySelector('input[name="usual_vehicle"]:checked')?.value,
    dvla_lookup_reg: document.getElementById('license-plate').value,

    // DVLA fields from vehicleData object (populated by DVLA API)
    dvla_vehicle_lookup_make: vehicleData?.make || null,
    dvla_vehicle_lookup_model: vehicleData?.model || null,
    dvla_vehicle_lookup_color: vehicleData?.colour || null,
    dvla_vehicle_lookup_year: vehicleData?.yearOfManufacture || null,
    dvla_vehicle_lookup_fuel_type: vehicleData?.fuelType || null,
    dvla_vehicle_lookup_mot_status: vehicleData?.motStatus || null,
    dvla_vehicle_lookup_mot_expiry: vehicleData?.motExpiryDate || null,
    dvla_vehicle_lookup_tax_status: vehicleData?.taxStatus || null,
    dvla_vehicle_lookup_tax_due_date: vehicleData?.taxDueDate || null,
    dvla_vehicle_lookup_insurance_status: vehicleData?.insuranceStatus || null,

    no_damage: document.getElementById('no-damage-checkbox').checked,
    impact_point: impactPoints,  // Array
    damage_to_your_vehicle: document.getElementById('damage-description').value,
    vehicle_driveable: document.querySelector('input[name="vehicle_driveable"]:checked')?.value
  };

  // Submit to backend
  const response = await fetch('/api/incident-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
}
```

### Checklist

- [ ] All 16 database fields are included in submission
- [ ] `impact_point` is sent as array
- [ ] `vehicle_driveable` is sent as single value (not array)
- [ ] DVLA fields are extracted from `vehicleData` object
- [ ] Form validates required fields before submission

---

## 6️⃣ Backend Controller (Needs Implementation/Verification)

**File**: `src/controllers/incidentReportController.js` or similar

### Check POST endpoint saves all fields:

```javascript
async function createIncidentReport(req, res) {
  const userId = req.user.id; // From auth middleware
  const {
    usual_vehicle,
    dvla_lookup_reg,
    dvla_vehicle_lookup_make,
    dvla_vehicle_lookup_model,
    dvla_vehicle_lookup_color,
    dvla_vehicle_lookup_year,
    dvla_vehicle_lookup_fuel_type,
    dvla_vehicle_lookup_mot_status,
    dvla_vehicle_lookup_mot_expiry,
    dvla_vehicle_lookup_tax_status,
    dvla_vehicle_lookup_tax_due_date,
    dvla_vehicle_lookup_insurance_status,
    no_damage,
    impact_point,
    damage_to_your_vehicle,
    vehicle_driveable
  } = req.body;

  const { data, error } = await supabase
    .from('incident_reports')
    .insert({
      create_user_id: userId,
      usual_vehicle,
      dvla_lookup_reg,
      dvla_vehicle_lookup_make,
      dvla_vehicle_lookup_model,
      dvla_vehicle_lookup_color,
      dvla_vehicle_lookup_year,
      dvla_vehicle_lookup_fuel_type,
      dvla_vehicle_lookup_mot_status,
      dvla_vehicle_lookup_mot_expiry,
      dvla_vehicle_lookup_tax_status,
      dvla_vehicle_lookup_tax_due_date,
      dvla_vehicle_lookup_insurance_status,
      no_damage,
      impact_point,  // Array automatically handled by Supabase
      damage_to_your_vehicle,
      vehicle_driveable
    });

  if (error) {
    logger.error('Error saving incident report:', error);
    return res.status(500).json({ error: 'Failed to save report' });
  }

  res.status(201).json({ success: true, data });
}
```

### Checklist

- [ ] Controller extracts all 16 Page 5 fields from `req.body`
- [ ] `impact_point` array is passed directly to Supabase (no JSON.stringify needed)
- [ ] Error handling is present
- [ ] Returns success response with data

---

## 7️⃣ PDF Generation Code (Needs Implementation/Verification)

**File**: `src/services/adobePdfService.js` or similar

### Check PDF generation includes Page 5 data:

```javascript
async function generateIncidentPdf(userId) {
  // 1. Fetch incident report data
  const { data, error } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (error) throw error;

  // 2. Map Page 5 data to PDF fields
  const page5Fields = mapPage5DataToPdf(data);

  // 3. Merge with other page fields
  const allPdfFields = {
    ...page1Fields,
    ...page2Fields,
    ...page3Fields,
    ...page4Fields,
    ...page5Fields,  // ← Page 5 fields
    ...page6Fields,
    // ... etc
  };

  // 4. Fill PDF template
  const filledPdf = await pdfService.fillForm(allPdfFields);

  return filledPdf;
}
```

### Checklist

- [ ] `mapPage5DataToPdf()` is called
- [ ] Page 5 fields are merged into `allPdfFields`
- [ ] All 29 PDF fields are filled
- [ ] PDF generation doesn't error on Page 5 fields

---

## 8️⃣ End-to-End Testing

### Test Data

```sql
-- Insert test record in Supabase
INSERT INTO incident_reports (
  create_user_id,
  usual_vehicle,
  dvla_lookup_reg,
  dvla_vehicle_lookup_make,
  dvla_vehicle_lookup_model,
  dvla_vehicle_lookup_color,
  dvla_vehicle_lookup_year,
  dvla_vehicle_lookup_fuel_type,
  dvla_vehicle_lookup_mot_status,
  dvla_vehicle_lookup_mot_expiry,
  dvla_vehicle_lookup_tax_status,
  dvla_vehicle_lookup_tax_due_date,
  dvla_vehicle_lookup_insurance_status,
  no_damage,
  impact_point,
  damage_to_your_vehicle,
  vehicle_driveable
) VALUES (
  'your-test-user-uuid',
  'no',
  'AB12 CDE',
  'FORD',
  'Focus',
  'Blue',
  '2020',
  'Petrol',
  'Valid',
  '2025-06-15',
  'Taxed',
  '2025-03-01',
  'Insured',
  false,
  ARRAY['front_passenger', 'passenger_side', 'rear'],
  'Large dent on passenger door approximately 20cm, bumper cracked, rear light damaged',
  'yes'
);
```

### Test Checklist

- [ ] Run HTML form, fill all Page 5 fields
- [ ] Verify auto-save works
- [ ] Submit form
- [ ] Check database record exists with all 16 fields populated
- [ ] Generate PDF: `node test-form-filling.js [user-uuid]`
- [ ] Open PDF and verify:
  - [ ] 2 usual_vehicle checkboxes (only one checked)
  - [ ] 12 DVLA text fields populated
  - [ ] 1 no_damage checkbox (unchecked if damage exists)
  - [ ] 3 impact_point checkboxes checked (front_passenger, passenger_side, rear)
  - [ ] 7 impact_point checkboxes unchecked
  - [ ] 1 damage description text box with full text
  - [ ] 1 vehicle_driveable checkbox checked (yes)
  - [ ] 2 vehicle_driveable checkboxes unchecked (no, unsure)

---

## 9️⃣ Common Issues & Fixes

### Issue 1: Impact Points Not Showing in PDF

**Symptom**: All impact_point checkboxes are unchecked in PDF

**Cause**: Array not being mapped to individual checkboxes

**Fix**: Verify `mapPage5DataToPdf()` uses `.includes()` for each impact point

---

### Issue 2: DVLA Fields Blank in Database

**Symptom**: DVLA fields are NULL in database after form submission

**Cause**: `vehicleData` object not being extracted in submission code

**Fix**: Ensure submission code maps `vehicleData.make` → `dvla_vehicle_lookup_make`, etc.

---

### Issue 3: Vehicle Driveability Shows Multiple Checked

**Symptom**: Multiple vehicle_driveable checkboxes checked in PDF

**Cause**: Using array handling instead of single value

**Fix**: Verify database column is `TEXT` (not `TEXT[]`) and mapping uses `===` not `.includes()`

---

### Issue 4: Database Error on Insert

**Symptom**: "column does not exist" error

**Cause**: Columns not added to Supabase

**Fix**: Run SQL migration from `PAGE_FIVE_SQL_MIGRATION.md`

---

## 10️⃣ Final Verification Query

Run this in Supabase to confirm everything is working:

```sql
-- Check recent incident reports have Page 5 data
SELECT
  create_user_id,
  usual_vehicle,
  dvla_lookup_reg,
  dvla_vehicle_lookup_make,
  array_length(impact_point, 1) as impact_count,
  damage_to_your_vehicle,
  vehicle_driveable,
  created_at
FROM incident_reports
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 5;
```

Expected: Recent records show populated Page 5 fields

---

## Summary Checklist

- [ ] **HTML**: All fields exist and work (✅ Already complete)
- [ ] **Database**: 16 columns added to `incident_reports` table
- [ ] **PDF**: 29 form fields added to PDF template
- [ ] **Mapping Code**: `mapPage5DataToPdf()` function implemented
- [ ] **Submission**: Form submission includes all 16 fields
- [ ] **Backend**: Controller saves all fields to database
- [ ] **PDF Generation**: PDF includes Page 5 data
- [ ] **Testing**: End-to-end test passes

---

**Status**: Use this checklist to verify your PDF and database updates
**Next**: Mark items complete as you verify each section

**Last Updated**: 2025-11-03
