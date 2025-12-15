# Field Mapping Audit Report - Pages 5, 7, 9, 10

**Date**: 2025-11-11
**Status**: 🔴 **CRITICAL DATA LOSS ISSUE IDENTIFIED**

## Executive Summary

Pages 5, 9, and 10 are NOT saving data to the correct sessionStorage keys, resulting in **100% data loss** for these pages. Only Page 7 is saving correctly.

---

## Root Cause Analysis

### The Problem

**Page 12 (Final Submission)** expects data in sessionStorage with this pattern:
```javascript
sessionStorage.getItem('incident_page5')  // Expected key
sessionStorage.getItem('incident_page7')  // Expected key
sessionStorage.getItem('incident_page9')  // Expected key
sessionStorage.getItem('incident_page10') // Expected key
```

**What Pages Are Actually Doing:**

| Page | Expected Key | Actual Key | Storage Type | Status |
|------|-------------|-----------|--------------|--------|
| Page 5 | `sessionStorage: incident_page5` | `localStorage: page5_data` | ❌ localStorage | **CRITICAL** |
| Page 7 | `sessionStorage: incident_page7` | `sessionStorage: incident_page7` | ✅ sessionStorage | **CORRECT** |
| Page 9 | `sessionStorage: incident_page9` | `localStorage: page9_data` | ❌ localStorage | **CRITICAL** |
| Page 10 | `sessionStorage: incident_page10` | `localStorage: page10_data` | ❌ localStorage | **CRITICAL** |

---

## Evidence

### Page 5 (Vehicle Details)
**File**: `/public/incident-form-page5-vehicle.html`

**Line 1158** - Saves to WRONG location:
```javascript
localStorage.setItem('page5_data', JSON.stringify(formData));
```

**Should be**:
```javascript
sessionStorage.setItem('incident_page5', JSON.stringify(formData));
```

**Fields affected** (32 fields):
- `usual_vehicle` ❌
- `vehicle_license_plate` ❌
- `dvla_make`, `dvla_model`, `dvla_colour`, `dvla_year` ❌
- `dvla_fuel_type`, `dvla_mot_status`, `dvla_mot_expiry` ❌
- `dvla_tax_status`, `dvla_tax_due_date`, `dvla_insurance_status` ❌
- `no_damage` ❌
- `damage_to_your_vehicle` ❌
- `impact_point_*` (10 boolean fields) ❌
- `vehicle_driveable` ❌
- `manual_make`, `manual_model`, `manual_colour`, `manual_year` ❌

---

### Page 7 (Other Vehicle/Driver)
**File**: `/public/incident-form-page7-other-vehicle.html`

**Line 1350** - ✅ **CORRECT**:
```javascript
sessionStorage.setItem('incident_page7', JSON.stringify(skipData));
```

**Fields working** (30+ fields):
- `other_full_name` ✅
- `other_contact_number` ✅
- `other_email_address` ✅
- `other_driving_license_number` ✅
- `other_vehicle_registration` ✅
- `other_vehicle_look_up_*` (10 DVLA fields) ✅
- `other_drivers_insurance_*` (4 insurance fields) ✅
- `no_visible_damage` ✅
- `describe_damage_to_vehicle` ✅

---

### Page 9 (Witnesses)
**File**: `/public/incident-form-page9-witnesses.html`

**Line 605** - Saves to WRONG location:
```javascript
localStorage.setItem('page9_data', JSON.stringify(data));
```

**Should be**:
```javascript
sessionStorage.setItem('incident_page9', JSON.stringify(data));
```

**Fields affected** (5 fields + arrays):
- `witnesses_present` ❌
- `witness_name` ❌
- `witness_mobile_number` ❌
- `witness_email_address` ❌
- `witness_statement` ❌
- `additional_witnesses` (array) ❌

---

### Page 10 (Police & Safety)
**File**: `/public/incident-form-page10-police-details.html`

**Line 772** - Saves to WRONG location:
```javascript
localStorage.setItem('page10_data', JSON.stringify(data));
```

**Should be**:
```javascript
sessionStorage.setItem('incident_page10', JSON.stringify(data));
```

**Fields affected** (9 fields):
- `police_attended` ❌
- `accident_ref_number` ❌
- `police_force` ❌
- `officer_name` ❌
- `officer_badge` ❌
- `user_breath_test` ❌
- `other_breath_test` ❌
- `airbags_deployed` ❌
- `seatbelts_worn` ❌
- `seatbelt_reason` ❌

---

## Controller Mappings Verification

**File**: `/src/controllers/incidentForm.controller.js`

The controller **IS** expecting and mapping all these fields correctly:

**Lines 397-402**: Controller destructures page data:
```javascript
page5 = {},
page7 = {},
page9 = {},
page10 = {},
```

**Lines 532-574**: Page 5 fields mapped ✅ (but never received ❌)
**Lines 581-609**: Page 7 fields mapped ✅ (and received ✅)
**Lines 612**: Page 9 fields mapped ✅ (but never received ❌)
**Lines 615-624**: Page 10 fields mapped ✅ (but never received ❌)

**Conclusion**: The controller is perfectly configured. The problem is purely in the HTML pages' JavaScript.

---

## Page 12 Data Collection Logic

**File**: `/public/incident-form-page12-final-medical-check.html`

**Line 702**: Page 12 collects data from sessionStorage:
```javascript
const pageData = sessionStorage.getItem(`incident_page${i}`);
if (pageData) {
  formData[`page${i}`] = JSON.parse(pageData);
}
```

This loop expects:
- `sessionStorage.getItem('incident_page1')` ✅
- `sessionStorage.getItem('incident_page2')` ✅
- `sessionStorage.getItem('incident_page3')` ✅
- `sessionStorage.getItem('incident_page4')` ✅
- `sessionStorage.getItem('incident_page5')` ❌ **NOT FOUND**
- `sessionStorage.getItem('incident_page6')` ✅
- `sessionStorage.getItem('incident_page7')` ✅ **ONLY ONE WORKING**
- `sessionStorage.getItem('incident_page8')` ✅
- `sessionStorage.getItem('incident_page9')` ❌ **NOT FOUND**
- `sessionStorage.getItem('incident_page10')` ❌ **NOT FOUND**

---

## Impact Assessment

### Severity: 🔴 **CRITICAL**

**Data Loss**:
- **Page 5**: 100% data loss (32 fields) - Vehicle details completely missing
- **Page 7**: 0% data loss (30+ fields) - Working correctly ✅
- **Page 9**: 100% data loss (5+ fields) - Witness information completely missing
- **Page 10**: 100% data loss (9 fields) - Police/safety data completely missing

**Total Fields Lost**: 46+ fields per submission

**User Impact**:
- Users complete forms but data is silently discarded
- No error messages shown to users
- Forms appear to work but submissions are incomplete
- Legal documentation is missing critical information

**Business Impact**:
- Invalid legal documents being generated
- Missing vehicle registration data
- Missing witness testimony
- Missing police incident numbers
- Potential legal liability

---

## Recommended Fixes

### Priority 1: Fix Storage Keys (CRITICAL - Deploy Immediately)

#### Fix Page 5
**File**: `/public/incident-form-page5-vehicle.html`

**Line 1158** - Change:
```javascript
// BEFORE (WRONG):
localStorage.setItem('page5_data', JSON.stringify(formData));

// AFTER (CORRECT):
sessionStorage.setItem('incident_page5', JSON.stringify(formData));
```

**Line 1164** - Change load function:
```javascript
// BEFORE (WRONG):
const saved = localStorage.getItem('page5_data');

// AFTER (CORRECT):
const saved = sessionStorage.getItem('incident_page5');
```

---

#### Fix Page 9
**File**: `/public/incident-form-page9-witnesses.html`

**Line 605** - Change:
```javascript
// BEFORE (WRONG):
localStorage.setItem('page9_data', JSON.stringify(data));

// AFTER (CORRECT):
sessionStorage.setItem('incident_page9', JSON.stringify(data));
```

**Line 605** - Change load function:
```javascript
// BEFORE (WRONG):
const saved = localStorage.getItem('page9_data');

// AFTER (CORRECT):
const saved = sessionStorage.getItem('incident_page9');
```

---

#### Fix Page 10
**File**: `/public/incident-form-page10-police-details.html`

**Line 772** - Change:
```javascript
// BEFORE (WRONG):
localStorage.setItem('page10_data', JSON.stringify(data));

// AFTER (CORRECT):
sessionStorage.setItem('incident_page10', JSON.stringify(data));
```

**Line 778** - Change load function:
```javascript
// BEFORE (WRONG):
const saved = localStorage.getItem('page10_data');

// AFTER (CORRECT):
const saved = sessionStorage.getItem('incident_page10');
```

---

### Priority 2: Migration Strategy for Existing Data

Users may have data in localStorage from previous attempts. Add migration logic to Page 12:

```javascript
// Add this BEFORE line 702 in page12
// Migrate any old localStorage data to sessionStorage
['page5_data', 'page9_data', 'page10_data'].forEach((oldKey, index) => {
  const pageNum = [5, 9, 10][index];
  const newKey = `incident_page${pageNum}`;

  const oldData = localStorage.getItem(oldKey);
  if (oldData && !sessionStorage.getItem(newKey)) {
    sessionStorage.setItem(newKey, oldData);
    console.log(`✅ Migrated ${oldKey} → ${newKey}`);
  }
});
```

---

### Priority 3: Add Validation Logging

Add console logging to Page 12 to detect missing data:

```javascript
// Add this after line 709
console.log('📊 Data Collection Summary:');
for (let i = 1; i <= 10; i++) {
  const key = `incident_page${i}`;
  const exists = !!sessionStorage.getItem(key);
  console.log(`${exists ? '✅' : '❌'} ${key}`);
}
```

---

## Testing Checklist

After applying fixes, verify:

- [ ] Page 5 saves to `sessionStorage` with key `incident_page5`
- [ ] Page 5 data appears in final submission
- [ ] Page 9 saves to `sessionStorage` with key `incident_page9`
- [ ] Page 9 witness data appears in final submission
- [ ] Page 10 saves to `sessionStorage` with key `incident_page10`
- [ ] Page 10 police data appears in final submission
- [ ] Browser console shows all pages ✅ in data collection summary
- [ ] Database receives all 46+ fields correctly
- [ ] PDF generation includes vehicle, witness, and police data

---

## Additional Findings

### localStorage vs sessionStorage

**Why sessionStorage is correct**:
- ✅ Auto-clears when browser tab closes (privacy)
- ✅ Not shared between tabs (prevents conflicts)
- ✅ Appropriate for multi-page form flows
- ✅ Matches all other pages (1-4, 6, 8)

**Why localStorage is wrong**:
- ❌ Persists forever (privacy risk)
- ❌ Shared between tabs (data corruption risk)
- ❌ User may have stale data from previous attempts
- ❌ Inconsistent with rest of application

---

## Timeline

| Date | Event |
|------|-------|
| 2025-11-11 | Issue identified - Pages 5, 9, 10 using wrong storage keys |
| 2025-11-11 | Audit completed - 46+ fields affected |
| **ASAP** | **Apply fixes to production** |

---

## Conclusion

This is a **critical data loss bug** affecting 3 out of 4 problematic pages. The fix is straightforward - change 6 lines of code (3 save lines + 3 load lines).

**Page 7 is the reference implementation** - it does everything correctly and should be used as the template for fixing Pages 5, 9, and 10.

**Estimated Fix Time**: 15 minutes
**Testing Time**: 30 minutes
**Total Deployment Time**: 1 hour

**Priority**: 🔴 **IMMEDIATE**
