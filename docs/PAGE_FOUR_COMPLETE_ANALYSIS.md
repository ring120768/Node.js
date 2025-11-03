# PAGE FOUR (LOCATION & JUNCTION) - Complete Analysis

**Date:** 2025-01-03
**Status:** 🔍 ANALYSIS IN PROGRESS
**HTML Field Names:** 10
**Actual Data Points:** 24+
**Your CSV:** "Page 4 Location (21)"

---

## 📊 Current State - HTML Form Structure

### Section 1: Precise Location (3 fields)

| Field Name | Type | Required | Purpose |
|------------|------|----------|---------|
| `what3words` | text input | optional | what3words address (e.g. ///filled.count.soap) |
| `location` | textarea | **required** | Full address or location description |
| `nearestlandmark` | text input | optional | Nearest landmark or notable feature |

### Section 2: Junction / Intersection Details (4 fields)

| Field Name | Type | Required | Purpose |
|------------|------|----------|---------|
| `junctiontype` | dropdown | **required** | Type of junction (T-junction, roundabout, etc.) |
| `junctioncontrol` | dropdown | conditional* | What controlled the junction (traffic lights, stop sign, etc.) |
| `trafficlightstatus` | dropdown | conditional** | Traffic light colour for your direction |
| `usermanoeuvre` | dropdown | conditional* | What you were doing when collision occurred |

*Required if `junctiontype` is NOT "not_junction" or "straight_road"
**Required if `junctioncontrol` is "traffic_lights"

**Junction Type Options (12):**
- straight_road
- not_junction
- t_junction
- crossroads
- y_junction
- staggered_junction
- roundabout
- mini_roundabout
- multi_lane_roundabout
- slip_road
- box_junction
- not_sure

**Junction Control Options (5):**
- traffic_lights
- stop_sign
- give_way_sign
- uncontrolled
- not_sure

**Traffic Light Status Options (6):**
- green
- amber
- red
- green_filter
- not_working
- not_sure

**User Manoeuvre Options (8):**
- going_straight
- turning_left
- turning_right
- waiting_to_turn_right
- waiting_at_line
- entering_from_minor
- already_in_junction
- other

### Section 3: Special Road Conditions & Hazards (1 field name, 11 values)

**Field:** `specialconditions` (checkbox array)

**Values (11 checkboxes):**
1. `roadworks` - Roadworks or construction
2. `workmen_in_road` - Workmen in road
3. `cyclists_in_road` - Cyclists in road
4. `pedestrians_in_road` - Pedestrians in road
5. `traffic_calming` - Traffic calming measures (speed bumps, chicanes)
6. `parked_vehicles` - Parked vehicles obstructing view
7. `pedestrian_crossing` - Near pedestrian crossing
8. `school_zone` - School zone or playground area
9. `narrow_road` - Narrow road or single-track
10. `pot_holes_road_defects` - Pot holes and road defects
11. `oil_spills` - Oil spills on road surface

### Section 4: Visibility Issues (1 field name, 5 values)

**Field:** `visibilityfactors` (checkbox array)

**Values (5 checkboxes):**
1. `clear_visibility` - Clear visibility - no issues
2. `restricted_by_structure` - Restricted by hedge, wall, or fence
3. `restricted_by_bend` - Restricted by bend or corner
4. `large_vehicle` - Large vehicle obstructing view (lorry, bus, van)
5. `sun_glare` - Sun glare or low sun

### Section 5: Additional Hazards (1 field)

| Field Name | Type | Required | Purpose |
|------------|------|----------|---------|
| `additionalhazards` | textarea | optional | Additional hazards or conditions not covered above |

---

## 🗄️ Database Schema Options

### Option A: Array Storage (PostgreSQL TEXT[] - RECOMMENDED)

**Advantages:**
- Clean, normalized storage
- Single query to get all selections
- Easy to add/remove values without migrations
- Smaller table (fewer columns)

**Database Columns Needed:**
```sql
-- Location (3 columns)
what3words TEXT,
location TEXT NOT NULL,
nearestlandmark TEXT,

-- Junction (4 columns)
junctiontype TEXT NOT NULL,
junctioncontrol TEXT,
trafficlightstatus TEXT,
usermanoeuvre TEXT,

-- Arrays (2 columns)
specialconditions TEXT[],
visibilityfactors TEXT[],

-- Additional (1 column)
additionalhazards TEXT

-- TOTAL: 11 database columns
```

**Controller Example:**
```javascript
specialconditions: ['roadworks', 'narrow_road', 'pot_holes_road_defects'],
visibilityfactors: ['sun_glare']
```

### Option B: Individual Boolean Columns (Current DB has both!)

**Advantages:**
- Direct mapping to PDF checkboxes
- Easy to query individual conditions
- Clear column names

**Disadvantages:**
- Many columns (16 extra for checkboxes)
- Need migration to add new conditions
- Harder to maintain

**Database Columns Needed:**
```sql
-- Location (3)
what3words, location, nearestlandmark

-- Junction (4)
junctiontype, junctioncontrol, trafficlightstatus, usermanoeuvre

-- Special Conditions (11 individual booleans)
special_condition_roadworks BOOLEAN,
special_condition_workmen_in_road BOOLEAN,
special_condition_cyclists_in_road BOOLEAN,
special_condition_pedestrians_in_road BOOLEAN,
special_condition_traffic_calming BOOLEAN,
special_condition_parked_vehicles BOOLEAN,
special_condition_pedestrian_crossing BOOLEAN,
special_condition_school_zone BOOLEAN,
special_condition_narrow_road BOOLEAN,
special_condition_pot_holes_road_defects BOOLEAN,
special_condition_oil_spills BOOLEAN,

-- Visibility Factors (5 individual booleans)
visibility_factor_clear BOOLEAN,
visibility_factor_restricted_structure BOOLEAN,
visibility_factor_restricted_bend BOOLEAN,
visibility_factor_large_vehicle BOOLEAN,
visibility_factor_sun_glare BOOLEAN,

-- Additional (1)
additionalhazards TEXT

-- TOTAL: 24 database columns
```

### Current Database State (Mixed Approach!)

Database currently has:
- ✅ `what3words` (TEXT)
- ✅ `location` (TEXT)
- ❌ `nearestlandmark` - **MISSING**
- ✅ `junctiontype` (TEXT)
- ✅ `junctioncontrol` (TEXT)
- ❌ `trafficlightstatus` - **MISSING**
- ❌ `usermanoeuvre` - **MISSING**
- ✅ `specialconditions` (appears to be TEXT[] array)
- ✅ `visibilityfactors` (appears to be TEXT[] array)
- ❌ `additionalhazards` - **MISSING**

**PLUS legacy individual boolean columns:**
- `special_conditions_roadworks`
- `special_conditions_workman`
- `special_conditions_defective_road`
- `special_conditions_oil_spills`
- `special_conditions_animals`
- `junction_information_roundabout`
- `junction_information_t_junction`
- `junction_information_traffic_lights`
- `junction_information_crossroads`
- ...and more

---

## 📄 PDF Fields Mapping

### Location Fields

| HTML Field | Database Column | PDF Field | Status |
|------------|----------------|-----------|--------|
| `what3words` | `what3words` | `what3words_address` | ✅ MAPPED |
| `location` | `location` | `full_address_location_description` | ✅ MAPPED |
| `nearestlandmark` | `nearestlandmark` | `nearest_landmark` | 🔧 DB COLUMN MISSING |

### Junction Fields

| HTML Field | Database Column | PDF Field | Status |
|------------|----------------|-----------|--------|
| `junctiontype` | `junctiontype` | `what_type_of_junction_was_it` | ✅ MAPPED |
| `junctioncontrol` | `junctioncontrol` | `what_controlled_this_junction` | ✅ MAPPED |
| `trafficlightstatus` | `trafficlightstatus` | `what _color_were_traffic _lights` | 🔧 DB COLUMN MISSING |
| `usermanoeuvre` | `usermanoeuvre` | ❓ | 🔧 DB COLUMN MISSING, PDF FIELD UNKNOWN |

### Special Conditions (Checkbox Array → Individual PDF Checkboxes)

**HTML:** `specialconditions` array with 11 values
**Database:** `specialconditions` TEXT[] array OR individual booleans
**PDF:** Individual checkbox fields

| HTML Checkbox Value | PDF Field | Status |
|---------------------|-----------|--------|
| `roadworks` | `special_conditions_roadworks` | ✅ MAPPED |
| `workmen_in_road` | `special_conditions_workman` | ✅ MAPPED |
| `cyclists_in_road` | `special_conditions_cyclists` | ✅ MAPPED |
| `pedestrians_in_road` | `special_conditions_pedestrians` | ✅ MAPPED |
| `traffic_calming` | `special_conditions_traffic_calming` | ✅ MAPPED |
| `parked_vehicles` | ❓ No exact match | ⚠️ MIGHT MAP TO `special_conditions_large_vehicle` |
| `pedestrian_crossing` | `special_conditions_pedestrian_crossing` | ✅ MAPPED |
| `school_zone` | `special_conditions_school` | ✅ MAPPED |
| `narrow_road` | `special_conditions_narrow_road` | ✅ MAPPED |
| `pot_holes_road_defects` | `special_conditions_pot_holes` | ✅ MAPPED |
| `oil_spills` | `special_conditions_oil_spills` | ✅ MAPPED |

**PDF has additional special conditions NOT in HTML:**
- `special_conditions_defective_road` (now covered by `pot_holes_road_defects`)
- `special_conditions_hedgerow` (mapped from `visibilityfactors: restricted_by_structure`)
- `special_conditions_animals`

### Visibility Factors (Checkbox Array → Individual PDF Checkboxes?)

**HTML:** `visibilityfactors` array with 5 values
**Database:** `visibilityfactors` TEXT[] array
**PDF:** Likely individual checkboxes (need to verify)

| HTML Checkbox Value | PDF Field | Status |
|---------------------|-----------|--------|
| `clear_visibility` | ❓ | 🔍 NEED TO FIND |
| `restricted_by_structure` | `special_conditions_hedgerow`? | ⚠️ UNCLEAR |
| `restricted_by_bend` | ❓ | 🔍 NEED TO FIND |
| `large_vehicle` | `special_conditions_large_vehicle` | ⚠️ OVERLAP WITH SPECIAL CONDITIONS |
| `sun_glare` | `special_conditions_sun_glare` | ⚠️ IN "SPECIAL CONDITIONS" NOT "VISIBILITY" |

**Note:** PDF seems to combine visibility factors into "special_conditions" checkboxes!

### Additional Hazards

| HTML Field | Database Column | PDF Field | Status |
|------------|----------------|-----------|--------|
| `additionalhazards` | `additionalhazards` | `special_conditions_additional_hazards` | 🔧 DB COLUMN MISSING |

### Bonus: Map Screenshot

**Not a form field but captured:**
- Stored in sessionStorage as `map_screenshot` (base64 data URL)
- PDF field: `what3Words_map_image_url`
- Needs separate upload handling

---

## 🚨 CRITICAL ISSUES

### Issue 1: Missing Database Columns (4 fields)
1. `nearestlandmark` - User can enter but won't be saved
2. `trafficlightstatus` - Critical for liability determination
3. `usermanoeuvre` - Critical for accident reconstruction
4. `additionalhazards` - User's additional context lost

**Impact:** HIGH - Critical data loss for legal purposes

**Solution:** Add these columns in migration

### Issue 2: Visibility Factors Mapped to Special Conditions in PDF
HTML separates "visibility factors" from "special conditions" but PDF combines them under "special_conditions" prefix.

**Impact:** MEDIUM - Data captured but categorized differently

**Solution:** Map visibility factors to special_conditions_* PDF fields

### Issue 3: Missing PDF Fields for HTML Checkboxes
- `parked_vehicles` - No clear PDF mapping
- `restricted_by_bend` - No clear PDF mapping
- `clear_visibility` - No clear PDF mapping

**Impact:** MEDIUM - User selections may not appear in PDF

**Solution:**
- Add new PDF checkboxes OR
- Map to closest existing PDF field OR
- Log warning when these selected

### Issue 4: PDF Has Extra Fields Not in HTML
PDF has special conditions not captured in HTML form:
- oil_spills
- defective_road
- pot_holes
- animals

**Impact:** LOW - PDF more comprehensive, but HTML form doesn't collect this data

**Solution:**
- Add these checkboxes to HTML form? OR
- Leave as future enhancement

---

## 📝 Recommended Approach

### Use PostgreSQL TEXT[] Arrays

**Rationale:**
1. Clean, modern approach
2. Fewer columns (11 vs 24)
3. Easy to add new values
4. Matches HTML form structure
5. PDF mapping layer handles array → individual checkboxes

### Database Changes Needed

```sql
-- Migration 006: Add Page Four missing columns

-- Add missing location/junction fields
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS nearestlandmark TEXT,
ADD COLUMN IF NOT EXISTS trafficlightstatus TEXT,
ADD COLUMN IF NOT EXISTS usermanoeuvre TEXT,
ADD COLUMN IF NOT EXISTS additionalhazards TEXT;

-- Arrays already exist (verify types)
-- specialconditions should be TEXT[]
-- visibilityfactors should be TEXT[]

COMMENT ON COLUMN incident_reports.nearestlandmark IS 'Nearest landmark to accident location (Page Four)';
COMMENT ON COLUMN incident_reports.trafficlightstatus IS 'Traffic light colour at time of accident (Page Four)';
COMMENT ON COLUMN incident_reports.usermanoeuvre IS 'User manoeuvre when collision occurred (Page Four)';
COMMENT ON COLUMN incident_reports.additionalhazards IS 'Additional hazards not covered by checkboxes (Page Four)';
```

---

## 📋 Controller Implementation

```javascript
// src/controllers/incidentController.js
async savePageFour(req, res) {
  const {
    // Location
    what3words,
    location,
    nearestlandmark,

    // Junction
    junctiontype,
    junctioncontrol,
    trafficlightstatus,
    usermanoeuvre,

    // Arrays from checkboxes
    special_conditions,  // Array from req.body
    visibility_factors,   // Array from req.body

    // Additional
    additionalhazards
  } = req.body;

  // Handle checkbox arrays - Express sends arrays for multiple checkboxes with same name
  const specialConditionsArray = Array.isArray(special_conditions)
    ? special_conditions
    : (special_conditions ? [special_conditions] : []);

  const visibilityFactorsArray = Array.isArray(visibility_factors)
    ? visibility_factors
    : (visibility_factors ? [visibility_factors] : []);

  const { data, error } = await supabase
    .from('incident_reports')
    .upsert({
      auth_user_id: req.user.id,

      // Location
      what3words,
      location,
      nearestlandmark,

      // Junction
      junctiontype,
      junctioncontrol: junctioncontrol || null,
      trafficlightstatus: trafficlightstatus || null,
      usermanoeuvre: usermanoeuvre || null,

      // Arrays (PostgreSQL TEXT[])
      specialconditions: specialConditionsArray,
      visibilityfactors: visibilityFactorsArray,

      // Additional
      additionalhazards,

      updated_at: new Date().toISOString()
    }, {
      onConflict: 'auth_user_id'
    })
    .select()
    .single();

  if (error) {
    logger.error('Error saving Page Four data', error);
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.json({ success: true, data });
}
```

---

## 📄 PDF Mapping Implementation

```javascript
// src/services/adobePdfService.js - Page Four mapping
const pageFourData = {
  // Location
  what3words_address: data.what3words || '',
  full_address_location_description: data.location || '',
  nearest_landmark: data.nearestlandmark || '',

  // Junction
  what_type_of_junction_was_it: data.junctiontype || '',
  what_controlled_this_junction: data.junctioncontrol || '',
  'what _color_were_traffic _lights': data.trafficlightstatus || '',  // Note space in PDF field name

  // Special Conditions - Map array to individual checkboxes
  special_conditions_roadworks: data.specialconditions?.includes('roadworks') ? 'Yes' : 'No',
  special_conditions_workman: data.specialconditions?.includes('workmen_in_road') ? 'Yes' : 'No',
  special_conditions_cyclists: data.specialconditions?.includes('cyclists_in_road') ? 'Yes' : 'No',
  special_conditions_pedestrians: data.specialconditions?.includes('pedestrians_in_road') ? 'Yes' : 'No',
  special_conditions_traffic_calming: data.specialconditions?.includes('traffic_calming') ? 'Yes' : 'No',
  special_conditions_pedestrian_crossing: data.specialconditions?.includes('pedestrian_crossing') ? 'Yes' : 'No',
  special_conditions_school: data.specialconditions?.includes('school_zone') ? 'Yes' : 'No',
  special_conditions_narrow_road: data.specialconditions?.includes('narrow_road') ? 'Yes' : 'No',
  special_conditions_pot_holes: data.specialconditions?.includes('pot_holes_road_defects') ? 'Yes' : 'No',
  special_conditions_oil_spills: data.specialconditions?.includes('oil_spills') ? 'Yes' : 'No',

  // Visibility Factors - Map to special_conditions in PDF
  special_conditions_hedgerow: data.visibilityfactors?.includes('restricted_by_structure') ? 'Yes' : 'No',
  special_conditions_large_vehicle: data.visibilityfactors?.includes('large_vehicle') || data.specialconditions?.includes('parked_vehicles') ? 'Yes' : 'No',
  special_conditions_sun_glare: data.visibilityfactors?.includes('sun_glare') ? 'Yes' : 'No',

  // Additional hazards
  special_conditions_additional_hazards: data.additionalhazards || '',

  // Map screenshot (if uploaded separately)
  what3Words_map_image_url: data.map_screenshot_url || ''
};
```

---

## ⚠️ Unmapped Fields Warning

**HTML fields with no PDF mapping:**
- `parked_vehicles` (special condition)
- `restricted_by_bend` (visibility factor)
- `clear_visibility` (visibility factor)
- `usermanoeuvre` (junction detail)

**PDF fields with no HTML input:**
- `special_conditions_defective_road` (now covered by `pot_holes_road_defects`)
- `special_conditions_animals`

---

## ✅ Summary

**After Migration 006:**
- ✅ 10/10 field names have database storage
- ✅ All 24 data points can be saved (arrays + text fields)
- ⚠️ 5 HTML selections have no PDF mapping
- ⚠️ 4 PDF checkboxes have no HTML input

**Data Loss:**
- **Before migration:** 4 fields lost (nearestlandmark, trafficlightstatus, usermanoeuvre, additionalhazards)
- **After migration:** 0 database loss, 5 PDF unmapped (acceptable - can add PDF fields later)

---

**Last Updated:** 2025-01-03
**Status:** ⏳ Awaiting migration 006
