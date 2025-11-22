# Page 5 Implementation - Action Plan

**Date**: 2025-11-03
**Status**: Database verified, type fixes needed, backend implementation pending

---

## ✅ Completed Tasks

### 1. Field Mapping Analysis ✅
**Files Created**:
- `docs/PAGE_FIVE_SUPABASE_AND_PDF_MAPPING.md` - Complete HTML → Database → PDF mapping guide
- `docs/PAGE_FIVE_IMPACT_POINT_ARRAY_HANDLING.md` - Array handling explanation

**What Was Done**:
- Analyzed CSV field names from column H
- Created comprehensive mapping guide showing how 29 HTML fields map to 16 database columns and 29 PDF fields
- Explained PostgreSQL TEXT[] array pattern for multi-select fields

### 2. SQL Migration Created ✅
**Files Created**:
- `docs/PAGE_FIVE_SQL_MIGRATION.md` - SQL to add 16 columns

**What Was Done**:
- Created SQL migration based on exact field names from CSV column H
- Used TEXT[] arrays for multi-select fields (impact_point)
- Used TEXT fields for single-select with multiple options (usual_vehicle, vehicle_driveable)

### 3. Database Verification ✅
**Files Created**:
- `scripts/verify-page5-schema.js` - Automated column existence check
- `scripts/verify-column-types.js` - Automated type verification
- `docs/PAGE_FIVE_VERIFICATION_RESULTS.md` - Verification results

**What Was Done**:
- ✅ Confirmed all 16 columns exist in database
- ⚠️ Identified 2 columns with incorrect data types

### 4. Reconciliation Checklist Created ✅
**Files Created**:
- `docs/PAGE_FIVE_RECONCILIATION_CHECKLIST.md` - 10-section verification checklist

**What Was Done**:
- Created comprehensive checklist covering HTML, Database, PDF, and Backend
- Provided verification queries and test plans

---

## ⚠️ Issues to Fix

### Data Type Mismatches (CRITICAL)

**Problem**: Two columns are BOOLEAN when they should be TEXT

| Column | Current Type | Required Type | Reason |
|--------|-------------|---------------|--------|
| `usual_vehicle` | BOOLEAN | TEXT | Values: "yes", "no" (semantic text choices) |
| `vehicle_driveable` | BOOLEAN | TEXT | Values: "yes", "no", "unsure" (3 states, not 2) |

**Impact**:
- BOOLEAN only supports `true`/`false` (2 states)
- `vehicle_driveable` needs 3 states: "yes", "no", "unsure"
- Semantic mismatch - these are text choices, not boolean flags

**Fix**: Run the SQL migration below to convert types while preserving existing data

---

## 🔧 Required Fixes

### Fix 1: Convert BOOLEAN → TEXT (Required)

**Action**: Run this SQL in **Supabase SQL Editor**:

```sql
BEGIN;

-- Fix usual_vehicle (BOOLEAN → TEXT)
ALTER TABLE incident_reports
ALTER COLUMN usual_vehicle TYPE TEXT
USING CASE
  WHEN usual_vehicle = true THEN 'yes'
  WHEN usual_vehicle = false THEN 'no'
  ELSE NULL
END;

COMMENT ON COLUMN incident_reports.usual_vehicle IS
'Page 5 - Were you driving your usual vehicle? Values: yes, no';

-- Fix vehicle_driveable (BOOLEAN → TEXT)
ALTER TABLE incident_reports
ALTER COLUMN vehicle_driveable TYPE TEXT
USING CASE
  WHEN vehicle_driveable = true THEN 'yes'
  WHEN vehicle_driveable = false THEN 'no'
  ELSE 'unsure'
END;

COMMENT ON COLUMN incident_reports.vehicle_driveable IS
'Page 5 - Was vehicle driveable? Values: yes (drove away), no (towed), unsure (did not attempt)';

COMMIT;
```

**Verification**: After running, verify with:

```sql
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'incident_reports'
  AND column_name IN ('usual_vehicle', 'vehicle_driveable')
ORDER BY column_name;
```

**Expected Result**:
```
usual_vehicle     | text | text
vehicle_driveable | text | text
```

**Or run**: `node scripts/verify-column-types.js` (should show no mismatches)

---

## 📋 Next Steps (Backend Implementation)

### Step 1: Update Form Submission Code

**File**: `public/incident-form-page5-vehicle.html`

**Task**: Ensure form submission includes all Page 5 fields

**Current Code** (around lines 1015-1040):
```javascript
const formData = {
  usual_vehicle: document.querySelector('input[name="usual_vehicle"]:checked')?.value,
  dvla_lookup_reg: document.getElementById('license-plate').value,
  dvla_vehicle_data: vehicleData,  // Contains all DVLA lookup fields
  no_damage: document.getElementById('no-damage-checkbox').checked,
  impact_points: Array.from(document.querySelectorAll('input[name="impact_point"]:checked')).map(cb => cb.value),
  damage_to_your_vehicle: document.getElementById('damage-description').value,
  vehicle_driveable: document.querySelector('input[name="vehicle_driveable"]:checked')?.value
};
```

**Required Changes**: None - code already correct! ✅

**Verification**: Check that `dvla_vehicle_data` object contains all 10 DVLA fields

---

### Step 2: Update Backend Controller

**File**: `src/controllers/incidentReportController.js`

**Task**: Save all Page 5 fields to database

**Add Code**:
```javascript
async function saveIncidentReportPage5(req, res) {
  try {
    const userId = req.user.id;
    const {
      usual_vehicle,
      dvla_lookup_reg,
      dvla_vehicle_data,
      no_damage,
      impact_points,
      damage_to_your_vehicle,
      vehicle_driveable
    } = req.body;

    // Flatten DVLA data
    const page5Data = {
      usual_vehicle,
      dvla_lookup_reg,
      dvla_vehicle_lookup_make: dvla_vehicle_data?.make,
      dvla_vehicle_lookup_model: dvla_vehicle_data?.model,
      dvla_vehicle_lookup_color: dvla_vehicle_data?.colour,
      dvla_vehicle_lookup_year: dvla_vehicle_data?.yearOfManufacture,
      dvla_vehicle_lookup_fuel_type: dvla_vehicle_data?.fuelType,
      dvla_vehicle_lookup_mot_status: dvla_vehicle_data?.motStatus,
      dvla_vehicle_lookup_mot_expiry: dvla_vehicle_data?.motExpiryDate,
      dvla_vehicle_lookup_tax_status: dvla_vehicle_data?.taxStatus,
      dvla_vehicle_lookup_tax_due_date: dvla_vehicle_data?.taxDueDate,
      dvla_vehicle_lookup_insurance_status: dvla_vehicle_data?.insuranceStatus,
      no_damage,
      damage_to_your_vehicle,
      impact_point: impact_points,  // PostgreSQL array
      vehicle_driveable
    };

    const { data, error } = await supabase
      .from('incident_reports')
      .update(page5Data)
      .eq('create_user_id', userId);

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Error saving Page 5 data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save vehicle details'
    });
  }
}
```

---

### Step 3: Update PDF Mapping Service

**File**: `src/services/adobePdfService.js` (or PDF mapping file)

**Task**: Map database fields to PDF form fields

**Add Function**:
```javascript
function mapPage5DataToPdf(data) {
  const pdfFields = {};

  // 1. Usual Vehicle (2 checkboxes from 1 database field)
  pdfFields.usual_vehicle_yes = (data.usual_vehicle === 'yes');
  pdfFields.usual_vehicle_no = (data.usual_vehicle === 'no');

  // 2. DVLA Lookup Registration (1 text field)
  pdfFields.dvla_lookup_reg = data.dvla_lookup_reg || '';

  // 3. DVLA Vehicle Data (10 text fields)
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

  // 5. Damage Description (1 textarea)
  pdfFields.damage_to_your_vehicle = data.damage_to_your_vehicle || '';

  // 6. Vehicle Driveability (3 mutually exclusive checkboxes from 1 database field)
  pdfFields.vehicle_driveable_yes = (data.vehicle_driveable === 'yes');
  pdfFields.vehicle_driveable_no = (data.vehicle_driveable === 'no');
  pdfFields.vehicle_driveable_unsure = (data.vehicle_driveable === 'unsure');

  return pdfFields;
}
```

**Integration**: Call this function in your existing PDF generation workflow

---

### Step 4: Add Route

**File**: `src/routes/index.js`

**Add**:
```javascript
router.post('/api/incident-reports/page5', requireAuth, incidentReportController.saveIncidentReportPage5);
```

---

### Step 5: Update Frontend Submission

**File**: `public/incident-form-page5-vehicle.html`

**Update Submit Handler** (around line 1050):
```javascript
async function submitPage5() {
  const formData = {
    usual_vehicle: document.querySelector('input[name="usual_vehicle"]:checked')?.value,
    dvla_lookup_reg: document.getElementById('license-plate').value,
    dvla_vehicle_data: vehicleData,
    no_damage: document.getElementById('no-damage-checkbox').checked,
    impact_points: Array.from(document.querySelectorAll('input[name="impact_point"]:checked')).map(cb => cb.value),
    damage_to_your_vehicle: document.getElementById('damage-description').value,
    vehicle_driveable: document.querySelector('input[name="vehicle_driveable"]:checked')?.value
  };

  const response = await fetch('/api/incident-reports/page5', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getSessionToken()}`
    },
    body: JSON.stringify(formData)
  });

  if (response.ok) {
    window.location.href = '/incident-form-page6.html';
  } else {
    alert('Failed to save vehicle details. Please try again.');
  }
}
```

---

## 🧪 Testing Plan

### Test 1: Data Type Fix Verification

**After running BOOLEAN → TEXT migration**:

```bash
node scripts/verify-column-types.js
```

**Expected**: No type mismatches reported

---

### Test 2: Insert Test Data

**SQL**:
```sql
INSERT INTO incident_reports (
  create_user_id,
  usual_vehicle,
  vehicle_driveable,
  impact_point
) VALUES (
  'test-uuid-here',
  'no',                                    -- TEXT value
  'yes',                                   -- TEXT value
  ARRAY['front', 'passenger_side']         -- TEXT[] array
);
```

**Expected**: Insert succeeds with no errors

---

### Test 3: Query Test Data

**SQL**:
```sql
SELECT
  usual_vehicle,
  vehicle_driveable,
  impact_point
FROM incident_reports
WHERE create_user_id = 'test-uuid-here';
```

**Expected**:
```
usual_vehicle | vehicle_driveable | impact_point
no            | yes               | {front,passenger_side}
```

---

### Test 4: End-to-End Form Submission

1. Navigate to Page 5: `/incident-form-page5-vehicle.html`
2. Fill form:
   - Select "No" for usual vehicle
   - Enter registration: "AB12CDE"
   - Click DVLA lookup (verify data populates)
   - Check impact points: Front, Passenger Side
   - Enter damage description
   - Select "Yes" for driveable
3. Submit form
4. Verify database:
   ```sql
   SELECT * FROM incident_reports WHERE create_user_id = '[your-user-id]';
   ```
5. Generate PDF and verify all fields appear correctly

---

## 📊 Progress Tracking

| Task | Status | Notes |
|------|--------|-------|
| Field mapping analysis | ✅ Complete | 6 documentation files created |
| SQL migration created | ✅ Complete | 16 columns defined |
| Database verification | ✅ Complete | All columns exist |
| **Data type fixes** | ⚠️ **PENDING** | Run SQL migration to convert BOOLEAN → TEXT |
| Backend controller | ⏳ Pending | Code provided above |
| PDF mapping service | ⏳ Pending | Code provided above |
| Route setup | ⏳ Pending | One line to add |
| Frontend integration | ⏳ Pending | Minor update needed |
| End-to-end testing | ⏳ Pending | Test plan provided |

---

## 🎯 Immediate Next Action

**RUN THIS NOW**:

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy the BOOLEAN → TEXT migration SQL from "Fix 1" above
3. Run the SQL
4. Verify with: `node scripts/verify-column-types.js`
5. Proceed to backend implementation

---

## 📚 Reference Documents

| Document | Purpose |
|----------|---------|
| `PAGE_FIVE_SUPABASE_AND_PDF_MAPPING.md` | Complete field mapping guide |
| `PAGE_FIVE_SQL_MIGRATION.md` | Original SQL migration (16 columns) |
| `PAGE_FIVE_IMPACT_POINT_ARRAY_HANDLING.md` | Array handling explanation |
| `PAGE_FIVE_RECONCILIATION_CHECKLIST.md` | 10-section verification checklist |
| `PAGE_FIVE_VERIFICATION_RESULTS.md` | Database verification results |
| `PAGE_FIVE_ACTION_PLAN.md` | This document |

---

## 💡 Key Insights

### Why TEXT Arrays?
- 10 HTML checkboxes → 1 database column → 10 PDF checkboxes
- PostgreSQL arrays enable efficient storage and querying
- Backend maps array to individual PDF checkboxes using `.includes()`

### Why TEXT Instead of BOOLEAN?
- **BOOLEAN**: Only 2 states (true/false)
- **TEXT**: Supports multiple named values ("yes"/"no"/"unsure")
- Semantic clarity: "yes" is more meaningful than `true`
- Extensibility: Can add new values later without schema changes

### Field Naming Convention
- **Page 1** (user_signup): No prefix (e.g., `vehicle_make`)
- **Page 5** (incident_reports): `dvla_vehicle_lookup_*` prefix
- **Page 7** (incident_reports): `other_vehicle_*` prefix (future)
- Prevents database collisions across different contexts

---

**Last Updated**: 2025-11-03
**Status**: Database verified, awaiting data type fixes and backend implementation
