# Complete Field List: Page 7 → Supabase

**File:** `public/incident-form-page7-other-vehicle.html`
**Page:** Other Driver & Vehicle Details (Page 7 of 10)
**Destination Tables:** `incident_reports` (main table) + `incident_other_vehicles` (future multi-vehicle support)
**Total Fields:** 24 (11 HTML inputs + 10 DVLA display fields + 3 system-generated)
**⚠️ CRITICAL ISSUE:** 37% data loss - 9 fields NOT mapped to database

---

## Overview

Page 7 collects information about the other driver and their vehicle involved in the incident. It features DVLA auto-lookup for vehicle details and automated validation warnings for expired MOT, Tax, or missing Insurance.

**Key Characteristics:**
- **Flexible Requirements:** Either driver name OR vehicle registration (not both required)
- **DVLA Integration:** Real-time vehicle lookup via `/api/dvla/lookup`
- **Validation Warnings:** Automated checks for MOT/Tax expiry
- **Multi-vehicle Support:** Can add multiple other vehicles via sessionStorage
- **Data stored in:** `incident_reports` table (single vehicle) + `sessionStorage` (multiple vehicles)

**⚠️ CRITICAL DATA LOSS ISSUE:**
This page has **37% unmapped fields** (9 out of 24 fields). Several new fields added in the custom form do NOT exist in the `incident_reports` table, which was designed for Typeform webhooks. Additionally, all DVLA lookup data (color, year, fuel type, MOT, Tax status) is NOT stored in the database.

---

## Field Mapping Success Rate

| Category | Field Count | Mapped | Unmapped | Success Rate |
|----------|-------------|--------|----------|--------------|
| **Driver Information** | 4 | 2 ⚠️ | 2 ❌ | 50% |
| **Vehicle Registration** | 1 | 1 ⚠️ | 0 | 100% |
| **DVLA Vehicle Details** | 2 | 2 ⚠️ | 0 | 100% |
| **DVLA Extended Data** | 8 | 0 | 8 ❌ | 0% |
| **Insurance Information** | 4 | 3 ⚠️ | 1 ❌ | 75% |
| **Damage Information** | 2 | 1 ⚠️ | 1 ❌ | 50% |
| **System Fields** | 3 | 1 ✅ | 2 ❌ | 33% |
| **TOTAL** | **24** | **10** | **14** | **42%** |

**⚠️ Partial Mapping (⚠️):** 9 fields have different names between frontend and database
**❌ Not Mapped:** 9 fields do not exist in database
**✅ Fully Mapped:** 1 field only

### Critical Finding: Field Name Mismatches

The frontend uses different field names than the database expects:

| Frontend Field Name | Database Column Name | Status |
|---------------------|----------------------|---------|
| `other_full_name` | `other_drivers_name` | ⚠️ Mismatch |
| `other_contact_number` | `other_drivers_number` | ⚠️ Mismatch |
| `other_vehicle_registration` | `vehicle_license_plate` | ⚠️ Mismatch |
| `describe_damage_to_vehicle` | `other_damage_accident` | ⚠️ Mismatch |
| `other_drivers_policy_holder_name` | `other_policy_holder` | ⚠️ Mismatch |
| `other_drivers_policy_cover_type` | `other_policy_cover` | ⚠️ Mismatch |

**Impact:** If data is submitted directly to backend without field name translation, these fields will NOT be stored correctly.

---

## Complete Field Inventory

### 1. Other Driver Information (4 fields - 50% success)

#### 1.1 Full Name ⚠️ PARTIAL MAPPING

**HTML:**
```html
<input
  type="text"
  id="other-full-name"
  name="other_full_name"
  placeholder="Enter full name if available"
>
```

**Frontend Field:** `other_full_name`
**Database Column:** `incident_reports.other_drivers_name` (TEXT)
**Required:** Conditional (OR with `other_vehicle_registration`)
**Validation:** Either name OR license plate must be provided
**Storage:** localStorage key `page7_data`, sessionStorage key `additional_vehicles`

**⚠️ Field Name Mismatch:**
- Frontend: `other_full_name`
- Database: `other_drivers_name`
- Typeform: `other_drivers_name`

**Location:** Lines 522-527

---

#### 1.2 Contact Number ⚠️ PARTIAL MAPPING

**HTML:**
```html
<input
  type="tel"
  id="other-contact-number"
  name="other_contact_number"
  placeholder="e.g., 07700 900000"
>
```

**Frontend Field:** `other_contact_number`
**Database Column:** `incident_reports.other_drivers_number` (TEXT)
**Required:** No
**Format:** UK phone number format

**⚠️ Field Name Mismatch:**
- Frontend: `other_contact_number`
- Database: `other_drivers_number`
- Typeform: `other_drivers_number`

**Location:** Lines 534-539

---

#### 1.3 Email Address ❌ NOT MAPPED

**HTML:**
```html
<input
  type="email"
  id="other-email-address"
  name="other_email_address"
  placeholder="email@example.com"
>
```

**Frontend Field:** `other_email_address`
**Database Column:** ❌ DOES NOT EXIST
**Required:** No
**Status:** **NEW FIELD - NOT IN DATABASE**

**⚠️ DATA LOSS:** This field is collected but has nowhere to be stored in `incident_reports` table. Typeform does NOT collect other driver email.

**Location:** Lines 546-550

---

#### 1.4 Driving License Number ❌ NOT MAPPED

**HTML:**
```html
<input
  type="text"
  id="other-driving-license-number"
  name="other_driving_license_number"
  placeholder="e.g., SMITH061102W97YT"
>
```

**Frontend Field:** `other_driving_license_number`
**Database Column:** ❌ DOES NOT EXIST
**Required:** No
**Format:** UK driving license format (16 characters)

**⚠️ DATA LOSS:** This field is collected but has nowhere to be stored in `incident_reports` table. Typeform does NOT collect other driver license number.

**Location:** Lines 558-562

---

### 2. Vehicle Registration (1 field - 100% success)

#### 2.1 Vehicle Registration ⚠️ PARTIAL MAPPING

**HTML:**
```html
<input
  type="text"
  id="other-vehicle-registration"
  name="other_vehicle_registration"
  placeholder="e.g., AB12CDE"
  style="flex: 1; text-transform: uppercase;"
>
```

**Frontend Field:** `other_vehicle_registration`
**Database Column:** `incident_reports.vehicle_license_plate` (TEXT)
**Required:** Conditional (OR with `other_full_name`)
**Format:** Uppercase, alphanumeric only (A-Z, 0-9)
**Validation:** Either name OR license plate must be provided

**⚠️ Field Name Mismatch:**
- Frontend: `other_vehicle_registration`
- Database: `vehicle_license_plate`
- Typeform: `vehicle_license_plate`

**Input Formatting (Lines 857-859):**
```javascript
document.getElementById('other-vehicle-registration').addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});
```

**Location:** Lines 583-590

---

### 3. DVLA Vehicle Lookup (10 fields - 20% success)

#### 3.1 DVLA Lookup Button

**HTML:**
```html
<button type="button" id="lookup-btn" class="lookup-btn">
  🔍 DVLA Lookup
</button>
```

**API Endpoint:** `GET /api/dvla/lookup?registration={licensePlate}`

**Lookup Logic (Lines 985-1062):**
```javascript
document.getElementById('lookup-btn').addEventListener('click', async () => {
  const lookupBtn = document.getElementById('lookup-btn');
  const licensePlate = document.getElementById('other-vehicle-registration').value.trim();

  if (!licensePlate) {
    // Show error
    return;
  }

  lookupBtn.disabled = true;
  lookupBtn.textContent = '🔄 Looking up...';

  try {
    // Call DVLA API endpoint
    const response = await fetch(`/api/dvla/lookup?registration=${licensePlate}`, {
      method: 'GET',
      credentials: 'include'
    });

    const data = await response.json();

    if (response.ok && data.success) {
      vehicleData = data.vehicle;

      // Display vehicle details
      document.getElementById('vehicle-details').style.display = 'block';
      document.getElementById('other-vehicle-look-up-make').textContent = vehicleData.make || '-';
      document.getElementById('other-vehicle-look-up-model').textContent = vehicleData.model || '-';
      document.getElementById('other-vehicle-look-up-colour').textContent = vehicleData.colour || '-';
      document.getElementById('other-vehicle-look-up-year').textContent = vehicleData.yearOfManufacture || '-';
      document.getElementById('other-vehicle-look-up-fuel-type').textContent = vehicleData.fuelType || '-';

      // Display MOT/Tax status with badges
      updateStatusBadge('other-vehicle-look-up-mot-status', vehicleData.motStatus);
      document.getElementById('other-vehicle-look-up-mot-expiry-date').textContent =
        vehicleData.motExpiryDate || '-';

      updateStatusBadge('other-vehicle-look-up-tax-status', vehicleData.taxStatus);
      document.getElementById('other-vehicle-look-up-tax-due-date').textContent =
        vehicleData.taxDueDate || '-';

      // Check for warnings (expired MOT, Tax, etc.)
      checkForWarnings(vehicleData);
      displayWarnings();

      autoSave();
      validateForm();
    } else {
      // Show error
      document.getElementById('lookup-error').style.display = 'block';
      document.getElementById('lookup-error-message').textContent =
        data.message || 'Vehicle not found. Please check the registration number.';
    }
  } catch (error) {
    console.error('DVLA lookup error:', error);
    // Show error message
  } finally {
    lookupBtn.disabled = false;
    lookupBtn.textContent = '🔍 DVLA Lookup';
  }
});
```

---

#### 3.2 Make ⚠️ PARTIAL MAPPING

**HTML:**
```html
<span id="other-vehicle-look-up-make">-</span>
```

**Frontend Field:** `other_vehicle_look_up_make` (display only)
**Database Column:** `incident_reports.other_make_of_vehicle` (TEXT)
**Source:** DVLA API `vehicle.make`
**Required:** No
**Default:** "-"

**⚠️ Display-Only Field:** Value is in `textContent`, not form input value. Must be extracted when submitting.

**Stored in sessionStorage (Lines 1302):**
```javascript
other_vehicle_look_up_make: document.getElementById('other-vehicle-look-up-make').textContent,
```

**Location:** Line 602

---

#### 3.3 Model ⚠️ PARTIAL MAPPING

**HTML:**
```html
<span id="other-vehicle-look-up-model">-</span>
```

**Frontend Field:** `other_vehicle_look_up_model` (display only)
**Database Column:** `incident_reports.other_model_of_vehicle` (TEXT)
**Source:** DVLA API `vehicle.model`
**Required:** No
**Default:** "-"

**⚠️ Display-Only Field:** Value is in `textContent`, not form input value. Must be extracted when submitting.

**Location:** Line 606

---

#### 3.4 Colour ❌ NOT MAPPED

**HTML:**
```html
<span id="other-vehicle-look-up-colour">-</span>
```

**Frontend Field:** `other_vehicle_look_up_colour` (display only)
**Database Column:** ❌ DOES NOT EXIST
**Source:** DVLA API `vehicle.colour`
**Required:** No
**Default:** "-"

**⚠️ DATA LOSS:** DVLA color data is displayed but NOT stored in database. `incident_reports` table has no column for other vehicle color.

**Location:** Line 610

---

#### 3.5 Year of Manufacture ❌ NOT MAPPED

**HTML:**
```html
<span id="other-vehicle-look-up-year">-</span>
```

**Frontend Field:** `other_vehicle_look_up_year` (display only)
**Database Column:** ❌ DOES NOT EXIST
**Source:** DVLA API `vehicle.yearOfManufacture`
**Required:** No
**Default:** "-"

**⚠️ DATA LOSS:** DVLA year data is displayed but NOT stored in database. `incident_reports` table has no column for other vehicle year.

**Location:** Line 614

---

#### 3.6 Fuel Type ❌ NOT MAPPED

**HTML:**
```html
<span id="other-vehicle-look-up-fuel-type">-</span>
```

**Frontend Field:** `other_vehicle_look_up_fuel_type` (display only)
**Database Column:** ❌ DOES NOT EXIST
**Source:** DVLA API `vehicle.fuelType`
**Required:** No
**Default:** "-"

**⚠️ DATA LOSS:** DVLA fuel type data is displayed but NOT stored in database. `incident_reports` table has no column for other vehicle fuel type.

**Location:** Line 618

---

#### 3.7 MOT Status ❌ NOT MAPPED

**HTML:**
```html
<span id="other-vehicle-look-up-mot-status" class="status-badge">-</span>
```

**Frontend Field:** `other_vehicle_look_up_mot_status` (display only)
**Database Column:** ❌ DOES NOT EXIST
**Source:** DVLA API `vehicle.motStatus`
**Required:** No
**Default:** "-"
**CSS Classes:** `.status-badge.valid` (green) or `.status-badge.expired` (red)

**⚠️ DATA LOSS:** MOT status is used for validation warnings but NOT stored in database.

**Validation Logic (Lines 922-929):**
```javascript
// Check MOT status
if (vehicle.motStatus && !vehicle.motStatus.toLowerCase().includes('valid')) {
  warnings.push({
    type: 'error',
    title: '⚠️ Invalid MOT',
    message: `MOT status is "${vehicle.motStatus}". The vehicle may not be roadworthy.`
  });
}
```

**Location:** Line 639

---

#### 3.8 MOT Expiry Date ❌ NOT MAPPED

**HTML:**
```html
<span id="other-vehicle-look-up-mot-expiry-date" class="detail-value">-</span>
```

**Frontend Field:** `other_vehicle_look_up_mot_expiry_date` (display only)
**Database Column:** ❌ DOES NOT EXIST
**Source:** DVLA API `vehicle.motExpiryDate`
**Required:** No
**Default:** "-"
**Format:** YYYY-MM-DD (date)

**⚠️ DATA LOSS:** MOT expiry date is used for validation warnings but NOT stored in database.

**Validation Logic (Lines 910-920):**
```javascript
// Check MOT expiry
if (vehicle.motExpiryDate) {
  const motExpiry = new Date(vehicle.motExpiryDate);
  if (motExpiry < today) {
    warnings.push({
      type: 'error',
      title: '⚠️ Expired MOT',
      message: `MOT expired on ${vehicle.motExpiryDate}. The other vehicle should not have been driven on public roads.`
    });
  }
}
```

**Location:** Line 643

---

#### 3.9 Tax Status ❌ NOT MAPPED

**HTML:**
```html
<span id="other-vehicle-look-up-tax-status" class="status-badge">-</span>
```

**Frontend Field:** `other_vehicle_look_up_tax_status` (display only)
**Database Column:** ❌ DOES NOT EXIST
**Source:** DVLA API `vehicle.taxStatus`
**Required:** No
**Default:** "-"
**CSS Classes:** `.status-badge.valid` (green) or `.status-badge.expired` (red)

**⚠️ DATA LOSS:** Tax status is used for validation warnings but NOT stored in database.

**Validation Logic (Lines 943-950):**
```javascript
// Check Tax status
if (vehicle.taxStatus && !vehicle.taxStatus.toLowerCase().includes('tax')) {
  warnings.push({
    type: 'error',
    title: '⚠️ Untaxed Vehicle',
    message: `Tax status is "${vehicle.taxStatus}". The vehicle may be untaxed.`
  });
}
```

**Location:** Line 647

---

#### 3.10 Tax Due Date ❌ NOT MAPPED

**HTML:**
```html
<span id="other-vehicle-look-up-tax-due-date" class="detail-value">-</span>
```

**Frontend Field:** `other_vehicle_look_up_tax_due_date` (display only)
**Database Column:** ❌ DOES NOT EXIST
**Source:** DVLA API `vehicle.taxDueDate`
**Required:** No
**Default:** "-"
**Format:** YYYY-MM-DD (date)

**⚠️ DATA LOSS:** Tax due date is used for validation warnings but NOT stored in database.

**Validation Logic (Lines 932-941):**
```javascript
// Check Tax expiry
if (vehicle.taxDueDate) {
  const taxDue = new Date(vehicle.taxDueDate);
  if (taxDue < today) {
    warnings.push({
      type: 'error',
      title: '⚠️ Expired Tax',
      message: `Tax expired on ${vehicle.taxDueDate}. The other vehicle should not have been driven on public roads.`
    });
  }
}
```

**Location:** Line 651

---

#### 3.11 Insurance Status ❌ NOT MAPPED

**HTML:**
```html
<span id="other-vehicle-look-up-insurance-status" class="status-badge">Not Available</span>
```

**Frontend Field:** `other_vehicle_look_up_insurance_status` (display only)
**Database Column:** ❌ DOES NOT EXIST
**Source:** Static text (DVLA API does not provide insurance data)
**Required:** No
**Default:** "Not Available"
**CSS Classes:** `.status-badge.beta` (purple)

**⚠️ Always Shows Warning:**
Insurance verification is not available via DVLA API. A warning is always added to the warnings array (Lines 952-957):

```javascript
// Insurance warning (always shown - cannot verify via API)
warnings.push({
  type: 'warning',
  title: 'ℹ️ Insurance Status Unknown',
  message: 'Insurance cannot be verified via DVLA API. Please obtain insurance details from the other driver.'
});
```

**Location:** Line 655

---

### 4. Insurance Information (4 fields - 75% success)

#### 4.1 Insurance Company ⚠️ PARTIAL MAPPING

**HTML:**
```html
<input
  type="text"
  id="other-drivers-insurance-company"
  name="other_drivers_insurance_company"
  placeholder="e.g., Aviva, Direct Line"
>
```

**Frontend Field:** `other_drivers_insurance_company`
**Database Column:** `incident_reports.other_insurance_company` (TEXT)
**Required:** No
**Status:** Maps correctly (same name as Typeform)

**Location:** Lines 687-691

---

#### 4.2 Policy Number ⚠️ PARTIAL MAPPING

**HTML:**
```html
<input
  type="text"
  id="other-drivers-policy-number"
  name="other_drivers_policy_number"
  placeholder="e.g., POL123456789"
>
```

**Frontend Field:** `other_drivers_policy_number`
**Database Column:** `incident_reports.other_policy_number` (TEXT)
**Required:** No
**Status:** Maps correctly (same name as Typeform)

**Location:** Lines 700-704

---

#### 4.3 Policy Holder Name ⚠️ PARTIAL MAPPING

**HTML:**
```html
<input
  type="text"
  id="other-drivers-policy-holder-name"
  name="other_drivers_policy_holder_name"
  placeholder="Enter policy holder name"
>
```

**Frontend Field:** `other_drivers_policy_holder_name`
**Database Column:** `incident_reports.other_policy_holder` (TEXT)
**Required:** No

**⚠️ Field Name Mismatch:**
- Frontend: `other_drivers_policy_holder_name`
- Database: `other_policy_holder`
- Typeform: `other_policy_holder`

**Location:** Lines 714-718

---

#### 4.4 Policy Cover Type ⚠️ PARTIAL MAPPING

**HTML:**
```html
<select id="other-drivers-policy-cover-type" name="other_drivers_policy_cover_type">
  <option value="">Select...</option>
  <option value="comprehensive">Comprehensive</option>
  <option value="third_party_fire_theft">Third Party, Fire & Theft</option>
  <option value="third_party">Third Party Only</option>
</select>
```

**Frontend Field:** `other_drivers_policy_cover_type`
**Database Column:** `incident_reports.other_policy_cover` (TEXT)
**Required:** No
**Options:**
- `comprehensive` - Full coverage
- `third_party_fire_theft` - Third Party, Fire & Theft
- `third_party` - Third Party Only

**⚠️ Field Name Mismatch:**
- Frontend: `other_drivers_policy_cover_type`
- Database: `other_policy_cover`
- Typeform: `other_policy_cover`

**Location:** Lines 727-747

---

### 5. Damage Information (2 fields - 50% success)

#### 5.1 No Visible Damage Checkbox ❌ NOT MAPPED

**HTML:**
```html
<input
  type="checkbox"
  id="no-visible-damage-checkbox"
  name="no_visible_damage"
  style="margin-right: 8px; width: 20px; height: 20px; vertical-align: middle;"
>
<label for="no-visible-damage-checkbox">No visible damage to other vehicle</label>
```

**Frontend Field:** `no_visible_damage`
**Database Column:** ❌ DOES NOT EXIST
**Required:** No
**Default:** `false` (unchecked)
**Type:** Boolean

**Behavior (Lines 886-903):**
When checked:
- Disables `describe_damage_to_vehicle` textarea
- Makes damage description optional
- Sets textarea opacity to 0.5
- Removes required asterisk

When unchecked:
- Enables textarea
- Makes damage description required (minimum 5 characters)
- Restores textarea opacity to 1
- Shows required asterisk

**⚠️ DATA LOSS:** This checkbox state is NOT stored in database. Typeform doesn't have this field.

**Location:** Line 746

---

#### 5.2 Damage Description ⚠️ PARTIAL MAPPING

**HTML:**
```html
<textarea
  id="describe-damage-to-vehicle"
  name="describe_damage_to_vehicle"
  rows="5"
  placeholder="Describe what you observed..."
  maxlength="1000"
  required
></textarea>
<div class="char-counter">
  <span id="damage-description-count">0</span> / 1000 characters (minimum 5)
</div>
```

**Frontend Field:** `describe_damage_to_vehicle`
**Database Column:** `incident_reports.other_damage_accident` (TEXT)
**Required:** Conditional (required if `no_visible_damage` unchecked)
**Minimum Length:** 5 characters
**Maximum Length:** 1000 characters
**Character Counter:** Real-time display with color coding

**⚠️ Field Name Mismatch:**
- Frontend: `describe_damage_to_vehicle`
- Database: `other_damage_accident`
- Typeform: `other_damage_accident`

**Character Counter Logic (Lines 862-878):**
```javascript
describeDamageToVehicle.addEventListener('input', () => {
  const length = describeDamageToVehicle.value.length;
  damageDescriptionCount.textContent = length;

  // Visual feedback at 70% and 90%
  if (length >= 900) {
    damageDescriptionCount.style.color = '#e53e3e'; // Red
    damageDescriptionCount.style.fontWeight = '700';
  } else if (length >= 700) {
    damageDescriptionCount.style.color = '#f59e0b'; // Orange
    damageDescriptionCount.style.fontWeight = '600';
  } else {
    damageDescriptionCount.style.color = '#666'; // Gray
    damageDescriptionCount.style.fontWeight = '400';
  }

  validateForm();
});
```

**Location:** Lines 757-767

---

### 6. System Fields (3 fields - 33% success)

#### 6.1 Vehicle Number ❌ NOT MAPPED

**Generated Field:** `vehicle_number`
**Database Column:** ❌ NOT STORED
**Type:** INTEGER
**Source:** JavaScript (Lines 1296)

**Purpose:** Track position in multi-vehicle sequence
- Vehicle 1 = User's vehicle
- Vehicle 2 = First other vehicle (Page 7)
- Vehicle 3+ = Additional vehicles (add more from Page 7)

**Generation Logic:**
```javascript
const currentVehicleData = {
  vehicle_number: additionalVehicles.length + 2, // Vehicle 1 is user, 2 is first other, 3+ are additional
  // ... other fields
};
```

**⚠️ DATA LOSS:** Vehicle numbering is NOT stored in `incident_reports`. This would be needed for the future `incident_other_vehicles` table to support multiple other vehicles.

---

#### 6.2 Saved At Timestamp ✅ MAPPED

**Generated Field:** `saved_at`
**Database Column:** `incident_reports.created_at` (TIMESTAMP WITH TIME ZONE)
**Type:** ISO 8601 timestamp
**Source:** JavaScript `new Date().toISOString()`

**Generation Logic (Line 1318):**
```javascript
saved_at: new Date().toISOString()
```

**✅ Successfully Maps:** This is the only field that maps cleanly to the database without translation.

---

#### 6.3 Warnings Array ❌ NOT MAPPED

**Generated Field:** `warnings`
**Database Column:** ❌ NOT STORED
**Type:** Array of objects
**Source:** JavaScript validation checks

**Purpose:** Display validation warnings for:
- Expired MOT
- Invalid MOT status
- Expired Tax
- Untaxed vehicle
- Insurance not verifiable

**Structure:**
```javascript
warnings = [
  {
    type: 'error' | 'warning',
    title: '⚠️ Expired MOT',
    message: 'MOT expired on 2024-01-15. The other vehicle should not have been driven on public roads.'
  }
]
```

**Display Logic (Lines 962-983):**
```javascript
function displayWarnings() {
  const container = document.getElementById('warnings-container');

  if (warnings.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.innerHTML = warnings.map(w => `
    <div class="alert alert-${w.type}">
      <span>${w.type === 'error' ? '⚠️' : 'ℹ️'}</span>
      <div>
        <strong>${w.title}</strong>
        <p style="margin-top: 4px;">${w.message}</p>
      </div>
    </div>
  `).join('');

  container.style.display = 'block';
}
```

**⚠️ DATA LOSS:** Warning information is NOT stored in database. This could be valuable for legal documentation showing the other vehicle was not roadworthy.

---

## Data Storage Architecture

### Primary Storage: sessionStorage

**Key:** `additional_vehicles`
**Type:** JSON Array
**Persistence:** Until browser tab closes

**Structure:**
```javascript
[
  {
    vehicle_number: 2,
    other_full_name: "John Smith",
    other_contact_number: "07700900000",
    other_email_address: "john@example.com",
    other_driving_license_number: "SMITH061102W97YT",
    other_vehicle_registration: "AB12CDE",
    other_vehicle_look_up_make: "FORD",
    other_vehicle_look_up_model: "FIESTA",
    other_vehicle_look_up_colour: "Blue",
    other_vehicle_look_up_year: "2018",
    other_vehicle_look_up_fuel_type: "Petrol",
    other_vehicle_look_up_mot_status: "Valid",
    other_vehicle_look_up_mot_expiry_date: "2025-12-15",
    other_vehicle_look_up_tax_status: "Taxed",
    other_vehicle_look_up_tax_due_date: "2026-01-01",
    other_vehicle_look_up_insurance_status: "Not Available",
    other_drivers_insurance_company: "Aviva",
    other_drivers_policy_number: "POL123456",
    other_drivers_policy_holder_name: "John Smith",
    other_drivers_policy_cover_type: "comprehensive",
    no_visible_damage: false,
    describe_damage_to_vehicle: "Front bumper dent, broken left headlight",
    saved_at: "2025-11-06T15:30:00.000Z"
  }
]
```

### Secondary Storage: localStorage

**Key:** `page7_data`
**Type:** JSON Object
**Persistence:** Until user clears browser data

**Purpose:** Auto-save current form state (for page refresh recovery)

**Structure:** Same as single vehicle object above, plus:
```javascript
{
  // ... all fields above
  vehicle_data: {
    make: "FORD",
    model: "FIESTA",
    colour: "Blue",
    yearOfManufacture: "2018",
    fuelType: "Petrol",
    motStatus: "Valid",
    motExpiryDate: "2025-12-15",
    taxStatus: "Taxed",
    taxDueDate: "2026-01-01"
  },
  warnings: [
    {
      type: "warning",
      title: "ℹ️ Insurance Status Unknown",
      message: "Insurance cannot be verified via DVLA API."
    }
  ]
}
```

---

## Validation Logic

### Form Validation (Lines 1069-1131)

**Requirements:**
1. **Either** driver name **OR** vehicle registration (not both required)
2. **Either** damage description (min 5 chars) **OR** "No visible damage" checkbox

**Validation Function:**
```javascript
function validateForm() {
  const driverName = document.getElementById('other-full-name').value.trim();
  const licensePlate = document.getElementById('other-vehicle-registration').value.trim();
  const damageDescription = describeDamageToVehicle.value.trim();
  const noDamageChecked = noDamageCheckbox.checked;

  // Check driver OR license plate
  const driverOrPlateProvided = driverName || licensePlate;

  // Check damage description OR no damage checkbox
  const damageRequirementMet =
    noDamageChecked ||
    (damageDescription.length >= 5);

  // Enable next button if both requirements met
  const isValid = driverOrPlateProvided && damageRequirementMet;

  nextBtn.disabled = !isValid;

  // Remove any existing feedback
  const existingFeedback = document.getElementById('validation-feedback');
  if (existingFeedback) {
    existingFeedback.remove();
  }

  // Show helpful feedback if invalid
  if (!isValid) {
    // ... display missing requirements
  }
}
```

**Auto-validation Triggers:**
- Input changes on any field
- Checkbox state changes
- DVLA lookup completion
- Page load (restore from localStorage)

---

## Multi-Vehicle Support

### Add Another Vehicle (Lines 1278-1365)

**Button:**
```html
<button type="button" class="btn" id="add-vehicle-btn">
  <span>➕</span>
  <span>Add Another Vehicle</span>
</button>
```

**Workflow:**
1. User fills out Page 7 for first other vehicle
2. Clicks "Add Another Vehicle" button
3. Current vehicle data saved to `sessionStorage.additional_vehicles` array
4. Form cleared for next vehicle
5. Confirmation message shown
6. User can add more vehicles (unlimited)
7. Click "Next" to proceed to Page 8

**Save Logic:**
```javascript
document.getElementById('add-vehicle-btn').addEventListener('click', () => {
  // Validate form first
  if (nextBtn.disabled) {
    alert('Please complete all required fields first');
    return;
  }

  autoSave();

  // Get existing additional vehicles from sessionStorage
  let additionalVehicles = [];
  const stored = sessionStorage.getItem('additional_vehicles');
  if (stored) {
    additionalVehicles = JSON.parse(stored);
  }

  // Add current vehicle data to array
  const currentVehicleData = {
    vehicle_number: additionalVehicles.length + 2,
    // ... all fields
    saved_at: new Date().toISOString()
  };

  additionalVehicles.push(currentVehicleData);
  sessionStorage.setItem('additional_vehicles', JSON.stringify(additionalVehicles));

  console.log(`✅ Vehicle ${currentVehicleData.vehicle_number} saved. Total vehicles: ${additionalVehicles.length + 1}`);

  // Show confirmation
  const confirmMsg = document.createElement('div');
  confirmMsg.innerHTML = `✓ Vehicle ${vehicleNum} saved! Now add vehicle ${vehicleNum + 1}`;
  document.body.appendChild(confirmMsg);

  // Clear form for next vehicle
  // ... reset all fields

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
```

---

## Navigation

### Back Button (Lines 1272-1275)

```javascript
document.getElementById('back-btn').addEventListener('click', () => {
  autoSave();
  window.location.href = '/incident-form-page6-vehicle-images.html';
});
```

**Destination:** Page 6 (Your Vehicle Images)

---

### Next Button (Lines 1252-1269)

**Triggers Advisory Modal** before proceeding to Page 8.

```javascript
document.getElementById('next-btn').addEventListener('click', () => {
  autoSave();
  advisoryModal.style.display = 'block';
});
```

**Advisory Modal Content:**
- Reminder about missing insurance details (check askMID.com)
- Option to photograph other vehicle documents
- Buttons: "Go Back" or "Continue to Next Page"

---

### Modal Continue Button (Lines 1265-1269)

```javascript
modalContinueBtn.addEventListener('click', () => {
  advisoryModal.style.display = 'none';
  autoSave();
  window.location.href = '/incident-form-page8-other-damage-images.html';
});
```

**Destination:** Page 8 (Other Damage Images)

---

## Critical Issues & Recommendations

### 🚨 Issue 1: Field Name Mismatches (37% of fields)

**Problem:** Frontend uses different names than database expects.

**Affected Fields:**
- `other_full_name` → `other_drivers_name`
- `other_contact_number` → `other_drivers_number`
- `other_vehicle_registration` → `vehicle_license_plate`
- `other_drivers_policy_holder_name` → `other_policy_holder`
- `other_drivers_policy_cover_type` → `other_policy_cover`
- `describe_damage_to_vehicle` → `other_damage_accident`

**Impact:** If form data is submitted directly to backend without field name translation, these fields will be **silently ignored** or stored in wrong columns.

**Solution Options:**

**Option A: Frontend Translation (Quick Fix)**
```javascript
// Before submitting to backend
function translateFieldNames(frontendData) {
  return {
    other_drivers_name: frontendData.other_full_name,
    other_drivers_number: frontendData.other_contact_number,
    vehicle_license_plate: frontendData.other_vehicle_registration,
    other_policy_holder: frontendData.other_drivers_policy_holder_name,
    other_policy_cover: frontendData.other_drivers_policy_cover_type,
    other_damage_accident: frontendData.describe_damage_to_vehicle,
    // ... other fields remain the same
  };
}
```

**Option B: Backend Flexible Mapping (Recommended)**
```javascript
// Backend controller accepts both old and new names
function mapOtherVehicleData(req) {
  return {
    other_drivers_name: req.body.other_full_name || req.body.other_drivers_name,
    other_drivers_number: req.body.other_contact_number || req.body.other_drivers_number,
    vehicle_license_plate: req.body.other_vehicle_registration || req.body.vehicle_license_plate,
    // ... handle all name variants
  };
}
```

**Option C: Database Migration (Long-term)**
```sql
-- Add new columns to match frontend names
ALTER TABLE incident_reports ADD COLUMN other_full_name TEXT;
ALTER TABLE incident_reports ADD COLUMN other_contact_number TEXT;
ALTER TABLE incident_reports ADD COLUMN other_vehicle_registration TEXT;
-- ... etc

-- Copy data from old columns
UPDATE incident_reports SET
  other_full_name = other_drivers_name,
  other_contact_number = other_drivers_number,
  other_vehicle_registration = vehicle_license_plate;

-- Optionally drop old columns after migration
```

---

### 🚨 Issue 2: New Fields Not in Database (37% data loss)

**Problem:** 9 fields are collected but have no database columns.

**Missing Database Columns:**
1. `other_email_address` - Other driver email
2. `other_driving_license_number` - Other driver license
3. `other_vehicle_look_up_colour` - DVLA color
4. `other_vehicle_look_up_year` - DVLA year
5. `other_vehicle_look_up_fuel_type` - DVLA fuel type
6. `other_vehicle_look_up_mot_status` - MOT status
7. `other_vehicle_look_up_mot_expiry_date` - MOT expiry
8. `other_vehicle_look_up_tax_status` - Tax status
9. `other_vehicle_look_up_tax_due_date` - Tax due date
10. `no_visible_damage` - Damage checkbox
11. `warnings` - Validation warnings array

**Impact:** **37% of collected data is lost** when submitting to database.

**Solution:** Add missing columns to `incident_reports` table:

```sql
-- Add new other driver fields
ALTER TABLE incident_reports
  ADD COLUMN other_email_address TEXT,
  ADD COLUMN other_driving_license_number TEXT;

-- Add DVLA extended data
ALTER TABLE incident_reports
  ADD COLUMN other_vehicle_colour TEXT,
  ADD COLUMN other_vehicle_year TEXT,
  ADD COLUMN other_vehicle_fuel_type TEXT,
  ADD COLUMN other_vehicle_mot_status TEXT,
  ADD COLUMN other_vehicle_mot_expiry_date DATE,
  ADD COLUMN other_vehicle_tax_status TEXT,
  ADD COLUMN other_vehicle_tax_due_date DATE;

-- Add damage checkbox
ALTER TABLE incident_reports
  ADD COLUMN no_visible_damage BOOLEAN DEFAULT false;

-- Add validation warnings (JSONB for array storage)
ALTER TABLE incident_reports
  ADD COLUMN other_vehicle_warnings JSONB;
```

**Note:** Warnings should be stored as JSONB for legal documentation purposes. They provide evidence that the other vehicle was potentially unroadworthy at the time of the incident.

---

### 🚨 Issue 3: Multi-Vehicle Not Supported in incident_reports

**Problem:** Current schema only supports ONE other vehicle per incident.

**Current Storage:** `sessionStorage.additional_vehicles` array (lost after tab close)

**Database Schema:** `incident_reports` table has single-vehicle columns only:
- `other_drivers_name` (single value)
- `vehicle_license_plate` (single value)
- etc.

**Impact:** If incident involves 3+ vehicles (user + 2+ others), additional vehicle data is **permanently lost** after form submission.

**Solution:** Implement `incident_other_vehicles` table (already exists in schema):

**Table Structure (from `/scripts/create-incident-other-vehicles-table.sql`):**
```sql
CREATE TABLE incident_other_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incident_reports(id),
  create_user_id UUID NOT NULL REFERENCES user_signup(create_user_id),

  -- Driver information
  driver_name TEXT,
  driver_phone TEXT,
  driver_address TEXT,
  driver_email TEXT, -- NEW
  driver_license_number TEXT, -- NEW

  -- Vehicle information
  vehicle_license_plate TEXT NOT NULL,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_color TEXT,
  vehicle_year_of_manufacture TEXT,
  vehicle_fuel_type TEXT, -- NEW

  -- MOT/Tax (NEW)
  mot_status TEXT,
  mot_expiry_date DATE,
  tax_status TEXT,
  tax_due_date DATE,

  -- Insurance information
  insurance_company TEXT,
  policy_number TEXT,
  policy_cover TEXT,
  policy_holder TEXT,

  -- Damage information
  damage_description TEXT,
  no_visible_damage BOOLEAN DEFAULT false, -- NEW

  -- Validation warnings (NEW)
  warnings JSONB,

  -- DVLA lookup metadata
  dvla_lookup_successful BOOLEAN DEFAULT false,
  dvla_lookup_timestamp TIMESTAMP WITH TIME ZONE,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  gdpr_consent BOOLEAN DEFAULT false
);
```

**Migration Strategy:**

**Step 1:** Create submission endpoint
```javascript
// POST /api/incident-reports/:incidentId/other-vehicles
async function submitOtherVehicles(req, res) {
  const { incidentId } = req.params;
  const vehicles = req.body.additional_vehicles; // From sessionStorage

  for (const vehicle of vehicles) {
    await supabase.from('incident_other_vehicles').insert({
      incident_id: incidentId,
      create_user_id: req.user.id,
      driver_name: vehicle.other_full_name,
      driver_phone: vehicle.other_contact_number,
      driver_email: vehicle.other_email_address,
      driver_license_number: vehicle.other_driving_license_number,
      vehicle_license_plate: vehicle.other_vehicle_registration,
      vehicle_make: vehicle.other_vehicle_look_up_make,
      vehicle_model: vehicle.other_vehicle_look_up_model,
      vehicle_color: vehicle.other_vehicle_look_up_colour,
      vehicle_year_of_manufacture: vehicle.other_vehicle_look_up_year,
      vehicle_fuel_type: vehicle.other_vehicle_look_up_fuel_type,
      mot_status: vehicle.other_vehicle_look_up_mot_status,
      mot_expiry_date: vehicle.other_vehicle_look_up_mot_expiry_date,
      tax_status: vehicle.other_vehicle_look_up_tax_status,
      tax_due_date: vehicle.other_vehicle_look_up_tax_due_date,
      insurance_company: vehicle.other_drivers_insurance_company,
      policy_number: vehicle.other_drivers_policy_number,
      policy_holder: vehicle.other_drivers_policy_holder_name,
      policy_cover: vehicle.other_drivers_policy_cover_type,
      damage_description: vehicle.describe_damage_to_vehicle,
      no_visible_damage: vehicle.no_visible_damage,
      warnings: JSON.stringify(vehicle.warnings),
      dvla_lookup_successful: vehicle.other_vehicle_look_up_make !== '-',
      dvla_lookup_timestamp: new Date().toISOString(),
      gdpr_consent: true
    });
  }
}
```

**Step 2:** Update Page 12 final submission
```javascript
// In transcription-status.html or final submission page
const additionalVehicles = JSON.parse(sessionStorage.getItem('additional_vehicles') || '[]');

if (additionalVehicles.length > 0) {
  await fetch(`/api/incident-reports/${incidentId}/other-vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ additional_vehicles: additionalVehicles }),
    credentials: 'include'
  });
}
```

---

### 🚨 Issue 4: Display-Only Fields Not Extracted

**Problem:** DVLA lookup fields use `textContent` instead of form values.

**Affected Fields:**
- `other_vehicle_look_up_make`
- `other_vehicle_look_up_model`
- `other_vehicle_look_up_colour`
- `other_vehicle_look_up_year`
- `other_vehicle_look_up_fuel_type`
- `other_vehicle_look_up_mot_status`
- `other_vehicle_look_up_mot_expiry_date`
- `other_vehicle_look_up_tax_status`
- `other_vehicle_look_up_tax_due_date`

**Current Implementation (Lines 1302-1310):**
```javascript
const currentVehicleData = {
  other_vehicle_look_up_make: document.getElementById('other-vehicle-look-up-make').textContent,
  other_vehicle_look_up_model: document.getElementById('other-vehicle-look-up-model').textContent,
  // ... textContent extraction
};
```

**Issue:** Standard form serialization (`new FormData()`) will **NOT capture** these values because they're not in form inputs.

**Impact:** If using standard form submission, all DVLA data is lost.

**Solution:** Always extract via `textContent` or store in hidden inputs:

**Option A: Continue with textContent extraction (current approach)**
```javascript
// Keep manual extraction in sessionStorage save
```

**Option B: Add hidden inputs (for standard form submission)**
```html
<input type="hidden" name="other_vehicle_make" id="hidden-make">
<input type="hidden" name="other_vehicle_model" id="hidden-model">
<!-- ... -->

<script>
// Update hidden inputs when DVLA lookup succeeds
vehicleData = data.vehicle;
document.getElementById('hidden-make').value = vehicleData.make || '';
document.getElementById('hidden-model').value = vehicleData.model || '';
</script>
```

---

## Testing Checklist

### Basic Functionality
- [ ] Page loads without errors
- [ ] All form fields render correctly
- [ ] Progress bar shows 70% (Page 7 of 10)
- [ ] Auto-save to localStorage works every 5 seconds
- [ ] Data persists on page refresh

### DVLA Lookup
- [ ] License plate input formats to uppercase
- [ ] Non-alphanumeric characters are stripped
- [ ] DVLA lookup button triggers API call
- [ ] Loading state shows "🔄 Looking up..."
- [ ] Success displays vehicle details section
- [ ] Make, Model, Colour, Year, Fuel Type populate
- [ ] MOT Status badge shows correct color (green/red)
- [ ] MOT Expiry Date displays in DD/MM/YYYY format
- [ ] Tax Status badge shows correct color (green/red)
- [ ] Tax Due Date displays in DD/MM/YYYY format
- [ ] Insurance Status always shows "Not Available"
- [ ] Error state displays message on lookup failure
- [ ] Lookup data stored in localStorage

### Validation Warnings
- [ ] Expired MOT triggers error warning
- [ ] Invalid MOT status triggers error warning
- [ ] Expired Tax triggers error warning
- [ ] Untaxed vehicle triggers error warning
- [ ] Insurance warning always displayed
- [ ] Warning badges show correct colors (red/purple)
- [ ] Warnings persist on page refresh

### Form Validation
- [ ] Next button disabled on page load
- [ ] Validation feedback shows missing requirements
- [ ] Either name OR license plate enables validation
- [ ] Damage description requires minimum 5 characters
- [ ] No damage checkbox disables damage textarea
- [ ] No damage checkbox removes required asterisk
- [ ] No damage checkbox OR damage description enables next
- [ ] Character counter updates in real-time
- [ ] Counter turns orange at 700 chars (70%)
- [ ] Counter turns red at 900 chars (90%)
- [ ] Next button enables when requirements met

### Multi-Vehicle Support
- [ ] "Add Another Vehicle" button visible
- [ ] Button disabled if form invalid
- [ ] Button saves current vehicle to sessionStorage
- [ ] Confirmation message shows vehicle number saved
- [ ] Form clears after save
- [ ] Can add unlimited vehicles
- [ ] Vehicle counter increments correctly (2, 3, 4...)
- [ ] All vehicles stored in `additional_vehicles` array

### Navigation
- [ ] Back button returns to Page 6
- [ ] Back button saves data before navigation
- [ ] Next button triggers advisory modal
- [ ] Modal shows insurance reminder
- [ ] Modal "Go Back" closes modal
- [ ] Modal "Continue" proceeds to Page 8
- [ ] Navigation preserves form data

### Data Persistence
- [ ] localStorage saves on input change
- [ ] localStorage saves on checkbox change
- [ ] localStorage saves on DVLA lookup
- [ ] sessionStorage saves when adding vehicle
- [ ] Saved data restores on page load
- [ ] DVLA data restores correctly
- [ ] Warnings array restores correctly
- [ ] Checkbox state restores correctly

### Field Name Translation (CRITICAL)
- [ ] `other_full_name` → `other_drivers_name`
- [ ] `other_contact_number` → `other_drivers_number`
- [ ] `other_vehicle_registration` → `vehicle_license_plate`
- [ ] `other_drivers_policy_holder_name` → `other_policy_holder`
- [ ] `other_drivers_policy_cover_type` → `other_policy_cover`
- [ ] `describe_damage_to_vehicle` → `other_damage_accident`

### Backend Submission (if implemented)
- [ ] POST endpoint receives correct field names
- [ ] All fields map to correct database columns
- [ ] DVLA data saved (if columns exist)
- [ ] Warnings array saved (if JSONB column exists)
- [ ] Multi-vehicle array submitted
- [ ] `incident_other_vehicles` records created

---

## Summary

**Total Fields:** 24
**Successfully Mapped:** 10 fields (42%)
**Partially Mapped (name mismatch):** 9 fields (37%)
**Not Mapped (missing columns):** 9 fields (37%)

### Critical Issues:
1. **Field Name Mismatches** - 37% of fields use different names than database
2. **Missing Database Columns** - 37% of fields have no storage destination
3. **Multi-Vehicle Not Supported** - Additional vehicles lost after submission
4. **Display-Only Fields** - DVLA data requires manual extraction

### Recommendations:
1. **Immediate:** Implement field name translation in submission handler
2. **Short-term:** Add missing columns to `incident_reports` table
3. **Long-term:** Migrate to `incident_other_vehicles` table for multi-vehicle support
4. **Critical:** Store DVLA MOT/Tax data and warnings for legal documentation

### Architecture Notes:
- Page uses **sessionStorage** for multi-vehicle support (temporary)
- Page uses **localStorage** for auto-save (persistent)
- DVLA lookup is **optional but recommended**
- Validation uses **flexible OR logic** (name OR plate, damage OR checkbox)
- Navigation includes **advisory modal** before Page 8

---

**Documentation Complete:** 2025-11-06
**Page Status:** Working but with 37% data loss
**Next Steps:** Implement field translation and database migrations

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
