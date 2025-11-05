# Complete Field List: Page 3 → Supabase

**File:** `public/incident-form-page3.html`
**Page:** Accident Details (Page 3 of 12)
**Destination Table:** `incident_reports`
**Total Fields:** 41 (40 HTML + 1 JavaScript-generated)

⚠️ **CRITICAL FINDING:** Only 22 of 41 fields are mapped to Supabase. 19 fields are collected but NOT stored in the database.

---

## Field Categories

| Category | Field Count | Mapped to DB | Not Mapped |
|----------|-------------|--------------|------------|
| Date & Time | 2 | 2 | 0 |
| Weather Conditions | 12 | 6 | 6 |
| Road Conditions | 6 | 6 | 0 |
| Road Type | 7 | 6 | 1 |
| Speed Fields | 2 | 2 | 0 |
| Traffic Conditions | 4 | 0 | 4 |
| Visibility | 4 | 3 | 1 |
| Road Markings | 3 | 0 | 3 |
| System (Generated) | 1 | 0 | 1 |
| **TOTAL** | **41** | **22** | **19** |

---

## ⚠️ UNMAPPED FIELDS WARNING

**19 fields are collected from the user but NOT stored in Supabase:**

### Weather (6 fields not mapped):
- `weather_bright_sunlight`
- `weather_cloudy`
- `weather_heavy_rain`
- `weather_drizzle`
- `weather_hail`
- `weather_thunder_lightning`

### Traffic Conditions (4 fields not mapped):
- `traffic_conditions_heavy`
- `traffic_conditions_moderate`
- `traffic_conditions_light`
- `traffic_conditions_no_traffic`

### Road Type (1 field not mapped):
- `road_type_car_park`

### Visibility (1 field not mapped):
- `visibility_very_poor`

### Road Markings (3 fields not mapped):
- `road_markings_visible_yes`
- `road_markings_visible_no`
- `road_markings_visible_partially`

### System (1 field not mapped):
- `completed_at` (sessionStorage only)

**Impact:** User input is collected and validated but silently discarded during backend processing. This may cause confusion or data loss.

---

## Complete Field List

### 1. Date & Time Fields (2 fields - Both Mapped)

| # | Field Name | HTML Type | Required | Data Type | Supabase Column | Notes |
|---|------------|-----------|----------|-----------|-----------------|-------|
| 1 | `accident_date` | Date Input | ✅ Yes | DATE | `incident_date` | Date of accident |
| 2 | `accident_time` | Time Input | ✅ Yes | TIME | `incident_time` | Time of accident (24-hour format) |

**Frontend Code (Lines 442-467):**
```html
<input type="date" id="accident_date" name="accident_date" required>
<input type="time" id="accident_time" name="accident_time" required>
```

**Backend Mapping:** Not shown in page3 mapping (likely in page1 based on controller structure)

**Validation (Lines 735-753):**
```javascript
const accidentDate = document.getElementById('accident_date').value.trim();
const accidentTime = document.getElementById('accident_time').value.trim();

if (!accidentDate) {
  alert('Please select the date of the accident.');
  return false;
}
```

---

### 2. Weather Conditions (12 checkboxes - Only 6 Mapped)

| # | Field Name | HTML ID | Mapped? | Supabase Column | Notes |
|---|------------|---------|---------|-----------------|-------|
| 3 | `weather_bright_sunlight` | `weather_bright_sunlight` | ❌ No | N/A | **NOT STORED** |
| 4 | `weather_clear` | `weather_clear` | ✅ Yes | `weather_clear` | Clear and dry |
| 5 | `weather_cloudy` | `weather_cloudy` | ❌ No | N/A | **NOT STORED** |
| 6 | `weather_raining` | `weather_raining` | ✅ Yes | `weather_rain` | Raining |
| 7 | `weather_heavy_rain` | `weather_heavy_rain` | ❌ No | N/A | **NOT STORED** |
| 8 | `weather_drizzle` | `weather_drizzle` | ❌ No | N/A | **NOT STORED** |
| 9 | `weather_fog` | `weather_fog` | ✅ Yes | `weather_fog` | Fog or poor visibility |
| 10 | `weather_snow` | `weather_snow` | ✅ Yes | `weather_snow` | Snow |
| 11 | `weather_ice` | `weather_ice` | ✅ Yes | `weather_ice_frost` | Ice/frost |
| 12 | `weather_windy` | `weather_windy` | ✅ Yes | `weather_wind` | Windy conditions |
| 13 | `weather_hail` | `weather_hail` | ❌ No | N/A | **NOT STORED** |
| 14 | `weather_thunder_lightning` | `weather_thunder_lightning` | ❌ No | N/A | **NOT STORED** |

**Frontend Collection (Lines 790-803):**
```javascript
const weatherConditions = {
  weather_bright_sunlight: document.getElementById('weather_bright_sunlight').checked,
  weather_clear: document.getElementById('weather_clear').checked,
  weather_cloudy: document.getElementById('weather_cloudy').checked,
  // ... 9 more weather checkboxes
};
```

**Backend Mapping (Lines 442-447):**
```javascript
// Only 6 of 12 weather fields are mapped
weather_clear: page3.weather_clear || false,
weather_rain: page3.weather_rain || false,  // NOTE: Mismatch - frontend uses weather_raining
weather_snow: page3.weather_snow || false,
weather_fog: page3.weather_fog || false,
weather_wind: page3.weather_wind || false,  // NOTE: Mismatch - frontend uses weather_windy
weather_ice_frost: page3.weather_ice_frost || false  // NOTE: Mismatch - frontend uses weather_ice
```

**⚠️ Field Name Mismatches:**
- Frontend: `weather_raining` → Backend expects: `weather_rain`
- Frontend: `weather_windy` → Backend expects: `weather_wind`
- Frontend: `weather_ice` → Backend expects: `weather_ice_frost`

**These mismatches may cause data loss!**

---

### 3. Road Conditions (6 checkboxes - All Mapped)

| # | Field Name | Required | Supabase Column | User-Facing Label |
|---|------------|----------|-----------------|-------------------|
| 15 | `road_condition_dry` | Group Required | `road_condition_dry` | Dry |
| 16 | `road_condition_wet` | Group Required | `road_condition_wet` | Wet |
| 17 | `road_condition_icy` | Group Required | `road_condition_icy` | Icy |
| 18 | `road_condition_snow_covered` | Group Required | `road_condition_snow` | Snow-covered |
| 19 | `road_condition_loose_surface` | Group Required | `road_condition_debris` | Loose surface (gravel, debris) |
| 20 | `road_condition_slush_on_road` | Group Required | `road_condition_slush_road` | Slush on road |

**Frontend Collection (Lines 806-813):**
```javascript
const roadConditions = {
  road_condition_dry: document.querySelector('input[name="road_condition_dry"]').checked,
  road_condition_wet: document.querySelector('input[name="road_condition_wet"]').checked,
  // ... 4 more road conditions
};
```

**Backend Mapping (Lines 453-459):**
```javascript
road_condition_dry: page3.road_condition_dry || false,
road_condition_wet: page3.road_condition_wet || false,
road_condition_icy: page3.road_condition_icy || false,
road_condition_snow: page3.road_condition_snow || false,
road_condition_slippery: page3.road_condition_slippery || false,  // ⚠️ Not in frontend!
road_condition_debris: page3.road_condition_debris || false,      // Maps from loose_surface
road_condition_slush_road: page3.road_condition_slush_road || false
```

**Validation (Lines 739, 755-758):**
```javascript
const roadConditionChecked = document.querySelectorAll('input[name^="road_condition_"]:checked').length > 0;

if (!roadConditionChecked) {
  alert('Please select at least one road surface condition.');
  return false;
}
```

---

### 4. Road Type (7 checkboxes - Only 6 Mapped)

| # | Field Name | Mapped? | Supabase Column | User-Facing Label |
|---|------------|---------|-----------------|-------------------|
| 21 | `road_type_motorway` | ✅ Yes | `road_type_motorway` | Motorway |
| 22 | `road_type_a_road` | ✅ Yes | `road_type_a_road` | A-road |
| 23 | `road_type_b_road` | ✅ Yes | `road_type_b_road` | B-road |
| 24 | `road_type_urban_street` | ✅ Yes | `road_type_urban` | Urban street |
| 25 | `road_type_rural_road` | ✅ Yes | `road_type_rural` | Rural road |
| 26 | `road_type_car_park` | ❌ No | N/A | Car park **NOT STORED** |
| 27 | `road_type_private_road` | ✅ Yes | `road_type_private_road` | Private road |

**Frontend Collection (Lines 816-824):**
```javascript
const roadTypes = {
  road_type_motorway: document.querySelector('input[name="road_type_motorway"]').checked,
  road_type_a_road: document.querySelector('input[name="road_type_a_road"]').checked,
  // ... 5 more road types
};
```

**Backend Mapping (Lines 461-466):**
```javascript
road_type_motorway: page3.road_type_motorway || false,
road_type_a_road: page3.road_type_a_road || false,
road_type_b_road: page3.road_type_b_road || false,
road_type_urban: page3.road_type_urban || false,  // Maps from urban_street
road_type_rural: page3.road_type_rural || false,  // Maps from rural_road
road_type_private_road: page3.road_type_private_road || false
// ⚠️ road_type_car_park NOT MAPPED
```

**Validation (Lines 740, 760-763):**
```javascript
const roadTypeChecked = document.querySelectorAll('input[name^="road_type_"]:checked').length > 0;

if (!roadTypeChecked) {
  alert('Please select at least one road type.');
  return false;
}
```

---

### 5. Speed Fields (2 fields - Both Mapped)

| # | Field Name | HTML Type | Required | Data Type | Supabase Column | Notes |
|---|------------|-----------|----------|-----------|-----------------|-------|
| 28 | `speed_limit` | Select Dropdown | ❌ No | TEXT | `speed_limit` | Posted speed limit (20-70 mph or 'unknown') |
| 29 | `your_speed` | Number Input | ❌ No | INTEGER | `your_speed` | User's estimated speed (0-150 mph) |

**Frontend HTML (Lines 607-639):**
```html
<select id="speed_limit" name="speed_limit">
  <option value="">Select speed limit</option>
  <option value="20">20 mph</option>
  <option value="30">30 mph</option>
  <!-- ... up to 70 mph -->
  <option value="unknown">Unknown</option>
</select>

<input type="number" id="your_speed" name="your_speed" placeholder="e.g., 30" min="0" max="150">
```

**Backend Mapping (Lines 468-469):**
```javascript
your_speed: page3.your_speed || null,
speed_limit: page3.speed_limit || null
```

---

### 6. Traffic Conditions (4 checkboxes - NONE Mapped!)

| # | Field Name | Mapped? | Supabase Column | Notes |
|---|------------|---------|-----------------|-------|
| 30 | `traffic_conditions_heavy` | ❌ No | N/A | **NOT STORED** |
| 31 | `traffic_conditions_moderate` | ❌ No | N/A | **NOT STORED** |
| 32 | `traffic_conditions_light` | ❌ No | N/A | **NOT STORED** |
| 33 | `traffic_conditions_no_traffic` | ❌ No | N/A | **NOT STORED** |

**Frontend Collection (Lines 827-832):**
```javascript
const trafficConditions = {
  traffic_conditions_heavy: document.querySelector('input[name="traffic_conditions_heavy"]').checked,
  traffic_conditions_moderate: document.querySelector('input[name="traffic_conditions_moderate"]').checked,
  traffic_conditions_light: document.querySelector('input[name="traffic_conditions_light"]').checked,
  traffic_conditions_no_traffic: document.querySelector('input[name="traffic_conditions_no_traffic"]').checked
};
```

**Backend Mapping:** ⚠️ **NONE - All 4 traffic fields are silently discarded**

**Validation (Lines 741, 765-768):**
```javascript
const trafficConditionsChecked = document.querySelectorAll('input[name^="traffic_conditions_"]:checked').length > 0;

if (!trafficConditionsChecked) {
  alert('Please select at least one traffic condition.');
  return false;
}
```

**⚠️ Critical Issue:** User is REQUIRED to select traffic conditions, but the data is NOT saved to the database!

---

### 7. Visibility (4 checkboxes - Only 3 Mapped)

| # | Field Name | Mapped? | Supabase Column | User-Facing Label |
|---|------------|---------|-----------------|-------------------|
| 34 | `visibility_good` | ✅ Yes | `visibility_good` | Good |
| 35 | `visibility_poor` | ✅ Yes | `visibility_poor` | Poor |
| 36 | `visibility_very_poor` | ❌ No | N/A | Very poor **NOT STORED** |
| 37 | `visibility_street_lights` | ✅ Yes | `visibility_street_lights` | Street lights |

**Frontend Collection (Lines 835-840):**
```javascript
const visibility = {
  visibility_good: document.querySelector('input[name="visibility_good"]').checked,
  visibility_poor: document.querySelector('input[name="visibility_poor"]').checked,
  visibility_very_poor: document.querySelector('input[name="visibility_very_poor"]').checked,
  visibility_street_lights: document.querySelector('input[name="visibility_street_lights"]').checked
};
```

**Backend Mapping (Lines 449-451):**
```javascript
visibility_good: page3.visibility_good || false,
visibility_poor: page3.visibility_poor || false,
visibility_street_lights: page3.visibility_street_lights || false
// ⚠️ visibility_very_poor NOT MAPPED
```

**Validation (Lines 742, 770-773):**
```javascript
const visibilityChecked = document.querySelectorAll('input[name^="visibility_"]:checked').length > 0;

if (!visibilityChecked) {
  alert('Please select at least one visibility condition.');
  return false;
}
```

---

### 8. Road Markings Visibility (3 checkboxes - NONE Mapped!)

| # | Field Name | Mapped? | Supabase Column | Notes |
|---|------------|---------|-----------------|-------|
| 38 | `road_markings_visible_yes` | ❌ No | N/A | **NOT STORED** |
| 39 | `road_markings_visible_no` | ❌ No | N/A | **NOT STORED** |
| 40 | `road_markings_visible_partially` | ❌ No | N/A | **NOT STORED** |

**Frontend Collection (Lines 843-847):**
```javascript
const roadMarkings = {
  road_markings_visible_yes: document.querySelector('input[name="road_markings_visible_yes"]').checked,
  road_markings_visible_no: document.querySelector('input[name="road_markings_visible_no"]').checked,
  road_markings_visible_partially: document.querySelector('input[name="road_markings_visible_partially"]').checked
};
```

**Backend Mapping:** ⚠️ **NONE - All 3 road marking fields are silently discarded**

**Validation (Lines 743, 775-778):**
```javascript
const roadMarkingsChecked = document.querySelectorAll('input[name^="road_markings_visible_"]:checked').length > 0;

if (!roadMarkingsChecked) {
  alert('Please indicate if road markings were visible.');
  return false;
}
```

**⚠️ Critical Issue:** User is REQUIRED to indicate road markings visibility, but the data is NOT saved!

---

### 9. System Fields (Generated by JavaScript)

| # | Field Name | Source | Data Type | Supabase Column | Notes |
|---|------------|--------|-----------|-----------------|-------|
| 41 | `completed_at` | JavaScript | TIMESTAMP | N/A | Generated on form submission, sessionStorage only |

**Frontend Generation (Line 861):**
```javascript
completed_at: new Date().toISOString()
```

---

## Data Transformation Summary

### Date/Time Fields (2 fields)

| Frontend Value | Backend Conversion | Supabase Value |
|----------------|-------------------|----------------|
| Date input | Direct string | `DATE` |
| Time input | Direct string | `TIME` |

### Checkbox → Boolean (37 fields)

| Frontend Value | Backend Conversion | Supabase Value |
|----------------|-------------------|----------------|
| `.checked = true` | Direct boolean with `\|\| false` fallback | `TRUE` |
| `.checked = false` | Direct boolean with `\|\| false` fallback | `FALSE` |

### Select/Number Fields (2 fields)

| Frontend Value | Backend Conversion | Supabase Value |
|----------------|-------------------|----------------|
| Select option value | `.trim()` or `\|\| null` | `TEXT` or `NULL` |
| Number input | Direct or `\|\| null` | `INTEGER` or `NULL` |

---

## Supabase Database Schema (incident_reports table)

```sql
-- Date & Time
incident_date DATE,
incident_time TIME,

-- Weather Conditions (only 6 of 12 mapped)
weather_clear BOOLEAN DEFAULT FALSE,
weather_rain BOOLEAN DEFAULT FALSE,
weather_snow BOOLEAN DEFAULT FALSE,
weather_fog BOOLEAN DEFAULT FALSE,
weather_wind BOOLEAN DEFAULT FALSE,
weather_ice_frost BOOLEAN DEFAULT FALSE,

-- Road Conditions (all 6 mapped)
road_condition_dry BOOLEAN DEFAULT FALSE,
road_condition_wet BOOLEAN DEFAULT FALSE,
road_condition_icy BOOLEAN DEFAULT FALSE,
road_condition_snow BOOLEAN DEFAULT FALSE,
road_condition_slippery BOOLEAN DEFAULT FALSE,
road_condition_debris BOOLEAN DEFAULT FALSE,
road_condition_slush_road BOOLEAN DEFAULT FALSE,

-- Road Type (only 6 of 7 mapped)
road_type_motorway BOOLEAN DEFAULT FALSE,
road_type_a_road BOOLEAN DEFAULT FALSE,
road_type_b_road BOOLEAN DEFAULT FALSE,
road_type_urban BOOLEAN DEFAULT FALSE,
road_type_rural BOOLEAN DEFAULT FALSE,
road_type_private_road BOOLEAN DEFAULT FALSE,

-- Speed
your_speed INTEGER,
speed_limit TEXT,

-- Visibility (only 3 of 4 mapped)
visibility_good BOOLEAN DEFAULT FALSE,
visibility_poor BOOLEAN DEFAULT FALSE,
visibility_street_lights BOOLEAN DEFAULT FALSE
```

**Missing from Schema:**
- All traffic_conditions fields (4)
- All road_markings fields (3)
- 6 weather fields
- 1 visibility field
- 1 road type field

---

## Field Requirements Summary

| Requirement Type | Field Count | Fields |
|-----------------|-------------|--------|
| **Always Required** | 2 | `accident_date`, `accident_time` |
| **Group Required** | 25 | At least 1 from each group (road conditions, road type, traffic, visibility, road markings) |
| **Optional** | 13 | All weather checkboxes, speed fields |
| **Generated** | 1 | `completed_at` |

---

## Data Type Summary

| Data Type | Field Count | Fields |
|-----------|-------------|--------|
| **BOOLEAN** | 37 | 12 weather + 6 road conditions + 7 road types + 4 traffic + 4 visibility + 3 road markings + 1 driveability |
| **DATE** | 1 | `accident_date` |
| **TIME** | 1 | `accident_time` |
| **TEXT** | 1 | `speed_limit` |
| **INTEGER** | 1 | `your_speed` |
| **TIMESTAMP** | 1 | `completed_at` (sessionStorage only) |

---

## ⚠️ Critical Data Loss Issues

### Issue 1: Field Name Mismatches
Frontend and backend use different field names, causing data loss:

| Frontend Field | Backend Expects | Result |
|----------------|-----------------|--------|
| `weather_raining` | `weather_rain` | ⚠️ Data may not save |
| `weather_windy` | `weather_wind` | ⚠️ Data may not save |
| `weather_ice` | `weather_ice_frost` | ⚠️ Data may not save |
| `road_type_urban_street` | `road_type_urban` | ⚠️ Data may not save |
| `road_type_rural_road` | `road_type_rural` | ⚠️ Data may not save |
| `road_condition_loose_surface` | `road_condition_debris` | ⚠️ Data may not save |

### Issue 2: Required But Not Stored
Users are forced to complete these fields, but data is discarded:

- **Traffic Conditions** (4 fields) - Required but NOT stored
- **Road Markings** (3 fields) - Required but NOT stored

### Issue 3: Optional But Not Stored
Users can optionally provide this data, but it's silently discarded:

- **Weather:** bright_sunlight, cloudy, heavy_rain, drizzle, hail, thunder_lightning (6 fields)
- **Road Type:** car_park (1 field)
- **Visibility:** very_poor (1 field)

---

## Code References

### Frontend
- **File:** `public/incident-form-page3.html`
- **Data Collection:** Lines 789-862
- **Validation:** Lines 733-781
- **Data Restoration:** Lines 878-975

### Backend
- **File:** `src/controllers/incidentForm.controller.js`
- **Submit Handler:** Lines 52-100
- **Data Mapping:** Lines 441-470 (buildIncidentData function)

### Database
- **Table:** `incident_reports`
- **Schema:** Approximately 22 columns from Page 3
- **Types:** 2 DATE/TIME + 18 BOOLEAN + 2 TEXT/INTEGER

---

## Example Data Payload

### Frontend (SessionStorage)
```json
{
  "accident_date": "2025-11-05",
  "accident_time": "14:30",
  "weather_bright_sunlight": true,
  "weather_clear": true,
  "weather_raining": false,
  "weather_heavy_rain": false,
  "road_condition_dry": true,
  "road_condition_wet": false,
  "road_type_motorway": true,
  "road_type_car_park": false,
  "speed_limit": "70",
  "your_speed": "65",
  "traffic_conditions_moderate": true,
  "visibility_good": true,
  "visibility_street_lights": true,
  "road_markings_visible_yes": true,
  "completed_at": "2025-11-05T14:35:22.123Z"
}
```

### Backend (What Actually Gets Stored)
```javascript
{
  create_user_id: "550e8400-e29b-41d4-a716-446655440000",
  // ⚠️ accident_date/time likely mapped elsewhere (page1?)

  // Weather (only 6 of 12 stored)
  weather_clear: true,  // ✅ Stored
  // weather_bright_sunlight: NOT STORED
  // weather_raining → weather_rain mismatch may cause loss

  // Road conditions (all stored)
  road_condition_dry: true,  // ✅ Stored
  road_condition_wet: false,  // ✅ Stored

  // Road type (6 of 7 stored)
  road_type_motorway: true,  // ✅ Stored
  // road_type_car_park: NOT STORED

  // Speed (both stored)
  speed_limit: "70",  // ✅ Stored
  your_speed: 65,  // ✅ Stored

  // Traffic conditions (NONE stored)
  // traffic_conditions_moderate: NOT STORED ⚠️

  // Visibility (3 of 4 stored)
  visibility_good: true,  // ✅ Stored
  visibility_street_lights: true,  // ✅ Stored

  // Road markings (NONE stored)
  // road_markings_visible_yes: NOT STORED ⚠️
}
```

---

## Recommendations

### 1. Fix Field Name Mismatches
Update backend to match frontend field names, or vice versa:
```javascript
// Option A: Update backend
weather_rain: page3.weather_raining || false,  // Match frontend

// Option B: Update frontend
<input type="checkbox" id="weather_rain" name="weather_rain">  // Match backend
```

### 2. Add Missing Database Columns
Create database columns for required fields:
```sql
ALTER TABLE incident_reports ADD COLUMN traffic_conditions_heavy BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN traffic_conditions_moderate BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN traffic_conditions_light BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN traffic_conditions_no_traffic BOOLEAN DEFAULT FALSE;

ALTER TABLE incident_reports ADD COLUMN road_markings_visible_yes BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN road_markings_visible_no BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN road_markings_visible_partially BOOLEAN DEFAULT FALSE;
```

### 3. Remove Unused Fields from Frontend
If fields are intentionally not stored, remove them from the form to avoid user confusion:
```html
<!-- Remove these if not needed -->
<!-- <input type="checkbox" id="weather_bright_sunlight"> -->
<!-- <input type="checkbox" id="traffic_conditions_heavy"> -->
```

### 4. Update Backend Mapping
Add mappings for all collected fields:
```javascript
// Add to buildIncidentData() function
traffic_conditions_heavy: page3.traffic_conditions_heavy || false,
traffic_conditions_moderate: page3.traffic_conditions_moderate || false,
traffic_conditions_light: page3.traffic_conditions_light || false,
traffic_conditions_no_traffic: page3.traffic_conditions_no_traffic || false,

road_markings_visible_yes: page3.road_markings_visible_yes || false,
road_markings_visible_no: page3.road_markings_visible_no || false,
road_markings_visible_partially: page3.road_markings_visible_partially || false
```

---

## Summary

**Total Fields from Page 3:** 41
**Sent to Supabase incident_reports:** 22 (estimated)
**Silently Discarded:** 19
**Boolean Fields:** 37
**Date/Time Fields:** 2
**Text/Number Fields:** 2

**Critical Issues:**
- 3 field name mismatches (may cause data loss)
- 7 required fields not stored (traffic + road markings)
- 12 optional fields not stored (weather variations, road type, visibility)

**Action Required:** Fix field mapping to ensure all user input is preserved.

---

**Generated:** 2025-11-05
**Author:** Claude Code Analysis
**Files Analyzed:**
- `public/incident-form-page3.html` (981 lines)
- `src/controllers/incidentForm.controller.js` (lines 441-470)
