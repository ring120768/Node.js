# Typeform Field Extraction Root Cause Analysis

**Date:** 2025-10-27
**Issue:** 91% field extraction failure (only 8/94 fields extracting from Typeform → Supabase)
**Status:** ✅ Root cause identified, Solution options proposed

---

## Executive Summary

After implementing **Phase 3.6 improvements** (emoji removal + fuzzy matching with substring logic), we've identified the root cause of the 91% field extraction failure:

**The database field names don't match the actual Typeform question wording.**

This is NOT a technical bug in the webhook code - it's a **data structure mismatch** between:
1. What we CALL fields in the database (`snake_case` simple names)
2. What Typeform actually ASKS (`natural language questions`)

---

## What's Working ✅

### Phase 3.5 Improvements (SUCCESSFUL)
1. **Emoji/Unicode removal** - ✅ Working perfectly
   - Before: `"title_🛡️_quick_safety_check..."`
   - After: `"quick_safety_check..."`

2. **Prefix stripping** - ✅ Working perfectly
   - Removes `title_`, `question_`, `field_` prefixes

3. **Hyphen → underscore conversion** - ✅ Working
   - `"T-junction"` → `"t_junction"`

### Phase 3.6 Improvements (SUCCESSFUL)
4. **Fuzzy matching with substring logic** - ✅ Logic correct
   - Successfully matches `airbags_deployed` in `were_the_airbags_deployed`
   - Successfully matches `damage_to_your_vehicle` in `was_there_any_damage_to_your_vehicle`

---

## The Real Problem ❌

### Evidence from Test Submission

**Test payload:** `incident_report_a9vhj1kekojyj6kvigkkja9vhj1wlbbj_2025-10-27T12-38-22-797Z.json`
- Total questions in form: 131
- Questions answered by user: **59 (45%)**
- Fields extracted to database: **8 (9% of total, 14% of answered)**

### Why Only 8 Fields Extracted

**All 8 successful extractions were EXACT matches (Strategy 2: TITLE):**

| Database Field | Typeform Question | Match Type |
|----------------|-------------------|------------|
| `medical_attention` | "Medical Attention" | ✅ EXACT |
| `when_did_the_accident_happen` | "When did the accident happen?" | ✅ EXACT |
| `what_time_did_the_accident_happen` | "What time did the accident happen?" | ✅ EXACT |
| `make_of_car` | "Make of Car" | ✅ EXACT |
| `model_of_car` | "Model of Car" | ✅ EXACT |
| `vehicle_license_plate` | "Vehicle License Plate" | ✅ EXACT |
| `police_officers_name` | "Police Officer's Name" | ✅ EXACT |
| `police_force_details` | "Police Force Details" | ✅ EXACT |

These worked because the Typeform questions normalize perfectly to match database field names.

### Why Fuzzy Matching Didn't Help

**Example mismatches found:**

1. **`wearing_seatbelts`**
   - Database expects: `wearing_seatbelts` (one word)
   - Typeform asks: "Were you and all your passengers wearing seat belts?"
   - Normalizes to: `were_you_and_all_your_passengers_if_any_wearing_seat_belts`
   - **Mismatch:** Title has `wearing_seat_belts` (two words), not `wearing_seatbelts`

2. **`are_you_safe`**
   - Database expects: `are_you_safe`
   - Typeform asks: "🛡️ Quick safety check: Are you in a safe location..."
   - Normalizes to: `quick_safety_check_lets_make_sure_youre_safe...`
   - **Mismatch:** Words scattered throughout long question, plus contraction `youre` vs `are_you`

3. **`six_point_safety_check`**
   - Database expects: `six_point_safety_check`
   - Typeform asks: "Six-point check: (lists 6 safety items)"
   - Normalizes to: `quick_safety_check...six_point_check...`
   - **Mismatch:** Title has `six_point_check` without `safety`

4. **`airbags_deployed`** ✅ WOULD WORK
   - Database expects: `airbags_deployed`
   - Typeform asks: "Were the Airbags Deployed?"
   - Normalizes to: `were_the_airbags_deployed`
   - **✅ Fuzzy match successful!** BUT user didn't answer this question

5. **`damage_to_your_vehicle`** ✅ WOULD WORK
   - Database expects: `damage_to_your_vehicle`
   - Typeform asks: "Was There Any Damage To Your Vehicle?"
   - Normalizes to: `was_there_any_damage_to_your_vehicle`
   - **✅ Fuzzy match successful!** BUT user didn't answer this question

---

## Summary of Issues

### Issue 1: Incomplete Form Submissions
Users are only filling out **45% of the form** (59/131 fields). This might be intentional (conditional logic, optional sections) or users abandoning the form.

### Issue 2: Field Name Mismatches
Of the 59 fields answered, only 8 match exactly. The other 51 have:
- Different word order
- Different phrasing
- Singular vs plural differences
- Contractions vs full words
- Long descriptive questions vs simple field names

### Issue 3: Fuzzy Matching Limitations
Even with improved substring matching, fuzzy matching CAN'T handle:
- ❌ Word spacing differences (`seatbelts` vs `seat_belts`)
- ❌ Contractions (`youre` vs `are_you`)
- ❌ Scattered keywords in long questions
- ❌ Different word combinations (`six_point_safety_check` vs `six_point_check`)

---

## Solution Options

### Option 1: UUID-Based Hardcoded Mapping (RECOMMENDED) ✅

**Description:** Create a direct mapping file that maps Typeform field UUIDs to database column names.

**Pros:**
- ✅ 100% reliable - no guessing or fuzzy matching
- ✅ Handles all edge cases (contractions, spacing, etc.)
- ✅ Fast - no complex normalization needed
- ✅ Easy to maintain - clear mapping file
- ✅ Works immediately for all fields

**Cons:**
- ❌ Requires one-time effort to create mappings
- ❌ Needs updating if Typeform form changes

**Implementation:**
```javascript
// Create typeform-field-mappings.js
const INCIDENT_REPORT_MAPPING = {
  // UUID → database_field_name
  '93c7be28-36d...': 'six_point_safety_check',
  'aa4a286b-340...': 'wearing_seatbelts',
  '0c0e48ba-205...': 'airbags_deployed',
  'b10e20aa-264...': 'damage_to_your_vehicle',
  // ... 127 more mappings
};
```

**Effort:** 2-3 hours to create initial mappings

**Result:** **100% field extraction rate** for answered questions

---

### Option 2: Rewrite Typeform Questions (NOT RECOMMENDED) ❌

**Description:** Change all Typeform questions to match database field names exactly.

**Example:**
- Change: "🛡️ Quick safety check: Are you in a safe location..."
- To: "Are You Safe"

**Pros:**
- ✅ Simple exact matches
- ✅ Current code would work

**Cons:**
- ❌ Destroys UX - questions become robotic and unclear
- ❌ Loses context for users (what does "six_point_safety_check" mean?)
- ❌ Violates good form design principles
- ❌ Would confuse users filling out the form

**Verdict:** ❌ **DO NOT DO THIS** - UX disaster

---

### Option 3: AI-Powered Semantic Matching (OVERKILL) ⚠️

**Description:** Use OpenAI embeddings to match question meanings to field names.

**Pros:**
- ✅ Handles all linguistic variations
- ✅ No hardcoded mappings

**Cons:**
- ❌ Massive overkill for this problem
- ❌ Costs money (OpenAI API calls per webhook)
- ❌ Slower (network latency)
- ❌ Less reliable than direct mapping
- ❌ Harder to debug

**Verdict:** ⚠️ **NOT RECOMMENDED** - Use Option 1 instead

---

### Option 4: Hybrid Approach (GOOD MIDDLE GROUND) ✅

**Description:** Keep current 3-tier matching + add UUID fallback mapping for problematic fields.

**Implementation:**
```javascript
// Strategy 1: Direct UUID match
// Strategy 2: Exact normalized title match (current 8 fields)
// Strategy 3: Fuzzy substring match (works for some fields)
// Strategy 4: UUID fallback mapping (for remaining mismatches)

const UUID_FALLBACK_MAPPING = {
  // Only map the ~50 fields that don't match via Strategies 1-3
  '93c7be28-36d...': 'six_point_safety_check',
  'aa4a286b-340...': 'wearing_seatbelts',
  // ... ~48 more
};
```

**Pros:**
- ✅ Best of both worlds
- ✅ Relies on automatic matching when possible
- ✅ Falls back to explicit mapping for edge cases
- ✅ Easy to expand mapping over time

**Cons:**
- ⚠️ Slightly more complex logic

**Effort:** 2 hours to implement + 1 hour to create partial mappings

**Result:** **95%+ field extraction rate**

---

## Recommended Next Steps

### Immediate Action (Choose One)

**RECOMMENDED:** **Option 1 (UUID Mapping)**
1. Export Typeform form definition → `typeform_form_definition.json`
2. Create mapping file with all 131 fields
3. Update webhook controller to check UUID mapping first
4. Deploy and test with new incident report

**OR**

**ALTERNATIVE:** **Option 4 (Hybrid)**
1. Keep current 3-tier matching
2. Add UUID fallback for ~50 problematic fields
3. Gradually expand mapping as needed

### Testing Plan

After implementing chosen solution:
1. Submit complete test incident report (all 131 fields)
2. Verify 100% extraction rate
3. Check database has all expected data
4. Generate PDF to confirm all fields populated

---

## Technical Details

### Current 3-Tier Matching Strategy

**Implemented in:** `src/controllers/webhook.controller.js` lines 164-196

**Strategy 1: Direct UUID Match**
```javascript
answer = answers.find(a => a.field?.ref === ref);
```
- Tries to match field UUID directly
- Works: Never (we don't store UUIDs in database)

**Strategy 2: Exact Normalized Title Match**
```javascript
normalizedTitle === ref
```
- Normalizes Typeform question to snake_case
- Compares with database field name
- Works: 8/94 fields (9%)

**Strategy 3: Fuzzy Substring Match**
```javascript
normalizedTitle.includes(ref)
```
- Checks if field name is substring of question
- Works: Would work for ~10 more fields IF answered
- Fails: 76/94 fields due to mismatches

### Phase 3.6 Improvements Applied

**File:** `src/controllers/webhook.controller.js`
- Line 191: Changed from `RegExp(\`\\b${ref}\\b\`)` to `normalizedTitle.includes(ref)`
- Line 234: Changed from word boundaries to substring match

**File:** `scripts/debug-webhook-payload.js`
- Line 175: Changed from word boundaries to substring match

**Result:** Fuzzy matching logic now correct, but still limited by fundamental field name mismatches.

---

## Conclusion

The webhook field extraction is now **technically correct** but **semantically mismatched**.

**What we fixed:**
- ✅ Emoji removal
- ✅ Prefix stripping
- ✅ Fuzzy matching logic

**What remains:**
- ❌ Database field names don't match Typeform questions
- ❌ Users only filling 45% of form
- ❌ Need explicit UUID → field name mapping

**Recommended action:** Implement **Option 1 (UUID Mapping)** for 100% reliability.

**Estimated time to fix:** 2-3 hours to create mappings + 30 minutes to implement.

**Expected result:** **100% field extraction rate** for all answered questions.

---

## Files Modified (Phase 3.6)

1. `src/controllers/webhook.controller.js` - Updated fuzzy matching to substring
2. `scripts/debug-webhook-payload.js` - Updated fuzzy matching to substring
3. `test-fuzzy-match.js` - Created test showing matching works for some fields

**Git Status:** Ready to commit Phase 3.6 improvements

---

**Questions?** See `TYPEFORM_SUPABASE_FIELD_MAPPING.md` for complete field reference.
