# Incident Form Page Analysis - Pages 2, 3, 4

**Date:** 2025-10-29
**Branch:** feat/audit-prep
**Issue:** User reported incident form pages don't match Typeform reference and mock-up

---

## Reference Document

All comparisons are against: `/Users/ianring/Node.js/TYPEFORM_QUESTIONS_REFERENCE.md`

This 1002-line document is the single source of truth for incident form structure.

---

## Page 2 Analysis: ❌ WRONG CONTENT

### Current Title
`Safety Check & Basic Info - Page 2 of 12` (incident-form-page2.html:8)

### Current Content (INCORRECT)
```html
Section 1: 🛡️ Safety Status
- Question: "Is everyone safe right now?"
- Options: Yes / No / Emergency services needed

Section 2: 👤 Your Details  ❌ WRONG - Personal details should NOT be here
- Full Name (fullName)
- Date of Birth (dateOfBirth)
- Phone Number (phone)
- Email Address (email)
- Home Address (address)

Section 3: 📅 When Did This Happen?
- Date of Accident (accidentDate)
- Time of Accident (accidentTime)
```

### What Page 2 SHOULD Contain (Per Typeform Section 2)

**Reference:** TYPEFORM_QUESTIONS_REFERENCE.md lines 342-371

**Section: Medical Information**

1. **Do you need Medical Attention?** (yes/no)
   - Type: `yes_no`
   - Field: `medical_attention`

2. **Please provide Details of any injuries:** (long_text)
   - Field: `injury_details`
   - Placeholder: "Please describe your injuries in detail..."

3. **Severity of Injuries** (rating, 1-5 scale)
   - Field: `injury_severity`
   - Labels: "Minor" to "Severe"

4. **Hospital or Medical Center Name** (short_text)
   - Field: `medical_center`
   - Placeholder: "Name of hospital or medical center"

5. **Ambulance Called?** (yes/no)
   - Field: `ambulance_called`

6. **Treatment Received** (long_text)
   - Field: `treatment_received`
   - Placeholder: "What treatment did you receive?"

### Problems Identified

1. **❌ Personal Details Section**
   - Users ALREADY provided name, DOB, phone, email, address in signup form
   - This data is in `user_signup` table
   - Should NOT be duplicated in incident report
   - Frontend can fetch from `/api/profile` if needed for display

2. **❌ Safety Status Format**
   - Current format is correct conceptually but doesn't match Typeform structure
   - Should be integrated into medical attention question

3. **❌ Accident Date/Time**
   - Should be on Page 4 (Accident Details) per Typeform Section 4
   - Currently misplaced on Page 2

### Required Changes

**Complete rewrite of Page 2:**

1. Remove entire "Your Details" section
2. Remove "When Did This Happen" section
3. Replace with Medical Information section per Typeform
4. Update title to: "Medical Information - Page 2 of 12"
5. Implement all 6 medical questions from Typeform Section 2

---

## Page 3 Analysis: ⚠️ PARTIALLY CORRECT

### Current Title
`Medical Assessment - Page 3 of 12` (incident-form-page3.html:8)

### Current Content
```html
Section 1: 💢 Current Symptoms (CHECKBOX GROUP)
✅ CORRECT APPROACH - checkbox list for symptoms

Current symptoms (13 checkboxes):
1. chest_pain - "Chest pain or tightness"
2. bleeding - "Bleeding (external or suspected internal)"
3. breathlessness - "Difficulty breathing or breathlessness"
4. unconsciousness - "Loss of consciousness (even briefly)"
5. head_injury - "Head injury or severe headache"
6. neck_back_pain - "Neck or back pain"
7. broken_bones - "Suspected broken bones or fractures"
8. severe_pain - "Severe pain anywhere in body"
9. cuts_bruises - "Cuts, bruises, or abrasions"
10. whiplash - "Whiplash symptoms (neck stiffness)"
11. shock - "Shock or feeling dazed/confused"
12. other_injury - "Other injury or symptom"
13. no_injuries - "✅ No injuries or symptoms"

Section 2: 🚑 Medical Attention
- "Did you receive medical attention at the scene?" (yes/no)
- Conditional field: "Please provide details" (textarea)
```

### What Page 3 SHOULD Contain (Per Typeform Section 3)

**Reference:** TYPEFORM_QUESTIONS_REFERENCE.md lines 373-392

**Section: Medical Symptoms**

**Question:** "Are you experiencing any of the following symptoms?" (multiple_choice, multiple answers)

**Field:** `symptoms`

**Choices (11 checkboxes):**
1. Headache
2. Dizziness
3. Nausea
4. Back Pain
5. Neck Pain
6. Chest Pain
7. Abdominal Pain
8. Difficulty Breathing
9. Bleeding
10. Loss of Consciousness
11. Other

### Problems Identified

1. **⚠️ Symptom List Mismatch**
   - Current: 13 symptoms (too many)
   - Typeform: 11 symptoms (specific list)
   - Missing: Headache, Dizziness, Nausea, Abdominal Pain
   - Extra: head_injury, broken_bones, severe_pain, cuts_bruises, whiplash, shock, no_injuries

2. **⚠️ "Medical Attention" Section**
   - This question ("Did you receive medical attention at the scene?") should be on Page 2
   - It's part of Medical Information section in Typeform, not Medical Symptoms

3. **✅ Correct Elements**
   - Checkbox group approach is correct
   - "Other" option exists
   - Conditional logic pattern works well

### Required Changes

1. Update title to: "Medical Symptoms - Page 3 of 12"
2. Replace symptom list with exact 11 symptoms from Typeform:
   - Headache
   - Dizziness
   - Nausea
   - Back Pain
   - Neck Pain
   - Chest Pain
   - Abdominal Pain
   - Difficulty Breathing
   - Bleeding
   - Loss of Consciousness
   - Other
3. Remove "Medical Attention" section (move to Page 2)
4. Keep checkbox group styling (works well)

---

## Page 4 Analysis: ⚠️ WRONG REDIRECT + FIELD GAPS

### Current Title
`Location & Conditions - Page 4 of 12` (incident-form-page4.html:8)

### Current Content
```html
Section 1: 📌 Accident Location
- location (textarea) - "Street address or location description" ✅
- what3words (text) - "what3words address (optional)" ✅

Section 2: 🌤️ Weather & Light Conditions
- weather (select) - 7 options ✅
- lighting (select) - 4 options ✅
- roadSurface (select) - 6 options ✅

Section 3: 🛣️ Road Type
- roadType (select) - 8 options ✅
- speedLimit (select) - mph options ✅

Section 4: 🔀 Junction / Intersection
- junctionType (select) - 8 options ✅

Section 5: ⚠️ Special Road Conditions
- specialConditions (checkbox group) - 8 options ✅

Navigation:
Line 625: window.location.href = '/incident-form-page4a-vehicle-extended.html'; ❌ WRONG
```

### What Page 4 SHOULD Contain (Per Typeform Section 4)

**Reference:** TYPEFORM_QUESTIONS_REFERENCE.md lines 394-413

**Section: Accident Date & Time**

1. **Date of Accident** (date)
   - Field: `accident_date`
   - Format: DD/MM/YYYY

2. **Time of Accident** (time)
   - Field: `accident_time`
   - Format: HH:MM (24-hour)

3. **Exact Location of Accident** (long_text)
   - Field: `accident_location`
   - Placeholder: "Please describe the exact location..."

**PLUS:** All the road conditions fields (weather, lighting, etc.) - these seem correct

### Problems Identified

1. **❌ Missing Accident Date/Time**
   - Page 4 should start with date/time fields (currently on Page 2)
   - These are critical fields that must be at the top of the page

2. **❌ Wrong Navigation Target**
   - Line 625: Redirects to `/incident-form-page4a-vehicle-extended.html`
   - **Should redirect to:** `/incident-form-page4a-location-photos.html`
   - User explicitly stated: "there is no link to page 4a"
   - Page 4a exists: `incident-form-page4a-location-photos.html` (for uploading photos of accident scene)

3. **⚠️ what3words Field**
   - User reported: "What3words map not showing in mobile"
   - Current implementation: Just a text input (line 373)
   - Should include what3words map widget for mobile users
   - Need to integrate what3words JavaScript API

4. **✅ Correct Elements**
   - Location textarea is correct
   - Weather/lighting/road conditions match Typeform well
   - Special conditions checkboxes are comprehensive

### Required Changes

1. **Add Date/Time Section at Top**
   ```html
   Section: 📅 When Did This Happen?
   - accidentDate (date input, required)
   - accidentTime (time input, required)
   ```

2. **Fix Navigation**
   - Change line 625 from:
     ```javascript
     window.location.href = '/incident-form-page4a-vehicle-extended.html';
     ```
   - To:
     ```javascript
     window.location.href = '/incident-form-page4a-location-photos.html';
     ```

3. **Add what3words Map Widget**
   - Integrate what3words JavaScript API
   - Show interactive map on mobile
   - Auto-fill text input when user selects location on map
   - Reference: https://developer.what3words.com/tutorial/javascript

---

## User's Mock-up Mention

User stated: "Page 4 seems to have different content than what was displayed in the mock-up"

**Hypothesis:**
- Mock-up likely showed Accident Date/Time at the top of Page 4
- Current implementation has these fields on Page 2 (wrong page)
- This mismatch is causing confusion

**Verification Needed:**
- Ask user for mock-up file/screenshot to confirm exact expected layout

---

## Mobile UI Issues

User reported: "screen positioning being inconsistent and detached from the UI"

**Potential Causes:**

1. **Sticky Banner CSS**
   - All pages use `position: sticky` for banner (lines ~49-56)
   - Safe area insets for iOS notch (`env(safe-area-inset-top)`)
   - May need adjustment for certain device sizes

2. **Form Section Spacing**
   - Container padding: `24px 16px` (desktop), `16px 12px` (mobile <480px)
   - May need testing on actual devices to identify positioning issues

3. **Navigation Button Padding**
   - Uses `env(safe-area-inset-bottom)` for iPhone home indicator
   - May need adjustment

**Required Actions:**
1. Test on actual mobile device (iOS Safari, Android Chrome)
2. Check console for CSS errors
3. Verify viewport meta tag working correctly
4. Test sticky positioning behavior during scroll

---

## Summary of Required Changes

### Page 2 - COMPLETE REWRITE NEEDED
- ❌ Remove personal details section entirely
- ❌ Remove accident date/time section
- ✅ Add Medical Information section (6 questions from Typeform Section 2)
- Update title to "Medical Information - Page 2 of 12"

### Page 3 - MODERATE CHANGES
- ⚠️ Update title to "Medical Symptoms - Page 3 of 12"
- ⚠️ Replace symptom list with exact 11 from Typeform Section 3
- ❌ Remove "Medical Attention" section (move to Page 2)

### Page 4 - MINOR CHANGES + CRITICAL FIX
- ✅ Add Accident Date/Time section at top (move from Page 2)
- ❌ Fix navigation redirect (line 625) to `/incident-form-page4a-location-photos.html`
- ⚠️ Add what3words map widget for mobile
- ✅ Keep all existing road condition fields (they're correct)

### Mobile Testing
- Test sticky positioning on real devices
- Fix what3words map display
- Verify UI consistency across iOS/Android

---

## Implementation Order

**Priority 1 - Critical Issues:**
1. Fix Page 4 navigation redirect (1 line change, high impact)
2. Add what3words map widget (user explicitly mentioned this)

**Priority 2 - Content Alignment:**
3. Rewrite Page 2 content to match Typeform Medical Information
4. Update Page 3 symptom list to match Typeform Medical Symptoms
5. Move accident date/time from Page 2 to Page 4

**Priority 3 - Mobile UI:**
6. Test on actual mobile devices
7. Fix any positioning/CSS issues found

---

**Status:** Analysis complete, ready for implementation
**Next Step:** Get user confirmation on priorities before making changes
