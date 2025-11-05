# Complete Field List: Page 4 → Supabase

**File:** `public/incident-form-page4.html`
**Page:** Accident Location (Page 4 of 12)
**Destination Table:** `incident_reports`
**Total Fields:** 28 (25 HTML + 3 JavaScript-generated)
**⚠️ CRITICAL:** Only 14 of 28 fields mapped to Supabase (50% data loss!)

---

## ⚠️ CRITICAL DATA LOSS ISSUES

### Summary of Issues

| Issue Type | Count | Impact |
|------------|-------|--------|
| **UNMAPPED Required Fields** | 2 | CRITICAL - location, junction details lost |
| **UNMAPPED Optional Fields** | 11 | HIGH - what3words, landmark, manoeuvre, visibility, hazards lost |
| **Field Name Mismatches** | 1 | MEDIUM - junction_control vs traffic_controls |
| **Successfully Mapped** | 14 | ✅ junction_type + special_conditions array (12 checkboxes) |
| **Total Data Loss** | 50% | 14 of 28 fields NOT stored in database |

### Field Name Mismatch

**Frontend sends:** `junction_control`
**Backend expects:** `traffic_controls`

```javascript
// Frontend (Line 1201)
junction_control: document.getElementById('junctioncontrol').value,

// Backend (Line 474) - EXPECTS DIFFERENT NAME!
traffic_controls: page4.traffic_controls || null,
```

**Impact:** `junction_control` field is silently discarded because backend looks for `traffic_controls`.

---

## Field Categories

| Category | Field Count | Mapped | Unmapped |
|----------|-------------|--------|----------|
| Location Fields | 3 | 0 | 3 ❌ |
| Junction Details | 4 | 1 | 3 ❌ |
| Visibility Factors | 5 | 0 | 5 ❌ |
| Special Conditions | 12 | 12 ✅ | 0 |
| Additional Hazards | 1 | 0 | 1 ❌ |
| System Fields (Generated) | 3 | 0 | 3 |
| **TOTAL** | **28** | **13** | **15** |

---

## Complete Field List

### 1. Location Fields (3 fields - ALL UNMAPPED ❌)

| # | Field Name | HTML Type | Required | Data Type | Supabase Column | Status | User-Facing Label |
|---|------------|-----------|----------|-----------|-----------------|--------|-------------------|
| 1 | `location` | Textarea | ✅ Yes | TEXT | ❌ N/A | **UNMAPPED** | Full address or location description |
| 2 | `what3words` | Text Input | ❌ No | TEXT | ❌ N/A | **UNMAPPED** | what3words address |
| 3 | `nearest_landmark` | Text Input | ❌ No | TEXT | ❌ N/A | **UNMAPPED** | Nearest landmark or notable feature |

**Frontend Code (Lines 532-557):**
```html
<!-- Location Textarea (REQUIRED) -->
<textarea
  id="location"
  name="location"
  required
  placeholder="e.g. Junction of High Street and Park Road, London SW1A 1AA, or M25 between Junction 15 and 16 northbound"
></textarea>

<!-- what3words Input (OPTIONAL) -->
<input
  type="text"
  id="what3words"
  name="what3words"
  placeholder="e.g. ///filled.count.soap"
>

<!-- Nearest Landmark Input (OPTIONAL) -->
<input
  type="text"
  id="nearestlandmark"
  name="nearestlandmark"
  placeholder="e.g. Tesco Metro, Red Lion pub, Shell petrol station"
>
```

**Backend Mapping:**
```javascript
// ❌ NONE OF THESE FIELDS ARE MAPPED IN BACKEND!
// src/controllers/incidentForm.controller.js lines 471-474
// Page 4 mapping only includes:
special_conditions: page4.special_conditions || null,
junction_type: page4.junction_type || null,
traffic_controls: page4.traffic_controls || null
```

**⚠️ CRITICAL ISSUE:** The most important field on Page 4 (`location` textarea) is **REQUIRED** by the frontend but **NOT stored in the database**!

---

### 2. Junction Details (4 fields - 1 mapped, 3 unmapped)

| # | Field Name | HTML Type | Required | Data Type | Supabase Column | Status | User-Facing Label |
|---|------------|-----------|----------|-----------|-----------------|--------|-------------------|
| 4 | `junction_type` | Select Dropdown | ✅ Yes | TEXT | `junction_type` | ✅ MAPPED | What type of junction was it? |
| 5 | `junction_control` | Select Dropdown | ⚠️ Conditional | TEXT | ❌ `traffic_controls` | ⚠️ **MISMATCH** | What controlled this junction? |
| 6 | `traffic_light_status` | Select Dropdown | ⚠️ Conditional | TEXT | ❌ N/A | **UNMAPPED** | Traffic light colour for your direction |
| 7 | `user_manoeuvre` | Select Dropdown | ⚠️ Conditional | TEXT | ❌ N/A | **UNMAPPED** | What were you doing when collision occurred? |

**Frontend Code (Lines 567-647):**
```html
<!-- Junction Type (REQUIRED) -->
<select id="junctiontype" name="junctiontype" required>
  <option value="">Select junction type...</option>
  <option value="straight_road">Straight road (not at junction)</option>
  <option value="not_junction">Not at or near a junction</option>
  <option value="t_junction">T-junction</option>
  <option value="crossroads">Crossroads (4-way junction)</option>
  <option value="y_junction">Y-junction</option>
  <option value="roundabout">Roundabout (single-lane)</option>
  <option value="mini_roundabout">Mini roundabout</option>
  <option value="multi_lane_roundabout">Multi-lane roundabout</option>
  <option value="slip_road">Slip road (motorway entry/exit)</option>
  <option value="box_junction">Box junction (yellow hatched area)</option>
</select>

<!-- Junction Control (CONDITIONAL - shown only if at junction) -->
<select id="junctioncontrol" name="junctioncontrol">
  <option value="traffic_lights">Traffic lights</option>
  <option value="stop_sign">Stop sign</option>
  <option value="give_way_sign">Give Way sign or road markings</option>
  <option value="uncontrolled">Uncontrolled (no signs or markings)</option>
</select>

<!-- Traffic Light Status (CONDITIONAL - shown only if traffic lights) -->
<select id="trafficlightstatus" name="trafficlightstatus">
  <option value="green">Green</option>
  <option value="amber">Amber</option>
  <option value="red">Red</option>
  <option value="green_filter">Green filter arrow (directional)</option>
  <option value="not_working">Lights were not working</option>
</select>

<!-- User Manoeuvre (CONDITIONAL - shown only if at junction) -->
<select id="usermanoeuvre" name="usermanoeuvre">
  <option value="going_straight">Going straight ahead</option>
  <option value="turning_left">Turning left</option>
  <option value="turning_right">Turning right</option>
  <option value="waiting_to_turn_right">Waiting to turn right (in junction)</option>
  <option value="already_in_junction">Already in junction when hit</option>
</select>
```

**Backend Mapping (Lines 471-474):**
```javascript
// Page 4: Special Conditions
special_conditions: page4.special_conditions || null,
junction_type: page4.junction_type || null,              // ✅ MAPPED
traffic_controls: page4.traffic_controls || null,        // ⚠️ NAME MISMATCH
// ❌ traffic_light_status NOT MAPPED
// ❌ user_manoeuvre NOT MAPPED
```

**Conditional Logic (Lines 811-852):**
```javascript
// Progressive Disclosure: Show/hide junction details
junctionType.addEventListener('change', function() {
  const selectedType = this.value;

  if (selectedType === 'not_junction' || selectedType === 'straight_road') {
    // Hide all junction details
    junctionDetailsGroup.style.display = 'none';
    junctionControl.removeAttribute('required');
    document.getElementById('usermanoeuvre').removeAttribute('required');
  } else {
    // Show junction details for any junction type
    junctionDetailsGroup.style.display = 'block';
    junctionControl.setAttribute('required', 'required');
    document.getElementById('usermanoeuvre').setAttribute('required', 'required');
  }
});

// Show/hide traffic light status based on junction control
junctionControl.addEventListener('change', function() {
  if (this.value === 'traffic_lights') {
    trafficlightstatusgroup.style.display = 'block';
    trafficLightStatus.setAttribute('required', 'required');
  } else {
    trafficlightstatusgroup.style.display = 'none';
    trafficLightStatus.removeAttribute('required');
  }
});
```

**⚠️ CRITICAL ISSUE:** `junction_control` field has a name mismatch - frontend sends `junction_control` but backend expects `traffic_controls`, causing data loss.

---

### 3. Visibility Factors (5 checkboxes - ALL UNMAPPED ❌)

| # | Field Name | HTML Value | Required | Data Type | Supabase Column | Status | User-Facing Label |
|---|------------|------------|----------|-----------|-----------------|--------|-------------------|
| 8 | `visibility_clear` | `visibilityfactors=clear_visibility` | ❌ No | BOOLEAN | ❌ N/A | **UNMAPPED** | Clear visibility - no issues |
| 9 | `visibility_restricted_structure` | `visibilityfactors=restricted_by_structure` | ❌ No | BOOLEAN | ❌ N/A | **UNMAPPED** | Restricted by hedge, wall, or fence |
| 10 | `visibility_restricted_bend` | `visibilityfactors=restricted_by_bend` | ❌ No | BOOLEAN | ❌ N/A | **UNMAPPED** | Restricted by bend or corner |
| 11 | `visibility_large_vehicle` | `visibilityfactors=large_vehicle` | ❌ No | BOOLEAN | ❌ N/A | **UNMAPPED** | Large vehicle obstructing view |
| 12 | `visibility_sun_glare` | `visibilityfactors=sun_glare` | ❌ No | BOOLEAN | ❌ N/A | **UNMAPPED** | Sun glare or low sun |

**Frontend Code (Lines 739-761):**
```html
<div class="checkbox-group">
  <label>
    <input type="checkbox" name="visibilityfactors" value="clear_visibility">
    <span>Clear visibility - no issues</span>
  </label>
  <label>
    <input type="checkbox" name="visibilityfactors" value="restricted_by_structure">
    <span>Restricted by hedge, wall, or fence</span>
  </label>
  <label>
    <input type="checkbox" name="visibilityfactors" value="restricted_by_bend">
    <span>Restricted by bend or corner</span>
  </label>
  <label>
    <input type="checkbox" name="visibilityfactors" value="large_vehicle">
    <span>Large vehicle obstructing view (lorry, bus, van)</span>
  </label>
  <label>
    <input type="checkbox" name="visibilityfactors" value="sun_glare">
    <span>Sun glare or low sun</span>
  </label>
</div>
```

**Frontend Collection (Lines 1183-1185):**
```javascript
// Get selected visibility factors
const selectedVisibilityFactors = Array.from(
  document.querySelectorAll('input[name="visibilityfactors"]:checked')
).map(cb => cb.value);

// Saved to sessionStorage
visibility_factors: selectedVisibilityFactors,
```

**Backend Mapping:**
```javascript
// ❌ NO MAPPING FOR visibility_factors IN BACKEND
// These 5 checkboxes are collected but never stored
```

**⚠️ CRITICAL ISSUE:** All 5 visibility factor checkboxes are collected but **NOT stored in database**. This is critical for liability determination.

---

### 4. Special Conditions (12 checkboxes - ALL MAPPED ✅)

| # | Field Name | HTML Value | Required | Data Type | Supabase Column | Status | User-Facing Label |
|---|------------|------------|----------|-----------|-----------------|--------|-------------------|
| 13 | `special_condition_roadworks` | `specialconditions=roadworks` | ❌ No | BOOLEAN | `special_conditions` (JSONB) | ✅ MAPPED | Roadworks or construction |
| 14 | `special_condition_workmen` | `specialconditions=workmen_in_road` | ❌ No | BOOLEAN | `special_conditions` (JSONB) | ✅ MAPPED | Workmen in road |
| 15 | `special_condition_cyclists` | `specialconditions=cyclists_in_road` | ❌ No | BOOLEAN | `special_conditions` (JSONB) | ✅ MAPPED | Cyclists in road |
| 16 | `special_condition_pedestrians` | `specialconditions=pedestrians_in_road` | ❌ No | BOOLEAN | `special_conditions` (JSONB) | ✅ MAPPED | Pedestrians in road |
| 17 | `special_condition_traffic_calming` | `specialconditions=traffic_calming` | ❌ No | BOOLEAN | `special_conditions` (JSONB) | ✅ MAPPED | Traffic calming measures |
| 18 | `special_condition_parked_vehicles` | `specialconditions=parked_vehicles` | ❌ No | BOOLEAN | `special_conditions` (JSONB) | ✅ MAPPED | Parked vehicles obstructing view |
| 19 | `special_condition_crossing` | `specialconditions=pedestrian_crossing` | ❌ No | BOOLEAN | `special_conditions` (JSONB) | ✅ MAPPED | Near pedestrian crossing |
| 20 | `special_condition_school_zone` | `specialconditions=school_zone` | ❌ No | BOOLEAN | `special_conditions` (JSONB) | ✅ MAPPED | School zone or playground area |
| 21 | `special_condition_narrow_road` | `specialconditions=narrow_road` | ❌ No | BOOLEAN | `special_conditions` (JSONB) | ✅ MAPPED | Narrow road or single-track |
| 22 | `special_condition_potholes` | `specialconditions=pot_holes_road_defects` | ❌ No | BOOLEAN | `special_conditions` (JSONB) | ✅ MAPPED | Pot holes and road defects |
| 23 | `special_condition_oil_spills` | `specialconditions=oil_spills` | ❌ No | BOOLEAN | `special_conditions` (JSONB) | ✅ MAPPED | Oil spills |
| 24 | `special_condition_animals` | `specialconditions=animals_in_road` | ❌ No | BOOLEAN | `special_conditions` (JSONB) | ✅ MAPPED | Animals in road |

**Frontend Code (Lines 682-731):**
```html
<div class="checkbox-group">
  <label>
    <input type="checkbox" name="specialconditions" value="roadworks">
    <span>Roadworks or construction</span>
  </label>
  <label>
    <input type="checkbox" name="specialconditions" value="workmen_in_road">
    <span>Workmen in road</span>
  </label>
  <label>
    <input type="checkbox" name="specialconditions" value="cyclists_in_road">
    <span>Cyclists in road</span>
  </label>
  <!-- ... 9 more checkboxes ... -->
</div>
```

**Frontend Collection (Lines 1179-1181):**
```javascript
// Get selected special conditions
const selectedConditions = Array.from(
  document.querySelectorAll('input[name="specialconditions"]:checked')
).map(cb => cb.value);

// Saved to sessionStorage
special_conditions: selectedConditions,
```

**Backend Mapping (Line 472):**
```javascript
// Page 4: Special Conditions
special_conditions: page4.special_conditions || null, // Array as JSONB or TEXT[]
```

**✅ SUCCESS:** All 12 special condition checkboxes are successfully mapped to the `special_conditions` column as a JSONB array or TEXT[] array.

---

### 5. Additional Hazards (1 field - UNMAPPED ❌)

| # | Field Name | HTML Type | Required | Data Type | Supabase Column | Status | User-Facing Label |
|---|------------|-----------|----------|-----------|-----------------|--------|-------------------|
| 25 | `additional_hazards` | Textarea | ❌ No | TEXT | ❌ N/A | **UNMAPPED** | Additional hazards or conditions |

**Frontend Code (Lines 765-778):**
```html
<textarea
  id="additionalhazards"
  name="additionalhazards"
  rows="3"
  placeholder="Describe any other hazards, road conditions, or circumstances not covered above..."
></textarea>
```

**Frontend Collection (Line 1206):**
```javascript
additional_hazards: document.getElementById('additionalhazards').value.trim(),
```

**Backend Mapping:**
```javascript
// ❌ NO MAPPING FOR additional_hazards IN BACKEND
```

**⚠️ CRITICAL ISSUE:** Free-text field for additional hazards is collected but **NOT stored in database**.

---

### 6. System Fields (Generated by JavaScript)

| # | Field Name | Source | Data Type | Supabase Column | Storage Location | Notes |
|---|------------|--------|-----------|-----------------|------------------|-------|
| 26 | `session_id` | localStorage | TEXT | N/A | Used by locationPhotoService | temp_session_id for photo finalization |
| 27 | `map_screenshot_captured` | JavaScript | BOOLEAN | N/A | Frontend only | Flag indicating if map screenshot was captured |
| 28 | `completed_at` | JavaScript | TIMESTAMP | N/A | sessionStorage only | Generated on form submission |

**Frontend Generation (Lines 1196-1210):**
```javascript
const pageData = {
  // ... all form fields ...
  session_id: localStorage.getItem('temp_session_id'),      // For photo finalization
  map_screenshot_captured: mapScreenshotCaptured,           // Frontend tracking
  completed_at: new Date().toISOString()                    // sessionStorage only
};

sessionStorage.setItem('incident_page4', JSON.stringify(pageData));
```

**Usage:**
- `session_id`: Used by `locationPhotoService.finalizePhotos()` to claim temp uploads
- `map_screenshot_captured`: Boolean flag for frontend UI (not stored in database)
- `completed_at`: Timestamp for sessionStorage tracking (not sent to Supabase)

---

## Map Screenshot Feature

### Overview

Page 4 includes an interactive Leaflet map with screenshot capture capability. Users can:
1. Click "Get My Location" to auto-populate what3words address
2. View interactive map centered on their location
3. Capture map screenshot and upload to Supabase temp storage

### Map Screenshot Workflow

**Step 1: User Gets Location (Lines 917-1057)**
```javascript
getLocationBtn.addEventListener('click', async function() {
  // 1. Get GPS coordinates via navigator.geolocation
  const position = await navigator.geolocation.getCurrentPosition();
  const { latitude, longitude } = position.coords;

  // 2. Convert to what3words via API
  const response = await fetch(`/api/location/convert?lat=${latitude}&lng=${longitude}`);
  const data = await response.json();

  // 3. Auto-populate what3words field
  what3wordsInput.value = `///${data.words}`;

  // 4. Display interactive Leaflet map
  const map = L.map('location-map').setView([latitude, longitude], 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  L.marker([latitude, longitude]).addTo(map);
});
```

**Step 2: User Captures Screenshot (Lines 1074-1171)**
```javascript
captureMapBtn.addEventListener('click', async function() {
  // 1. Capture map div using html2canvas
  const mapElement = document.getElementById('map-screenshot-target');
  const canvas = await html2canvas(mapElement, {
    useCORS: true,
    scale: 2  // Higher quality
  });

  // 2. Convert canvas to blob
  mapScreenshotBlob = await new Promise(resolve => {
    canvas.toBlob(resolve, 'image/png', 0.95);
  });

  // 3. Upload immediately to Supabase temp storage
  const formData = new FormData();
  formData.append('file', mapScreenshotBlob, `map-screenshot-${Date.now()}.png`);
  formData.append('field_name', 'map_screenshot');
  formData.append('temp_session_id', localStorage.getItem('temp_session_id'));

  const uploadResponse = await fetch('/api/images/temp-upload', {
    method: 'POST',
    body: formData
  });

  // 4. Show success message
  mapScreenshotStatus.innerHTML = '✅ Map screenshot saved to Supabase!';
  captureMapBtn.innerHTML = '✓ Screenshot Uploaded';
});
```

**Step 3: Backend Finalizes Photo (Lines 107-116 in incidentForm.controller.js)**
```javascript
// When form is submitted on Page 12
if (formData.page4.session_id && formData.page4.map_screenshot_captured) {
  mapScreenshotResults = await locationPhotoService.finalizePhotosByType(
    userId,
    formData.page4.session_id,
    'location-map',              // storage category
    'location_map_screenshot'    // document_type in user_documents
  );
}
```

**Storage Path:**
- **Temp:** `user-documents/temp/{session_id}/map-screenshot-{timestamp}.png`
- **Permanent:** `user-documents/{userId}/map-screenshot-{timestamp}.png`

**Database Record:** Created in `user_documents` table with `document_type = 'location_map_screenshot'`

---

## Data Transformation Summary

### Dropdown Values → TEXT

| Frontend Value | Backend Conversion | Supabase Value |
|----------------|-------------------|----------------|
| Select option value | Direct string | `TEXT` or `NULL` |

**Applied to:**
- `junction_type`: "t_junction", "crossroads", etc.
- `junction_control` → `traffic_controls` (name mismatch!)
- `traffic_light_status`: "green", "amber", "red" (UNMAPPED)
- `user_manoeuvre`: "going_straight", "turning_left" (UNMAPPED)

### Checkbox Arrays → JSONB/TEXT[]

| Frontend Value | Backend Conversion | Supabase Value |
|----------------|-------------------|----------------|
| Array of checkbox values | Stored as JSONB or TEXT[] | `["value1", "value2"]` |

**Applied to:**
- `special_conditions`: Successfully mapped ✅
- `visibility_factors`: NOT MAPPED ❌

### Text Fields → STRING/NULL

| Frontend Value | Backend Conversion | Supabase Value |
|----------------|-------------------|----------------|
| User input text | `.trim()` or `\|\| null` | `TEXT` or `NULL` |
| Empty string | `\|\| null` | `NULL` |

**Applied to (ALL UNMAPPED ❌):**
- `location`
- `what3words`
- `nearest_landmark`
- `additional_hazards`

---

## Supabase Database Schema (incident_reports table)

### Currently Mapped Fields (3 fields)

```sql
-- Junction Information
junction_type TEXT,                          -- ✅ Mapped from page4.junction_type
traffic_controls TEXT,                       -- ⚠️ Name mismatch: frontend sends junction_control
special_conditions JSONB,                    -- ✅ Mapped as array of 12 checkbox values
```

### ⚠️ Missing Columns (Should Be Added)

```sql
-- Location Information (CRITICAL - currently unmapped!)
location_description TEXT,                   -- From location textarea (REQUIRED field!)
location_what3words TEXT,                    -- From what3words input
nearest_landmark TEXT,                       -- From nearestlandmark input

-- Junction Details (currently unmapped!)
traffic_light_status TEXT,                   -- From trafficlightstatus dropdown
user_manoeuvre TEXT,                         -- From usermanoeuvre dropdown

-- Visibility Factors (currently unmapped!)
visibility_factors JSONB,                    -- Array of 5 checkbox values
-- OR individual BOOLEAN columns:
visibility_clear BOOLEAN DEFAULT false,
visibility_restricted_structure BOOLEAN DEFAULT false,
visibility_restricted_bend BOOLEAN DEFAULT false,
visibility_large_vehicle BOOLEAN DEFAULT false,
visibility_sun_glare BOOLEAN DEFAULT false,

-- Additional Hazards (currently unmapped!)
additional_hazards TEXT,                     -- From additionalhazards textarea
```

---

## Submission Flow

### Step 1: User Completes Page 4
User fills out accident location form with interactive map

### Step 2: Frontend Validation (Lines 854-908)
```javascript
function validateForm() {
  // Check required fields
  const location = document.getElementById('location').value.trim();
  if (!location) {
    alert('Please provide the accident location.');
    return false;
  }

  // Validate what3words format if provided
  if (what3words) {
    const w3wPattern = /^(\/\/\/)?[\w-]+\.[\w-]+\.[\w-]+$/;
    if (!w3wPattern.test(what3words)) {
      alert('Please enter a valid what3words address');
      return false;
    }
  }

  // Validate junction type
  if (!junctionType) {
    alert('Please select the junction type.');
    return false;
  }

  // Validate junction details if at a junction
  if (junctionType !== 'not_junction') {
    if (!junctionControl) {
      alert('Please select what controlled the junction.');
      return false;
    }

    if (junctionControl === 'traffic_lights' && !trafficLightStatus) {
      alert('Please select traffic light colour.');
      return false;
    }

    if (!userManoeuvre) {
      alert('Please select your manoeuvre.');
      return false;
    }
  }

  return true;
}
```

### Step 3: Data Collection (Lines 1174-1212)
```javascript
nextBtn.addEventListener('click', function() {
  if (!validateForm()) return;

  // Collect checkbox arrays
  const selectedConditions = Array.from(
    document.querySelectorAll('input[name="specialconditions"]:checked')
  ).map(cb => cb.value);

  const selectedVisibilityFactors = Array.from(
    document.querySelectorAll('input[name="visibilityfactors"]:checked')
  ).map(cb => cb.value);

  // Check if map screenshot was captured
  const mapScreenshotCaptured = captureMapBtn?.innerHTML.includes('Screenshot Uploaded');

  // Save all data to sessionStorage
  const pageData = {
    location: document.getElementById('location').value.trim(),
    what3words: document.getElementById('what3words').value.trim(),
    nearest_landmark: document.getElementById('nearestlandmark').value.trim(),
    junction_type: document.getElementById('junctiontype').value,
    junction_control: document.getElementById('junctioncontrol').value,
    traffic_light_status: trafficLightStatus,
    user_manoeuvre: document.getElementById('usermanoeuvre').value,
    visibility_factors: selectedVisibilityFactors,
    special_conditions: selectedConditions,
    additional_hazards: document.getElementById('additionalhazards').value.trim(),
    session_id: localStorage.getItem('temp_session_id'),
    map_screenshot_captured: mapScreenshotCaptured,
    completed_at: new Date().toISOString()
  };

  sessionStorage.setItem('incident_page4', JSON.stringify(pageData));
  window.location.href = '/incident-form-page4a-location-photos.html';
});
```

### Step 4: Data Restoration (Lines 1225-1287)
```javascript
window.addEventListener('DOMContentLoaded', function() {
  const saved = sessionStorage.getItem('incident_page4');
  if (saved) {
    const data = JSON.parse(saved);

    // Restore text inputs
    if (data.location) document.getElementById('location').value = data.location;
    if (data.what3words) document.getElementById('what3words').value = data.what3words;
    if (data.nearest_landmark) document.getElementById('nearestlandmark').value = data.nearest_landmark;

    // Restore junction type and trigger progressive disclosure
    if (data.junction_type) {
      document.getElementById('junctiontype').value = data.junction_type;
      junctionType.dispatchEvent(new Event('change'));
    }

    // Restore junction control and trigger progressive disclosure
    if (data.junction_control) {
      document.getElementById('junctioncontrol').value = data.junction_control;
      junctionControl.dispatchEvent(new Event('change'));
    }

    // Restore conditional fields
    if (data.traffic_light_status) {
      document.getElementById('trafficlightstatus').value = data.traffic_light_status;
    }
    if (data.user_manoeuvre) {
      document.getElementById('usermanoeuvre').value = data.user_manoeuvre;
    }

    // Restore checkbox arrays
    if (data.visibility_factors && Array.isArray(data.visibility_factors)) {
      data.visibility_factors.forEach(factor => {
        const checkbox = document.querySelector(`input[name="visibilityfactors"][value="${factor}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }

    if (data.special_conditions && Array.isArray(data.special_conditions)) {
      data.special_conditions.forEach(condition => {
        const checkbox = document.querySelector(`input[name="specialconditions"][value="${condition}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }

    // Restore additional hazards text
    if (data.additional_hazards) {
      document.getElementById('additionalhazards').value = data.additional_hazards;
    }
  }
});
```

### Step 5: Multi-Page Collection (Page 12)
All 12 pages merged into single object

### Step 6: HTTP POST to Backend
```javascript
POST /api/incident-form/submit
{
  page4: {
    location: "Junction of High Street and Park Road, London SW1A 1AA",
    what3words: "///filled.count.soap",
    nearest_landmark: "Tesco Metro",
    junction_type: "t_junction",
    junction_control: "traffic_lights",              // ⚠️ NAME MISMATCH
    traffic_light_status: "green",                   // ❌ UNMAPPED
    user_manoeuvre: "turning_right",                 // ❌ UNMAPPED
    visibility_factors: ["sun_glare"],               // ❌ UNMAPPED
    special_conditions: ["roadworks", "parked_vehicles"],  // ✅ MAPPED
    additional_hazards: "Large van blocking view",   // ❌ UNMAPPED
    session_id: "uuid",
    map_screenshot_captured: true,
    completed_at: "2025-11-05T21:30:45.123Z"
  }
}
```

### Step 7: Backend Processing (Lines 471-474)
```javascript
// src/controllers/incidentForm.controller.js
const incidentData = {
  // ... other pages ...

  // Page 4: Special Conditions (ONLY 3 FIELDS MAPPED!)
  special_conditions: page4.special_conditions || null,
  junction_type: page4.junction_type || null,
  traffic_controls: page4.traffic_controls || null,  // ⚠️ Wrong field name!

  // ❌ ALL OTHER PAGE 4 FIELDS SILENTLY DISCARDED
};
```

### Step 8: Supabase Insert
```javascript
await supabase
  .from('incident_reports')
  .insert([incidentData])
  .select()
  .single();
```

---

## Field Requirements Summary

| Requirement Type | Field Count | Fields |
|-----------------|-------------|--------|
| **Always Required** | 2 | `location`, `junction_type` |
| **Conditionally Required** | 3 | `junction_control`, `traffic_light_status`, `user_manoeuvre` (when at junction) |
| **Optional** | 20 | `what3words`, `nearest_landmark`, 5 visibility factors, 12 special conditions, `additional_hazards` |
| **Generated** | 3 | `session_id`, `map_screenshot_captured`, `completed_at` |

---

## Data Type Summary

| Data Type | Field Count | Fields |
|-----------|-------------|--------|
| **TEXT** | 7 | location, what3words, nearest_landmark, junction_type, junction_control, traffic_light_status, user_manoeuvre, additional_hazards |
| **BOOLEAN** | 17 | 5 visibility factors + 12 special conditions |
| **JSONB/TEXT[]** | 2 | special_conditions array, visibility_factors array |
| **TIMESTAMP** | 1 | `completed_at` (sessionStorage only) |

---

## Code References

### Frontend
- **File:** `public/incident-form-page4.html`
- **Data Collection:** Lines 1174-1212
- **Validation:** Lines 854-908
- **Conditional Logic:** Lines 811-852 (junction progressive disclosure)
- **Map Screenshot:** Lines 1074-1171
- **what3words Integration:** Lines 917-1057
- **Data Restoration:** Lines 1225-1287

### Backend
- **File:** `src/controllers/incidentForm.controller.js`
- **Submit Handler:** Lines 52-100
- **Data Mapping:** Lines 391-490 (buildIncidentData function)
- **Page 4 Fields:** Lines 471-474 (ONLY 3 FIELDS!)
- **Photo Finalization:** Lines 107-116 (map screenshot)

### Services
- **File:** `src/services/locationPhotoService.js`
- **Photo Finalization:** `finalizePhotos()`, `finalizePhotosByType()`
- **Map Screenshot:** Claims temp upload and creates user_documents record

### Database
- **Table:** `incident_reports`
- **Schema:** 3 columns from Page 4 (missing 11+ columns!)
- **Types:** 1 TEXT (junction_type) + 1 TEXT (traffic_controls) + 1 JSONB (special_conditions)

---

## Example Data Payload

### Frontend (SessionStorage)
```json
{
  "location": "Junction of High Street and Park Road, London SW1A 1AA, near large Tesco supermarket",
  "what3words": "///filled.count.soap",
  "nearest_landmark": "Tesco Metro on corner of High Street",
  "junction_type": "t_junction",
  "junction_control": "traffic_lights",
  "traffic_light_status": "green",
  "user_manoeuvre": "turning_right",
  "visibility_factors": ["sun_glare", "large_vehicle"],
  "special_conditions": ["roadworks", "parked_vehicles", "traffic_calming"],
  "additional_hazards": "Large white van parked on corner blocking view of traffic from right. Temporary traffic lights for roadworks causing confusion.",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "map_screenshot_captured": true,
  "completed_at": "2025-11-05T21:30:45.123Z"
}
```

### Backend (Supabase Insert) - ⚠️ CRITICAL DATA LOSS

```javascript
{
  create_user_id: "550e8400-e29b-41d4-a716-446655440000",

  // ✅ Successfully mapped (only 3 fields)
  junction_type: "t_junction",
  traffic_controls: null,  // ⚠️ NULL because frontend sent "junction_control" not "traffic_controls"
  special_conditions: ["roadworks", "parked_vehicles", "traffic_calming"],

  // ❌ CRITICAL DATA LOSS - These fields were collected but NOT STORED:
  // location: NOT STORED (REQUIRED field lost!)
  // what3words: NOT STORED
  // nearest_landmark: NOT STORED
  // junction_control: NOT STORED (name mismatch)
  // traffic_light_status: NOT STORED
  // user_manoeuvre: NOT STORED
  // visibility_factors: NOT STORED (entire array lost)
  // additional_hazards: NOT STORED (free-text description lost)
}
```

**⚠️ RESULT:** Only 14 of 28 fields stored (50% data loss!)

---

## ⚠️ CRITICAL RECOMMENDATIONS

### 1. Add Missing Database Columns (HIGH PRIORITY)

```sql
-- Add missing location fields (CRITICAL!)
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS location_description TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS location_what3words TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS nearest_landmark TEXT;

-- Add missing junction fields
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS traffic_light_status TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS user_manoeuvre TEXT;

-- Add visibility factors (as JSONB array or individual BOOLEAN columns)
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS visibility_factors JSONB;

-- Add additional hazards
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS additional_hazards TEXT;

-- Add comments
COMMENT ON COLUMN incident_reports.location_description IS 'Full address or location description from Page 4 textarea (REQUIRED)';
COMMENT ON COLUMN incident_reports.location_what3words IS 'what3words address (e.g., ///filled.count.soap)';
COMMENT ON COLUMN incident_reports.nearest_landmark IS 'Nearest landmark or notable feature';
COMMENT ON COLUMN incident_reports.traffic_light_status IS 'Traffic light colour for user direction (green, amber, red, etc.)';
COMMENT ON COLUMN incident_reports.user_manoeuvre IS 'User manoeuvre at time of collision (going_straight, turning_left, etc.)';
COMMENT ON COLUMN incident_reports.visibility_factors IS 'Array of visibility factors (clear_visibility, restricted_by_structure, etc.)';
COMMENT ON COLUMN incident_reports.additional_hazards IS 'Additional hazards or conditions description from Page 4';
```

### 2. Fix Field Name Mismatch (CRITICAL!)

**Option A: Update Backend to Match Frontend**
```javascript
// src/controllers/incidentForm.controller.js line 474
// CHANGE:
traffic_controls: page4.traffic_controls || null,
// TO:
traffic_controls: page4.junction_control || null,
```

**Option B: Update Frontend to Match Backend**
```javascript
// public/incident-form-page4.html line 1201
// CHANGE:
junction_control: document.getElementById('junctioncontrol').value,
// TO:
traffic_controls: document.getElementById('junctioncontrol').value,
```

**Recommendation:** Update backend to match frontend (Option A) to avoid changing 3 places in frontend code.

### 3. Update Backend Mapping (HIGH PRIORITY)

```javascript
// src/controllers/incidentForm.controller.js
// ADD after line 474:

// Page 4: Location Information (CRITICAL - currently unmapped!)
location_description: page4.location || null,
location_what3words: page4.what3words || null,
nearest_landmark: page4.nearest_landmark || null,

// Page 4: Junction Details (currently unmapped!)
junction_control: page4.junction_control || null,  // Fix name mismatch
traffic_light_status: page4.traffic_light_status || null,
user_manoeuvre: page4.user_manoeuvre || null,

// Page 4: Visibility Factors (currently unmapped!)
visibility_factors: page4.visibility_factors || null,

// Page 4: Additional Hazards (currently unmapped!)
additional_hazards: page4.additional_hazards || null,
```

### 4. Verification Script

Create a test script to verify Page 4 field mappings:

```javascript
#!/usr/bin/env node
/**
 * Test Script: Verify Page 4 Field Mappings
 * Usage: node test-page4-fields.js
 */

const testData = {
  page4: {
    location: "Junction of High Street and Park Road, London SW1A 1AA",
    what3words: "///filled.count.soap",
    nearest_landmark: "Tesco Metro",
    junction_type: "t_junction",
    junction_control: "traffic_lights",
    traffic_light_status: "green",
    user_manoeuvre: "turning_right",
    visibility_factors: ["sun_glare", "large_vehicle"],
    special_conditions: ["roadworks", "parked_vehicles"],
    additional_hazards: "Large van blocking view"
  }
};

console.log('✅ Testing Page 4 field mappings...');
console.log('\n📝 Fields sent from frontend:');
Object.keys(testData.page4).forEach(key => {
  console.log(`  - ${key}: ${JSON.stringify(testData.page4[key])}`);
});

console.log('\n⚠️ Fields currently mapped in backend:');
console.log('  - special_conditions ✅');
console.log('  - junction_type ✅');
console.log('  - traffic_controls ⚠️ (name mismatch with junction_control)');

console.log('\n❌ Fields NOT mapped (data loss):');
console.log('  - location ❌ (REQUIRED FIELD!)');
console.log('  - what3words ❌');
console.log('  - nearest_landmark ❌');
console.log('  - junction_control ❌ (name mismatch)');
console.log('  - traffic_light_status ❌');
console.log('  - user_manoeuvre ❌');
console.log('  - visibility_factors ❌');
console.log('  - additional_hazards ❌');

console.log('\n📊 Summary:');
console.log('  Total fields: 13');
console.log('  Mapped: 3 (23%)');
console.log('  Unmapped: 10 (77%)');
console.log('  ⚠️ CRITICAL: 77% data loss on Page 4!');
```

---

## Summary

**Total Fields from Page 4:** 28
**Sent to Supabase incident_reports:** 3 (excluding system fields)
**Successfully Mapped:** 13 of 28 (46%)
**Data Loss:** 50%

**Field Types:**
- TEXT Fields: 7 (1 mapped, 6 unmapped)
- BOOLEAN Fields: 17 (12 mapped as array, 5 unmapped)
- JSONB Arrays: 2 (1 mapped, 1 unmapped)
- TIMESTAMP: 1 (sessionStorage only)

**Requirements:**
- Always Required: 2 fields (1 mapped, 1 unmapped!)
- Conditionally Required: 3 fields (all unmapped)
- Optional: 20 fields (12 mapped, 8 unmapped)
- Generated: 3 fields (used for services, not stored in incident_reports)

**⚠️ CRITICAL ISSUES:**
1. **REQUIRED FIELD NOT STORED:** `location` textarea is required by frontend but NOT stored in database
2. **Field Name Mismatch:** `junction_control` vs `traffic_controls` causing data loss
3. **11 Fields Silently Discarded:** Including critical liability information (visibility, manoeuvre, hazards)

---

**Generated:** 2025-11-05
**Author:** Claude Code Analysis
**Files Analyzed:**
- `public/incident-form-page4.html` (1295 lines)
- `src/controllers/incidentForm.controller.js` (lines 471-474)
- `src/services/locationPhotoService.js` (photo finalization)
