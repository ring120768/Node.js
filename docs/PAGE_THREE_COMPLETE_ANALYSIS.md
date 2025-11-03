# PAGE THREE (DATE/WEATHER/ROAD) - Complete Analysis

**Date:** 2025-01-03
**Status:** 🔍 ANALYSIS IN PROGRESS
**Total HTML Fields:** 41
**User CSV Fields:** 34 (discrepancy indicates missing/unmapped fields)

---

## 📊 Current State

### HTML Form Fields (Ground Truth - 41 total)

**Section 1: Date & Time (2 fields)**
1. `accident_date`
2. `accident_time`

**Section 2: Weather Conditions (13 fields)**
3. `weather_bright_sunlight`
4. `weather_clear`
5. `weather_cloudy`
6. `weather_raining`
7. `weather_heavy_rain`
8. `weather_drizzle`
9. `weather_fog`
10. `weather_snow`
11. `weather_ice`
12. `weather_windy`
13. `weather_hail`
14. `weather_thunder_lightning`
15. `weather_other` (text input for "other")

**Section 3: Road Conditions (6 fields)**
16. `road_condition_dry`
17. `road_condition_wet`
18. `road_condition_icy`
19. `road_condition_snow_covered`
20. `road_condition_loose_surface`
21. `road_condition_other` (text input for "other")

**Section 4: Road Type (7 fields)**
22. `road_type_motorway`
23. `road_type_a_road`
24. `road_type_b_road`
25. `road_type_urban_street`
26. `road_type_rural_road`
27. `road_type_car_park`
28. `road_type_other` (text input for "other")

**Section 5: Speed (2 fields)**
29. `speed_limit` (dropdown)
30. `your_speed` (estimated speed text input)

**Section 6: Traffic Conditions (4 fields)**
31. `traffic_conditions_heavy`
32. `traffic_conditions_moderate`
33. `traffic_conditions_light`
34. `traffic_conditions_no_traffic`

**Section 7: Visibility (4 fields)**
35. `visibility_good`
36. `visibility_poor`
37. `visibility_very_poor`
38. `visibility_street_lights` ✅ (UPDATED from visibility_severely_restricted)

**Section 8: Road Markings (3 fields)**
39. `road_markings_visible_yes`
40. `road_markings_visible_no`
41. `road_markings_visible_partially`

---

## 🗄️ Database Columns (Supabase)

### Verified Existing Columns:

**Date/Time:**
- ✅ `accident_date`
- ✅ `accident_time`

**Weather (Multiple naming conventions exist):**
- ✅ `weather_bright_daylight` (PDF naming)
- ✅ `weather_clear_and_dry` (combined old style)
- ✅ `weather_drizzle`
- ✅ `weather_fog`
- ✅ `weather_hail`
- ✅ `weather_heavy_rain`
- ✅ `weather_overcast`
- ✅ `weather_raining`
- ✅ `weather_snow`
- ✅ `weather_snow_on_road`
- ✅ `weather_street_lights`
- ✅ `weather_thunder`
- ✅ `weather_windy`
- ✅ `weather_wet_road`
- ✅ `weather_slush_road`
- ✅ `weather_loose_surface`
- ✅ `weather_dusk`
- ✅ `weather_conditions` (generic text field)

**Road Conditions:**
- ✅ `road_condition_dry`
- ✅ `road_condition_wet`
- ✅ `road_condition_icy`
- ✅ `road_condition_snow_covered`
- ✅ `road_condition_loose_surface`
- ✅ `road_condition_other`

**Road Type:**
- ✅ `road_type` (old generic text field)
- ✅ `road_type_motorway`
- ✅ `road_type_a_road`
- ✅ `road_type_b_road`
- ✅ `road_type_urban_street`
- ✅ `road_type_rural_road`
- ✅ `road_type_car_park`
- ✅ `road_type_other`

**Speed:**
- ✅ `speed_limit`
- ❌ `your_speed` - **MISSING** (need to add)

**Traffic:**
- ✅ `traffic_heavy` (old naming)
- ✅ `traffic_moderate` (old naming)
- ✅ `traffic_light` (old naming)
- ✅ `traffic_none` (old naming)
- ✅ `traffic_conditions_no_traffic` (new naming)

**Visibility:**
- ✅ `visibility_good`
- ✅ `visibility_poor`
- ✅ `visibility_very_poor`
- ⚠️ `visibility_severely_restricted` (needs renaming to `visibility_street_lights`)

**Road Markings:**
- ✅ `road_markings_yes` (old naming)
- ✅ `road_markings_no` (old naming)
- ✅ `road_markings_partial` (old naming)
- ✅ `road_markings_visible_yes` (new naming - duplicate)
- ✅ `road_markings_visible_no` (new naming - duplicate)
- ✅ `road_markings_visible_partially` (new naming - duplicate)

---

## 📄 PDF Fields Mapping

| HTML Field | Database Column | PDF Field | Status |
|------------|----------------|-----------|--------|
| **Date & Time** ||||
| `accident_date` | `accident_date` | `when_did_the_accident_happen` | ✅ MAPPED |
| `accident_time` | `accident_time` | `what_time_did_the_accident_happen` | ✅ MAPPED |
| **Weather Conditions** ||||
| `weather_bright_sunlight` | ❓ Missing? | `weather_bright_daylight` | ⚠️ NAME MISMATCH |
| `weather_clear` | ❓ Missing? | `weather_clear_and_dry` | ⚠️ COMBINED IN PDF |
| `weather_cloudy` | ❓ Missing? | `weather_overcast` | ⚠️ NAME MISMATCH |
| `weather_raining` | `weather_raining` | `weather_raining` | ✅ MAPPED |
| `weather_heavy_rain` | `weather_heavy_rain` | `weather_heavy_rain` | ✅ MAPPED |
| `weather_drizzle` | `weather_drizzle` | `weather_drizzle` | ✅ MAPPED |
| `weather_fog` | `weather_fog` | `weather_fog` | ✅ MAPPED |
| `weather_snow` | `weather_snow` | `weather_snow` | ✅ MAPPED |
| `weather_ice` | ❓ Missing? | `weather_ice_on_road` | ⚠️ NAME MISMATCH |
| `weather_windy` | `weather_windy` | `weather_windy` | ✅ MAPPED |
| `weather_hail` | `weather_hail` | `weather_hail` | ✅ MAPPED |
| `weather_thunder_lightning` | `weather_thunder` | `weather_thunder_lightening` | ⚠️ TYPO IN PDF |
| `weather_other` | ❓ Missing? | N/A | ⚠️ NO PDF FIELD |
| **Road Conditions** ||||
| `road_condition_dry` | `road_condition_dry` | `weather_road_dry` | ⚠️ PDF UNDER "WEATHER" |
| `road_condition_wet` | `road_condition_wet` | `weather_wet_road` | ⚠️ PDF UNDER "WEATHER" |
| `road_condition_icy` | `road_condition_icy` | `weather_ice_on_road` | ⚠️ OVERLAP WITH WEATHER |
| `road_condition_snow_covered` | `road_condition_snow_covered` | `weather_snow_on_road` | ⚠️ PDF UNDER "WEATHER" |
| `road_condition_loose_surface` | `road_condition_loose_surface` | `weather_loose_surface_road` | ⚠️ PDF UNDER "WEATHER" |
| `road_condition_other` | `road_condition_other` | N/A | ⚠️ NO PDF FIELD |
| **Road Type** ||||
| `road_type_motorway` | `road_type_motorway` | `road_type_motorway` | ✅ MAPPED |
| `road_type_a_road` | `road_type_a_road` | `road_type_a_road` | ✅ MAPPED |
| `road_type_b_road` | `road_type_b_road` | `road_type_b_road` | ✅ MAPPED |
| `road_type_urban_street` | `road_type_urban_street` | `road_type_urban` | ⚠️ NAME SHORTENED |
| `road_type_rural_road` | `road_type_rural_road` | `road_type_rural` | ⚠️ NAME SHORTENED |
| `road_type_car_park` | `road_type_car_park` | `road_type_car_park` | ✅ MAPPED |
| `road_type_other` | `road_type_other` | `road_type_private_road` | ⚠️ DIFFERENT MEANING |
| **Speed** ||||
| `speed_limit` | `speed_limit` | `speed_limit` | ✅ MAPPED |
| `your_speed` | ❌ MISSING | `your_estimated_speed_mph` | 🚨 DB COLUMN MISSING |
| **Traffic** ||||
| `traffic_conditions_heavy` | `traffic_heavy` OR `traffic_conditions_no_traffic`? | `traffic_conditions_heavy` | ⚠️ DUPLICATE DB NAMES |
| `traffic_conditions_moderate` | `traffic_moderate` | `traffic_conditions_moderate` | ⚠️ DUPLICATE DB NAMES |
| `traffic_conditions_light` | `traffic_light` | `traffic_conditions_light` | ⚠️ DUPLICATE DB NAMES |
| `traffic_conditions_no_traffic` | `traffic_none` OR `traffic_conditions_no_traffic` | `traffic_conditions_no_traffic` | ⚠️ DUPLICATE DB NAMES |
| **Visibility** ||||
| `visibility_good` | `visibility_good` | `visabilty_good` | ⚠️ PDF TYPO |
| `visibility_poor` | `visibility_poor` | `visability_poor` | ⚠️ PDF TYPO |
| `visibility_very_poor` | `visibility_very_poor` | `visibility_very_poor` | ✅ MAPPED |
| `visibility_street_lights` | `visibility_severely_restricted` → **RENAME** | `weather_street_lights` | 🔧 MIGRATION NEEDED |
| **Road Markings** ||||
| `road_markings_visible_yes` | `road_markings_yes` OR `road_markings_visible_yes` | `road_markings_yes` | ⚠️ DUPLICATE DB NAMES |
| `road_markings_visible_no` | `road_markings_no` OR `road_markings_visible_no` | `road_markings_no` | ⚠️ DUPLICATE DB NAMES |
| `road_markings_visible_partially` | `road_markings_partial` OR `road_markings_visible_partially` | `road_markings_partial` | ⚠️ DUPLICATE DB NAMES |

---

## 🚨 CRITICAL ISSUES

### Issue 1: Missing Database Column
**Field:** `your_speed` (user's estimated speed)
**Impact:** HIGH - User input will be lost if submitted
**Solution:** Add column to `incident_reports` table

### Issue 2: Weather/Road Condition Overlap
**Problem:** PDF combines weather and road conditions under "weather" prefix
**Example:** HTML has `road_condition_dry` but PDF has `weather_road_dry`
**Impact:** MEDIUM - Mapping confusion, but workable
**Solution:** Document mapping clearly in PDF service

### Issue 3: Duplicate Database Columns (Legacy vs New)
**Pattern:** Database has both old and new naming conventions:
- `traffic_heavy` (old) vs `traffic_conditions_heavy` (conceptual new name from HTML)
- `road_markings_yes` (old) vs `road_markings_visible_yes` (new)
**Impact:** LOW - Can use either, but causes confusion
**Solution:** Decide on standard, deprecate old columns

### Issue 4: PDF Field Name Typos
**Found:**
- `visabilty_good` (should be "visibility")
- `visability_poor` (should be "visibility")
- `weather_thunder_lightening` (should be "lightning")
**Impact:** LOW - Mapping works, but looks unprofessional
**Solution:** Fix in future PDF update

### Issue 5: Missing PDF Fields for "Other" Options
**Fields with "other" text inputs:**
- `weather_other` - No PDF field
- `road_condition_other` - No PDF field
- `road_type_other` - Maps to `road_type_private_road` (different meaning!)
**Impact:** MEDIUM - Custom user input may be lost
**Solution:** Add generic "other" text fields to PDF or append to description

### Issue 6: User CSV Shows Fields Not in HTML
**User encountered:** "special road conditions" (roadworks, workman, cyclists, pedestrians, school zone, narrow road, poor markings)
**HTML form:** No such fields found
**PDF has:** `special_conditions_traffic_calming`, `special_conditions_defective_road`, `special_conditions_roadworks`, `special_conditions_narrow_road`
**Impact:** 🚨 HIGH - User is seeing fields that don't exist in current HTML!
**Question:** Are these fields on a different page (Page 4)? Or missing from Page 3?

---

## 📝 Recommendations

### Immediate Actions:

1. **Add Missing Database Column:**
```sql
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS your_speed TEXT;
```

2. **Rename Visibility Column (Already created migration 004):**
```sql
ALTER TABLE incident_reports
RENAME COLUMN visibility_severely_restricted TO visibility_street_lights;
```

3. **Clarify "Special Road Conditions" Location:**
- User CSV shows these fields under Page Three
- HTML Page Three doesn't have them
- Are they on Page Four?
- Or missing from Page Three?

4. **Standardize Database Naming:**
- Use newer `traffic_conditions_*` naming (consistent with HTML)
- Use newer `road_markings_visible_*` naming (more descriptive)
- Deprecate old `traffic_*` and `road_markings_*` columns

### Future PDF Updates:

1. Fix typos: `visabilty` → `visibility`, `lightening` → `lightning`
2. Add "other" text fields for custom inputs
3. Align road condition naming (currently under "weather")

---

## ✅ What's Working

**37 out of 41 fields** have database columns and can be mapped to PDF (with naming translation).

**4 fields** need attention:
1. `your_speed` - Missing DB column
2. `weather_other` - Missing DB column, no PDF field
3. `road_condition_other` - Missing DB column, no PDF field
4. `road_type_other` - Has DB column but PDF field has different meaning

---

## 📋 Next Steps

1. ✅ Locate "special road conditions" fields (Page 3 or Page 4?)
2. 🔧 Add `your_speed` database column
3. 🔧 Run migration 004 (rename visibility field)
4. 🔧 Decide on "other" field handling (add DB columns or skip)
5. 📝 Create complete field mapping for Page Three
6. 📝 Reconcile database duplicate naming (old vs new)
7. ✅ Verify Page Three 100% before proceeding to Page Four

---

**Last Updated:** 2025-01-03
**Status:** Awaiting user clarification on "special road conditions" location
