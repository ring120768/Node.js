# Database Column Investigation Report

**Date:** 2025-11-11
**Issue:** Data loss after 'special_conditions_animals' field and missing database columns

---

## Executive Summary

Investigation reveals **4 critical database column mismatches** that are causing data insertion failures:

1. ✅ **FIXED**: `detailed_account_of_what_happened` (removed from webhook controller)
2. ❌ **ACTIVE BUG**: `special_conditions_animals` - column doesn't exist
3. ❌ **ACTIVE BUG**: `model_of_car` - column doesn't exist
4. ❌ **ACTIVE BUG**: `incident_description` - column doesn't exist
5. ❌ **TABLE MISSING**: `ai_analysis` - table doesn't exist
6. ❌ **COLUMN MISSING**: `ai_transcription.incident_id` - column doesn't exist

---

## Database Schema Analysis

### incident_reports Table (166 columns)

**❌ Fields in webhook controller that DON'T exist in database:**
- `special_conditions_animals` (line 1105)
- `model_of_car` (line 1108)
- `incident_description` (commented out in incidentForm.controller.js)

**✅ Fields that DO exist:**
- `usual_vehicle` ✅
- `vehicle_license_plate` ✅
- `dvla_make`, `dvla_model`, `dvla_colour` ✅
- `manual_make`, `manual_model` ✅

**Issue Analysis:**
The webhook controller at line 1105 tries to insert `special_conditions_animals` which doesn't exist in the database. When Supabase attempts the INSERT operation with a non-existent column, it returns a PGRST204 error and **THE ENTIRE INSERT FAILS**.

This explains why data "looks good up to special_conditions_animals" but then nothing after `usual_vehicle` is captured - **the database transaction is rejected before it completes**.

---

## Root Cause: Field Name Mismatch

### Legacy Typeform Field Names vs New Database Schema

The webhook controller is using **old Typeform field names** that were removed during the schema migration (migration 013):

```javascript
// Line 1105 - webhook.controller.js
special_conditions_animals: getAnswerByRefWithDefault(answers, 'special_conditions_animals', 'boolean', titleMap),

// Database schema:
// ❌ special_conditions_animals does NOT exist
// ✅ special_condition_parked_vehicles DOES exist (similar naming pattern)
```

**Note:** The field was likely renamed or removed during the migration from Typeform to in-house forms. The correct field might be `special_condition_parked_vehicles` (which exists in the schema).

---

## Field-by-Field Analysis

### 1. `special_conditions_animals` (Line 1105)

**Status:** ❌ Column does not exist
**Impact:** HIGH - Causes INSERT to fail, blocking all subsequent fields
**Location:** `src/controllers/webhook.controller.js:1105`

**Code:**
```javascript
special_conditions_animals: getAnswerByRefWithDefault(answers, 'special_conditions_animals', 'boolean', titleMap),
```

**Fix Required:**
1. Check if field was renamed (possibly to `special_condition_animals` without 's'?)
2. Check migration files to see when it was removed
3. Either remove this line OR update to correct column name

---

### 2. `model_of_car` (Line 1108)

**Status:** ❌ Column does not exist
**Impact:** HIGH - Causes INSERT to fail
**Location:** `src/controllers/webhook.controller.js:1108`

**Code:**
```javascript
model_of_car: getAnswerByRef(answers, 'model_of_car', titleMap),
```

**Replacement fields that DO exist:**
- `dvla_model` ✅ (for DVLA lookup data)
- `manual_model` ✅ (for manually entered data)

**Fix Required:** Remove this line (legacy Typeform field, replaced by dvla_model/manual_model)

---

### 3. `incident_description` (Previously existed)

**Status:** ❌ Column does not exist (removed in migration 013)
**Impact:** MEDIUM - Caused error at 20:52:20 GMT
**Location:** Commented out in `src/controllers/incidentForm.controller.js:413`

**Evidence:**
```javascript
// Note: incident_description column removed - does not exist in schema
```

**Fix Status:** ✅ Already documented as removed

---

## AI Service Issues

### 4. `ai_analysis` Table

**Status:** ❌ Table does not exist
**Error:** `Could not find the table 'public.ai_analysis' in the schema cache`
**Impact:** LOW (non-critical) - Already wrapped in try/catch
**Location:** `src/controllers/ai.controller.js` (storeAIAnalysis function)

**Timestamps:**
- Multiple occurrences: 14:32:38, 14:32:41, 14:33:24, 14:33:30, 14:33:52, 14:34:14, 15:02:06, 15:04:32, 15:05:24, 15:05:34 GMT

**Current Handling:**
```javascript
// ai.controller.js - Already has error handling
} catch (error) {
  logger.warn('Failed to store AI analysis (non-critical)', { error: error.message });
}
```

**Fix Required:** Create `ai_analysis` table OR remove the storeAIAnalysis function calls

---

### 5. `ai_transcription.incident_id` Column

**Status:** ❌ Column does not exist
**Error:** `Could not find the 'incident_id' column of 'ai_transcription' in the schema cache`
**Impact:** HIGH - Prevents saving personal statements
**Location:** `src/controllers/ai.controller.js:403`

**Timestamps:**
- 15:02:52 GMT
- 15:06:21 GMT

**Current Code:**
```javascript
// ai.controller.js:383-391
const { data, error } = await supabase
  .from('ai_transcription')
  .insert([{
    create_user_id: userId,
    incident_id: incidentId || null,  // ❌ This column doesn't exist
    transcript_text: personalStatement,
    narrative_text: accidentNarrative || null,
    voice_transcription: voiceTranscription || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }])
```

**Schema Investigation:**
The ai_transcription table exists but shows 0 columns when queried. This suggests either:
1. The table has no data AND no schema is cached
2. There's a permission/RLS issue preventing schema access
3. The table was recently altered and Supabase schema cache is stale

**Fix Required:**
1. Check actual table schema in Supabase dashboard
2. Either remove `incident_id` from INSERT
3. OR create the `incident_id` column if it's needed

---

## Migration History Context

Based on the FIELD_VALIDATION_COMPLETE.md document read earlier:

**Migration 013** (`013_cleanup_incident_reports_table.sql`) removed several fields including:
- `detailed_account_of_what_happened` (line 156)
- `file_url_record_detailed_account_of_what_happened` (line 253-255)

**The Issue:**
The webhook controller was NOT updated when these migrations ran. It's still trying to insert old Typeform field names that don't exist in the new schema designed for in-house HTML forms.

---

## Recommended Fixes (Priority Order)

### 🔴 CRITICAL (Fix Immediately)

**1. Remove `special_conditions_animals` from webhook controller**
   - File: `src/controllers/webhook.controller.js`
   - Line: 1105
   - Action: Remove or rename to match actual column name

**2. Remove `model_of_car` from webhook controller**
   - File: `src/controllers/webhook.controller.js`
   - Line: 1108
   - Action: Remove (replaced by dvla_model/manual_model)

**3. Fix `ai_transcription.incident_id` issue**
   - File: `src/controllers/ai.controller.js`
   - Lines: 330, 353, 385
   - Action: Remove `incident_id` from INSERT/UPDATE queries OR create the column

### 🟡 MEDIUM (Fix Soon)

**4. Create `ai_analysis` table OR remove storeAIAnalysis calls**
   - File: `src/controllers/ai.controller.js`
   - Function: `storeAIAnalysis` (lines 248-280)
   - Action: Either create table with proper schema OR remove function

### 🟢 LOW (Monitor)

**5. Verify `incident_description` is fully removed**
   - Already documented as removed
   - No active errors (just one occurrence at 20:52:20)

---

## Testing Plan

After applying fixes, test with:

```bash
# 1. Test Typeform webhook with full payload
node test-incident-webhook.js

# 2. Verify data insertion succeeds
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('incident_reports')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(1)
  .then(({ data, error }) => {
    if (error) console.error('Error:', error);
    else console.log('Latest record:', data[0]);
  });
"

# 3. Check server logs for PGRST204 errors
tail -100 /tmp/server.log | grep "PGRST204"
```

---

## Additional Notes

### Why Data Looks "Good Up To special_conditions_animals"

When Supabase receives an INSERT query with a non-existent column:

```sql
INSERT INTO incident_reports (
  special_conditions_roadworks,  -- ✅ exists
  special_conditions_animals,     -- ❌ DOESN'T EXIST - QUERY FAILS HERE
  usual_vehicle,                  -- ⏭️ never processed
  vehicle_license_plate           -- ⏭️ never processed
) VALUES (...)
```

The PostgreSQL database returns a PGRST204 error **before executing the INSERT**, so:
- Fields BEFORE the bad column might appear in logs as "extracted"
- But the entire INSERT transaction is REJECTED
- NO DATA is actually saved to the database
- This explains why "data seems good up to special_conditions_animals" but nothing after `usual_vehicle` is captured

---

**Last Updated:** 2025-11-11 15:55 GMT
**Status:** Investigation complete, fixes pending
