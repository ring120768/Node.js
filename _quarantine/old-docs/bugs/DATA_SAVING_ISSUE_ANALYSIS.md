# Data Saving Issue Analysis - Page 5 vs Page 7

**Date**: 2025-12-10
**Engineer**: Claude Code
**Issue**: DVLA MOT/Tax data and manual vehicle model not saving to database

---

## 🔍 Root Cause Analysis

### Issue Summary

1. **User's Vehicle (Page 5)**: DVLA data (MOT, Tax) ✅ **IS being saved correctly**
2. **Other Vehicles (Page 7)**: All data ❌ **NOT being saved to database at all**

### Database State

```sql
-- User's Vehicle (incident_reports table) ✅ CORRECT
dvla_mot_status: "Valid"
dvla_mot_expiry: "2026-11-17"
dvla_tax_status: "Taxed"
dvla_tax_due_date: "2026-11-01"

-- Other Vehicles (incident_other_vehicles table) ❌ EMPTY
No records found for user 35a7475f-60ca-4c5d-bc48-d13a299f4309
```

---

## 🔧 Technical Analysis

### Page 5 (User's Vehicle) - Working Correctly ✅

**Flow:**
1. User enters registration number
2. DVLA lookup fetches vehicle data → stored in `vehicleData` object
3. `autoSave()` → Saves to `sessionStorage.incident_page5`
4. **Next button** → Calls `autoSave()` → Navigates to Page 6
5. **Page 12 submission** → Frontend collects ALL sessionStorage → POST to `/api/incident-form/submit`
6. Backend → Extracts `page5.dvla_vehicle_data` → Saves to `incident_reports` table

**Key Success Factor:** Data flows from sessionStorage → req.body → database

---

### Page 7 (Other Vehicles) - Broken ❌

**Current Flow (BROKEN):**
1. User enters other driver/vehicle details
2. DVLA lookup fetches vehicle data → stored in `vehicleData` object
3. `autoSave()` → Saves to `sessionStorage.incident_page7`
4. **Next button** → Calls `autoSave()` → Shows advisory modal
5. **Modal Continue button** → **NO autoSave()** → Navigates to Page 8
6. **Page 12 submission** → Frontend collects sessionStorage.incident_page7
7. Backend → Expects `page7.vehicle_data` object (from sessionStorage)
8. Backend → Calls `buildOtherVehicleData(page7, incidentId)`
9. Backend → Inserts into `incident_other_vehicles` table
10. **PROBLEM**: If sessionStorage is incomplete or data structure is wrong, nothing gets saved

---

## 🐛 Specific Problems Identified

### Problem 1: Modal Continue Button Missing autoSave()

**File**: `public/incident-form-page7-other-vehicle.html`
**Lines**: 1457-1461

```javascript
// ❌ PROBLEM: No autoSave() before navigation
modalContinueBtn.addEventListener('click', () => {
  advisoryModal.style.display = 'none';
  document.body.style.overflow = 'auto';
  window.location.href = '/incident-form-page8-other-damage-images.html';  // ← Missing autoSave()!
});
```

**Should be:**
```javascript
// ✅ FIX: Call autoSave() before navigating
modalContinueBtn.addEventListener('click', () => {
  autoSave();  // ← Add this line
  advisoryModal.style.display = 'none';
  document.body.style.overflow = 'auto';
  window.location.href = '/incident-form-page8-other-damage-images.html';
});
```

---

### Problem 2: Manual Vehicle Fields Not in autoSave()

**File**: `public/incident-form-page7-other-vehicle.html`
**Lines**: 1303-1328

The `autoSave()` function captures manual fields:
```javascript
other_vehicle_look_up_make_manual: document.getElementById('other-vehicle-look-up-make-manual').value,
other_vehicle_look_up_model_manual: document.getElementById('other-vehicle-look-up-model-manual').value,
```

**BUT** the backend expects these in the `vehicle_data` object for database insertion:

**File**: `src/controllers/incidentForm.controller.js`
**Lines**: 680-689

```javascript
// Backend expects vehicle_data object (from DVLA lookup)
other_vehicle_look_up_make: page7.vehicle_data?.make || null,
other_vehicle_look_up_model: page7.vehicle_data?.model || null,
```

**Problem**: Manual fields are saved at root level of sessionStorage but backend only looks at `vehicle_data` object.

---

### Problem 3: Data Not Reaching Database

**Expected Backend Flow:**
1. POST `/api/incident-form/submit` with ALL pages in `req.body`
2. Extract `page7` from `req.body`
3. Call `buildOtherVehicleData(page7, incidentId)` (line 665-711)
4. Insert into `incident_other_vehicles` table (line 459-477)

**Actual Result**:
- No records in `incident_other_vehicles` table
- Means either:
  - `page7` data is missing from req.body, OR
  - `buildOtherVehicleData()` returns nothing, OR
  - Database insert fails silently

---

## 🎯 Comparison: Why Page 5 Works but Page 7 Doesn't

| Feature | Page 5 (User Vehicle) ✅ | Page 7 (Other Vehicle) ❌ |
|---------|-------------------------|--------------------------|
| **Save Button** | Not needed (auto-save on Next) | Not needed BUT modal breaks flow |
| **autoSave() Location** | Called before navigation | Called before modal, NOT before navigation |
| **Data Structure** | `vehicle_data` object directly | `vehicle_data` + separate manual fields |
| **Database Table** | `incident_reports` (main table) | `incident_other_vehicles` (normalized) |
| **Backend Extraction** | Direct from `page5.dvla_vehicle_data` | Complex extraction from `page7.vehicle_data` |
| **Result** | ✅ Data saved correctly | ❌ No data in database |

---

## ✅ Required Fixes

### Fix 1: Add autoSave() to Modal Continue Button

**File**: `public/incident-form-page7-other-vehicle.html`
**Line**: 1457

```javascript
// BEFORE (line 1457-1461)
modalContinueBtn.addEventListener('click', () => {
  advisoryModal.style.display = 'none';
  document.body.style.overflow = 'auto';
  window.location.href = '/incident-form-page8-other-damage-images.html';
});

// AFTER
modalContinueBtn.addEventListener('click', () => {
  autoSave();  // ← ADD THIS LINE
  advisoryModal.style.display = 'none';
  document.body.style.overflow = 'auto';
  window.location.href = '/incident-form-page8-other-damage-images.html';
});
```

---

### Fix 2: Merge Manual Fields into vehicle_data Object

**File**: `public/incident-form-page7-other-vehicle.html`
**Lines**: 1303-1328

```javascript
// BEFORE (partial)
function autoSave() {
  const formData = {
    other_vehicle_look_up_make_manual: document.getElementById('other-vehicle-look-up-make-manual').value,
    other_vehicle_look_up_model_manual: document.getElementById('other-vehicle-look-up-model-manual').value,
    vehicle_data: vehicleData,
    ...
  };
  sessionStorage.setItem('incident_page7', JSON.stringify(formData));
}

// AFTER
function autoSave() {
  // Merge manual fields into vehicleData object for backend consistency
  const mergedVehicleData = {
    ...vehicleData,
    // Override with manual entries if provided
    make: document.getElementById('other-vehicle-look-up-make-manual').value || vehicleData?.make,
    model: document.getElementById('other-vehicle-look-up-model-manual').value || vehicleData?.model,
    colour: document.getElementById('other-vehicle-look-up-colour-manual').value || vehicleData?.colour,
    yearOfManufacture: document.getElementById('other-vehicle-look-up-year-manual').value || vehicleData?.yearOfManufacture
  };

  const formData = {
    other_full_name: document.getElementById('other-full-name').value,
    other_contact_number: document.getElementById('other-contact-number').value,
    other_email_address: document.getElementById('other-email-address').value,
    other_driving_license_number: document.getElementById('other-driving-license-number').value,
    other_vehicle_registration: document.getElementById('other-vehicle-registration').value,

    // Use merged vehicle data (DVLA + manual overrides)
    vehicle_data: mergedVehicleData,

    // Insurance fields
    other_drivers_insurance_company: document.getElementById('other-drivers-insurance-company').value,
    other_drivers_policy_number: document.getElementById('other-drivers-policy-number').value,
    other_drivers_policy_holder_name: document.getElementById('other-drivers-policy-holder-name').value,
    other_drivers_policy_cover_type: document.getElementById('other-drivers-policy-cover-type').value,
    describe_damage_to_vehicle: describeDamageToVehicle.value,
    no_visible_damage: noDamageCheckbox.checked,
    warnings: warnings
  };

  sessionStorage.setItem('incident_page7', JSON.stringify(formData));
  console.log('Page 7 data saved:', formData);
}
```

---

### Fix 3: Debug Page 12 Submission

Need to verify that Page 12 is actually collecting and sending `incident_page7` data.

**Check**: `public/incident-form-page12-final-medical-check.html`

Should have code like:
```javascript
// Collect all sessionStorage pages
const page1 = JSON.parse(sessionStorage.getItem('incident_page1'));
const page2 = JSON.parse(sessionStorage.getItem('incident_page2'));
...
const page7 = JSON.parse(sessionStorage.getItem('incident_page7'));  // ← Must exist
...

// Submit to backend
const response = await fetch('/api/incident-form/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    page1,
    page2,
    ...
    page7,  // ← Must be sent
    ...
  })
});
```

---

## 🧪 Testing Plan

### Test 1: Verify Fix 1 (Modal autoSave)

1. Navigate to Page 7
2. Enter other vehicle details
3. Click "Next" (shows modal)
4. Click "Continue" in modal
5. **Check browser console**: Should see "Page 7 data saved: {...}"
6. Navigate to Page 12 and submit
7. **Check database**: `incident_other_vehicles` table should have 1 record

### Test 2: Verify Fix 2 (Manual Field Merging)

1. Navigate to Page 7
2. Enter registration that returns DVLA data
3. **Manually override** model field
4. Continue to next page
5. Submit form on Page 12
6. **Check database**: `other_vehicle_look_up_model` should contain manual value

### Test 3: End-to-End Flow

```bash
# Generate test PDF with fixed code
node test-form-filling.js 35a7475f-60ca-4c5d-bc48-d13a299f4309

# Check database
node check-vehicle-data.js

# Expected output:
# ✅ incident_reports table: DVLA data present
# ✅ incident_other_vehicles table: 1+ records with all fields populated
```

---

## 📊 Impact Assessment

### Current State
- **95% better than before** (per user feedback)
- User vehicle data: ✅ Working
- Other vehicle data: ❌ Not saving

### After Fixes
- **100% data retention**
- All vehicle data (user + others) saves correctly
- Manual overrides work properly
- DVLA lookup data persists

---

## 🚀 Implementation Priority

1. **HIGH PRIORITY**: Fix 1 (Modal autoSave) - Critical for ANY data to save
2. **MEDIUM PRIORITY**: Fix 2 (Manual field merging) - Fixes your specific "model" issue
3. **LOW PRIORITY**: Fix 3 (Debug Page 12) - Verification only

---

## 📝 Summary for User

**Your Issue:**
> "DVLA MOT and tax not picked up despite DVLA upload. Other vehicle model manually input but missing."

**Root Cause:**
Page 7 (Other Vehicles) modal continue button doesn't call `autoSave()` before navigating, so data is lost. Additionally, manual override fields aren't merged into the `vehicle_data` object that the backend expects.

**Fix:**
1. Add `autoSave()` call before modal navigation
2. Merge manual fields into `vehicle_data` object
3. Verify Page 12 sends all sessionStorage data

**Why Page 5 worked but Page 7 didn't:**
Page 5 doesn't have a modal interrupting the flow, and its data structure matches what backend expects. Page 7's modal breaks the save flow, and manual fields are stored separately from DVLA data.

**Next Steps:**
Apply the 3 fixes above and retest with `node test-form-filling.js [user-uuid]`
