# Page 7 (Other Vehicles) - Complete Field Mapping Analysis

**Date**: 2025-11-04
**Status**: 🔍 REVIEW IN PROGRESS
**Critical Issues**: YES - Multiple vehicles not saved, field mismatches, missing columns

---

## 📋 Executive Summary

**Data Loss Severity**: 🔴 **CRITICAL** - 50%+ data loss + entire additional vehicles lost

### Issues Found

1. **Field Name Mismatches**: 2 fields
   - `other_license_plate` (frontend) → `other_vehicle_registration` (backend)
   - `other_insurance_company` (frontend) → `other_driver_insurance` (backend)

2. **Missing Backend Mappings**: 6 fields collected but not mapped
   - `other_driver_email`
   - `other_driver_license`
   - `other_policy_number`
   - `other_policy_holder`
   - `other_policy_cover`
   - `no_visible_damage`

3. **Additional Vehicles Not Saved**: 100% data loss for vehicles 2+
   - Frontend stores multiple vehicles in `sessionStorage.additional_vehicles`
   - Backend ONLY saves first vehicle to `incident_reports` table
   - `incident_other_vehicles` table exists but is NEVER used
   - If accident involves 3 vehicles, vehicles 2 and 3 are completely lost!

4. **Missing Database Columns**: 5 fields
   - `other_insurance_company` (incident_reports)
   - `other_policy_number` (both tables)
   - `other_policy_holder` (both tables)
   - `other_policy_cover` (both tables)
   - `no_visible_damage` (both tables)

---

## 1️⃣ REVIEW: Current State

### Frontend Analysis (`public/incident-form-page7-other-vehicle.html`)

**Total Fields Collected**: 14 fields per vehicle

#### Driver Details (5 fields)
| Field ID | Data Saved As | Type | Notes |
|----------|---------------|------|-------|
| `other-driver-name` | `other_driver_name` | text | ✅ |
| `other-driver-phone` | `other_driver_phone` | text | ✅ |
| `other-driver-email` | `other_driver_email` | text | ✅ |
| `other-driver-address` | `other_driver_address` | text | ✅ |
| `other-driver-license` | `other_driver_license` | text | ✅ |

#### Vehicle Details (4 fields)
| Field ID | Data Saved As | Type | Notes |
|----------|---------------|------|-------|
| `other-license-plate` | `other_license_plate` | text | ⚠️ Backend expects `other_vehicle_registration` |
| `other-vehicle-make` | `other_vehicle_make` | text | ✅ Can be DVLA auto or manual |
| `other-vehicle-model` | `other_vehicle_model` | text | ✅ Can be DVLA auto or manual |
| `other-vehicle-color` | `other_vehicle_color` | text | ✅ Can be DVLA auto or manual |

#### Insurance Details (4 fields)
| Field ID | Data Saved As | Type | Notes |
|----------|---------------|------|-------|
| `other-insurance-company` | `other_insurance_company` | text | ⚠️ Backend expects `other_driver_insurance` |
| `other-policy-number` | `other_policy_number` | text | ❌ Not in backend |
| `other-policy-holder` | `other_policy_holder` | text | ❌ Not in backend |
| `other-policy-cover` | `other_policy_cover` | select | ❌ Not in backend |

#### Damage Details (1 field + 1 flag)
| Field ID | Data Saved As | Type | Notes |
|----------|---------------|------|-------|
| `other-point-of-impact` | `other_point_of_impact` | text | ✅ Should be TEXT[] array |
| `no-damage-checkbox` | `no_visible_damage` | boolean | ❌ Not in backend |

**Storage Method**: `sessionStorage.setItem('additional_vehicles', JSON.stringify(array))`

**Multiple Vehicles**: YES - User can add Vehicle 2, Vehicle 3, etc.

---

### Backend Analysis (`src/controllers/incidentForm.controller.js` lines 342-351)

**Total Fields Mapped**: 8 fields (to `incident_reports` table ONLY)

#### Mapped to incident_reports Table
```javascript
// Page 7: Other Vehicle
other_vehicle_make: page7.other_vehicle_make || null,
other_vehicle_model: page7.other_vehicle_model || null,
other_vehicle_color: page7.other_vehicle_color || null,
other_vehicle_registration: page7.other_vehicle_registration || null,  // ⚠️ Frontend sends other_license_plate

other_driver_name: page7.other_driver_name || null,
other_driver_phone: page7.other_driver_phone || null,
other_driver_address: page7.other_driver_address || null,
other_driver_insurance: page7.other_driver_insurance || null,  // ⚠️ Frontend sends other_insurance_company
```

#### NOT Mapped (Missing)
- ❌ `other_driver_email`
- ❌ `other_driver_license`
- ❌ `other_license_plate` (sent but backend looks for `other_vehicle_registration`)
- ❌ `other_insurance_company` (sent but backend looks for `other_driver_insurance`)
- ❌ `other_policy_number`
- ❌ `other_policy_holder`
- ❌ `other_policy_cover`
- ❌ `other_point_of_impact`
- ❌ `no_visible_damage`

#### Additional Vehicles NOT Handled
- ❌ **CRITICAL**: `sessionStorage.additional_vehicles` array is NEVER processed
- ❌ `incident_other_vehicles` table is NEVER used
- ❌ Only first vehicle data saved (to incident_reports)
- ❌ Vehicles 2, 3, 4+ are completely lost!

---

### Database Analysis

#### Table 1: `incident_reports` (Main incident)

**Columns for "First Other Vehicle"**:
```sql
-- From Page 7 (first vehicle)
other_vehicle_make TEXT,
other_vehicle_model TEXT,
other_vehicle_color TEXT,
other_vehicle_registration TEXT,  -- ⚠️ Frontend sends other_license_plate
other_driver_name TEXT,
other_driver_phone TEXT,
other_driver_address TEXT,
other_driver_insurance TEXT,  -- ⚠️ Frontend sends other_insurance_company
```

**Missing Columns**:
- ❌ `other_driver_email`
- ❌ `other_driver_license`
- ❌ `other_policy_number`
- ❌ `other_policy_holder`
- ❌ `other_policy_cover`
- ❌ `other_point_of_impact`
- ❌ `no_visible_damage`

#### Table 2: `incident_other_vehicles` (Additional vehicles 2, 3, 4+)

**Purpose**: Store details for 2nd, 3rd, 4th+ vehicles involved

**Columns** (from migration 002):
```sql
id UUID PRIMARY KEY,
incident_report_id UUID REFERENCES incident_reports(id),  -- Links to main report
vehicle_number INTEGER,  -- 2, 3, 4, etc.

-- Added in migration 002:
other_driver_name TEXT,
other_driver_phone TEXT,
other_driver_email TEXT,
other_driver_license TEXT,
other_license_plate TEXT,
other_point_of_impact TEXT  -- Should be TEXT[]
```

**Missing Columns** (need to be added):
- ❌ `other_driver_address`
- ❌ `other_vehicle_make`
- ❌ `other_vehicle_model`
- ❌ `other_vehicle_color`
- ❌ `other_insurance_company`
- ❌ `other_policy_number`
- ❌ `other_policy_holder`
- ❌ `other_policy_cover`
- ❌ `no_visible_damage`

**Current Status**: ⚠️ **Table exists but is NEVER used by backend**

---

## 2️⃣ Discrepancy Summary

### Field Name Mismatches

| Frontend Sends | Backend Expects | Database Column | Fix Required |
|----------------|-----------------|-----------------|--------------|
| `other_license_plate` | `other_vehicle_registration` | `other_vehicle_registration` | ✅ Backend needs to accept `other_license_plate` |
| `other_insurance_company` | `other_driver_insurance` | `other_driver_insurance` | ✅ Backend needs to accept `other_insurance_company` |

### Missing Backend Mappings

| Frontend Field | Mapped? | Database Column Exists? | Action Required |
|----------------|---------|-------------------------|-----------------|
| `other_driver_email` | ❌ NO | ❌ NO (incident_reports) | Add to backend + migration |
| `other_driver_license` | ❌ NO | ❌ NO (incident_reports) | Add to backend + migration |
| `other_policy_number` | ❌ NO | ❌ NO (both tables) | Add to backend + migration |
| `other_policy_holder` | ❌ NO | ❌ NO (both tables) | Add to backend + migration |
| `other_policy_cover` | ❌ NO | ❌ NO (both tables) | Add to backend + migration |
| `other_point_of_impact` | ❌ NO | ✅ YES (other_vehicles only) | Add to backend + incident_reports |
| `no_visible_damage` | ❌ NO | ❌ NO (both tables) | Add to backend + migration |

### Additional Vehicles Issue

**Problem**: Frontend can save multiple vehicles, but backend only processes first vehicle

**Example Scenario**:
```
User accident involving 3 vehicles:
- Vehicle 1 (User): Ford Focus (Page 5)
- Vehicle 2 (Other): BMW 3 Series ← Saved to incident_reports ✅
- Vehicle 3 (Other): Toyota Corolla ← LOST ❌
- Vehicle 4 (Other): Honda Civic ← LOST ❌
```

**Root Cause**:
1. Frontend stores vehicles 2+ in `sessionStorage.additional_vehicles` array
2. Backend `submitIncident()` function NEVER reads `additional_vehicles`
3. `incident_other_vehicles` table NEVER gets populated
4. Only first other vehicle saved to `incident_reports` table

**Impact**: 100% data loss for vehicles 2, 3, 4+

---

## 3️⃣ Data Flow Diagram

### Current (BROKEN) Flow

```
Frontend Page 7:
  User enters Vehicle 2 (BMW) details → sessionStorage.additional_vehicles[0]
  User clicks "Add Another Vehicle"
  User enters Vehicle 3 (Toyota) details → sessionStorage.additional_vehicles[1]
  User clicks "Next"

  → Sends formData.page7 = {
      other_vehicle_make: "BMW",  // Only first vehicle
      ...
    }

Backend Controller:
  Receives page7 object (first vehicle only)
  Maps to incident_reports table
  ❌ IGNORES sessionStorage.additional_vehicles
  ❌ NEVER touches incident_other_vehicles table

Result:
  ✅ Vehicle 2 (BMW) saved to incident_reports
  ❌ Vehicle 3 (Toyota) LOST FOREVER
```

### Correct Flow (What SHOULD Happen)

```
Frontend Page 7:
  Vehicle 1 (first other vehicle) → page7 object
  Vehicle 2+ → additional_vehicles array

Backend Controller:
  1. Save Vehicle 1 to incident_reports.other_vehicle_* columns ✅
  2. Loop through additional_vehicles array
  3. For each vehicle:
     - INSERT INTO incident_other_vehicles
     - SET incident_report_id = incident.id
     - SET vehicle_number = 2, 3, 4, etc.
     - SET all other_* columns
```

---

## 4️⃣ Required Fixes

### Fix 1: Update Backend Controller

**File**: `src/controllers/incidentForm.controller.js`

#### Part A: Fix Field Name Mappings (lines 343-351)

**Before**:
```javascript
// Page 7: Other Vehicle
other_vehicle_make: page7.other_vehicle_make || null,
other_vehicle_model: page7.other_vehicle_model || null,
other_vehicle_color: page7.other_vehicle_color || null,
other_vehicle_registration: page7.other_vehicle_registration || null,  // Wrong name

other_driver_name: page7.other_driver_name || null,
other_driver_phone: page7.other_driver_phone || null,
other_driver_address: page7.other_driver_address || null,
other_driver_insurance: page7.other_driver_insurance || null,  // Wrong name
```

**After**:
```javascript
// Page 7: First Other Vehicle (saved to incident_reports)
other_vehicle_make: page7.other_vehicle_make || null,
other_vehicle_model: page7.other_vehicle_model || null,
other_vehicle_color: page7.other_vehicle_color || null,
other_license_plate: page7.other_license_plate || null,  // Fixed name

other_driver_name: page7.other_driver_name || null,
other_driver_phone: page7.other_driver_phone || null,
other_driver_email: page7.other_driver_email || null,  // NEW
other_driver_address: page7.other_driver_address || null,
other_driver_license: page7.other_driver_license || null,  // NEW

other_insurance_company: page7.other_insurance_company || null,  // Fixed name
other_policy_number: page7.other_policy_number || null,  // NEW
other_policy_holder: page7.other_policy_holder || null,  // NEW
other_policy_cover: page7.other_policy_cover || null,  // NEW

other_point_of_impact: page7.other_point_of_impact || null,  // NEW
no_visible_damage: page7.no_visible_damage || false,  // NEW (boolean)
```

#### Part B: Add Additional Vehicles Handler (new function)

**Add after incident creation**:
```javascript
// After creating incident record...

// Handle additional vehicles (vehicles 2, 3, 4+)
if (formData.additional_vehicles && formData.additional_vehicles.length > 0) {
  logger.info('Saving additional vehicles', {
    incidentId: incident.id,
    count: formData.additional_vehicles.length
  });

  for (let i = 0; i < formData.additional_vehicles.length; i++) {
    const vehicle = formData.additional_vehicles[i];

    const { error: vehicleError } = await supabase
      .from('incident_other_vehicles')
      .insert({
        incident_report_id: incident.id,
        vehicle_number: vehicle.vehicle_number || (i + 2),  // Start from 2
        other_driver_name: vehicle.other_driver_name || null,
        other_driver_phone: vehicle.other_driver_phone || null,
        other_driver_email: vehicle.other_driver_email || null,
        other_driver_address: vehicle.other_driver_address || null,
        other_driver_license: vehicle.other_driver_license || null,
        other_license_plate: vehicle.other_license_plate || null,
        other_vehicle_make: vehicle.other_vehicle_make || null,
        other_vehicle_model: vehicle.other_vehicle_model || null,
        other_vehicle_color: vehicle.other_vehicle_color || null,
        other_insurance_company: vehicle.other_insurance_company || null,
        other_policy_number: vehicle.other_policy_number || null,
        other_policy_holder: vehicle.other_policy_holder || null,
        other_policy_cover: vehicle.other_policy_cover || null,
        other_point_of_impact: vehicle.other_point_of_impact || null,
        no_visible_damage: vehicle.no_visible_damage || false
      });

    if (vehicleError) {
      logger.error('Failed to save additional vehicle', {
        incidentId: incident.id,
        vehicleNumber: i + 2,
        error: vehicleError.message
      });
      // Don't fail entire submission - continue processing
    }
  }
}
```

---

### Fix 2: Database Migrations

#### Migration A: Add Missing Columns to `incident_reports`

**File**: `supabase/migrations/009_add_page7_fields_to_incident_reports.sql`

```sql
-- Add missing Page 7 fields to incident_reports table (for first other vehicle)
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS other_driver_email TEXT,
ADD COLUMN IF NOT EXISTS other_driver_license TEXT,
ADD COLUMN IF NOT EXISTS other_policy_number TEXT,
ADD COLUMN IF NOT EXISTS other_policy_holder TEXT,
ADD COLUMN IF NOT EXISTS other_policy_cover TEXT,
ADD COLUMN IF NOT EXISTS other_point_of_impact TEXT,  -- or TEXT[]
ADD COLUMN IF NOT EXISTS no_visible_damage BOOLEAN DEFAULT FALSE;

-- Rename other_vehicle_registration to other_license_plate (match frontend)
ALTER TABLE incident_reports
RENAME COLUMN other_vehicle_registration TO other_license_plate;

-- Rename other_driver_insurance to other_insurance_company (match frontend)
ALTER TABLE incident_reports
RENAME COLUMN other_driver_insurance TO other_insurance_company;
```

#### Migration B: Add Missing Columns to `incident_other_vehicles`

**File**: `supabase/migrations/010_add_page7_fields_to_other_vehicles.sql`

```sql
-- Add missing fields to incident_other_vehicles table (for vehicles 2, 3, 4+)
ALTER TABLE incident_other_vehicles
ADD COLUMN IF NOT EXISTS other_driver_address TEXT,
ADD COLUMN IF NOT EXISTS other_vehicle_make TEXT,
ADD COLUMN IF NOT EXISTS other_vehicle_model TEXT,
ADD COLUMN IF NOT EXISTS other_vehicle_color TEXT,
ADD COLUMN IF NOT EXISTS other_insurance_company TEXT,
ADD COLUMN IF NOT EXISTS other_policy_number TEXT,
ADD COLUMN IF NOT EXISTS other_policy_holder TEXT,
ADD COLUMN IF NOT EXISTS other_policy_cover TEXT,
ADD COLUMN IF NOT EXISTS no_visible_damage BOOLEAN DEFAULT FALSE;

-- Ensure point of impact is TEXT[] array (not TEXT)
ALTER TABLE incident_other_vehicles
ALTER COLUMN other_point_of_impact TYPE TEXT[] USING other_point_of_impact::TEXT[];
```

---

## 5️⃣ Testing Requirements

### Test 1: Single Other Vehicle
- Fill Page 7 with 1 other vehicle
- Submit form
- Verify all 14 fields saved to `incident_reports` table

### Test 2: Multiple Other Vehicles
- Fill Page 7 with 3 other vehicles (BMW, Toyota, Honda)
- Submit form
- Verify:
  - Vehicle 1 (BMW) saved to `incident_reports` ✅
  - Vehicle 2 (Toyota) saved to `incident_other_vehicles` ✅
  - Vehicle 3 (Honda) saved to `incident_other_vehicles` ✅

### Test 3: Field Name Mappings
- Verify `other_license_plate` (frontend) → `other_license_plate` (DB) ✅
- Verify `other_insurance_company` (frontend) → `other_insurance_company` (DB) ✅

---

## 6️⃣ Impact Assessment

### Before Fix
- **Single Vehicle**: 43% data loss (6 of 14 fields lost)
- **Multiple Vehicles**: 100% data loss for vehicles 2+ (entire records lost)
- **Field Mismatches**: 2 fields using wrong names

### After Fix
- **Single Vehicle**: 0% data loss (all 14 fields saved)
- **Multiple Vehicles**: 0% data loss (all vehicles saved correctly)
- **Field Mismatches**: 0 (all names consistent)

---

**Status**: 🔍 REVIEW COMPLETE - Ready for ITERATE phase
**Next Step**: Implement fixes (2 migrations + backend controller updates)
**Priority**: 🔴 CRITICAL - Multiple vehicles being completely lost

---

**Last Updated**: 2025-11-04
