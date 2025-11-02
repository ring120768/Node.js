# Post-Migration Implementation Checklist

**Migration**: 001_add_new_pdf_fields
**Date**: 2025-11-02
**Status**: 🟡 Database schema updated, application code pending

---

## Overview

After successfully running the database migration, you need to update the application code to utilize the new fields. This checklist guides you through all required changes.

---

## Phase 1: PDF Service Updates

### 1.1 Update PDF Field Mapping

**File**: `src/services/pdfService.js` (or wherever Adobe PDF filling logic lives)

**Task**: Map 207 PDF fields to database columns

**Reference**:
- Use `MASTER_PDF_FIELD_LIST_207_FIELDS.csv` for complete mappings
- Use `COMPREHENSIVE_PDF_FIELD_MAPPING.md` for detailed field info

**Example additions**:

```javascript
// Medical fields (5 new)
'ambulance_callled': data.ambulance_called ? 'Yes' : '',  // Note: PDF has typo "callled"
'hospital_or_medical_center': data.hospital_name || '',
'severity_of_injuries': data.injury_severity || '',
'treatment_recieved': data.treatment_received || '',      // Note: PDF has typo "recieved"
'further_medical_attention': data.medical_follow_up_needed || '',

// DVLA fields (10 new for your vehicle)
'uk_licence_plate_look_up': data.dvla_lookup_reg || '',
'vehicle_found_make': data.dvla_vehicle_make || '',
'vehicle_found_model': data.dvla_vehicle_model || '',
'vehicle_found_color': data.dvla_vehicle_color || '',
'vehicle_found_year': data.dvla_vehicle_year || '',
'vehicle_found_fuel_type': data.dvla_vehicle_fuel_type || '',
'vehicle_found_mot': data.dvla_mot_status || '',
'vehicle_found_mot_expiry': data.dvla_mot_expiry_date ? formatDate(data.dvla_mot_expiry_date) : '',
'vehicle_found_road_tax': data.dvla_tax_status || '',
'vehicle_found_road_tax_due_date': data.dvla_tax_due_date ? formatDate(data.dvla_tax_due_date) : '',

// Weather checkboxes (7 new)
'weather_drizzle': data.weather_drizzle || false,
'weather_raining': data.weather_raining || false,
'weather-hail': data.weather_hail || false,                // Note: PDF uses hyphen
'weather_windy': data.weather_windy || false,
'weather_thunder_lightening': data.weather_thunder || false, // Note: PDF says "lightening"
'weather_slush_road': data.weather_slush_road || false,
'weather_loose_surface_road': data.weather_loose_surface || false,

// Traffic conditions (4 new)
'traffic_conditions_heavy': data.traffic_heavy || false,
'traffic_conditions_moderate': data.traffic_moderate || false,
'traffic_conditions_light': data.traffic_light || false,
'traffic_conditions_no_traffic': data.traffic_none || false,

// Road markings (3 new)
'road_markings_yes': data.road_markings_yes || false,
'road_markings_partial': data.road_markings_partial || false,
'road_markings_no': data.road_markings_no || false,

// Visibility (3 new)
'visabilty_good': data.visibility_good || false,          // Note: PDF has typo "visabilty"
'visability_poor': data.visibility_poor || false,          // Note: PDF has typo "visability"
'visability_very_poor': data.visibility_very_poor || false, // Note: PDF has typo "visability"

// Other vehicle DVLA fields (9 new)
'other_car_mot_status': otherVehicleData.dvla_mot_status || '',
'other_car_mot_expiry': otherVehicleData.dvla_mot_expiry_date ? formatDate(otherVehicleData.dvla_mot_expiry_date) : '',
'other_car_tax_status': otherVehicleData.dvla_tax_status || '',
'other_car_tax_due_date': otherVehicleData.dvla_tax_due_date ? formatDate(otherVehicleData.dvla_tax_due_date) : '',
'other_car_insurance_status': otherVehicleData.dvla_insurance_status || '',
'other_driver_vehicle_marked_for_export': otherVehicleData.dvla_export_marker ? 'Yes' : 'No',
'other_car_insurance_company': otherVehicleData.insurance_company || '',
'other_car_colour_policy number': otherVehicleData.insurance_policy_number || '',
'other_car_colour_policy holder': otherVehicleData.insurance_policy_holder || '',

// Witness 2 fields (4 new)
'witness_name_2': witnessData.witness_2_name || '',
'witness_mobile_number_2': witnessData.witness_2_mobile || '',
'witness_email_address_2': witnessData.witness_2_email || '',
'witness_statement_2': witnessData.witness_2_statement || '',
```

**Status**: ☐ Not started

---

### 1.2 Update Data Fetching

**File**: `lib/data/dataFetcher.js` or similar

**Task**: Include new columns in SELECT queries

**Example**:

```javascript
// Fetch incident report with new fields
const { data, error } = await supabase
  .from('incident_reports')
  .select(`
    *,
    ambulance_called,
    hospital_name,
    injury_severity,
    treatment_received,
    medical_follow_up_needed,
    dvla_lookup_reg,
    dvla_vehicle_make,
    dvla_vehicle_model,
    dvla_vehicle_color,
    dvla_vehicle_year,
    dvla_vehicle_fuel_type,
    dvla_mot_status,
    dvla_mot_expiry_date,
    dvla_tax_status,
    dvla_tax_due_date,
    weather_drizzle,
    weather_raining,
    weather_hail,
    weather_windy,
    weather_thunder,
    weather_slush_road,
    weather_loose_surface,
    traffic_heavy,
    traffic_moderate,
    traffic_light,
    traffic_none,
    road_markings_yes,
    road_markings_partial,
    road_markings_no,
    visibility_good,
    visibility_poor,
    visibility_very_poor
  `)
  .eq('create_user_id', userId)
  .single();
```

**Status**: ☐ Not started

---

## Phase 2: Backend Controllers

### 2.1 Incident Report Controller

**File**: `src/controllers/incidentReportController.js`

**Task**: Accept and save new fields from frontend

**Example**:

```javascript
// Extract new fields from request body
const {
  // Medical
  ambulance_called,
  hospital_name,
  injury_severity,
  treatment_received,
  medical_follow_up_needed,

  // DVLA
  dvla_lookup_reg,
  dvla_vehicle_make,
  dvla_vehicle_model,
  // ... etc

  // Weather
  weather_drizzle,
  weather_raining,
  // ... etc

  // Traffic
  traffic_heavy,
  traffic_moderate,
  traffic_light,
  traffic_none,

  // Road markings
  road_markings_yes,
  road_markings_partial,
  road_markings_no,

  // Visibility
  visibility_good,
  visibility_poor,
  visibility_very_poor

} = req.body;

// Insert/update with new fields
const { data, error } = await supabase
  .from('incident_reports')
  .upsert({
    create_user_id: userId,
    ambulance_called,
    hospital_name,
    injury_severity,
    treatment_received,
    medical_follow_up_needed,
    dvla_lookup_reg,
    dvla_vehicle_make,
    // ... all new fields
  });
```

**Status**: ☐ Not started

---

### 2.2 Other Vehicles Controller

**File**: `src/controllers/otherVehiclesController.js` (or similar)

**Task**: Handle DVLA and insurance fields for other vehicles

**New fields to handle**:
- dvla_mot_status
- dvla_mot_expiry_date
- dvla_tax_status
- dvla_tax_due_date
- dvla_insurance_status
- dvla_export_marker
- insurance_company
- insurance_policy_number
- insurance_policy_holder

**Status**: ☐ Not started

---

### 2.3 Witnesses Controller

**File**: `src/controllers/witnessesController.js` (or similar)

**Task**: Handle witness 2 fields

**New fields to handle**:
- witness_2_name
- witness_2_mobile
- witness_2_email
- witness_2_statement

**Status**: ☐ Not started

---

## Phase 3: DVLA Integration (New Service)

### 3.1 Create DVLA Service

**File**: `src/services/dvlaService.js` (NEW FILE)

**Task**: Create service to lookup UK vehicle data

**Required functionality**:

```javascript
class DVLAService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1';
  }

  async lookupVehicle(registrationNumber) {
    // Call DVLA API
    // Return: make, model, color, year, fuel, MOT status/expiry, tax status/due
  }

  async checkMOTStatus(registrationNumber) {
    // Call MOT history API
  }

  async checkInsuranceStatus(registrationNumber) {
    // Call MIB (Motor Insurers' Bureau) API
  }
}

module.exports = new DVLAService(process.env.DVLA_API_KEY);
```

**API Documentation**: https://developer-portal.driver-vehicle-licensing.api.gov.uk/

**Environment variables needed**:
- `DVLA_API_KEY` (apply at gov.uk)

**Status**: ☐ Not started

---

### 3.2 Create DVLA API Endpoint

**File**: `src/routes/dvlaRoutes.js` (NEW FILE)

**Task**: Create REST endpoint for DVLA lookups

**Endpoints**:

```javascript
// POST /api/dvla/lookup
// Body: { registrationNumber: "AB12 CDE" }
// Returns: { make, model, color, year, fuel, mot, tax }

router.post('/lookup', requireAuth, async (req, res) => {
  const { registrationNumber } = req.body;

  // Validate UK reg format
  if (!isValidUKReg(registrationNumber)) {
    return res.status(400).json({ error: 'Invalid UK registration' });
  }

  // Call DVLA service
  const vehicleData = await dvlaService.lookupVehicle(registrationNumber);

  res.json({ success: true, data: vehicleData });
});
```

**Status**: ☐ Not started

---

## Phase 4: Frontend Updates

### 4.1 Medical Information Page

**File**: `public/incident-form-page2.html` (or wherever medical info is)

**Task**: Add new medical fields to form

**New inputs**:

```html
<!-- Ambulance called -->
<label>
  <input type="checkbox" name="ambulance_called" id="ambulance_called">
  Was an ambulance called?
</label>

<!-- Hospital name -->
<label for="hospital_name">Hospital or Medical Center Name:</label>
<input type="text" name="hospital_name" id="hospital_name">

<!-- Injury severity -->
<label for="injury_severity">Severity of Injuries:</label>
<select name="injury_severity" id="injury_severity">
  <option value="">Select...</option>
  <option value="Minor">Minor</option>
  <option value="Moderate">Moderate</option>
  <option value="Severe">Severe</option>
  <option value="Life-threatening">Life-threatening</option>
</select>

<!-- Treatment received -->
<label for="treatment_received">Treatment Received:</label>
<textarea name="treatment_received" id="treatment_received" rows="3"></textarea>

<!-- Follow-up needed -->
<label for="medical_follow_up_needed">Further Medical Attention Needed:</label>
<textarea name="medical_follow_up_needed" id="medical_follow_up_needed" rows="2"></textarea>
```

**Status**: ☐ Not started

---

### 4.2 Accident Conditions Page

**File**: `public/incident-form-page4.html` (or wherever weather/traffic is)

**Task**: Add weather, traffic, road markings, and visibility fields

**New checkboxes**:

```html
<!-- Weather conditions (7 new) -->
<fieldset>
  <legend>Weather Conditions</legend>
  <!-- Existing: overcast, clear_and_dry, bright_daylight, heavy_rain, fog, snow, thunder, ice, street_lights -->

  <!-- NEW -->
  <label><input type="checkbox" name="weather_drizzle"> Drizzle</label>
  <label><input type="checkbox" name="weather_raining"> Raining</label>
  <label><input type="checkbox" name="weather_hail"> Hail</label>
  <label><input type="checkbox" name="weather_windy"> Windy</label>
  <label><input type="checkbox" name="weather_thunder"> Thunder & Lightning</label>
  <label><input type="checkbox" name="weather_slush_road"> Slush on Road</label>
  <label><input type="checkbox" name="weather_loose_surface"> Loose Surface</label>
</fieldset>

<!-- Traffic conditions (4 new - radio buttons for mutual exclusivity) -->
<fieldset>
  <legend>Traffic Conditions</legend>
  <label><input type="radio" name="traffic" value="heavy"> Heavy</label>
  <label><input type="radio" name="traffic" value="moderate"> Moderate</label>
  <label><input type="radio" name="traffic" value="light"> Light</label>
  <label><input type="radio" name="traffic" value="none"> No Traffic</label>
</fieldset>

<!-- Road markings (3 new - radio buttons) -->
<fieldset>
  <legend>Road Markings</legend>
  <label><input type="radio" name="road_markings" value="yes"> Yes - Clear</label>
  <label><input type="radio" name="road_markings" value="partial"> Partial - Worn</label>
  <label><input type="radio" name="road_markings" value="no"> No Markings</label>
</fieldset>

<!-- Visibility (3 new - radio buttons) -->
<fieldset>
  <legend>Visibility</legend>
  <label><input type="radio" name="visibility" value="good"> Good</label>
  <label><input type="radio" name="visibility" value="poor"> Poor</label>
  <label><input type="radio" name="visibility" value="very_poor"> Very Poor</label>
</fieldset>
```

**JavaScript**:

```javascript
// Convert radio buttons to boolean fields before submitting
function convertRadioToBoolean(formData) {
  const traffic = formData.get('traffic');
  formData.delete('traffic');
  formData.set('traffic_heavy', traffic === 'heavy');
  formData.set('traffic_moderate', traffic === 'moderate');
  formData.set('traffic_light', traffic === 'light');
  formData.set('traffic_none', traffic === 'none');

  // Same for road_markings and visibility
  // ...
}
```

**Status**: ☐ Not started

---

### 4.3 Your Vehicle Page (DVLA Lookup)

**File**: `public/incident-form-page7.html` (or wherever user's vehicle info is)

**Task**: Add DVLA lookup button and auto-fill functionality

**New UI**:

```html
<!-- Registration input with lookup button -->
<div class="dvla-lookup-container">
  <label for="car_registration_number">Registration Number:</label>
  <input type="text"
         name="car_registration_number"
         id="car_registration_number"
         placeholder="AB12 CDE"
         pattern="^[A-Z]{2}[0-9]{2}\s?[A-Z]{3}$">

  <button type="button" id="dvla-lookup-btn" onclick="lookupVehicle()">
    🔍 Auto-Fill from DVLA
  </button>
</div>

<!-- Hidden fields for DVLA results -->
<input type="hidden" name="dvla_lookup_reg" id="dvla_lookup_reg">
<input type="hidden" name="dvla_vehicle_make" id="dvla_vehicle_make">
<input type="hidden" name="dvla_vehicle_model" id="dvla_vehicle_model">
<input type="hidden" name="dvla_vehicle_color" id="dvla_vehicle_color">
<input type="hidden" name="dvla_vehicle_year" id="dvla_vehicle_year">
<input type="hidden" name="dvla_vehicle_fuel_type" id="dvla_vehicle_fuel_type">
<input type="hidden" name="dvla_mot_status" id="dvla_mot_status">
<input type="hidden" name="dvla_mot_expiry_date" id="dvla_mot_expiry_date">
<input type="hidden" name="dvla_tax_status" id="dvla_tax_status">
<input type="hidden" name="dvla_tax_due_date" id="dvla_tax_due_date">

<!-- Display results -->
<div id="dvla-results" style="display:none;">
  <h4>DVLA Lookup Results:</h4>
  <p><strong>Make:</strong> <span id="display-make"></span></p>
  <p><strong>Model:</strong> <span id="display-model"></span></p>
  <p><strong>Color:</strong> <span id="display-color"></span></p>
  <p><strong>Year:</strong> <span id="display-year"></span></p>
  <p><strong>Fuel:</strong> <span id="display-fuel"></span></p>
  <p><strong>MOT Status:</strong> <span id="display-mot"></span></p>
  <p><strong>MOT Expiry:</strong> <span id="display-mot-expiry"></span></p>
  <p><strong>Tax Status:</strong> <span id="display-tax"></span></p>
  <p><strong>Tax Due:</strong> <span id="display-tax-due"></span></p>
</div>
```

**JavaScript**:

```javascript
async function lookupVehicle() {
  const regNumber = document.getElementById('car_registration_number').value;

  if (!regNumber) {
    alert('Please enter a registration number');
    return;
  }

  const btn = document.getElementById('dvla-lookup-btn');
  btn.disabled = true;
  btn.textContent = '🔄 Looking up...';

  try {
    const response = await fetch('/api/dvla/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationNumber: regNumber })
    });

    const result = await response.json();

    if (result.success) {
      // Populate hidden fields
      document.getElementById('dvla_lookup_reg').value = regNumber;
      document.getElementById('dvla_vehicle_make').value = result.data.make;
      document.getElementById('dvla_vehicle_model').value = result.data.model;
      // ... populate all fields

      // Show results
      document.getElementById('display-make').textContent = result.data.make;
      document.getElementById('display-model').textContent = result.data.model;
      // ... update all display elements

      document.getElementById('dvla-results').style.display = 'block';

      // Also auto-fill visible form fields
      document.getElementById('vehicle_make').value = result.data.make;
      document.getElementById('vehicle_model').value = result.data.model;
      // ...
    } else {
      alert('DVLA lookup failed: ' + result.error);
    }

  } catch (error) {
    alert('Error: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '🔍 Auto-Fill from DVLA';
  }
}
```

**Status**: ☐ Not started

---

### 4.4 Other Vehicle Page (DVLA Lookup)

**File**: `public/incident-form-page9.html` (or wherever other driver's vehicle is)

**Task**: Add same DVLA lookup for other vehicle

**Similar to 4.3 but for other vehicle fields**

**Status**: ☐ Not started

---

### 4.5 Witnesses Page

**File**: `public/incident-form-page10.html` (or wherever witnesses are)

**Task**: Add second witness section

**New section**:

```html
<fieldset>
  <legend>Witness #2 (Optional)</legend>

  <label for="witness_2_name">Full Name:</label>
  <input type="text" name="witness_2_name" id="witness_2_name">

  <label for="witness_2_mobile">Mobile Number:</label>
  <input type="tel" name="witness_2_mobile" id="witness_2_mobile" placeholder="+44 7700 900000">

  <label for="witness_2_email">Email Address:</label>
  <input type="email" name="witness_2_email" id="witness_2_email">

  <label for="witness_2_statement">Witness Statement:</label>
  <textarea name="witness_2_statement" id="witness_2_statement" rows="5"></textarea>
</fieldset>
```

**Status**: ☐ Not started

---

## Phase 5: Validation & Testing

### 5.1 Add Validation Rules

**Files**: Various controllers and frontend JS

**Tasks**:

- [ ] Validate UK registration format (XX00 XXX)
- [ ] Validate only one traffic condition selected
- [ ] Validate only one visibility level selected
- [ ] Validate only one road marking status selected
- [ ] Validate MOT/tax dates are valid UK dates
- [ ] Validate email/phone for witness 2

**Status**: ☐ Not started

---

### 5.2 Test Scenarios

Create test cases for:

- [ ] Medical fields captured correctly
- [ ] DVLA lookup works for valid UK reg
- [ ] DVLA lookup handles invalid reg gracefully
- [ ] Weather checkboxes save correctly
- [ ] Traffic radio buttons enforce single selection
- [ ] Road marking radio buttons enforce single selection
- [ ] Visibility radio buttons enforce single selection
- [ ] Other vehicle DVLA lookup works
- [ ] Witness 2 fields save correctly
- [ ] PDF generation includes all new fields
- [ ] PDF shows correct values in all 207 fields

**Status**: ☐ Not started

---

## Phase 6: Documentation

### 6.1 Update API Documentation

**File**: `API_DOCUMENTATION.md` (or similar)

**Tasks**:

- [ ] Document `/api/dvla/lookup` endpoint
- [ ] Document new request body fields for incident reports
- [ ] Document new response fields
- [ ] Add DVLA API key setup instructions

**Status**: ☐ Not started

---

### 6.2 Update README

**File**: `README.md`

**Tasks**:

- [ ] Add DVLA API key to environment variables section
- [ ] Update field count (207 fields)
- [ ] Document new features (DVLA lookup, witness 2, etc.)

**Status**: ☐ Not started

---

## Environment Variables

Add to `.env` or Replit Secrets:

```bash
# DVLA API (UK vehicle lookups)
DVLA_API_KEY=your_api_key_here
DVLA_API_URL=https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1
```

**How to get DVLA API key**:
1. Register at: https://developer-portal.driver-vehicle-licensing.api.gov.uk/
2. Create application
3. Subscribe to "Vehicle Enquiry Service"
4. Get API key

**Status**: ☐ Not started

---

## Priority Order

Implement in this order for fastest results:

1. **HIGH PRIORITY** (Required for PDF generation)
   - [ ] Phase 1.1: Update PDF field mapping
   - [ ] Phase 1.2: Update data fetching
   - [ ] Phase 2.1: Update incident report controller

2. **MEDIUM PRIORITY** (User-facing features)
   - [ ] Phase 4.1: Medical information page
   - [ ] Phase 4.2: Accident conditions page
   - [ ] Phase 4.5: Witnesses page
   - [ ] Phase 2.2: Other vehicles controller
   - [ ] Phase 2.3: Witnesses controller

3. **LOW PRIORITY** (Nice-to-have)
   - [ ] Phase 3: DVLA integration (can be added later)
   - [ ] Phase 4.3: DVLA lookup for your vehicle
   - [ ] Phase 4.4: DVLA lookup for other vehicle

4. **ONGOING** (As you go)
   - [ ] Phase 5: Validation & testing
   - [ ] Phase 6: Documentation

---

## Completion Criteria

Migration implementation is complete when:

- [x] Database schema updated (51 new columns)
- [ ] PDF service maps all 207 fields
- [ ] All controllers handle new fields
- [ ] All UI pages capture new data
- [ ] DVLA integration working (optional)
- [ ] All 207 fields appear in generated PDF
- [ ] Validation tests passing
- [ ] Documentation updated

---

**Created**: 2025-11-02
**Last Updated**: 2025-11-02
**Version**: 1.0
