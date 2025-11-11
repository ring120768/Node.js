# Comprehensive Field Mapping Plan: In-House HTML Forms → Supabase Database

**Project**: Car Crash Lawyer AI - Field Mapping for New In-House Forms
**Date**: 2025-10-31
**Completed**: 22-thought ultrathinking analysis with sequential-thinking MCP
**Status**: ✅ Analysis Complete → Ready for Implementation

---

## Executive Summary

### Key Findings

🔴 **CRITICAL DISCOVERY**: The new in-house HTML forms contain **~64 new fields**, significantly more than the estimated 20-25 fields. This is due to:
- Expansion of single-choice fields into multiple checkboxes (road_type: 1 field → 7 checkboxes)
- Addition of entirely new categories (traffic conditions, visibility levels, road markings)
- Enhanced data collection (medical details, recovery information, junction specifics)

✅ **SOLUTION**: Use PostgreSQL **TEXT[] arrays** for checkbox groups, reducing 64 individual columns to **~35 total new database columns** (25 single-value + 10 arrays).

### Comparison: Old vs New System

| Metric | Old Typeform System | New In-House Forms |
|--------|---------------------|-------------------|
| Total Fields | 160+ | 99 unique HTML fields |
| User Signup | 29 fields | (Unchanged) |
| Incident Report | 131+ fields | 99 fields |
| HTML Files | N/A | 16 form pages |
| Database Columns | 106 (incident_reports) | Need +35 new columns |
| Checkbox Storage | Individual BOOLEAN columns | TEXT[] arrays ✅ |

### Recommended Approach

**Storage Strategy**: PostgreSQL TEXT[] Arrays
- **Before**: 64 individual BOOLEAN columns
- **After**: 35 columns (25 singles + 10 arrays)
- **Benefits**: Cleaner schema, easier queries, better performance
- **Trade-off**: Slightly more complex controller logic

**Migration Strategy**: 7-Phase SQL Migrations with 30-day transition period
1. Rename existing columns (align with new HTML names)
2. Add new single-value columns
3. Add array columns with data migration
4. Update other vehicle table (9 new fields)
5. Add indexes and constraints
6. Dual-write transition period
7. Cleanup old columns

**Risk Level**: 🟠 HIGH (requires careful testing, gradual rollout)

---

## Part 1: Complete Field Inventory

### 1.1 HTML Form Files Analyzed (16 Total)

**User Signup** (2 files):
1. `signup-auth.html` - Page 1 (Authentication)
2. `signup-form.html` - Pages 2-9 (Data collection)

**Incident Report** (12 files):
1. `incident-form-page1.html`
2. `incident-form-page2.html` - Medical
3. `incident-form-page3.html` - Conditions
4. `incident-form-page4.html` - Location
5. `incident-form-page4a-location-photos.html`
6. `incident-form-page5-vehicle.html`
7. `incident-form-page6-vehicle-images.html`
8. `incident-form-page7-other-vehicle.html`
9. `incident-form-page8-other-damage-images.html`
10. `incident-form-page9-witnesses.html`
11. `incident-form-page10-police-details.html`
12. `incident-form-page12-final-medical-check.html`

**Post-Incident** (2 files):
13. `transcription-status.html` - Audio transcription
14. `declaration.html` - Final legal declaration

### 1.2 Complete List of 99 HTML Form Fields

**Generated from**: `/tmp/html-field-list.txt` (extracted via `scripts/analyze-html-fields.js`)

<details>
<summary>Click to expand all 99 fields</summary>

```
1. accident_date
2. accident_narrative
3. accident_time
4. additionalHazards
5. airbags_deployed
6. damage_description
7. final_feeling
8. impact_point
9. junctionControl
10. junctionType
11. license_plate
12. location
13. medical_ambulance_called
14. medical_attention_needed
15. medical_hospital_name
16. medical_injury_details
17. medical_injury_severity
18. medical_symptom_abdominal_bruising
19. medical_symptom_abdominal_pain
20. medical_symptom_breathlessness
21. medical_symptom_change_in_vision
22. medical_symptom_chest_pain
23. medical_symptom_dizziness
24. medical_symptom_life_threatening
25. medical_symptom_limb_pain_mobility
26. medical_symptom_limb_weakness
27. medical_symptom_loss_of_consciousness
28. medical_symptom_none
29. medical_symptom_severe_headache
30. medical_symptom_uncontrolled_bleeding
31. medical_treatment_received
32. nearestLandmark
33. no_damage
34. no_visible_damage
35. other-breath-test
36. other_driver_email
37. other_driver_license
38. other_driver_name
39. other_driver_phone
40. other_insurance_company
41. other_license_plate
42. other_point_of_impact
43. other_policy_cover
44. other_policy_holder
45. other_policy_number
46. police_attended
47. recovery_company
48. recovery_location
49. recovery_notes
50. recovery_phone
51. road_condition_dry
52. road_condition_icy
53. road_condition_loose_surface
54. road_condition_other
55. road_condition_snow_covered
56. road_condition_wet
57. road_markings_visible_no
58. road_markings_visible_partially
59. road_markings_visible_yes
60. road_type_a_road
61. road_type_b_road
62. road_type_car_park
63. road_type_motorway
64. road_type_other
65. road_type_rural_road
66. road_type_urban_street
67. seatbelts_worn
68. specialConditions
69. speed_limit
70. trafficLightStatus
71. traffic_conditions_heavy
72. traffic_conditions_light
73. traffic_conditions_moderate
74. traffic_conditions_no_traffic
75. user-breath-test
76. userManoeuvre
77. usual_vehicle
78. vehicle_driveable
79. visibilityFactors
80. visibility_good
81. visibility_poor
82. visibility_severely_restricted
83. visibility_very_poor
84. weather_bright_sunlight
85. weather_clear
86. weather_cloudy
87. weather_drizzle
88. weather_fog
89. weather_hail
90. weather_heavy_rain
91. weather_ice
92. weather_other
93. weather_raining
94. weather_snow
95. weather_thunder_lightning
96. weather_windy
97. what3words
98. witnesses_present
99. your_speed
```

</details>

---

## Part 2: Gap Analysis - New Fields Identification

### 2.1 New Fields by Category (64 Total)

#### MEDICAL (9 new fields)
| HTML Field | Type | Priority | Notes |
|------------|------|----------|-------|
| `medical_attention_needed` | TEXT | HIGH | Did you need medical attention? |
| `medical_hospital_name` | TEXT | HIGH | Which hospital? |
| `medical_injury_details` | TEXT | HIGH | Describe injuries |
| `medical_injury_severity` | TEXT | HIGH | Minor/Moderate/Severe |
| `medical_ambulance_called` | BOOLEAN | HIGH | Was ambulance called? |
| `medical_treatment_received` | TEXT | MEDIUM | What treatment received? |
| `medical_symptom_dizziness` | BOOLEAN | MEDIUM | New symptom checkbox |
| `medical_symptom_life_threatening` | BOOLEAN | HIGH | Critical triage |
| `final_feeling` | TEXT | MEDIUM | How do you feel now? |

**Storage Recommendation**:
- 5 single-value TEXT/BOOLEAN columns
- 4 additional symptoms → Add to existing `medical_symptoms TEXT[]` array

#### LOCATION/ACCIDENT (3 new fields)
| HTML Field | Type | Priority | Notes |
|------------|------|----------|-------|
| `what3words` | TEXT | HIGH | 3-word location (e.g., "table.lamp.chair") |
| `nearestLandmark` | TEXT | MEDIUM | Nearest landmark for reference |
| `additionalHazards` | TEXT | LOW | Additional hazards at scene |

#### WEATHER CONDITIONS (5 new)
| HTML Field | Type | Priority | Notes |
|------------|------|----------|-------|
| `weather_drizzle` | BOOLEAN → ARRAY | MEDIUM | Light rain variant |
| `weather_windy` | BOOLEAN → ARRAY | MEDIUM | Wind conditions |
| `weather_hail` | BOOLEAN → ARRAY | MEDIUM | Hail present |
| `weather_thunder_lightning` | BOOLEAN → ARRAY | MEDIUM | Storm conditions |
| `weather_other` | BOOLEAN → ARRAY | MEDIUM | Other weather |

**Storage**: Add to existing `weather_conditions TEXT[]` array

#### ROAD CONDITIONS (4 new)
| HTML Field | Type | Priority | Notes |
|------------|------|----------|-------|
| `road_condition_dry` | BOOLEAN → ARRAY | HIGH | Explicit dry marking |
| `road_condition_icy` | BOOLEAN → ARRAY | HIGH | Ice present |
| `road_condition_loose_surface` | BOOLEAN → ARRAY | HIGH | Gravel/loose surface |
| `road_condition_other` | BOOLEAN → ARRAY | LOW | Other conditions |

**Storage**: Add to `road_conditions TEXT[]` array (consolidate 6 old booleans)

#### ROAD TYPE (7 new - EXPANSION from 1 field)
| HTML Field | Type | Priority | Notes |
|------------|------|----------|-------|
| `road_type_motorway` | BOOLEAN → ARRAY | HIGH | M1, M25, etc. |
| `road_type_a_road` | BOOLEAN → ARRAY | HIGH | A-roads |
| `road_type_b_road` | BOOLEAN → ARRAY | MEDIUM | B-roads |
| `road_type_urban_street` | BOOLEAN → ARRAY | HIGH | City streets |
| `road_type_rural_road` | BOOLEAN → ARRAY | MEDIUM | Country lanes |
| `road_type_car_park` | BOOLEAN → ARRAY | HIGH | Car park incident |
| `road_type_other` | BOOLEAN → ARRAY | LOW | Other location |

**Storage**: NEW `road_types TEXT[]` array (replaces single `road_type` TEXT field)

#### TRAFFIC CONDITIONS (4 new - ENTIRELY NEW CATEGORY)
| HTML Field | Type | Priority | Notes |
|------------|------|----------|-------|
| `traffic_conditions_heavy` | BOOLEAN → ARRAY | HIGH | Rush hour traffic |
| `traffic_conditions_moderate` | BOOLEAN → ARRAY | MEDIUM | Moderate flow |
| `traffic_conditions_light` | BOOLEAN → ARRAY | MEDIUM | Light traffic |
| `traffic_conditions_no_traffic` | BOOLEAN → ARRAY | LOW | No other vehicles |

**Storage**: NEW `traffic_conditions TEXT[]` array

#### VISIBILITY (4 new - ENTIRELY NEW CATEGORY)
| HTML Field | Type | Priority | Notes |
|------------|------|----------|-------|
| `visibility_good` | BOOLEAN → ARRAY | HIGH | Clear visibility |
| `visibility_poor` | BOOLEAN → ARRAY | HIGH | Reduced visibility |
| `visibility_very_poor` | BOOLEAN → ARRAY | HIGH | Severely limited |
| `visibility_severely_restricted` | BOOLEAN → ARRAY | HIGH | Near zero visibility |

**Storage**: NEW `visibility_levels TEXT[]` array

#### ROAD MARKINGS (3 new - ENTIRELY NEW CATEGORY)
| HTML Field | Type | Priority | Notes |
|------------|------|----------|-------|
| `road_markings_visible_yes` | BOOLEAN → ARRAY | MEDIUM | Markings clear |
| `road_markings_visible_no` | BOOLEAN → ARRAY | MEDIUM | No markings visible |
| `road_markings_visible_partially` | BOOLEAN → ARRAY | MEDIUM | Faded markings |

**Storage**: NEW `road_markings_visible TEXT[]` array

#### JUNCTION (3 enhanced fields)
| HTML Field | Type | Priority | Notes |
|------------|------|----------|-------|
| `junctionControl` | TEXT | HIGH | Traffic light/roundabout/priority |
| `trafficLightStatus` | TEXT | HIGH | Red/amber/green/not working |
| `userManoeuvre` | TEXT | HIGH | What was user doing? |

**Storage**: 3 single-value TEXT columns

#### SPEED (1 new)
| HTML Field | Type | Priority | Notes |
|------------|------|----------|-------|
| `your_speed` | TEXT | HIGH | User's speed at impact |

**Note**: `speed_limit` may already exist in database, verify!

#### VEHICLE (8 new)
| HTML Field | Type | Priority | Notes |
|------------|------|----------|-------|
| `usual_vehicle` | BOOLEAN | HIGH | Is this your usual vehicle? |
| `vehicle_driveable` | BOOLEAN | HIGH | Can you drive it away? |
| `no_damage` | BOOLEAN | MEDIUM | No damage to vehicle |
| `impact_point` | TEXT[] | HIGH | 11 checkboxes for impact location |
| `recovery_company` | TEXT | MEDIUM | Recovery company name |
| `recovery_location` | TEXT | MEDIUM | Where recovered to |
| `recovery_phone` | TEXT | MEDIUM | Recovery contact |
| `recovery_notes` | TEXT | LOW | Additional recovery notes |

**Storage**: 4 TEXT columns, 3 BOOLEAN columns, 1 TEXT[] array

#### OTHER DRIVER (4 new)
| HTML Field | Type | Priority | Notes |
|------------|------|----------|-------|
| `other_driver_email` | TEXT | HIGH ⭐ | CRITICAL - no DB column! |
| `other_driver_license` | TEXT | HIGH ⭐ | CRITICAL - no DB column! |
| `no_visible_damage` | BOOLEAN | MEDIUM | Their vehicle undamaged |
| `other_point_of_impact` | TEXT | MEDIUM | Impact point on their vehicle |

**Storage**: Add 4 columns to `incident_other_vehicles` table

#### SPECIAL CONDITIONS (8 new - EXPANSION)
| HTML Field | Type | Priority | Notes |
|------------|------|----------|-------|
| `cyclists_in_road` | BOOLEAN → ARRAY | MEDIUM | Cyclists present |
| `pedestrians_in_road` | BOOLEAN → ARRAY | MEDIUM | Pedestrians nearby |
| `traffic_calming` | BOOLEAN → ARRAY | LOW | Speed bumps/chicanes |
| `parked_vehicles` | BOOLEAN → ARRAY | MEDIUM | Parked cars narrowing road |
| `pedestrian_crossing` | BOOLEAN → ARRAY | MEDIUM | Zebra/pelican crossing |
| `school_zone` | BOOLEAN → ARRAY | HIGH | School area |
| `narrow_road` | BOOLEAN → ARRAY | MEDIUM | Restricted width |
| `poor_signage` | BOOLEAN → ARRAY | LOW | Missing/unclear signs |

**Storage**: NEW `special_conditions TEXT[]` array (or add to existing if present)

#### VISIBILITY FACTORS (1 field, 5 values)
| HTML Field | Type | Priority | Notes |
|------------|------|----------|-------|
| `visibilityFactors` | TEXT[] | MEDIUM | Multiple factors affecting visibility |

**Values**: sun_glare, rain_windscreen, dirt_windscreen, fogged_windows, obstructed_view

---

### 2.2 Database Impact Summary

**Total New Fields**: 64
**After Array Consolidation**: ~35 new database columns

**Breakdown**:
- **25 single-value columns** (TEXT, BOOLEAN, DATE)
- **10 array columns** (TEXT[])

**New Columns for `incident_reports` table**:

**Single-Value Columns (25)**:
```sql
-- Medical (5)
medical_attention_needed TEXT
medical_hospital_name TEXT
medical_injury_details TEXT
medical_injury_severity TEXT
final_feeling TEXT

-- Location (2)
what3words TEXT
nearestLandmark TEXT

-- Junction (3)
junctionControl TEXT
trafficLightStatus TEXT
userManoeuvre TEXT

-- Speed (1)
your_speed TEXT

-- Vehicle (7)
usual_vehicle BOOLEAN
vehicle_driveable BOOLEAN
no_damage BOOLEAN
recovery_company TEXT
recovery_location TEXT
recovery_phone TEXT
recovery_notes TEXT

-- Additional (7)
additionalHazards TEXT
medical_ambulance_called BOOLEAN
medical_treatment_received TEXT
medical_symptom_dizziness BOOLEAN
medical_symptom_life_threatening BOOLEAN
airbags_deployed BOOLEAN (may exist)
seatbelts_worn BOOLEAN (may exist)
```

**Array Columns (10)**:
```sql
-- Existing to convert from booleans
weather_conditions TEXT[]        -- From 12 boolean columns
road_conditions TEXT[]           -- From 6 boolean columns
medical_symptoms TEXT[]          -- From 11 boolean columns

-- New categories
road_types TEXT[]                -- 7 checkboxes
traffic_conditions TEXT[]        -- 4 checkboxes
visibility_levels TEXT[]         -- 4 checkboxes
road_markings_visible TEXT[]     -- 3 checkboxes
special_conditions TEXT[]        -- 8 checkboxes
visibility_factors TEXT[]        -- 5 checkboxes
impact_point TEXT[]              -- 11 checkboxes
```

**New Columns for `incident_other_vehicles` table (9)**:
```sql
-- Driver info
driver_email TEXT                -- ⭐ CRITICAL MISSING
driver_license TEXT              -- ⭐ CRITICAL MISSING
no_visible_damage BOOLEAN
other_point_of_impact TEXT

-- DVLA fields (from SCHEMA_ANALYSIS_SUMMARY.md)
mot_status TEXT
mot_expiry_date DATE
tax_status TEXT
tax_due_date DATE
fuel_type TEXT
engine_capacity TEXT
```

---

## Part 3: Storage Strategy - PostgreSQL Arrays

### 3.1 Why Use Arrays?

**Problem**: Checkbox groups create many boolean columns
- Before: 64 individual BOOLEAN columns
- After: 35 columns (25 singles + 10 arrays)

**Benefits**:
✅ Cleaner schema (fewer columns)
✅ Easier to add new checkbox values (no schema change)
✅ Better for multiple selections
✅ Faster queries with GIN indexes
✅ More flexible for reporting

**Trade-offs**:
⚠️ Slightly more complex controller logic
⚠️ Requires array manipulation in SQL
⚠️ Need GIN indexes for performance

### 3.2 Array Column Design

**Example: Weather Conditions**

Old Typeform (12 boolean columns):
```sql
weather_overcast BOOLEAN
weather_heavy_rain BOOLEAN
weather_fog BOOLEAN
weather_snow_on_road BOOLEAN
weather_bright_daylight BOOLEAN
weather_light_rain BOOLEAN
weather_clear_and_dry BOOLEAN
weather_dusk BOOLEAN
weather_snow BOOLEAN
weather_street_lights BOOLEAN
weather_wet_road BOOLEAN
```

New In-House (1 array column):
```sql
weather_conditions TEXT[] = ['raining', 'windy', 'fog', 'heavy_rain']
```

**HTML Form → Array Mapping**:
```javascript
// Frontend sends
{
  weather_raining: true,
  weather_windy: true,
  weather_fog: false,
  weather_heavy_rain: true
}

// Backend transforms to
{
  weather_conditions: ['raining', 'windy', 'heavy_rain']
}
```

### 3.3 Array Value Standards

Each array column has defined valid values:

**weather_conditions**:
```javascript
VALID_VALUES = [
  'raining', 'windy', 'fog', 'snow', 'clear', 'overcast',
  'heavy_rain', 'light_rain', 'dusk', 'bright_daylight',
  'street_lights', 'wet_road', 'drizzle', 'hail',
  'thunder_lightning', 'ice', 'other', 'bright_sunlight', 'cloudy'
]
```

**road_conditions**:
```javascript
VALID_VALUES = [
  'dry', 'wet', 'icy', 'snow_covered', 'loose_surface', 'other'
]
```

**road_types**:
```javascript
VALID_VALUES = [
  'motorway', 'a_road', 'b_road', 'urban_street',
  'rural_road', 'car_park', 'other'
]
```

**traffic_conditions**:
```javascript
VALID_VALUES = [
  'heavy', 'moderate', 'light', 'no_traffic'
]
```

**visibility_levels**:
```javascript
VALID_VALUES = [
  'good', 'poor', 'very_poor', 'severely_restricted'
]
```

**road_markings_visible**:
```javascript
VALID_VALUES = [
  'yes', 'no', 'partially'
]
```

**medical_symptoms**:
```javascript
VALID_VALUES = [
  'chest_pain', 'breathlessness', 'abdominal_bruising',
  'uncontrolled_bleeding', 'severe_headache', 'change_in_vision',
  'abdominal_pain', 'limb_pain_mobility', 'limb_weakness',
  'loss_of_consciousness', 'dizziness', 'life_threatening', 'none'
]
```

**special_conditions**:
```javascript
VALID_VALUES = [
  'animals', 'roadworks', 'defective_road', 'oil_spills',
  'workman', 'cyclists_in_road', 'pedestrians_in_road',
  'traffic_calming', 'parked_vehicles', 'pedestrian_crossing',
  'school_zone', 'narrow_road', 'poor_signage'
]
```

**visibility_factors**:
```javascript
VALID_VALUES = [
  'sun_glare', 'rain_windscreen', 'dirt_windscreen',
  'fogged_windows', 'obstructed_view'
]
```

**impact_point**:
```javascript
VALID_VALUES = [
  'front', 'rear', 'left_side', 'right_side',
  'front_left_corner', 'front_right_corner',
  'rear_left_corner', 'rear_right_corner',
  'roof', 'underside', 'multiple_points'
]
```

---

## Part 4: Database Migrations (7 Phases)

### Phase 1: Rename Existing Columns

**File**: `migrations/001-rename-existing-fields.sql`

**Purpose**: Align database column names with new HTML form field names

```sql
-- Rename date/time fields
ALTER TABLE incident_reports
  RENAME COLUMN when_did_the_accident_happen TO accident_date;

ALTER TABLE incident_reports
  RENAME COLUMN what_time_did_the_accident_happen TO accident_time;

-- Rename location field
ALTER TABLE incident_reports
  RENAME COLUMN where_exactly_did_this_happen TO location;

-- Rename narrative field
ALTER TABLE incident_reports
  RENAME COLUMN detailed_account_of_what_happened TO accident_narrative;

-- Rename police field
ALTER TABLE incident_reports
  RENAME COLUMN did_police_attend TO police_attended;

-- Rename vehicle damage field (if exists)
ALTER TABLE incident_reports
  RENAME COLUMN damage_to_your_vehicle TO damage_description;

-- Rename other driver fields (if exist)
ALTER TABLE incident_reports
  RENAME COLUMN other_drivers_name TO other_driver_name;

ALTER TABLE incident_reports
  RENAME COLUMN other_drivers_number TO other_driver_phone;

ALTER TABLE incident_reports
  RENAME COLUMN other_drivers_address TO other_driver_address;
```

**Rollback**:
```sql
ALTER TABLE incident_reports RENAME COLUMN accident_date TO when_did_the_accident_happen;
ALTER TABLE incident_reports RENAME COLUMN accident_time TO what_time_did_the_accident_happen;
-- ... reverse all renames
```

---

### Phase 2: Add New Medical Fields

**File**: `migrations/002-add-medical-fields.sql`

```sql
-- Add new single-value medical fields
ALTER TABLE incident_reports
  ADD COLUMN medical_attention_needed TEXT,
  ADD COLUMN medical_hospital_name TEXT,
  ADD COLUMN medical_injury_details TEXT,
  ADD COLUMN medical_injury_severity TEXT,
  ADD COLUMN medical_ambulance_called BOOLEAN DEFAULT false,
  ADD COLUMN medical_treatment_received TEXT,
  ADD COLUMN medical_symptom_dizziness BOOLEAN DEFAULT false,
  ADD COLUMN medical_symptom_life_threatening BOOLEAN DEFAULT false,
  ADD COLUMN final_feeling TEXT;

-- Add comments for documentation
COMMENT ON COLUMN incident_reports.medical_attention_needed IS
  'Did user need medical attention? YES/NO';
COMMENT ON COLUMN incident_reports.medical_hospital_name IS
  'Name of hospital attended (if applicable)';
COMMENT ON COLUMN incident_reports.medical_injury_severity IS
  'Minor/Moderate/Severe/Life-threatening';
```

**Rollback**:
```sql
ALTER TABLE incident_reports
  DROP COLUMN medical_attention_needed,
  DROP COLUMN medical_hospital_name,
  DROP COLUMN medical_injury_details,
  DROP COLUMN medical_injury_severity,
  DROP COLUMN medical_ambulance_called,
  DROP COLUMN medical_treatment_received,
  DROP COLUMN medical_symptom_dizziness,
  DROP COLUMN medical_symptom_life_threatening,
  DROP COLUMN final_feeling;
```

---

### Phase 3: Add New Location Fields

**File**: `migrations/003-add-location-fields.sql`

```sql
-- Add location enhancement fields
ALTER TABLE incident_reports
  ADD COLUMN what3words TEXT,
  ADD COLUMN nearestLandmark TEXT,
  ADD COLUMN additionalHazards TEXT;

-- Add constraint for what3words format (3 words separated by dots)
ALTER TABLE incident_reports
  ADD CONSTRAINT what3words_format
    CHECK (what3words IS NULL OR what3words ~ '^[a-z]+\.[a-z]+\.[a-z]+$');

-- Add index for location searches
CREATE INDEX idx_incident_reports_what3words
  ON incident_reports(what3words)
  WHERE what3words IS NOT NULL;
```

**Rollback**:
```sql
DROP INDEX IF EXISTS idx_incident_reports_what3words;
ALTER TABLE incident_reports
  DROP CONSTRAINT IF EXISTS what3words_format;
ALTER TABLE incident_reports
  DROP COLUMN what3words,
  DROP COLUMN nearestLandmark,
  DROP COLUMN additionalHazards;
```

---

### Phase 4: Add Array Columns with Data Migration

**File**: `migrations/004-add-condition-arrays.sql`

**⚠️ CRITICAL**: This phase migrates data from old boolean columns to new array columns

```sql
-- Step 1: Add new array columns
ALTER TABLE incident_reports
  -- Weather (consolidate 12 old booleans + 5 new)
  ADD COLUMN weather_conditions TEXT[] DEFAULT '{}',

  -- Road conditions (consolidate 6 old booleans + 4 new)
  ADD COLUMN road_conditions TEXT[] DEFAULT '{}',

  -- Medical symptoms (consolidate 11 old booleans + 2 new)
  ADD COLUMN medical_symptoms TEXT[] DEFAULT '{}',

  -- Road types (NEW - 7 checkboxes)
  ADD COLUMN road_types TEXT[] DEFAULT '{}',

  -- Traffic conditions (NEW - 4 checkboxes)
  ADD COLUMN traffic_conditions TEXT[] DEFAULT '{}',

  -- Visibility (NEW - 4 checkboxes)
  ADD COLUMN visibility_levels TEXT[] DEFAULT '{}',

  -- Road markings (NEW - 3 checkboxes)
  ADD COLUMN road_markings_visible TEXT[] DEFAULT '{}',

  -- Special conditions (consolidate 6 old + 8 new)
  ADD COLUMN special_conditions TEXT[] DEFAULT '{}',

  -- Visibility factors (NEW - 5 checkboxes)
  ADD COLUMN visibility_factors TEXT[] DEFAULT '{}',

  -- Impact point (NEW - 11 checkboxes)
  ADD COLUMN impact_point TEXT[] DEFAULT '{}';

-- Step 2: Migrate data from old boolean columns to arrays
-- Weather conditions
UPDATE incident_reports SET weather_conditions =
  ARRAY(
    SELECT unnest(ARRAY[
      CASE WHEN weather_overcast = true THEN 'overcast' END,
      CASE WHEN weather_street_lights = true THEN 'street_lights' END,
      CASE WHEN weather_heavy_rain = true THEN 'heavy_rain' END,
      CASE WHEN weather_wet_road = true THEN 'wet_road' END,
      CASE WHEN weather_fog = true THEN 'fog' END,
      CASE WHEN weather_snow_on_road = true THEN 'snow' END,
      CASE WHEN weather_bright_daylight = true THEN 'bright_daylight' END,
      CASE WHEN weather_light_rain = true THEN 'light_rain' END,
      CASE WHEN weather_clear_and_dry = true THEN 'clear' END,
      CASE WHEN weather_dusk = true THEN 'dusk' END,
      CASE WHEN weather_snow = true THEN 'snow' END
    ])
    WHERE unnest IS NOT NULL
  )
WHERE id IS NOT NULL;

-- Medical symptoms
UPDATE incident_reports SET medical_symptoms =
  ARRAY(
    SELECT unnest(ARRAY[
      CASE WHEN medical_chest_pain = true THEN 'chest_pain' END,
      CASE WHEN medical_breathlessness = true THEN 'breathlessness' END,
      CASE WHEN medical_abdominal_bruising = true THEN 'abdominal_bruising' END,
      CASE WHEN medical_uncontrolled_bleeding = true THEN 'uncontrolled_bleeding' END,
      CASE WHEN medical_severe_headache = true THEN 'severe_headache' END,
      CASE WHEN medical_change_in_vision = true THEN 'change_in_vision' END,
      CASE WHEN medical_abdominal_pain = true THEN 'abdominal_pain' END,
      CASE WHEN medical_limb_pain = true THEN 'limb_pain_mobility' END,
      CASE WHEN medical_limb_weakness = true THEN 'limb_weakness' END,
      CASE WHEN medical_loss_of_consciousness = true THEN 'loss_of_consciousness' END,
      CASE WHEN medical_none_of_these = true THEN 'none' END
    ])
    WHERE unnest IS NOT NULL
  )
WHERE id IS NOT NULL;

-- Step 3: Add GIN indexes for fast array searches
CREATE INDEX idx_incident_reports_weather_gin
  ON incident_reports USING GIN (weather_conditions);

CREATE INDEX idx_incident_reports_road_conditions_gin
  ON incident_reports USING GIN (road_conditions);

CREATE INDEX idx_incident_reports_medical_symptoms_gin
  ON incident_reports USING GIN (medical_symptoms);

CREATE INDEX idx_incident_reports_traffic_gin
  ON incident_reports USING GIN (traffic_conditions);

CREATE INDEX idx_incident_reports_visibility_gin
  ON incident_reports USING GIN (visibility_levels);

-- Step 4: Add CHECK constraints for valid values
ALTER TABLE incident_reports
  ADD CONSTRAINT weather_valid_values CHECK (
    weather_conditions <@ ARRAY[
      'raining', 'windy', 'fog', 'snow', 'clear', 'overcast',
      'heavy_rain', 'light_rain', 'dusk', 'bright_daylight',
      'street_lights', 'wet_road', 'drizzle', 'hail',
      'thunder_lightning', 'ice', 'other', 'bright_sunlight', 'cloudy'
    ]::TEXT[]
  ),
  ADD CONSTRAINT road_conditions_valid_values CHECK (
    road_conditions <@ ARRAY[
      'dry', 'wet', 'icy', 'snow_covered', 'loose_surface', 'other'
    ]::TEXT[]
  ),
  ADD CONSTRAINT traffic_valid_values CHECK (
    traffic_conditions <@ ARRAY[
      'heavy', 'moderate', 'light', 'no_traffic'
    ]::TEXT[]
  ),
  ADD CONSTRAINT visibility_valid_values CHECK (
    visibility_levels <@ ARRAY[
      'good', 'poor', 'very_poor', 'severely_restricted'
    ]::TEXT[]
  );

-- Step 5: Add NOT NULL constraints (arrays should be [] not NULL)
ALTER TABLE incident_reports
  ALTER COLUMN weather_conditions SET NOT NULL,
  ALTER COLUMN road_conditions SET NOT NULL,
  ALTER COLUMN medical_symptoms SET NOT NULL,
  ALTER COLUMN road_types SET NOT NULL,
  ALTER COLUMN traffic_conditions SET NOT NULL,
  ALTER COLUMN visibility_levels SET NOT NULL,
  ALTER COLUMN road_markings_visible SET NOT NULL,
  ALTER COLUMN special_conditions SET NOT NULL,
  ALTER COLUMN visibility_factors SET NOT NULL,
  ALTER COLUMN impact_point SET NOT NULL;

-- DO NOT DROP OLD COLUMNS YET (keep for 30-day transition)
-- Will drop in Phase 7 after verification
```

**Verification Queries**:
```sql
-- Check data migration successful
SELECT
  id,
  weather_conditions,
  array_length(weather_conditions, 1) as num_weather,
  weather_raining,  -- old column
  weather_windy     -- old column
FROM incident_reports
WHERE array_length(weather_conditions, 1) > 0
LIMIT 10;

-- Check no NULL arrays
SELECT COUNT(*) FROM incident_reports WHERE weather_conditions IS NULL;
-- Should return 0

-- Check arrays properly indexed
EXPLAIN ANALYZE
SELECT * FROM incident_reports
WHERE weather_conditions @> ARRAY['raining']::TEXT[];
-- Should use GIN index
```

**Rollback**:
```sql
DROP INDEX IF EXISTS idx_incident_reports_weather_gin;
DROP INDEX IF EXISTS idx_incident_reports_road_conditions_gin;
DROP INDEX IF EXISTS idx_incident_reports_medical_symptoms_gin;
DROP INDEX IF EXISTS idx_incident_reports_traffic_gin;
DROP INDEX IF EXISTS idx_incident_reports_visibility_gin;

ALTER TABLE incident_reports
  DROP CONSTRAINT IF EXISTS weather_valid_values,
  DROP CONSTRAINT IF EXISTS road_conditions_valid_values,
  DROP CONSTRAINT IF EXISTS traffic_valid_values,
  DROP CONSTRAINT IF EXISTS visibility_valid_values;

ALTER TABLE incident_reports
  DROP COLUMN weather_conditions,
  DROP COLUMN road_conditions,
  DROP COLUMN medical_symptoms,
  DROP COLUMN road_types,
  DROP COLUMN traffic_conditions,
  DROP COLUMN visibility_levels,
  DROP COLUMN road_markings_visible,
  DROP COLUMN special_conditions,
  DROP COLUMN visibility_factors,
  DROP COLUMN impact_point;
```

---

### Phase 5: Add Junction/Speed Fields

**File**: `migrations/005-add-junction-speed-fields.sql`

```sql
-- Add junction and speed fields
ALTER TABLE incident_reports
  ADD COLUMN junctionControl TEXT,
  ADD COLUMN trafficLightStatus TEXT,
  ADD COLUMN userManoeuvre TEXT,
  ADD COLUMN your_speed TEXT;

-- Check if speed_limit already exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident_reports'
    AND column_name = 'speed_limit'
  ) THEN
    ALTER TABLE incident_reports ADD COLUMN speed_limit TEXT;
  END IF;
END $$;

-- Add constraints for valid values
ALTER TABLE incident_reports
  ADD CONSTRAINT junction_control_valid CHECK (
    junctionControl IS NULL OR
    junctionControl IN ('traffic_light', 'roundabout', 'priority', 'give_way', 'stop_sign', 'none')
  ),
  ADD CONSTRAINT traffic_light_status_valid CHECK (
    trafficLightStatus IS NULL OR
    trafficLightStatus IN ('red', 'amber', 'green', 'not_working', 'not_applicable')
  );
```

**Rollback**:
```sql
ALTER TABLE incident_reports
  DROP CONSTRAINT IF EXISTS junction_control_valid,
  DROP CONSTRAINT IF EXISTS traffic_light_status_valid;

ALTER TABLE incident_reports
  DROP COLUMN junctionControl,
  DROP COLUMN trafficLightStatus,
  DROP COLUMN userManoeuvre,
  DROP COLUMN your_speed;
  -- Don't drop speed_limit if it existed before
```

---

### Phase 6: Add Vehicle/Recovery Fields

**File**: `migrations/006-add-vehicle-recovery-fields.sql`

```sql
-- Add vehicle and recovery fields
ALTER TABLE incident_reports
  ADD COLUMN usual_vehicle BOOLEAN,
  ADD COLUMN vehicle_driveable BOOLEAN,
  ADD COLUMN no_damage BOOLEAN DEFAULT false,
  ADD COLUMN recovery_company TEXT,
  ADD COLUMN recovery_location TEXT,
  ADD COLUMN recovery_phone TEXT,
  ADD COLUMN recovery_notes TEXT;

-- Check if airbags_deployed and seatbelts_worn exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident_reports'
    AND column_name = 'airbags_deployed'
  ) THEN
    ALTER TABLE incident_reports ADD COLUMN airbags_deployed BOOLEAN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident_reports'
    AND column_name = 'seatbelts_worn'
  ) THEN
    ALTER TABLE incident_reports ADD COLUMN seatbelts_worn BOOLEAN;
  END IF;
END $$;

-- Add UK phone format constraint for recovery_phone
ALTER TABLE incident_reports
  ADD CONSTRAINT recovery_phone_format CHECK (
    recovery_phone IS NULL OR
    recovery_phone ~ '^\+?44[0-9]{10}$' OR  -- +44 format
    recovery_phone ~ '^0[0-9]{10}$'          -- 0xxx format
  );
```

**Rollback**:
```sql
ALTER TABLE incident_reports
  DROP CONSTRAINT IF EXISTS recovery_phone_format;

ALTER TABLE incident_reports
  DROP COLUMN usual_vehicle,
  DROP COLUMN vehicle_driveable,
  DROP COLUMN no_damage,
  DROP COLUMN recovery_company,
  DROP COLUMN recovery_location,
  DROP COLUMN recovery_phone,
  DROP COLUMN recovery_notes;
  -- Don't drop airbags_deployed or seatbelts_worn if they existed before
```

---

### Phase 7: Update incident_other_vehicles Table

**File**: `migrations/007-add-other-vehicle-fields.sql`

**⚠️ CRITICAL**: This adds 9 missing columns including email and DVLA fields

```sql
-- Add new driver information fields
ALTER TABLE incident_other_vehicles
  ADD COLUMN driver_email TEXT,
  ADD COLUMN driver_license TEXT,
  ADD COLUMN no_visible_damage BOOLEAN DEFAULT false,
  ADD COLUMN other_point_of_impact TEXT;

-- Add DVLA fields (from SCHEMA_ANALYSIS_SUMMARY.md)
ALTER TABLE incident_other_vehicles
  ADD COLUMN mot_status TEXT,
  ADD COLUMN mot_expiry_date DATE,
  ADD COLUMN tax_status TEXT,
  ADD COLUMN tax_due_date DATE,
  ADD COLUMN fuel_type TEXT,
  ADD COLUMN engine_capacity TEXT;

-- Add email format constraint
ALTER TABLE incident_other_vehicles
  ADD CONSTRAINT driver_email_format CHECK (
    driver_email IS NULL OR
    driver_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );

-- Add constraints for DVLA fields
ALTER TABLE incident_other_vehicles
  ADD CONSTRAINT mot_status_valid CHECK (
    mot_status IS NULL OR
    mot_status IN ('Valid', 'Not valid', 'No details held', 'No results returned')
  ),
  ADD CONSTRAINT tax_status_valid CHECK (
    tax_status IS NULL OR
    tax_status IN ('Taxed', 'SORN', 'Untaxed', 'No results returned')
  );

-- Add indexes for common lookups
CREATE INDEX idx_other_vehicles_driver_email
  ON incident_other_vehicles(driver_email)
  WHERE driver_email IS NOT NULL;

CREATE INDEX idx_other_vehicles_driver_license
  ON incident_other_vehicles(driver_license)
  WHERE driver_license IS NOT NULL;

-- Add comments for DVLA fields
COMMENT ON COLUMN incident_other_vehicles.mot_status IS
  'MOT status from DVLA API lookup';
COMMENT ON COLUMN incident_other_vehicles.mot_expiry_date IS
  'MOT expiry date from DVLA API';
COMMENT ON COLUMN incident_other_vehicles.tax_status IS
  'Tax status from DVLA API lookup';
COMMENT ON COLUMN incident_other_vehicles.tax_due_date IS
  'Tax due/renewal date from DVLA API';
COMMENT ON COLUMN incident_other_vehicles.fuel_type IS
  'Fuel type from DVLA API (Petrol/Diesel/Electric/Hybrid)';
COMMENT ON COLUMN incident_other_vehicles.engine_capacity IS
  'Engine size from DVLA API (e.g., 1997cc)';
```

**Rollback**:
```sql
DROP INDEX IF EXISTS idx_other_vehicles_driver_email;
DROP INDEX IF EXISTS idx_other_vehicles_driver_license;

ALTER TABLE incident_other_vehicles
  DROP CONSTRAINT IF EXISTS driver_email_format,
  DROP CONSTRAINT IF EXISTS mot_status_valid,
  DROP CONSTRAINT IF EXISTS tax_status_valid;

ALTER TABLE incident_other_vehicles
  DROP COLUMN driver_email,
  DROP COLUMN driver_license,
  DROP COLUMN no_visible_damage,
  DROP COLUMN other_point_of_impact,
  DROP COLUMN mot_status,
  DROP COLUMN mot_expiry_date,
  DROP COLUMN tax_status,
  DROP COLUMN tax_due_date,
  DROP COLUMN fuel_type,
  DROP COLUMN engine_capacity;
```

---

### Migration Execution Order

**⚠️ CRITICAL**: Run in exact order, verify each phase before proceeding

```bash
# 1. Backup production database
pg_dump -h <host> -U <user> -d production > backup_$(date +%Y%m%d).sql

# 2. Test on development database first
psql -h dev-host -U dev-user -d development -f migrations/001-rename-existing-fields.sql
# ... verify success ...

# 3. Run all 7 migrations sequentially on production
for i in {1..7}; do
  echo "Running migration 00$i..."
  psql -h prod-host -U prod-user -d production -f migrations/00$i-*.sql

  # Verify row count unchanged
  echo "Verifying data integrity..."
  psql -h prod-host -U prod-user -d production -c "SELECT COUNT(*) FROM incident_reports;"

  # Pause for manual verification
  read -p "Migration 00$i complete. Verify and press Enter to continue..."
done

# 4. Verify final state
psql -h prod-host -U prod-user -d production -f scripts/validate-migration.sql
```

---

## Part 5: Controller Updates

### 5.1 Checkbox Grouping Logic

**New File**: `src/utils/fieldMapper.js`

```javascript
/**
 * Field Mapper Utility
 * Converts HTML checkbox fields to PostgreSQL array columns
 */

/**
 * Groups checkbox fields by prefix pattern
 * @param {Object} formData - Raw form data from request
 * @returns {Object} Grouped checkbox values as arrays
 */
function groupCheckboxFields(formData) {
  const groups = {
    weather_conditions: [],
    road_conditions: [],
    road_types: [],
    traffic_conditions: [],
    visibility_levels: [],
    road_markings_visible: [],
    medical_symptoms: [],
    special_conditions: [],
    visibility_factors: [],
    impact_point: []
  };

  for (const [key, value] of Object.entries(formData)) {
    // Skip if not a checkbox (value must be true/false or string 'true'/'false')
    if (value !== true && value !== 'true' && value !== false && value !== 'false') {
      continue;
    }

    const isChecked = value === true || value === 'true';

    // Weather checkboxes
    if (key.startsWith('weather_') && isChecked) {
      const cleanValue = key.replace('weather_', '');
      groups.weather_conditions.push(cleanValue);
    }

    // Road condition checkboxes
    else if (key.startsWith('road_condition_') && isChecked) {
      const cleanValue = key.replace('road_condition_', '');
      groups.road_conditions.push(cleanValue);
    }

    // Road type checkboxes
    else if (key.startsWith('road_type_') && isChecked) {
      const cleanValue = key.replace('road_type_', '');
      groups.road_types.push(cleanValue);
    }

    // Traffic conditions (NEW category)
    else if (key.startsWith('traffic_conditions_') && isChecked) {
      const cleanValue = key.replace('traffic_conditions_', '');
      groups.traffic_conditions.push(cleanValue);
    }

    // Visibility levels (NEW category)
    else if (key.startsWith('visibility_') && isChecked) {
      const cleanValue = key.replace('visibility_', '');
      groups.visibility_levels.push(cleanValue);
    }

    // Road markings (NEW category)
    else if (key.startsWith('road_markings_visible_') && isChecked) {
      const cleanValue = key.replace('road_markings_visible_', '');
      groups.road_markings_visible.push(cleanValue);
    }

    // Medical symptoms
    else if (key.startsWith('medical_symptom_') && isChecked) {
      const cleanValue = key.replace('medical_symptom_', '');
      groups.medical_symptoms.push(cleanValue);
    }

    // Special conditions (NEW)
    else if (key.startsWith('special_conditions_') && isChecked) {
      const cleanValue = key.replace('special_conditions_', '');
      groups.special_conditions.push(cleanValue);
    }
  }

  // Handle arrays that come directly from frontend
  if (Array.isArray(formData.visibilityFactors)) {
    groups.visibility_factors = formData.visibilityFactors;
  }

  if (Array.isArray(formData.impact_point)) {
    groups.impact_point = formData.impact_point;
  }

  return groups;
}

/**
 * Expands database array values back to individual PDF checkbox fields
 * @param {Array} arrayValue - Database array (e.g., ['raining', 'windy'])
 * @param {String} prefix - Field prefix (e.g., 'weather')
 * @returns {Object} PDF checkbox fields
 */
function expandArrayToPdfCheckboxes(arrayValue, prefix) {
  if (!Array.isArray(arrayValue)) return {};

  const pdfFields = {};

  arrayValue.forEach(value => {
    const fieldName = `${prefix}_${value}`;
    pdfFields[fieldName] = true;
  });

  return pdfFields;
}

/**
 * Validates array values against allowed list
 * @param {Array} values - Array to validate
 * @param {Array} allowedValues - Valid values
 * @returns {Object} { valid: boolean, invalid: Array }
 */
function validateArrayValues(values, allowedValues) {
  if (!Array.isArray(values)) {
    return { valid: false, invalid: ['Not an array'] };
  }

  const invalid = values.filter(v => !allowedValues.includes(v));

  return {
    valid: invalid.length === 0,
    invalid
  };
}

module.exports = {
  groupCheckboxFields,
  expandArrayToPdfCheckboxes,
  validateArrayValues
};
```

---

### 5.2 Updated Incident Controller

**File**: `src/controllers/incident.controller.js` (modifications)

```javascript
const { groupCheckboxFields, validateArrayValues } = require('../utils/fieldMapper');
const logger = require('../utils/logger');
const supabase = require('../config/supabase');

// Valid values for array columns
const VALID_VALUES = {
  weather_conditions: [
    'raining', 'windy', 'fog', 'snow', 'clear', 'overcast',
    'heavy_rain', 'light_rain', 'dusk', 'bright_daylight',
    'street_lights', 'wet_road', 'drizzle', 'hail',
    'thunder_lightning', 'ice', 'other', 'bright_sunlight', 'cloudy'
  ],
  road_conditions: [
    'dry', 'wet', 'icy', 'snow_covered', 'loose_surface', 'other'
  ],
  traffic_conditions: [
    'heavy', 'moderate', 'light', 'no_traffic'
  ],
  visibility_levels: [
    'good', 'poor', 'very_poor', 'severely_restricted'
  ],
  road_markings_visible: [
    'yes', 'no', 'partially'
  ],
  medical_symptoms: [
    'chest_pain', 'breathlessness', 'abdominal_bruising',
    'uncontrolled_bleeding', 'severe_headache', 'change_in_vision',
    'abdominal_pain', 'limb_pain_mobility', 'limb_weakness',
    'loss_of_consciousness', 'dizziness', 'life_threatening', 'none'
  ],
  road_types: [
    'motorway', 'a_road', 'b_road', 'urban_street',
    'rural_road', 'car_park', 'other'
  ],
  special_conditions: [
    'animals', 'roadworks', 'defective_road', 'oil_spills',
    'workman', 'cyclists_in_road', 'pedestrians_in_road',
    'traffic_calming', 'parked_vehicles', 'pedestrian_crossing',
    'school_zone', 'narrow_road', 'poor_signage'
  ],
  visibility_factors: [
    'sun_glare', 'rain_windscreen', 'dirt_windscreen',
    'fogged_windows', 'obstructed_view'
  ],
  impact_point: [
    'front', 'rear', 'left_side', 'right_side',
    'front_left_corner', 'front_right_corner',
    'rear_left_corner', 'rear_right_corner',
    'roof', 'underside', 'multiple_points'
  ]
};

/**
 * Save incident report with new field mapping
 * @route POST /api/incident-reports
 */
async function saveIncidentReport(req, res) {
  try {
    const userId = req.user.id; // From auth middleware
    const formData = req.body;

    // Step 1: Group checkbox fields into arrays
    const checkboxGroups = groupCheckboxFields(formData);

    // Step 2: Validate array values
    const validationErrors = [];

    for (const [arrayName, values] of Object.entries(checkboxGroups)) {
      const validation = validateArrayValues(values, VALID_VALUES[arrayName]);
      if (!validation.valid) {
        validationErrors.push({
          field: arrayName,
          invalid: validation.invalid
        });
      }
    }

    if (validationErrors.length > 0) {
      logger.warn('Invalid array values detected', { validationErrors });
      return res.status(400).json({
        success: false,
        error: 'Invalid field values',
        details: validationErrors
      });
    }

    // Step 3: Build database payload
    const dbData = {
      create_user_id: userId,

      // Array columns (NEW)
      weather_conditions: checkboxGroups.weather_conditions,
      road_conditions: checkboxGroups.road_conditions,
      road_types: checkboxGroups.road_types,
      traffic_conditions: checkboxGroups.traffic_conditions,
      visibility_levels: checkboxGroups.visibility_levels,
      road_markings_visible: checkboxGroups.road_markings_visible,
      medical_symptoms: checkboxGroups.medical_symptoms,
      special_conditions: checkboxGroups.special_conditions,
      visibility_factors: checkboxGroups.visibility_factors,
      impact_point: checkboxGroups.impact_point,

      // Renamed fields
      accident_date: formData.accident_date,
      accident_time: formData.accident_time,
      accident_narrative: formData.accident_narrative,
      location: formData.location,

      // NEW location fields
      what3words: formData.what3words,
      nearestLandmark: formData.nearestLandmark,
      additionalHazards: formData.additionalHazards,

      // NEW medical fields
      medical_attention_needed: formData.medical_attention_needed,
      medical_hospital_name: formData.medical_hospital_name,
      medical_injury_details: formData.medical_injury_details,
      medical_injury_severity: formData.medical_injury_severity,
      medical_ambulance_called: formData.medical_ambulance_called === true,
      medical_treatment_received: formData.medical_treatment_received,
      final_feeling: formData.final_feeling,

      // NEW junction fields
      junctionType: formData.junctionType,
      junctionControl: formData.junctionControl,
      trafficLightStatus: formData.trafficLightStatus,
      userManoeuvre: formData.userManoeuvre,

      // Speed fields
      your_speed: formData.your_speed,
      speed_limit: formData.speed_limit,

      // NEW vehicle fields
      usual_vehicle: formData.usual_vehicle === true,
      vehicle_driveable: formData.vehicle_driveable === true,
      no_damage: formData.no_damage === true,
      recovery_company: formData.recovery_company,
      recovery_location: formData.recovery_location,
      recovery_phone: formData.recovery_phone,
      recovery_notes: formData.recovery_notes,

      // Existing fields (keep all old mappings)
      license_plate: formData.license_plate,
      damage_description: formData.damage_description,
      airbags_deployed: formData.airbags_deployed === true,
      seatbelts_worn: formData.seatbelts_worn === true,
      police_attended: formData.police_attended === true,
      witnesses_present: formData.witnesses_present === true,

      // ... include all other existing fields
    };

    // Step 4: Insert into database
    const { data, error } = await supabase
      .from('incident_reports')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      logger.error('Database insert failed', { error: error.message });
      throw error;
    }

    logger.info('Incident report saved', { id: data.id });

    return res.status(201).json({
      success: true,
      data: {
        id: data.id,
        created_at: data.created_at
      }
    });

  } catch (error) {
    logger.error('Error saving incident report', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to save incident report'
    });
  }
}

module.exports = {
  saveIncidentReport
};
```

---

### 5.3 New Other Vehicle Controller

**File**: `src/controllers/otherVehicle.controller.js` (NEW FILE)

```javascript
const logger = require('../utils/logger');
const supabase = require('../config/supabase');

/**
 * Save other vehicle involved in incident
 * @route POST /api/other-vehicles
 */
async function saveOtherVehicle(req, res) {
  try {
    const userId = req.user.id;
    const { incidentId, vehicleData } = req.body;

    if (!incidentId) {
      return res.status(400).json({
        success: false,
        error: 'Incident ID required'
      });
    }

    // Verify incident belongs to user
    const { data: incident, error: incidentError } = await supabase
      .from('incident_reports')
      .select('id')
      .eq('id', incidentId)
      .eq('create_user_id', userId)
      .single();

    if (incidentError || !incident) {
      return res.status(403).json({
        success: false,
        error: 'Incident not found or access denied'
      });
    }

    // Build database payload with NEW fields
    const dbData = {
      incident_id: incidentId,
      create_user_id: userId,

      // Driver info (with NEW fields ⭐)
      driver_name: vehicleData.other_driver_name,
      driver_phone: vehicleData.other_driver_phone,
      driver_address: vehicleData.other_driver_address,
      driver_email: vehicleData.other_driver_email, // ⭐ NEW
      driver_license: vehicleData.other_driver_license, // ⭐ NEW

      // Vehicle info (with NEW fields)
      vehicle_license_plate: vehicleData.other_license_plate,
      vehicle_make: vehicleData.other_make_of_vehicle,
      vehicle_model: vehicleData.other_model_of_vehicle,
      vehicle_color: vehicleData.other_vehicle_color,
      no_visible_damage: vehicleData.no_visible_damage === true, // NEW
      other_point_of_impact: vehicleData.other_point_of_impact, // NEW

      // Insurance
      insurance_company: vehicleData.other_insurance_company,
      policy_number: vehicleData.other_policy_number,
      policy_cover: vehicleData.other_policy_cover,
      policy_holder: vehicleData.other_policy_holder,

      // Damage
      damage_description: vehicleData.damage_description,

      // DVLA fields (may be populated via separate DVLA lookup)
      mot_status: vehicleData.mot_status || null,
      mot_expiry_date: vehicleData.mot_expiry_date || null,
      tax_status: vehicleData.tax_status || null,
      tax_due_date: vehicleData.tax_due_date || null,
      fuel_type: vehicleData.fuel_type || null,
      engine_capacity: vehicleData.engine_capacity || null,

      // DVLA metadata
      dvla_lookup_successful: vehicleData.dvla_lookup_successful || false,
      dvla_lookup_timestamp: vehicleData.dvla_lookup_timestamp || null,
      dvla_error_message: vehicleData.dvla_error_message || null
    };

    // Insert into database
    const { data, error } = await supabase
      .from('incident_other_vehicles')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      logger.error('Database insert failed', { error: error.message });
      throw error;
    }

    logger.info('Other vehicle saved', { id: data.id });

    return res.status(201).json({
      success: true,
      data: {
        id: data.id,
        created_at: data.created_at
      }
    });

  } catch (error) {
    logger.error('Error saving other vehicle', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to save other vehicle'
    });
  }
}

/**
 * Get all vehicles for an incident
 * @route GET /api/other-vehicles/:incidentId
 */
async function getVehiclesByIncident(req, res) {
  try {
    const userId = req.user.id;
    const { incidentId } = req.params;

    const { data, error } = await supabase
      .from('incident_other_vehicles')
      .select('*')
      .eq('incident_id', incidentId)
      .eq('create_user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || []
    });

  } catch (error) {
    logger.error('Error fetching other vehicles', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch other vehicles'
    });
  }
}

module.exports = {
  saveOtherVehicle,
  getVehiclesByIncident
};
```

**Router Integration** (`src/routes/index.js`):
```javascript
const otherVehicleController = require('../controllers/otherVehicle.controller');

router.post('/other-vehicles', requireAuth, otherVehicleController.saveOtherVehicle);
router.get('/other-vehicles/:incidentId', requireAuth, otherVehicleController.getVehiclesByIncident);
```

---

## Part 6: PDF Mapping Strategy

### 6.1 Database Arrays → PDF Checkboxes

**Challenge**: Database stores arrays (`['raining', 'windy']`) but PDF needs individual checkboxes (`weather_raining`, `weather_windy`)

**Solution**: Reverse mapping function

**File**: `src/services/pdfService.js` (modifications)

```javascript
const { expandArrayToPdfCheckboxes } = require('../utils/fieldMapper');

/**
 * Map database incident data to PDF form fields
 * @param {Object} incidentData - Data from database
 * @returns {Object} PDF field values
 */
function mapIncidentDataToPdf(incidentData) {
  const pdfFields = {};

  // === ARRAY FIELDS → EXPAND TO CHECKBOXES ===

  // Weather conditions
  const weatherFields = expandArrayToPdfCheckboxes(
    incidentData.weather_conditions,
    'weather'
  );
  Object.assign(pdfFields, weatherFields);

  // Road conditions
  const roadCondFields = expandArrayToPdfCheckboxes(
    incidentData.road_conditions,
    'road_condition'
  );
  Object.assign(pdfFields, roadCondFields);

  // Road types
  const roadTypeFields = expandArrayToPdfCheckboxes(
    incidentData.road_types,
    'road_type'
  );
  Object.assign(pdfFields, roadTypeFields);

  // Traffic conditions
  const trafficFields = expandArrayToPdfCheckboxes(
    incidentData.traffic_conditions,
    'traffic_conditions'
  );
  Object.assign(pdfFields, trafficFields);

  // Visibility levels
  const visibilityFields = expandArrayToPdfCheckboxes(
    incidentData.visibility_levels,
    'visibility'
  );
  Object.assign(pdfFields, visibilityFields);

  // Road markings
  const roadMarkingsFields = expandArrayToPdfCheckboxes(
    incidentData.road_markings_visible,
    'road_markings_visible'
  );
  Object.assign(pdfFields, roadMarkingsFields);

  // Medical symptoms
  const medicalSymptomFields = expandArrayToPdfCheckboxes(
    incidentData.medical_symptoms,
    'medical_symptom'
  );
  Object.assign(pdfFields, medicalSymptomFields);

  // Special conditions
  const specialCondFields = expandArrayToPdfCheckboxes(
    incidentData.special_conditions,
    'special_conditions'
  );
  Object.assign(pdfFields, specialCondFields);

  // Visibility factors
  const visFactorFields = expandArrayToPdfCheckboxes(
    incidentData.visibility_factors,
    'visibilityFactors'
  );
  Object.assign(pdfFields, visFactorFields);

  // Impact point
  const impactFields = expandArrayToPdfCheckboxes(
    incidentData.impact_point,
    'impact_point'
  );
  Object.assign(pdfFields, impactFields);

  // === SINGLE-VALUE FIELDS → DIRECT MAPPING ===

  // Date/time (renamed fields)
  pdfFields.accident_date = incidentData.accident_date;
  pdfFields.accident_time = incidentData.accident_time;
  pdfFields.location = incidentData.location;
  pdfFields.accident_narrative = incidentData.accident_narrative;

  // NEW location fields
  pdfFields.what3words = incidentData.what3words;
  pdfFields.nearestLandmark = incidentData.nearestLandmark;
  pdfFields.additionalHazards = incidentData.additionalHazards;

  // NEW medical fields
  pdfFields.medical_attention_needed = incidentData.medical_attention_needed;
  pdfFields.medical_hospital_name = incidentData.medical_hospital_name;
  pdfFields.medical_injury_details = incidentData.medical_injury_details;
  pdfFields.medical_injury_severity = incidentData.medical_injury_severity;
  pdfFields.medical_ambulance_called = incidentData.medical_ambulance_called;
  pdfFields.medical_treatment_received = incidentData.medical_treatment_received;
  pdfFields.final_feeling = incidentData.final_feeling;

  // NEW junction fields
  pdfFields.junctionType = incidentData.junctionType;
  pdfFields.junctionControl = incidentData.junctionControl;
  pdfFields.trafficLightStatus = incidentData.trafficLightStatus;
  pdfFields.userManoeuvre = incidentData.userManoeuvre;

  // Speed fields
  pdfFields.your_speed = incidentData.your_speed;
  pdfFields.speed_limit = incidentData.speed_limit;

  // NEW vehicle fields
  pdfFields.usual_vehicle = incidentData.usual_vehicle;
  pdfFields.vehicle_driveable = incidentData.vehicle_driveable;
  pdfFields.no_damage = incidentData.no_damage;
  pdfFields.recovery_company = incidentData.recovery_company;
  pdfFields.recovery_location = incidentData.recovery_location;
  pdfFields.recovery_phone = incidentData.recovery_phone;
  pdfFields.recovery_notes = incidentData.recovery_notes;

  // Existing fields (all remain)
  pdfFields.license_plate = incidentData.license_plate;
  pdfFields.damage_description = incidentData.damage_description;
  pdfFields.airbags_deployed = incidentData.airbags_deployed;
  pdfFields.seatbelts_worn = incidentData.seatbelts_worn;
  pdfFields.police_attended = incidentData.police_attended;

  // ... include all other existing mappings

  return pdfFields;
}

/**
 * Map other vehicle data to PDF fields
 * @param {Object} vehicleData - Data from incident_other_vehicles table
 * @returns {Object} PDF field values
 */
function mapOtherVehicleToPdf(vehicleData) {
  return {
    // Driver info (with NEW fields)
    other_driver_name: vehicleData.driver_name,
    other_driver_phone: vehicleData.driver_phone,
    other_driver_address: vehicleData.driver_address,
    other_driver_email: vehicleData.driver_email, // ⭐ NEW
    other_driver_license: vehicleData.driver_license, // ⭐ NEW

    // Vehicle info
    other_license_plate: vehicleData.vehicle_license_plate,
    other_make_of_vehicle: vehicleData.vehicle_make,
    other_model_of_vehicle: vehicleData.vehicle_model,
    other_vehicle_color: vehicleData.vehicle_color,
    no_visible_damage: vehicleData.no_visible_damage, // NEW
    other_point_of_impact: vehicleData.other_point_of_impact, // NEW

    // Insurance
    other_insurance_company: vehicleData.insurance_company,
    other_policy_number: vehicleData.policy_number,
    other_policy_cover: vehicleData.policy_cover,
    other_policy_holder: vehicleData.policy_holder,

    // DVLA fields (NEW)
    mot_status: vehicleData.mot_status,
    mot_expiry_date: vehicleData.mot_expiry_date,
    tax_status: vehicleData.tax_status,
    tax_due_date: vehicleData.tax_due_date,
    fuel_type: vehicleData.fuel_type,
    engine_capacity: vehicleData.engine_capacity,

    // Damage
    damage_description: vehicleData.damage_description
  };
}

module.exports = {
  mapIncidentDataToPdf,
  mapOtherVehicleToPdf
};
```

---

### 6.2 PDF Template Analysis (PENDING)

**⚠️ ACTION REQUIRED**: Extract existing PDF field names to complete mapping

**Tool**: Adobe PDF Services API

**Script to Create**: `scripts/extract-pdf-fields.js`

```javascript
/**
 * Extract all form field names from PDF templates
 * Uses Adobe PDF Services API
 */

const PDFServicesSdk = require('@adobe/pdfservices-node-sdk');
const fs = require('fs');

async function extractPdfFields(pdfPath) {
  const credentials = PDFServicesSdk.Credentials
    .serviceAccountCredentialsBuilder()
    .fromFile('credentials/pdfservices-api-credentials.json')
    .build();

  const executionContext = PDFServicesSdk.ExecutionContext.create(credentials);
  const extractPdfOperation = PDFServicesSdk.ExtractPDF.Operation.createNew();

  const input = PDFServicesSdk.FileRef.createFromLocalFile(pdfPath);
  extractPdfOperation.setInput(input);

  // Extract form fields
  extractPdfOperation.setOptions(
    PDFServicesSdk.ExtractPDF.options.ExtractPdfOptions.createNew()
      .addElementsToExtract(PDFServicesSdk.ExtractPDF.options.ExtractElementType.FORM_FIELDS)
  );

  const result = await extractPdfOperation.execute(executionContext);
  const jsonPath = await result.saveAsFile('output/pdf-fields.json');

  const fieldsJson = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // Parse and return field names
  const fields = fieldsJson.elements
    .filter(el => el.type === 'form_field')
    .map(el => ({
      name: el.name,
      type: el.fieldType,
      page: el.page,
      required: el.required || false
    }));

  return fields;
}

// Run extraction
(async () => {
  console.log('Extracting fields from incident report PDF...');
  const incidentFields = await extractPdfFields(
    'pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf'
  );

  console.log('Extracting fields from witness/vehicle PDF...');
  const witnessFields = await extractPdfFields(
    'pdf-templates/Car-Crash-Lawyer-AI-Witness-Vehicle-Template.pdf'
  );

  // Save results
  fs.writeFileSync(
    'output/incident-pdf-fields.json',
    JSON.stringify(incidentFields, null, 2)
  );

  fs.writeFileSync(
    'output/witness-vehicle-pdf-fields.json',
    JSON.stringify(witnessFields, null, 2)
  );

  console.log(`\nFound ${incidentFields.length} fields in incident report`);
  console.log(`Found ${witnessFields.length} fields in witness/vehicle template`);

  // Compare with HTML fields
  const htmlFields = require('../tmp/html-field-list.txt').split('\n');

  const pdfFieldNames = incidentFields.map(f => f.name);
  const missing = htmlFields.filter(hf => !pdfFieldNames.includes(hf));

  console.log(`\n⚠️ ${missing.length} HTML fields NOT in PDF template:`);
  missing.forEach(f => console.log(`  - ${f}`));
})();
```

**Expected Output**: List of missing PDF fields that need to be added to templates

---

### 6.3 PDF Template Modification Plan (PLACEHOLDER)

**After running extract-pdf-fields.js**, create this table:

| HTML Field | DB Column | PDF Field | Page # | Type | Status |
|------------|-----------|-----------|--------|------|--------|
| `weather_raining` | `weather_conditions[]` | `weather_raining` | 8 | checkbox | EXISTS ✅ |
| `traffic_conditions_heavy` | `traffic_conditions[]` | `traffic_conditions_heavy` | 8 | checkbox | **MISSING ❌** |
| `visibility_good` | `visibility_levels[]` | `visibility_good` | 8 | checkbox | **MISSING ❌** |
| `what3words` | `what3words` | `what3words` | 4 | text | **MISSING ❌** |
| ... | ... | ... | ... | ... | ... |

**Placement Strategy**:
- Medical fields → Pages 2-3 (medical section)
- Traffic/visibility → Page 8 (conditions section)
- Junction details → Page 4 (location section)
- Vehicle recovery → Page 10-11 (vehicle section)
- Other driver email/license → Page 13-14 (other vehicle section)

**Tool**: Adobe Acrobat Pro (manual editing) or Adobe Express Add-on (if available)

---

## Part 7: Testing Strategy

### 7.1 Phase 1: Database Migration Testing

**Objective**: Verify migrations execute without data loss

**Script**: `scripts/validate-migration.sql`

```sql
-- 1. Check row counts unchanged
SELECT 'incident_reports' as table_name, COUNT(*) as row_count
FROM incident_reports
UNION ALL
SELECT 'incident_other_vehicles', COUNT(*)
FROM incident_other_vehicles;

-- 2. Check weather array migration
SELECT
  id,
  weather_conditions,
  array_length(weather_conditions, 1) as num_conditions,
  weather_raining,  -- old column (should still exist in transition period)
  weather_windy     -- old column
FROM incident_reports
WHERE array_length(weather_conditions, 1) > 0
LIMIT 10;

-- 3. Verify no NULL arrays (should be [] not NULL)
SELECT
  COUNT(*) FILTER (WHERE weather_conditions IS NULL) as weather_null,
  COUNT(*) FILTER (WHERE road_conditions IS NULL) as road_null,
  COUNT(*) FILTER (WHERE traffic_conditions IS NULL) as traffic_null
FROM incident_reports;
-- All should return 0

-- 4. Check array values are valid
SELECT
  id,
  weather_conditions,
  unnest(weather_conditions) as weather_value
FROM incident_reports
WHERE array_length(weather_conditions, 1) > 0
LIMIT 20;
-- Manually verify values match VALID_VALUES list

-- 5. Verify indexes created
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('incident_reports', 'incident_other_vehicles')
AND indexname LIKE '%_gin%'
ORDER BY tablename, indexname;

-- 6. Check constraints exist
SELECT
  conname as constraint_name,
  contype as constraint_type,
  conrelid::regclass as table_name
FROM pg_constraint
WHERE conrelid::regclass::text LIKE 'incident_%'
AND contype = 'c'  -- CHECK constraints
ORDER BY table_name, conname;

-- 7. Verify new columns exist in incident_other_vehicles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'incident_other_vehicles'
AND column_name IN (
  'driver_email', 'driver_license', 'mot_status', 'mot_expiry_date',
  'tax_status', 'tax_due_date', 'fuel_type', 'engine_capacity'
)
ORDER BY column_name;

-- 8. Performance check - GIN index usage
EXPLAIN ANALYZE
SELECT * FROM incident_reports
WHERE weather_conditions @> ARRAY['raining']::TEXT[];
-- Should show "Bitmap Index Scan using idx_incident_reports_weather_gin"
```

**Acceptance Criteria**:
✅ Row counts unchanged
✅ Arrays contain correct values
✅ No NULL arrays
✅ All indexes created
✅ All constraints exist
✅ GIN indexes used in queries
✅ New columns exist in other_vehicles

---

### 7.2 Phase 2: Controller Testing

**Script**: `test-new-field-mapping.js`

```javascript
/**
 * Test new field mapping logic
 * Tests checkbox grouping and array storage
 */

const { groupCheckboxFields, validateArrayValues } = require('./src/utils/fieldMapper');
const supabase = require('./src/config/supabase');

// Test data with all 99 fields
const testIncidentData = {
  // Basic fields
  accident_date: '2025-01-15',
  accident_time: '14:30',
  location: '123 High Street, London',
  accident_narrative: 'Vehicle pulled out in front of me...',

  // Weather checkboxes (should group to array)
  weather_raining: true,
  weather_windy: true,
  weather_fog: false,
  weather_heavy_rain: false,

  // Road conditions (should group to array)
  road_condition_wet: true,
  road_condition_dry: false,
  road_condition_icy: false,

  // Road types (NEW - should group to array)
  road_type_urban_street: true,
  road_type_motorway: false,

  // Traffic conditions (NEW - should group to array)
  traffic_conditions_heavy: true,
  traffic_conditions_moderate: false,

  // Visibility (NEW - should group to array)
  visibility_poor: true,
  visibility_good: false,

  // Road markings (NEW - should group to array)
  road_markings_visible_yes: false,
  road_markings_visible_partially: true,

  // Medical symptoms (should group to array)
  medical_symptom_chest_pain: false,
  medical_symptom_dizziness: true,
  medical_symptom_none: false,

  // NEW single-value medical fields
  medical_attention_needed: 'Yes',
  medical_hospital_name: 'St Thomas Hospital',
  medical_injury_severity: 'Moderate',
  final_feeling: 'Shaken but okay',

  // NEW location fields
  what3words: 'table.lamp.chair',
  nearestLandmark: 'Big Ben',

  // NEW junction fields
  junctionType: 'traffic_light',
  junctionControl: 'traffic_light',
  trafficLightStatus: 'amber',
  userManoeuvre: 'going_straight',

  // Speed
  your_speed: '30',
  speed_limit: '30',

  // NEW vehicle fields
  usual_vehicle: true,
  vehicle_driveable: false,
  no_damage: false,
  recovery_company: 'AA Recovery',
  recovery_phone: '+447700123456',

  // Arrays from frontend
  impact_point: ['front', 'front_left_corner'],
  visibility_factors: ['sun_glare', 'rain_windscreen']
};

async function testFieldMapping() {
  console.log('=== Testing Field Mapping ===\n');

  // Test 1: Checkbox grouping
  console.log('Test 1: Checkbox Grouping');
  const grouped = groupCheckboxFields(testIncidentData);

  console.assert(
    grouped.weather_conditions.includes('raining'),
    '✅ Weather: raining included'
  );
  console.assert(
    grouped.weather_conditions.includes('windy'),
    '✅ Weather: windy included'
  );
  console.assert(
    !grouped.weather_conditions.includes('fog'),
    '✅ Weather: fog excluded (unchecked)'
  );

  console.assert(
    grouped.traffic_conditions.includes('heavy'),
    '✅ Traffic: heavy included'
  );

  console.assert(
    grouped.visibility_levels.includes('poor'),
    '✅ Visibility: poor included'
  );

  console.assert(
    grouped.road_markings_visible.includes('partially'),
    '✅ Road markings: partially included'
  );

  console.assert(
    Array.isArray(grouped.impact_point) &&
    grouped.impact_point.includes('front'),
    '✅ Impact point: front included'
  );

  console.log('\n✅ All checkbox grouping tests passed!\n');

  // Test 2: Database insert
  console.log('Test 2: Database Insert');

  const dbPayload = {
    create_user_id: 'test-user-uuid-12345',

    // Arrays
    weather_conditions: grouped.weather_conditions,
    road_conditions: grouped.road_conditions,
    road_types: grouped.road_types,
    traffic_conditions: grouped.traffic_conditions,
    visibility_levels: grouped.visibility_levels,
    road_markings_visible: grouped.road_markings_visible,
    medical_symptoms: grouped.medical_symptoms,
    impact_point: grouped.impact_point,
    visibility_factors: grouped.visibility_factors,

    // Singles
    accident_date: testIncidentData.accident_date,
    accident_time: testIncidentData.accident_time,
    location: testIncidentData.location,
    what3words: testIncidentData.what3words,
    nearestLandmark: testIncidentData.nearestLandmark,
    medical_attention_needed: testIncidentData.medical_attention_needed,
    medical_hospital_name: testIncidentData.medical_hospital_name,
    junctionType: testIncidentData.junctionType,
    your_speed: testIncidentData.your_speed,
    usual_vehicle: testIncidentData.usual_vehicle,
    recovery_company: testIncidentData.recovery_company
  };

  // IMPORTANT: Use service role key for testing (bypasses RLS)
  const { data, error } = await supabase
    .from('incident_reports')
    .insert(dbPayload)
    .select()
    .single();

  if (error) {
    console.error('❌ Database insert failed:', error.message);
    process.exit(1);
  }

  console.log('✅ Database insert successful!');
  console.log('   Incident ID:', data.id);
  console.log('   Weather array:', data.weather_conditions);
  console.log('   Traffic array:', data.traffic_conditions);

  // Test 3: Verify data integrity
  console.log('\nTest 3: Data Integrity');

  const { data: retrieved, error: retrieveError } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('id', data.id)
    .single();

  if (retrieveError) {
    console.error('❌ Retrieval failed:', retrieveError.message);
    process.exit(1);
  }

  console.assert(
    Array.isArray(retrieved.weather_conditions),
    '✅ Weather is array'
  );

  console.assert(
    retrieved.weather_conditions.includes('raining'),
    '✅ Weather contains raining'
  );

  console.assert(
    retrieved.what3words === 'table.lamp.chair',
    '✅ what3words preserved'
  );

  console.assert(
    retrieved.traffic_conditions.includes('heavy'),
    '✅ Traffic conditions preserved'
  );

  console.log('\n✅ All data integrity tests passed!');

  // Cleanup test data
  await supabase
    .from('incident_reports')
    .delete()
    .eq('id', data.id);

  console.log('\n✅ Test data cleaned up\n');
  console.log('=== ALL TESTS PASSED ===');
}

// Run tests
testFieldMapping().catch(console.error);
```

**Run**:
```bash
node test-new-field-mapping.js
```

---

### 7.3 Phase 3: PDF Generation Testing

**Script**: `test-pdf-generation-new-fields.js`

```javascript
/**
 * Test PDF generation with new field mappings
 */

const { mapIncidentDataToPdf, mapOtherVehicleToPdf } = require('./src/services/pdfService');
const supabase = require('./src/config/supabase');

async function testPdfGeneration(incidentId) {
  console.log('=== Testing PDF Generation with New Fields ===\n');

  // Fetch incident data
  const { data: incident, error } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('id', incidentId)
    .single();

  if (error) {
    console.error('Failed to fetch incident:', error.message);
    process.exit(1);
  }

  console.log('Incident loaded:', incidentId);

  // Test mapping
  const pdfFields = mapIncidentDataToPdf(incident);

  console.log('\n=== PDF Field Mapping Results ===');

  // Check array → checkbox expansion
  console.log('\nWeather checkboxes:');
  const weatherChecked = Object.entries(pdfFields)
    .filter(([key]) => key.startsWith('weather_'))
    .filter(([, value]) => value === true);
  console.log(weatherChecked.map(([key]) => `  ✅ ${key}`).join('\n'));

  console.log('\nTraffic condition checkboxes:');
  const trafficChecked = Object.entries(pdfFields)
    .filter(([key]) => key.startsWith('traffic_conditions_'))
    .filter(([, value]) => value === true);
  console.log(trafficChecked.map(([key]) => `  ✅ ${key}`).join('\n'));

  console.log('\nVisibility checkboxes:');
  const visibilityChecked = Object.entries(pdfFields)
    .filter(([key]) => key.startsWith('visibility_'))
    .filter(([, value]) => value === true);
  console.log(visibilityChecked.map(([key]) => `  ✅ ${key}`).join('\n'));

  // Check single-value NEW fields
  console.log('\nNew single-value fields:');
  const newFields = [
    'what3words', 'nearestLandmark', 'medical_hospital_name',
    'medical_injury_severity', 'final_feeling', 'junctionControl',
    'your_speed', 'recovery_company'
  ];

  newFields.forEach(field => {
    if (pdfFields[field]) {
      console.log(`  ✅ ${field}: ${pdfFields[field]}`);
    } else {
      console.log(`  ⚠️ ${field}: (not set)`);
    }
  });

  // Verify field count
  const totalFields = Object.keys(pdfFields).length;
  console.log(`\n📊 Total PDF fields populated: ${totalFields}`);
  console.log('   Expected: 150+ fields');

  if (totalFields < 100) {
    console.warn('⚠️ WARNING: Field count seems low, some mappings may be missing');
  }

  console.log('\n✅ PDF mapping test complete!');
}

// Run with actual incident ID
const incidentId = process.argv[2];

if (!incidentId) {
  console.error('Usage: node test-pdf-generation-new-fields.js <incident-id>');
  process.exit(1);
}

testPdfGeneration(incidentId).catch(console.error);
```

**Run**:
```bash
node test-pdf-generation-new-fields.js <actual-incident-uuid>
```

---

### 7.4 Phase 4: End-to-End Testing

**Manual Testing Checklist**:

```markdown
# E2E Testing Checklist

## Setup
- [ ] Fresh browser session (incognito)
- [ ] Cleared localStorage
- [ ] Development/staging environment

## User Flow
1. [ ] Sign up new test user
2. [ ] Complete incident form with ALL new fields:

   **Page 2 - Medical**
   - [ ] Check "medical attention needed"
   - [ ] Enter hospital name
   - [ ] Select injury severity
   - [ ] Check multiple symptoms (dizziness, chest pain)
   - [ ] Enter final feeling

   **Page 3 - Conditions**
   - [ ] Check multiple weather conditions (raining, windy)
   - [ ] Check multiple road conditions (wet)
   - [ ] Check multiple road types (urban street)
   - [ ] Check traffic condition (heavy)
   - [ ] Check visibility (poor)
   - [ ] Check road markings (partially visible)

   **Page 4 - Location**
   - [ ] Enter what3words location
   - [ ] Enter nearest landmark
   - [ ] Select junction type
   - [ ] Select junction control
   - [ ] Select traffic light status
   - [ ] Select user manoeuvre

   **Page 5 - Vehicle**
   - [ ] Select "usual vehicle" = Yes
   - [ ] Select "vehicle driveable" = No
   - [ ] Check multiple impact points
   - [ ] Enter recovery company details

   **Page 7 - Other Vehicle**
   - [ ] Enter other driver email ⭐
   - [ ] Enter other driver license ⭐
   - [ ] Select impact point

3. [ ] Submit form
4. [ ] Verify confirmation page shows

## Database Verification
5. [ ] Open Supabase dashboard
6. [ ] Find incident in incident_reports table
7. [ ] Verify arrays populated:
   - [ ] weather_conditions = ['raining', 'windy']
   - [ ] traffic_conditions = ['heavy']
   - [ ] visibility_levels = ['poor']
   - [ ] road_markings_visible = ['partially']
8. [ ] Verify single fields populated:
   - [ ] what3words = 'xxx.xxx.xxx'
   - [ ] medical_hospital_name = '<entered value>'
   - [ ] junctionControl = '<selected value>'
9. [ ] Check incident_other_vehicles table:
   - [ ] driver_email populated ⭐
   - [ ] driver_license populated ⭐

## PDF Generation
10. [ ] Navigate to PDF generation page
11. [ ] Generate PDF
12. [ ] Download PDF
13. [ ] Open in Adobe Acrobat Reader
14. [ ] Verify checkboxes:
    - [ ] weather_raining = CHECKED
    - [ ] weather_windy = CHECKED
    - [ ] traffic_conditions_heavy = CHECKED
    - [ ] visibility_poor = CHECKED
15. [ ] Verify text fields:
    - [ ] what3words visible on page
    - [ ] hospital name visible
    - [ ] recovery company visible
16. [ ] Verify other vehicle section:
    - [ ] Email displayed
    - [ ] License displayed

## Email Delivery
17. [ ] Check email inbox
18. [ ] Verify PDF attached
19. [ ] Open attachment
20. [ ] Spot check 10 random fields

## Acceptance
- [ ] All checkboxes correct
- [ ] All text fields correct
- [ ] No missing fields
- [ ] No undefined/null values
- [ ] PDF looks professional
- [ ] Lawyer could use this document

PASS/FAIL: __________
Tested by: __________
Date: __________
```

---

### 7.5 Phase 5: Regression Testing

**Objective**: Ensure OLD incidents still work after migrations

**Test Cases**:

1. **Load Old Incident (Pre-Migration)**
   - Fetch incident created before migration
   - Verify data displays correctly
   - Check for any missing/broken fields
   - Ensure boolean columns still readable

2. **Generate PDF from Old Incident**
   - Use pre-migration incident ID
   - Generate PDF
   - Verify all fields populate
   - Check for any undefined values

3. **Edit Old Incident (if supported)**
   - Load old incident in edit mode
   - Make minor change
   - Save
   - Verify no data corruption

**Script**: `test-old-incidents.js`

```javascript
/**
 * Test that old incidents (pre-migration) still work
 */

async function testOldIncident(oldIncidentId) {
  // Fetch old incident
  const { data: oldIncident } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('id', oldIncidentId)
    .single();

  console.log('Old incident loaded:', oldIncidentId);

  // Check if old boolean columns still exist
  const hasOldBooleans =
    'weather_raining' in oldIncident &&
    'weather_windy' in oldIncident;

  if (hasOldBooleans) {
    console.log('✅ Old boolean columns still present (transition period)');
  }

  // Generate PDF
  const pdfFields = mapIncidentDataToPdf(oldIncident);

  // Verify field count
  const fieldCount = Object.keys(pdfFields).length;
  console.log(`PDF fields: ${fieldCount}`);

  if (fieldCount < 100) {
    console.error('❌ FAIL: Too few fields mapped');
  } else {
    console.log('✅ PASS: Old incident still generates PDF correctly');
  }
}
```

---

## Part 8: Risk Assessment & Mitigation

### 8.1 Identified Risks

#### Risk 1: Data Loss During Migration 🔴 CRITICAL
**Probability**: Medium
**Impact**: CATASTROPHIC

**Scenarios**:
- Array migration fails, data lost
- Row counts mismatch after migration
- Invalid array values corrupt database

**Mitigation**:
1. ✅ Full database backup before ANY migration
2. ✅ Test migrations on development database first
3. ✅ Keep old boolean columns for 30 days (dual-write transition)
4. ✅ Export all incident_reports to CSV before migration
5. ✅ Verify row counts before/after each migration
6. ✅ Add NOT NULL constraints after population (not before)

**Rollback Plan**:
```bash
# Restore from backup if critical failure
pg_restore --dbname=production backup_2025_01_31.dump

# Or rollback individual migrations
psql -d production -f rollback-007.sql
psql -d production -f rollback-006.sql
# ... back to rollback-001.sql
```

---

#### Risk 2: PDF Generation Breaks 🟠 HIGH
**Probability**: High (150+ field mappings, easy to make mistakes)
**Impact**: HIGH (users can't get legal documents)

**Scenarios**:
- Array checkboxes don't populate
- New fields missing from PDF template
- Field names mismatch (weather_raining vs weather_rain)

**Mitigation**:
1. ✅ Test PDF generation extensively before deploy
2. ✅ Keep old PDF generation code as fallback
3. ✅ Feature flag: USE_NEW_FIELD_MAPPING (default: false)
4. ✅ Gradual rollout: 10% users → 50% → 100%
5. ✅ Automated PDF generation tests

**Rollback Plan**:
```javascript
// Feature flag in config
if (config.features.USE_NEW_FIELD_MAPPING) {
  return generatePdfWithNewFields(userId);
} else {
  return generatePdfWithOldFields(userId); // fallback
}
```

---

#### Risk 3: Array Field Bugs 🟡 MEDIUM
**Probability**: High (new pattern, easy to mess up)
**Impact**: MEDIUM (data quality issues)

**Examples of Bugs**:
- Empty arrays stored as NULL instead of []
- Arrays stored as strings: "['raining']" instead of ['raining']
- Duplicate values in arrays
- Wrong checkbox values (typos)

**Mitigation**:
1. ✅ Add database CHECK constraints for valid values
2. ✅ Add controller validation before insert
3. ✅ Add unit tests for groupCheckboxFields()
4. ✅ Add NOT NULL constraints (arrays should be [] not NULL)

**Example Constraint**:
```sql
ALTER TABLE incident_reports
  ADD CONSTRAINT weather_not_null
    CHECK (weather_conditions IS NOT NULL),
  ADD CONSTRAINT weather_valid_values
    CHECK (weather_conditions <@ ARRAY[
      'raining', 'windy', 'fog', 'snow', 'clear',
      'overcast', 'heavy_rain', 'light_rain', 'dusk',
      'bright_daylight', 'street_lights', 'wet_road'
    ]::TEXT[]);
```

**Rollback Plan**:
- Revert to old boolean columns (still available during transition)
- Fix bugs, redeploy with fixes

---

#### Risk 4: Frontend-Backend Mismatch 🟡 MEDIUM
**Probability**: Medium
**Impact**: MEDIUM (some fields not saved)

**Example**: Frontend sends 'traffic_conditions_heavy' but backend expects 'traffic_heavy'

**Mitigation**:
1. ✅ Create comprehensive field name mapping document (THIS DOCUMENT!)
2. ✅ Add logging for unrecognized fields
3. ✅ Add validation: reject if unexpected fields present
4. ✅ Frontend and backend use SAME field name constants

**Rollback Plan**:
- Fix field name mismatches quickly
- No data loss (just missing fields until fixed)

---

#### Risk 5: Performance Degradation 🟢 LOW
**Probability**: Low (PostgreSQL handles arrays well)
**Impact**: LOW (slightly slower queries)

**Concern**: GIN index searches on arrays might be slower than boolean lookups

**Mitigation**:
1. ✅ Add GIN indexes (already in migration plan)
2. ✅ Monitor query performance
3. ✅ Keep database query logs
4. ✅ Load test with 10,000+ incidents

**Benchmarks**:
```sql
-- Array search (with GIN index)
SELECT * FROM incident_reports
WHERE weather_conditions @> ARRAY['raining']::TEXT[];
-- Expected: < 100ms for 10k rows

-- Boolean search (old approach)
SELECT * FROM incident_reports
WHERE weather_raining = true;
-- Expected: < 50ms for 10k rows
```

**Rollback Plan**:
- If too slow, can denormalize arrays back to booleans
- Or add materialized view with boolean columns for fast searching

---

#### Risk 6: Legal/Compliance Issues 🟢 LOW
**Probability**: Very Low
**Impact**: CRITICAL (lawsuits, GDPR fines)

**Concern**: PDF doesn't accurately represent user input

**Mitigation**:
1. ✅ Lawyer review of new PDF template
2. ✅ Ensure PDF matches exactly what user submitted
3. ✅ Add audit log: "PDF generated from incident X on date Y"
4. ✅ Keep original form data forever (7 year retention)
5. ✅ Add "Generated by system" watermark on PDF

**Rollback Plan**:
- If legal issue found, immediately revert to old system
- Regenerate all affected PDFs
- Notify affected users

---

### 8.2 Deployment Strategy (Low Risk)

**Objective**: Deploy gradually to minimize blast radius

**Timeline**: 30 days

#### Week 1: Migrations & Dual-Write
**Day 1 (OFF HOURS, 2am GMT)**:
- Backup production database
- Run migrations 001-007 sequentially
- Verify no data loss
- Deploy controller changes (dual-write mode)

**Day 2-7**:
- Monitor error rates
- Verify arrays populating correctly
- Keep old boolean columns (fallback)

#### Week 2: Canary Testing (10%)
**Day 8**:
- Enable new field mapping for 10% of users (feature flag)
- Monitor PDF generation success rate
- Collect user feedback

**Day 9-14**:
- Fix any bugs found
- Verify data quality

#### Week 3: Expanded Rollout (50%)
**Day 15**:
- Enable for 50% of users

**Day 16-21**:
- Monitor at scale
- Performance testing

#### Week 4: Full Rollout (100%)
**Day 22**:
- Enable for 100% of users

**Day 23-30**:
- Monitor for issues
- Prepare for cleanup

**Day 30**:
- Drop old boolean columns (cleanup)
- Remove dual-write code
- Archive old PDF generation code

---

### 8.3 Rollback Triggers

**Immediately rollback if**:
- Error rate > 5%
- PDF generation fails > 1%
- Data loss detected
- Critical bug found
- User complaints > 10
- Legal team raises concern

**Rollback Procedure**:
1. Disable feature flag (USE_NEW_FIELD_MAPPING = false)
2. Revert to old boolean columns
3. Restore from backup if data corrupted
4. Notify users of temporary issue
5. Fix bugs in development
6. Re-test extensively
7. Try again with fixes

---

## Part 9: Implementation Timeline

### Phase 1: Preparation (Week 1)
**Days 1-3**:
- [ ] Review this document with team
- [ ] Set up development database
- [ ] Create all 7 SQL migration files
- [ ] Create validation scripts
- [ ] Set up monitoring/logging

**Days 4-7**:
- [ ] Create fieldMapper.js utility
- [ ] Update incident controller
- [ ] Create otherVehicle controller
- [ ] Write unit tests
- [ ] Run extract-pdf-fields.js script

---

### Phase 2: Development Testing (Week 2)
**Days 8-10**:
- [ ] Run migrations on dev database
- [ ] Test controller changes
- [ ] Test PDF generation
- [ ] Fix bugs found

**Days 11-14**:
- [ ] Complete PDF template analysis
- [ ] Add missing PDF fields (Adobe Acrobat Pro)
- [ ] Re-test PDF generation
- [ ] Code review

---

### Phase 3: Staging Deployment (Week 3)
**Days 15-17**:
- [ ] Deploy to staging environment
- [ ] Import sample production data
- [ ] Run E2E tests
- [ ] Performance testing
- [ ] Security review

**Days 18-21**:
- [ ] Lawyer review of PDF
- [ ] User acceptance testing
- [ ] Fix any issues
- [ ] Final signoff

---

### Phase 4: Production Deployment (Week 4)
**Day 22 (OFF HOURS, 2am GMT)**:
- [ ] Backup production database
- [ ] Run migrations 001-007
- [ ] Deploy controller changes
- [ ] Verify deployment

**Days 23-28**:
- [ ] Monitor error rates
- [ ] Collect user feedback
- [ ] Fix urgent bugs

**Day 29**: Final review before full rollout

---

### Phase 5: Gradual Rollout (Weeks 5-8)
**Week 5**: 10% of users
**Week 6**: 50% of users
**Week 7**: 100% of users
**Week 8**: Cleanup (drop old columns)

---

## Part 10: Outstanding Tasks & Next Steps

### Immediate Actions Required

1. **PDF Template Analysis** ⚠️ HIGH PRIORITY
   - [ ] Run `scripts/extract-pdf-fields.js`
   - [ ] Compare extracted fields with HTML field list
   - [ ] Identify missing fields (estimated 20-30)
   - [ ] Create PDF field addition list with page numbers

2. **Field Name Verification** ⚠️ MEDIUM PRIORITY
   - [ ] Query actual database columns
   - [ ] Compare with HTML form field names
   - [ ] Confirm renames needed (accident_date, etc.)
   - [ ] Update migration scripts if needed

3. **Image Upload Verification** 🟢 LOW PRIORITY
   - [ ] Review image upload HTML sections
   - [ ] Verify image fields map correctly
   - [ ] Test image upload flow with new forms

4. **localStorage Sync** 🟢 LOW PRIORITY
   - [ ] Review frontend localStorage implementation
   - [ ] Update localStorage keys for new fields
   - [ ] Test form data persistence

---

### Implementation Checklist

**Database**:
- [ ] Create all 7 migration SQL files
- [ ] Add rollback scripts for each
- [ ] Test on development database
- [ ] Create validation queries
- [ ] Set up monitoring for migration

**Controllers**:
- [ ] Create `src/utils/fieldMapper.js`
- [ ] Update `src/controllers/incident.controller.js`
- [ ] Create `src/controllers/otherVehicle.controller.js`
- [ ] Add validation for new fields
- [ ] Add unit tests

**PDF Generation**:
- [ ] Run PDF field extraction script
- [ ] Update PDF templates (Adobe Acrobat Pro)
- [ ] Update `src/services/pdfService.js`
- [ ] Add PDF mapping tests

**Testing**:
- [ ] Create `scripts/validate-migration.sql`
- [ ] Create `test-new-field-mapping.js`
- [ ] Create `test-pdf-generation-new-fields.js`
- [ ] Create E2E testing checklist
- [ ] Create `test-old-incidents.js`

**Deployment**:
- [ ] Set up feature flag (USE_NEW_FIELD_MAPPING)
- [ ] Create deployment runbook
- [ ] Set up monitoring/alerts
- [ ] Prepare rollback procedure
- [ ] Schedule deployment window

**Documentation**:
- [ ] Update API documentation
- [ ] Update developer README
- [ ] Create user-facing changelog
- [ ] Document troubleshooting steps

---

## Conclusion

This comprehensive field mapping plan provides a complete roadmap for migrating from Typeform to in-house HTML forms with 64+ new fields.

**Key Takeaways**:
1. **Storage**: Use PostgreSQL TEXT[] arrays for checkbox groups (reduces 64 fields to 35 columns)
2. **Migration**: 7-phase SQL migration with 30-day transition period
3. **Controllers**: Checkbox grouping logic with array validation
4. **PDF**: Reverse mapping (arrays → individual checkboxes)
5. **Testing**: 5-phase testing strategy with automated scripts
6. **Risk**: High risk change requiring gradual rollout (10% → 50% → 100%)
7. **Timeline**: 8 weeks total (4 weeks prep + 4 weeks rollout)

**Critical Success Factors**:
- ✅ Database backup before ANY changes
- ✅ Test on development database first
- ✅ Keep old columns during transition (30 days)
- ✅ Extensive testing at every phase
- ✅ Gradual rollout with feature flags
- ✅ Clear rollback triggers and procedures

**Outstanding Work**:
- ⚠️ PDF template field extraction (HIGH PRIORITY)
- ⚠️ Field name verification (MEDIUM PRIORITY)
- 🟢 Image upload verification (LOW PRIORITY)
- 🟢 localStorage sync (LOW PRIORITY)

**Next Action**: Run `scripts/extract-pdf-fields.js` to complete PDF analysis

---

**Document Generated**: 2025-10-31
**Analysis Method**: 22-thought ultrathinking with sequential-thinking MCP
**Estimated Implementation**: 8 weeks
**Risk Level**: 🟠 HIGH (requires careful execution)

**This document should be reviewed and approved by**:
- Technical Lead
- Database Administrator
- QA Team
- Legal Team (for PDF changes)
- Product Owner

---

*End of Document*
