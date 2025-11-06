# Page 10 (Police & Safety Information) → Supabase Complete Field Mapping

**Last Updated:** 2025-11-06
**File:** `public/incident-form-page10-police-details.html`
**Database Table:** `incident_reports`
**Total Fields:** 10
**Page Progress:** 83.33% (Page 10 of 12)

---

## Executive Summary

### ⚠️ Critical Finding: 20% Field Mapping Success Rate

Page 10 (Police & Safety Information) has achieved only a **20% perfect mapping success rate**, making it the **second-worst performing page** after Page 7 (42%). This page collects critical legal evidence about police attendance, breath tests, airbag deployment, and seatbelt usage.

**Quick Stats:**
- ✅ **2 Perfect Matches** (20%): Same field names in frontend and database
- ⚠️ **8 Partial Matches** (80%): Field exists but name mismatch - translation required
- ❌ **0 No Mapping** (0%): No fields completely unmapped
- 🔧 **Backend Translation Required**: 8 fields need name mapping

### Data Flow Architecture

```
Frontend Form Fields
       ↓
localStorage.page10_data
       ↓
sessionStorage (submission aggregation)
       ↓
POST /api/signup/submit
       ↓
[⚠️ FIELD NAME TRANSLATION LAYER REQUIRED]
       ↓
Supabase: incident_reports table
```

### Comparison with Other Pages

| Page | Topic | Success Rate | Perfect Matches | Partial | No Mapping |
|------|-------|--------------|-----------------|---------|------------|
| 5 | Medical Details | 97% | 30/31 | 1 | 0 |
| 6 | Accident Scene | 100% | 17/17 | 0 | 0 |
| 7 | Other Vehicle | 42% | 1/24 | 9 | 14 |
| 8 | Other Damage Images | 83% | 10/12 | 2 | 0 |
| 9 | Witnesses | 88% | 7/8 | 1 | 0 |
| **10** | **Police & Safety** | **20%** | **2/10** | **8** | **0** |

Page 10 ranks **5th out of 6 documented pages**, significantly below the average success rate.

---

## Field Inventory & Database Mapping

### Complete Field List (10 Total)

#### ✅ Perfect Matches (2 fields - 20%)

| # | Field Name | Database Column | Type | Required | Notes |
|---|-----------|-----------------|------|----------|-------|
| 7 | `other_breath_test` | `other_breath_test` | TEXT | Conditional | Other driver's breath test result |
| 8 | `airbags_deployed` | `airbags_deployed` | TEXT | Yes | Whether airbags deployed in your vehicle |

#### ⚠️ Partial Matches (8 fields - 80%)

**Critical: All require field name translation in backend**

| # | Frontend Field | Database Column | Translation Required |
|---|---------------|-----------------|---------------------|
| 1 | `police_attended` | `did_police_attend` | police_attended → did_police_attend |
| 2 | `accident_ref_number` | `accident_reference_number` | accident_ref_number → accident_reference_number |
| 3 | `police_force` | `police_force_details` | police_force → police_force_details |
| 4 | `officer_name` | `police_officers_name` | officer_name → police_officers_name |
| 5 | `officer_badge` | `police_officer_badge_number` | officer_badge → police_officer_badge_number |
| 6 | `user_breath_test` | `breath_test` | user_breath_test → breath_test |
| 9 | `seatbelts_worn` | `wearing_seatbelts` | seatbelts_worn → wearing_seatbelts |
| 10 | `seatbelt_reason` | `reason_no_seatbelts` | seatbelt_reason → reason_no_seatbelts |

#### ❌ No Mapping (0 fields - 0%)

None - all fields have corresponding database columns.

---

## Critical Success Metrics

### Database Coverage Analysis

**Storage Location:** `incident_reports` table (single record per user)

```sql
-- Relevant columns in incident_reports table:
did_police_attend               TEXT    -- ⚠️ Mismatch: police_attended
accident_reference_number       TEXT    -- ⚠️ Mismatch: accident_ref_number
police_force_details            TEXT    -- ⚠️ Mismatch: police_force
police_officers_name            TEXT    -- ⚠️ Mismatch: officer_name
police_officer_badge_number     TEXT    -- ⚠️ Mismatch: officer_badge
breath_test                     TEXT    -- ⚠️ Mismatch: user_breath_test
other_breath_test               TEXT    -- ✅ Match
airbags_deployed                TEXT    -- ✅ Match
wearing_seatbelts               TEXT    -- ⚠️ Mismatch: seatbelts_worn
reason_no_seatbelts             TEXT    -- ⚠️ Mismatch: seatbelt_reason
```

### Success Rate Calculation

**Formula:**
```
Perfect Matches / Total Fields = Success Rate
2 / 10 = 20%
```

**Data Loss Risk:**
- ⚠️ **CRITICAL**: 80% of fields require translation
- Without proper field name mapping, **all 8 partial match fields** would be lost
- This represents **critical legal evidence** (police reports, breath tests, safety equipment)

---

## Complete Field Reference with Code Analysis

### Field 1: Police Attendance ⚠️ PARTIAL

**Frontend Field Name:** `police_attended`
**Database Column:** `did_police_attend`
**HTML Type:** Radio Button
**Required:** Yes
**Code Location:** Lines 444-461

```html
<!-- Line 444-461: Police Attendance Question -->
<div class="form-group">
  <label class="form-label">
    Did police attend the scene?<span class="required">*</span>
  </label>
  <p class="form-hint">Select whether police officers came to the accident scene.</p>

  <div class="radio-group">
    <div class="radio-option" data-value="yes" data-field="police_attended">
      <input type="radio" name="police_attended" value="yes" id="police-yes">
      <div class="radio-option-icon">✅</div>
      <div class="radio-option-label">Yes</div>
    </div>
    <div class="radio-option" data-value="no" data-field="police_attended">
      <input type="radio" name="police_attended" value="no" id="police-no">
      <div class="radio-option-icon">❌</div>
      <div class="radio-option-label">No</div>
    </div>
  </div>
</div>
```

**JavaScript State Management:** Lines 642, 671-686

```javascript
// Line 642: State variable
let policeAttended = null;

// Line 671-686: Event handler
if (field === 'police_attended') {
  policeAttended = value;
  console.log('Police attended:', policeAttended);

  if (value === 'yes') {
    policeDetailsContainer.classList.add('visible');
  } else {
    policeDetailsContainer.classList.remove('visible');
    // Clear police fields
    document.getElementById('accident-ref').value = '';
    document.getElementById('police-force').value = '';
    document.getElementById('officer-name').value = '';
    document.getElementById('officer-badge').value = '';
    document.getElementById('user-breath-test').value = '';
    document.getElementById('other-breath-test').value = '';
  }
}
```

**localStorage Storage:** Line 748

```javascript
// Line 746-762: Save function
const data = {
  police_attended: policeAttended,
  // ...
};
```

**Values:** `"yes"` | `"no"`

**Typeform Mapping:** `did_police_attend` (TEXT)

**⚠️ Translation Required:**
```javascript
// Backend must map:
frontend.police_attended → database.did_police_attend
```

---

### Field 2: Accident Reference Number ⚠️ PARTIAL

**Frontend Field Name:** `accident_ref_number`
**Database Column:** `accident_reference_number`
**HTML Type:** Text Input
**Required:** Conditional (only if `police_attended === 'yes'`)
**Code Location:** Lines 470-476

```html
<!-- Line 470-476: Accident Reference Number Input -->
<div class="form-group">
  <label class="form-label" for="accident-ref">
    Accident Reference Number
  </label>
  <p class="form-hint">Unique identifier from police force (also called incident number)</p>
  <input type="text" id="accident-ref" placeholder="e.g., CAD123456 or Inc/2025/001234">
</div>
```

**Conditional Display:** Lines 464-534

```html
<!-- Line 464: Container shown only if police attended -->
<div id="police-details-container" class="police-details-container">
  <!-- All police detail fields here -->
</div>
```

**JavaScript Management:** Line 749

```javascript
// Line 749: Saved with trim()
accident_ref_number: document.getElementById('accident-ref').value.trim() || null,
```

**Input ID:** `accident-ref` (kebab-case)
**Saved As:** `accident_ref_number` (snake_case)
**Database:** `accident_reference_number` (snake_case, longer)

**Placeholder Examples:**
- `CAD123456` (Computer Aided Dispatch reference)
- `Inc/2025/001234` (Incident number format)

**Typeform Mapping:** `accident_reference_number` (TEXT)

**⚠️ Translation Required:**
```javascript
// Backend must map:
frontend.accident_ref_number → database.accident_reference_number
```

---

### Field 3: Police Force ⚠️ PARTIAL

**Frontend Field Name:** `police_force`
**Database Column:** `police_force_details`
**HTML Type:** Text Input
**Required:** Conditional (only if `police_attended === 'yes'`)
**Code Location:** Lines 478-484

```html
<!-- Line 478-484: Police Force Input -->
<div class="form-group">
  <label class="form-label" for="police-force">
    Police Force
  </label>
  <p class="form-hint">Which police force attended</p>
  <input type="text" id="police-force" placeholder="e.g., Thames Valley Police, Metropolitan Police">
</div>
```

**JavaScript Management:** Line 750

```javascript
// Line 750: Saved with trim()
police_force: document.getElementById('police-force').value.trim() || null,
```

**Placeholder Examples:**
- `Thames Valley Police`
- `Metropolitan Police`
- `Greater Manchester Police`

**Typeform Mapping:** `police_force_details` (TEXT)

**⚠️ Translation Required:**
```javascript
// Backend must map:
frontend.police_force → database.police_force_details
```

---

### Field 4: Officer Name ⚠️ PARTIAL

**Frontend Field Name:** `officer_name`
**Database Column:** `police_officers_name`
**HTML Type:** Text Input
**Required:** Conditional (only if `police_attended === 'yes'`)
**Code Location:** Lines 486-491

```html
<!-- Line 486-491: Officer Name Input -->
<div class="form-group">
  <label class="form-label" for="officer-name">
    Officer's Name
  </label>
  <input type="text" id="officer-name" placeholder="e.g., PC John Smith">
</div>
```

**JavaScript Management:** Line 751

```javascript
// Line 751: Saved with trim()
officer_name: document.getElementById('officer-name').value.trim() || null,
```

**Placeholder Example:** `PC John Smith`

**Typeform Mapping:** `police_officers_name` (TEXT, plural possessive)

**⚠️ Translation Required:**
```javascript
// Backend must map:
frontend.officer_name → database.police_officers_name
```

---

### Field 5: Officer Badge Number ⚠️ PARTIAL

**Frontend Field Name:** `officer_badge`
**Database Column:** `police_officer_badge_number`
**HTML Type:** Text Input
**Required:** Conditional (only if `police_attended === 'yes'`)
**Code Location:** Lines 493-498

```html
<!-- Line 493-498: Officer Badge Number Input -->
<div class="form-group">
  <label class="form-label" for="officer-badge">
    Officer's Badge/Collar Number
  </label>
  <input type="text" id="officer-badge" placeholder="e.g., 12345">
</div>
```

**JavaScript Management:** Line 752

```javascript
// Line 752: Saved with trim()
officer_badge: document.getElementById('officer-badge').value.trim() || null,
```

**UK Police Terminology:**
- "Badge Number" (US term)
- "Collar Number" (UK term - more common)
- "Shoulder Number" (alternative UK term)

**Placeholder Example:** `12345`

**Typeform Mapping:** `police_officer_badge_number` (TEXT)

**⚠️ Translation Required:**
```javascript
// Backend must map:
frontend.officer_badge → database.police_officer_badge_number
```

---

### Field 6: User Breath Test Result ⚠️ PARTIAL

**Frontend Field Name:** `user_breath_test`
**Database Column:** `breath_test`
**HTML Type:** Select Dropdown
**Required:** Conditional (only if `police_attended === 'yes'`)
**Code Location:** Lines 500-515

```html
<!-- Line 500-515: User Breath Test Dropdown -->
<div class="form-group">
  <label class="form-label" for="user-breath-test">
    Your Breath Test Result
  </label>
  <p class="form-hint">If a breath test was conducted, select the result</p>
  <select id="user-breath-test">
    <option value="">-- Select result --</option>
    <option value="not_tested">Not tested</option>
    <option value="negative_0mg">Negative (0 mg)</option>
    <option value="below_limit">Below legal limit (under 35 μg/100ml)</option>
    <option value="at_limit">At legal limit (35 μg/100ml)</option>
    <option value="above_limit">Above legal limit (over 35 μg/100ml)</option>
    <option value="refused">Refused to take test</option>
    <option value="unable">Unable to provide sample</option>
  </select>
</div>
```

**UK Legal Limit:** 35 micrograms per 100 millilitres of breath (μg/100ml)

**Option Values:**
- `""` - Not selected (empty string)
- `"not_tested"` - Test not conducted
- `"negative_0mg"` - Zero alcohol detected
- `"below_limit"` - Detected but under 35 μg/100ml
- `"at_limit"` - Exactly 35 μg/100ml
- `"above_limit"` - Over 35 μg/100ml (illegal)
- `"refused"` - Driver refused test (criminal offence)
- `"unable"` - Could not provide sample

**JavaScript Management:** Line 753

```javascript
// Line 753: Saved with trim()
user_breath_test: document.getElementById('user-breath-test').value.trim() || null,
```

**Typeform Mapping:** `breath_test` (TEXT)

**⚠️ Translation Required:**
```javascript
// Backend must map:
frontend.user_breath_test → database.breath_test
```

---

### Field 7: Other Driver Breath Test Result ✅ PERFECT MATCH

**Frontend Field Name:** `other_breath_test`
**Database Column:** `other_breath_test`
**HTML Type:** Select Dropdown
**Required:** Conditional (only if `police_attended === 'yes'`)
**Code Location:** Lines 517-533

```html
<!-- Line 517-533: Other Driver Breath Test Dropdown -->
<div class="form-group">
  <label class="form-label" for="other-breath-test">
    Other Driver's Breath Test Result
  </label>
  <p class="form-hint">If known</p>
  <select id="other-breath-test">
    <option value="">-- Select result --</option>
    <option value="unknown">Unknown / Not witnessed</option>
    <option value="not_tested">Not tested</option>
    <option value="negative_0mg">Negative (0 mg)</option>
    <option value="below_limit">Below legal limit (under 35 μg/100ml)</option>
    <option value="at_limit">At legal limit (35 μg/100ml)</option>
    <option value="above_limit">Above legal limit (over 35 μg/100ml)</option>
    <option value="refused">Refused to take test</option>
    <option value="arrested">Driver was arrested</option>
  </select>
</div>
```

**Additional Options (compared to user test):**
- `"unknown"` - Did not witness test
- `"arrested"` - Driver arrested (implies failed test)

**Missing Options (compared to user test):**
- `"unable"` - Not relevant for other driver

**JavaScript Management:** Line 754

```javascript
// Line 754: Saved with trim()
other_breath_test: document.getElementById('other-breath-test').value.trim() || null,
```

**Typeform Mapping:** `other_breath_test` (TEXT)

**✅ Perfect Match:**
```javascript
// No translation needed:
frontend.other_breath_test === database.other_breath_test
```

---

### Field 8: Airbags Deployed ✅ PERFECT MATCH

**Frontend Field Name:** `airbags_deployed`
**Database Column:** `airbags_deployed`
**HTML Type:** Radio Button
**Required:** Yes
**Code Location:** Lines 546-562

```html
<!-- Line 546-562: Airbags Deployed Question -->
<div class="form-group">
  <label class="form-label">
    Were the airbags deployed in your vehicle?<span class="required">*</span>
  </label>

  <div class="radio-group">
    <div class="radio-option" data-value="yes" data-field="airbags_deployed">
      <input type="radio" name="airbags_deployed" value="yes" id="airbags-yes">
      <div class="radio-option-icon">💨</div>
      <div class="radio-option-label">Yes</div>
    </div>
    <div class="radio-option" data-value="no" data-field="airbags_deployed">
      <input type="radio" name="airbags_deployed" value="no" id="airbags-no">
      <div class="radio-option-icon">🚫</div>
      <div class="radio-option-label">No</div>
    </div>
  </div>
</div>
```

**Safety Section Styling:** Lines 537-543

```html
<!-- Line 537-543: Safety Section Container -->
<div class="form-section safety-section">
  <div class="section-title">
    <span class="section-icon">🛡️</span>
    <span>Safety Equipment</span>
  </div>
  <p class="section-description">Critical evidence for your case - please answer accurately.</p>
```

**CSS Styling:** Lines 217-223

```css
.safety-section {
  padding: 24px;
  background: #fff9e6;          /* Yellow tint */
  border-radius: 12px;
  border: 2px solid #ffc107;    /* Yellow border */
  margin-top: 24px;
}
```

**JavaScript State Management:** Line 643, 687-689

```javascript
// Line 643: State variable
let airbagsDeployed = null;

// Line 687-689: Event handler
} else if (field === 'airbags_deployed') {
  airbagsDeployed = value;
  console.log('Airbags deployed:', airbagsDeployed);
```

**localStorage Storage:** Line 755

```javascript
// Line 755: Saved directly
airbags_deployed: airbagsDeployed,
```

**Values:** `"yes"` | `"no"`

**Typeform Mapping:** `airbags_deployed` (TEXT)

**Legal Significance:**
- Airbag deployment indicates significant impact force
- Non-deployment may suggest lower-speed collision
- Critical evidence for injury claims and vehicle damage assessment

**✅ Perfect Match:**
```javascript
// No translation needed:
frontend.airbags_deployed === database.airbags_deployed
```

---

### Field 9: Seatbelts Worn ⚠️ PARTIAL

**Frontend Field Name:** `seatbelts_worn`
**Database Column:** `wearing_seatbelts`
**HTML Type:** Radio Button
**Required:** Yes
**Code Location:** Lines 564-604

```html
<!-- Line 564-604: Seatbelts Worn Question -->
<div class="form-group">
  <label class="form-label">
    Were you and all passengers wearing seat belts?<span class="required">*</span>
  </label>
  <p class="help-text" style="margin-top: 8px; margin-bottom: 12px;">
    UK law requires seatbelts while the vehicle is moving. Legal exemptions include:
    parked/stationary vehicles, reversing, medical exemption certificates, licensed
    taxi drivers, and vehicles manufactured before 1965 without fitted belts.
  </p>

  <div class="radio-group">
    <div class="radio-option" data-value="yes" data-field="seatbelts_worn">
      <input type="radio" name="seatbelts_worn" value="yes" id="seatbelts-yes">
      <div class="radio-option-icon">✅</div>
      <div class="radio-option-label">Yes</div>
    </div>
    <div class="radio-option radio-with-tooltip" data-value="no" data-field="seatbelts_worn">
      <input type="radio" name="seatbelts_worn" value="no" id="seatbelts-no">
      <div class="radio-option-icon">❌</div>
      <div class="radio-option-label">No</div>

      <!-- Hover tooltip with legal exemptions -->
      <div class="hover-tooltip">
        <div class="tooltip-content">
          <div class="tooltip-title">
            <span>💡</span>
            <span>Pro Tip</span>
          </div>
          <p class="tooltip-description">UK law requires seatbelts while moving. Common legal exemptions:</p>
          <div class="tooltip-examples">
            <div class="tooltip-examples-title">Valid Reasons:</div>
            <ul>
              <li>Vehicle was parked/stationary when hit</li>
              <li>Reversing into a parking space</li>
              <li>Medical exemption certificate</li>
              <li>Licensed taxi driver picking up passenger</li>
              <li>Vehicle manufactured before 1965 (no fitted belts)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

**UK Seatbelt Law - Legal Exemptions:**
1. **Vehicle parked/stationary** when hit
2. **Reversing** into a parking space
3. **Medical exemption certificate** from GP
4. **Licensed taxi driver** picking up fare
5. **Pre-1965 vehicles** without fitted belts

**Hover Tooltip:** Lines 583-601

Shows legal exemptions when user hovers over "No" option. CSS animations on hover:

```css
.radio-with-tooltip:hover .hover-tooltip {
  opacity: 1;
  visibility: visible;
  bottom: calc(100% + 16px);
}
```

**JavaScript State Management:** Line 644, 690-700

```javascript
// Line 644: State variable
let seatbeltsWorn = null;

// Line 690-700: Event handler
} else if (field === 'seatbelts_worn') {
  seatbeltsWorn = value;
  console.log('Seatbelts worn:', seatbeltsWorn);

  if (value === 'no') {
    seatbeltExplanation.classList.add('visible');
  } else {
    seatbeltExplanation.classList.remove('visible');
    seatbeltReasonTextarea.value = '';
  }
}
```

**localStorage Storage:** Line 756

```javascript
// Line 756: Saved directly
seatbelts_worn: seatbeltsWorn,
```

**Values:** `"yes"` | `"no"`

**Typeform Mapping:** `wearing_seatbelts` (TEXT)

**Legal Significance:**
- Not wearing seatbelt may affect compensation (contributory negligence)
- Legal exemptions fully protect claimant's rights
- Explanation required to establish exemption applicability

**⚠️ Translation Required:**
```javascript
// Backend must map:
frontend.seatbelts_worn → database.wearing_seatbelts
```

---

### Field 10: Seatbelt Reason ⚠️ PARTIAL

**Frontend Field Name:** `seatbelt_reason`
**Database Column:** `reason_no_seatbelts`
**HTML Type:** Textarea
**Required:** Conditional (only if `seatbelts_worn === 'no'`)
**Code Location:** Lines 606-614

```html
<!-- Line 606-614: Seatbelt Explanation (Conditional) -->
<div id="seatbelt-explanation" class="seatbelt-explanation">
  <div class="alert alert-warning">
    <span>⚠️</span>
    <span>Please explain why seatbelts were not worn - this is important legal information.</span>
  </div>
  <textarea id="seatbelt-reason" placeholder="Please explain the reason why seatbelts were not worn..." maxlength="500"></textarea>
  <div id="seatbelt-char-counter" class="char-counter">0 / 500 characters</div>
</div>
```

**Conditional Display:** Lines 225-232 (CSS)

```css
.seatbelt-explanation {
  display: none;
  margin-top: 16px;
}

.seatbelt-explanation.visible {
  display: block;
}
```

**Character Counter:** Lines 707-713

```javascript
// Line 707-713: Character counter with validation
seatbeltReasonTextarea.addEventListener('input', () => {
  const length = seatbeltReasonTextarea.value.length;
  seatbeltCharCounter.textContent = `${length} / 500 characters`;
  validateForm();
  saveData();
});
```

**Validation Logic:** Lines 733-736

```javascript
// Line 733-736: Minimum 5 characters required
if (seatbeltsWorn === 'no') {
  const reason = seatbeltReasonTextarea.value.trim();
  isValid = reason.length > 5; // At least 5 characters
}
```

**localStorage Storage:** Line 757

```javascript
// Line 757: Saved conditionally
seatbelt_reason: seatbeltsWorn === 'no' ? seatbeltReasonTextarea.value.trim() : null
```

**Constraints:**
- Max length: 500 characters (HTML attribute `maxlength="500"`)
- Min length: 6 characters (validation requires `> 5`)
- Only saved if `seatbelts_worn === 'no'`
- Trimmed on save

**Typeform Mapping:** `reason_no_seatbelts` (TEXT)

**Legal Purpose:**
- Establishes valid legal exemption
- Protects against contributory negligence claims
- Required for solicitor to defend full compensation claim

**⚠️ Translation Required:**
```javascript
// Backend must map:
frontend.seatbelt_reason → database.reason_no_seatbelts
```

---

## Conditional Logic Analysis

### Primary Conditional: Police Attendance

**Trigger Field:** `police_attended` (Lines 444-461)

**Conditional Display Container:** Lines 464-534

```javascript
// Line 671-686: Show/hide police details based on attendance
if (field === 'police_attended') {
  policeAttended = value;

  if (value === 'yes') {
    policeDetailsContainer.classList.add('visible');
  } else {
    policeDetailsContainer.classList.remove('visible');
    // Clear all police fields
    document.getElementById('accident-ref').value = '';
    document.getElementById('police-force').value = '';
    document.getElementById('officer-name').value = '';
    document.getElementById('officer-badge').value = '';
    document.getElementById('user-breath-test').value = '';
    document.getElementById('other-breath-test').value = '';
  }
}
```

**Fields Shown Only If `police_attended === 'yes'`:**
1. `accident_ref_number` (accident reference)
2. `police_force` (force name)
3. `officer_name` (officer name)
4. `officer_badge` (badge/collar number)
5. `user_breath_test` (your breath test result)
6. `other_breath_test` (other driver's breath test)

**CSS Implementation:** Lines 204-215

```css
.police-details-container {
  display: none;
  padding: 24px;
  background: var(--container-bg);
  border-radius: 12px;
  border: 2px solid var(--accent);
  margin-top: 24px;
}

.police-details-container.visible {
  display: block;
}
```

**UX Pattern:**
- Default: Hidden
- User selects "Yes" → Container slides into view
- User selects "No" → Container hides + all fields cleared
- Warning alert shown when visible (Lines 465-468)

### Secondary Conditional: Seatbelt Explanation

**Trigger Field:** `seatbelts_worn` (Lines 564-604)

**Conditional Display:** Lines 606-614

```javascript
// Line 690-700: Show/hide seatbelt explanation
if (field === 'seatbelts_worn') {
  seatbeltsWorn = value;

  if (value === 'no') {
    seatbeltExplanation.classList.add('visible');
  } else {
    seatbeltExplanation.classList.remove('visible');
    seatbeltReasonTextarea.value = '';
  }
}
```

**Field Shown Only If `seatbelts_worn === 'no'`:**
- `seatbelt_reason` (textarea explaining why)

**CSS Implementation:** Lines 225-232

```css
.seatbelt-explanation {
  display: none;
  margin-top: 16px;
}

.seatbelt-explanation.visible {
  display: block;
}
```

**UX Pattern:**
- Default: Hidden
- User selects "No" → Textarea appears with warning
- User selects "Yes" → Textarea hides + content cleared
- Warning alert explains importance (Lines 607-610)

### Form Validation Logic

**Complete Validation Function:** Lines 722-743

```javascript
function validateForm() {
  let isValid = false;

  // Required fields
  const hasPoliceAnswer = policeAttended !== null;
  const hasAirbagsAnswer = airbagsDeployed !== null;
  const hasSeatbeltsAnswer = seatbeltsWorn !== null;

  if (hasPoliceAnswer && hasAirbagsAnswer && hasSeatbeltsAnswer) {
    // If seatbelts not worn, explanation required
    if (seatbeltsWorn === 'no') {
      const reason = seatbeltReasonTextarea.value.trim();
      isValid = reason.length > 5; // At least 6 characters
    } else {
      isValid = true;
    }
  }

  nextBtn.disabled = !isValid;
  console.log('Form valid:', isValid);
}
```

**Validation Rules:**

**Always Required (3 fields):**
1. `police_attended` - Must answer yes or no
2. `airbags_deployed` - Must answer yes or no
3. `seatbelts_worn` - Must answer yes or no

**Conditionally Required (1 field):**
4. `seatbelt_reason` - Required if `seatbelts_worn === 'no'` AND minimum 6 characters

**Validation Paths:**

```
Path 1: All "yes" answers
├── police_attended = 'yes'
├── airbags_deployed = 'yes'
├── seatbelts_worn = 'yes'
└── ✅ Valid (Next button enabled)

Path 2: Police no, others yes
├── police_attended = 'no'
├── airbags_deployed = 'yes'
├── seatbelts_worn = 'yes'
└── ✅ Valid

Path 3: Seatbelts not worn
├── police_attended = 'yes' or 'no'
├── airbags_deployed = 'yes' or 'no'
├── seatbelts_worn = 'no'
└── IF seatbelt_reason.length > 5 → ✅ Valid
    ELSE → ❌ Invalid (Next button disabled)
```

**Police Detail Fields:**
- All optional (no validation required)
- Cleared automatically when `police_attended === 'no'`
- Saved as `null` if empty (Line 749-754)

---

## localStorage Data Structure

### Storage Key

```javascript
localStorage.setItem('page10_data', JSON.stringify(data));
```

**Key:** `page10_data`
**Format:** JSON string

### Data Object Schema

**Complete Object:** Lines 746-762

```javascript
const data = {
  // Police attendance (required)
  police_attended: policeAttended,                  // "yes" | "no" | null

  // Police details (conditional - only if police attended)
  accident_ref_number: document.getElementById('accident-ref').value.trim() || null,
  police_force: document.getElementById('police-force').value.trim() || null,
  officer_name: document.getElementById('officer-name').value.trim() || null,
  officer_badge: document.getElementById('officer-badge').value.trim() || null,
  user_breath_test: document.getElementById('user-breath-test').value.trim() || null,
  other_breath_test: document.getElementById('other-breath-test').value.trim() || null,

  // Safety equipment (required)
  airbags_deployed: airbagsDeployed,                // "yes" | "no" | null
  seatbelts_worn: seatbeltsWorn,                    // "yes" | "no" | null

  // Seatbelt explanation (conditional - only if seatbelts not worn)
  seatbelt_reason: seatbeltsWorn === 'no' ? seatbeltReasonTextarea.value.trim() : null
};
```

### Example Data States

**Example 1: Police attended, airbags deployed, seatbelts worn**

```json
{
  "police_attended": "yes",
  "accident_ref_number": "CAD123456",
  "police_force": "Thames Valley Police",
  "officer_name": "PC John Smith",
  "officer_badge": "12345",
  "user_breath_test": "negative_0mg",
  "other_breath_test": "unknown",
  "airbags_deployed": "yes",
  "seatbelts_worn": "yes",
  "seatbelt_reason": null
}
```

**Example 2: No police, no airbags, seatbelts not worn (with explanation)**

```json
{
  "police_attended": "no",
  "accident_ref_number": null,
  "police_force": null,
  "officer_name": null,
  "officer_badge": null,
  "user_breath_test": null,
  "other_breath_test": null,
  "airbags_deployed": "no",
  "seatbelts_worn": "no",
  "seatbelt_reason": "Vehicle was stationary when hit from behind while parked"
}
```

**Example 3: Police attended, minimal details provided**

```json
{
  "police_attended": "yes",
  "accident_ref_number": "Inc/2025/001234",
  "police_force": null,
  "officer_name": null,
  "officer_badge": null,
  "user_breath_test": "not_tested",
  "other_breath_test": "not_tested",
  "airbags_deployed": "no",
  "seatbelts_worn": "yes",
  "seatbelt_reason": null
}
```

### Load Function

**Complete Load Function:** Lines 765-812

```javascript
function loadData() {
  const saved = localStorage.getItem('page10_data');
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    console.log('Loading saved data:', data);

    // Restore police attended
    if (data.police_attended) {
      policeAttended = data.police_attended;
      const option = document.querySelector(`.radio-option[data-field="police_attended"][data-value="${data.police_attended}"]`);
      if (option) option.click();
    }

    // Restore police details
    if (data.accident_ref_number) document.getElementById('accident-ref').value = data.accident_ref_number;
    if (data.police_force) document.getElementById('police-force').value = data.police_force;
    if (data.officer_name) document.getElementById('officer-name').value = data.officer_name;
    if (data.officer_badge) document.getElementById('officer-badge').value = data.officer_badge;
    if (data.user_breath_test) document.getElementById('user-breath-test').value = data.user_breath_test;
    if (data.other_breath_test) document.getElementById('other-breath-test').value = data.other_breath_test;

    // Restore airbags
    if (data.airbags_deployed) {
      airbagsDeployed = data.airbags_deployed;
      const option = document.querySelector(`.radio-option[data-field="airbags_deployed"][data-value="${data.airbags_deployed}"]`);
      if (option) option.click();
    }

    // Restore seatbelts
    if (data.seatbelts_worn) {
      seatbeltsWorn = data.seatbelts_worn;
      const option = document.querySelector(`.radio-option[data-field="seatbelts_worn"][data-value="${data.seatbelts_worn}"]`);
      if (option) option.click();
    }

    // Restore seatbelt reason
    if (data.seatbelt_reason) {
      seatbeltReasonTextarea.value = data.seatbelt_reason;
      seatbeltCharCounter.textContent = `${data.seatbelt_reason.length} / 500 characters`;
    }

    validateForm();
  } catch (error) {
    console.error('Error loading data:', error);
  }
}
```

**Restoration Logic:**
1. Radio buttons trigger `click()` to restore selected state
2. Text inputs set `value` directly
3. Select dropdowns set `value` directly
4. Character counter updated for textarea
5. Validation runs after all fields restored

---

## Navigation & Page Flow

### Navigation Buttons

**Back Button:** Lines 619-622

```html
<button type="button" class="btn btn-secondary" id="back-btn">
  <span>←</span>
  <span>Back</span>
</button>
```

**Next Button:** Lines 623-627

```html
<button type="button" class="btn btn-primary" id="next-btn" disabled>
  <span>Next</span>
  <span>→</span>
</button>
```

**Initial State:** `disabled` (enabled only when form valid)

### Navigation Event Handlers

**Back Button:** Lines 815-818

```javascript
document.getElementById('back-btn').addEventListener('click', () => {
  console.log('Back button clicked - returning to Page 9');
  window.location.href = '/incident-form-page9-witnesses.html';
});
```

**Next Button:** Lines 820-824

```javascript
document.getElementById('next-btn').addEventListener('click', () => {
  console.log('Next button clicked - proceeding to Page 12 (Final Medical Check)');
  saveData();
  window.location.href = '/incident-form-page12-final-medical-check.html';
});
```

### Page Flow

```
Page 9: Witnesses
        ↓
    [Back Button]
        ↓
Page 10: Police & Safety Information (THIS PAGE)
        ↓
    [Next Button]
        ↓
Page 12: Final Medical Check

⚠️ NOTE: Page 11 is skipped in navigation flow
```

**Progress Tracking:** Line 84 (CSS) + Line 424 (HTML)

```css
.progress-bar {
  width: 83.33%; /* Page 10 of 12 = 83.33% */
}
```

```html
<p>Page 10 of 12: Almost Done!</p>
```

---

## Backend Implementation Requirements

### Critical Field Name Translation Layer

**⚠️ URGENT:** Backend MUST implement field name translation for 80% of fields.

**Required Translation Map:**

```javascript
// src/controllers/signup.controller.js (or incident submission handler)

function translatePage10FieldNames(frontendData) {
  return {
    // Police attendance (1 field - PARTIAL)
    did_police_attend: frontendData.police_attended,

    // Police details (5 fields - ALL PARTIAL)
    accident_reference_number: frontendData.accident_ref_number,
    police_force_details: frontendData.police_force,
    police_officers_name: frontendData.officer_name,
    police_officer_badge_number: frontendData.officer_badge,
    breath_test: frontendData.user_breath_test,

    // Breath test (1 field - PERFECT MATCH)
    other_breath_test: frontendData.other_breath_test,  // No change needed

    // Safety equipment (1 field - PERFECT MATCH)
    airbags_deployed: frontendData.airbags_deployed,    // No change needed

    // Seatbelt info (2 fields - BOTH PARTIAL)
    wearing_seatbelts: frontendData.seatbelts_worn,
    reason_no_seatbelts: frontendData.seatbelt_reason
  };
}
```

### Database Insert Example

**Supabase Insert Pattern:**

```javascript
// Extract Page 10 data from localStorage aggregation
const page10Data = JSON.parse(submissionData.page10_data);

// Translate field names
const translatedData = translatePage10FieldNames(page10Data);

// Insert/update incident_reports table
const { data, error } = await supabase
  .from('incident_reports')
  .upsert({
    create_user_id: userId,

    // Police information
    did_police_attend: translatedData.did_police_attend,
    accident_reference_number: translatedData.accident_reference_number,
    police_force_details: translatedData.police_force_details,
    police_officers_name: translatedData.police_officers_name,
    police_officer_badge_number: translatedData.police_officer_badge_number,
    breath_test: translatedData.breath_test,
    other_breath_test: translatedData.other_breath_test,

    // Safety equipment
    airbags_deployed: translatedData.airbags_deployed,
    wearing_seatbelts: translatedData.wearing_seatbelts,
    reason_no_seatbelts: translatedData.reason_no_seatbelts,

    updated_at: new Date().toISOString()
  }, {
    onConflict: 'create_user_id'
  });

if (error) {
  console.error('Error saving Page 10 data:', error);
  throw new Error('Failed to save police and safety information');
}
```

### Validation Requirements

**Backend Validation Rules:**

```javascript
function validatePage10Data(data) {
  const errors = [];

  // Required fields
  if (!data.police_attended || !['yes', 'no'].includes(data.police_attended)) {
    errors.push('police_attended must be "yes" or "no"');
  }

  if (!data.airbags_deployed || !['yes', 'no'].includes(data.airbags_deployed)) {
    errors.push('airbags_deployed must be "yes" or "no"');
  }

  if (!data.seatbelts_worn || !['yes', 'no'].includes(data.seatbelts_worn)) {
    errors.push('seatbelts_worn must be "yes" or "no"');
  }

  // Conditional validation: seatbelt explanation
  if (data.seatbelts_worn === 'no') {
    if (!data.seatbelt_reason || data.seatbelt_reason.trim().length < 6) {
      errors.push('seatbelt_reason required (min 6 characters) when seatbelts not worn');
    }
    if (data.seatbelt_reason && data.seatbelt_reason.length > 500) {
      errors.push('seatbelt_reason exceeds 500 character limit');
    }
  }

  // Breath test validation (if provided)
  const validBreathTests = [
    '', 'not_tested', 'negative_0mg', 'below_limit',
    'at_limit', 'above_limit', 'refused', 'unable'
  ];
  if (data.user_breath_test && !validBreathTests.includes(data.user_breath_test)) {
    errors.push('Invalid user_breath_test value');
  }

  const validOtherBreathTests = [
    '', 'unknown', 'not_tested', 'negative_0mg', 'below_limit',
    'at_limit', 'above_limit', 'refused', 'arrested'
  ];
  if (data.other_breath_test && !validOtherBreathTests.includes(data.other_breath_test)) {
    errors.push('Invalid other_breath_test value');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Error Handling

**Example Error Response:**

```javascript
app.post('/api/signup/submit', async (req, res) => {
  try {
    const page10Data = JSON.parse(req.body.page10_data);

    // Validate
    const validation = validatePage10Data(page10Data);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Page 10 validation failed',
        details: validation.errors,
        page: 10
      });
    }

    // Translate field names
    const translatedData = translatePage10FieldNames(page10Data);

    // Save to database
    await saveToDatabase(translatedData);

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error processing Page 10:', error);
    res.status(500).json({
      error: 'Failed to save police and safety information',
      page: 10
    });
  }
});
```

---

## Critical Issues & Recommendations

### 🔴 Critical Issue 1: 80% Field Name Mismatch Rate

**Problem:**
8 out of 10 fields (80%) have different names between frontend and database. Without translation, these fields will be lost.

**Impact:**
- **Legal evidence lost:** Police reports, breath test results
- **Safety data missing:** Seatbelt usage, airbag deployment
- **Compensation risk:** Missing evidence weakens claims

**Affected Fields:**
1. `police_attended` → `did_police_attend`
2. `accident_ref_number` → `accident_reference_number`
3. `police_force` → `police_force_details`
4. `officer_name` → `police_officers_name`
5. `officer_badge` → `police_officer_badge_number`
6. `user_breath_test` → `breath_test`
7. `seatbelts_worn` → `wearing_seatbelts`
8. `seatbelt_reason` → `reason_no_seatbelts`

**Solution:**
Implement `translatePage10FieldNames()` function in backend (see Backend Implementation section).

**Priority:** 🔴 URGENT - Must be implemented before production

---

### ⚠️ Critical Issue 2: Conditional Logic Not Enforced on Backend

**Problem:**
Frontend conditionally shows/hides fields, but backend may not validate this logic.

**Scenarios:**

**Scenario A: Police fields when police didn't attend**
```javascript
// Frontend sends:
{
  police_attended: "no",
  accident_ref_number: "CAD123456",  // Should be null
  police_force: "Thames Valley",      // Should be null
  // ...
}

// Backend should ignore/null these fields when police_attended === "no"
```

**Scenario B: Seatbelt reason when seatbelts worn**
```javascript
// Frontend sends:
{
  seatbelts_worn: "yes",
  seatbelt_reason: "Some text"  // Should be null
}

// Backend should ignore this field when seatbelts_worn === "yes"
```

**Solution:**

```javascript
function sanitizeConditionalFields(data) {
  const sanitized = { ...data };

  // If police didn't attend, clear all police detail fields
  if (sanitized.police_attended === 'no') {
    sanitized.accident_ref_number = null;
    sanitized.police_force = null;
    sanitized.officer_name = null;
    sanitized.officer_badge = null;
    sanitized.user_breath_test = null;
    sanitized.other_breath_test = null;
  }

  // If seatbelts worn, clear explanation
  if (sanitized.seatbelts_worn === 'yes') {
    sanitized.seatbelt_reason = null;
  }

  return sanitized;
}

// Apply before translation
const sanitizedData = sanitizeConditionalFields(page10Data);
const translatedData = translatePage10FieldNames(sanitizedData);
```

**Priority:** ⚠️ HIGH - Prevents invalid data states

---

### ⚠️ Critical Issue 3: Breath Test Options Not Validated

**Problem:**
Dropdown fields have specific allowed values, but no backend validation.

**User Breath Test Valid Options:**
- `""` (empty - not selected)
- `"not_tested"`
- `"negative_0mg"`
- `"below_limit"`
- `"at_limit"`
- `"above_limit"`
- `"refused"`
- `"unable"`

**Other Breath Test Valid Options:**
- `""` (empty)
- `"unknown"`
- `"not_tested"`
- `"negative_0mg"`
- `"below_limit"`
- `"at_limit"`
- `"above_limit"`
- `"refused"`
- `"arrested"`

**Solution:**
Implement enum validation (see Backend Validation Requirements section).

**Priority:** ⚠️ MEDIUM - Prevents invalid data

---

### 💡 Recommendation 1: Align Frontend Field Names with Database

**Current State:**
Frontend uses concise names (`police_attended`, `officer_badge`)
Database uses verbose names (`did_police_attend`, `police_officer_badge_number`)

**Proposal:**
Update frontend field names to match database exactly.

**Example Change:**

```javascript
// BEFORE (current implementation)
const data = {
  police_attended: policeAttended,
  officer_badge: document.getElementById('officer-badge').value.trim()
};

// AFTER (aligned with database)
const data = {
  did_police_attend: policeAttended,
  police_officer_badge_number: document.getElementById('officer-badge').value.trim()
};
```

**Benefits:**
- ✅ Eliminates translation layer entirely
- ✅ Reduces backend complexity
- ✅ Prevents field name mismatch errors
- ✅ Improves maintainability

**Trade-offs:**
- ⚠️ Requires updating HTML file
- ⚠️ Requires updating localStorage key names
- ⚠️ May break existing saved data (need migration)

**Migration Strategy:**

```javascript
// Load function with backward compatibility
function loadData() {
  const saved = localStorage.getItem('page10_data');
  if (!saved) return;

  const data = JSON.parse(saved);

  // Support old field names (migration period)
  const policeAttended = data.did_police_attend || data.police_attended;
  const seatbeltsWorn = data.wearing_seatbelts || data.seatbelts_worn;

  // ... use normalized names
}
```

**Priority:** 💡 RECOMMENDED - Consider for future refactor

---

### 💡 Recommendation 2: Add UK Police Force Autocomplete

**Enhancement:**
Pre-populate dropdown with UK police forces for faster data entry.

**Implementation:**

```html
<input type="text"
       id="police-force"
       list="uk-police-forces"
       placeholder="e.g., Thames Valley Police">

<datalist id="uk-police-forces">
  <option value="Metropolitan Police">
  <option value="Thames Valley Police">
  <option value="Greater Manchester Police">
  <option value="West Midlands Police">
  <option value="Kent Police">
  <option value="Essex Police">
  <option value="Hertfordshire Constabulary">
  <!-- ... all 43 UK territorial police forces -->
</datalist>
```

**Benefits:**
- ✅ Faster data entry
- ✅ Standardized force names
- ✅ Prevents typos
- ✅ Better data quality for reporting

**Priority:** 💡 NICE TO HAVE - UX improvement

---

### 💡 Recommendation 3: Add Breath Test Result Tooltips

**Enhancement:**
Explain UK legal limits and consequences for each breath test option.

**Example Tooltip for "Above legal limit":**

```html
<option value="above_limit"
        title="Over 35 μg/100ml - driving offence, may result in disqualification">
  Above legal limit (over 35 μg/100ml)
</option>
```

**Benefits:**
- ✅ User education
- ✅ Accurate selection
- ✅ Legal awareness

**Priority:** 💡 NICE TO HAVE - Educational enhancement

---

### 📊 Recommendation 4: Track Police Attendance Statistics

**Analytics:**
Track percentage of incidents with police attendance for reporting.

**Example Query:**

```sql
-- Police attendance rate by month
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_incidents,
  SUM(CASE WHEN did_police_attend = 'yes' THEN 1 ELSE 0 END) as police_attended,
  ROUND(100.0 * SUM(CASE WHEN did_police_attend = 'yes' THEN 1 ELSE 0 END) / COUNT(*), 2) as attendance_rate
FROM incident_reports
WHERE deleted_at IS NULL
GROUP BY month
ORDER BY month DESC;
```

**Benefits:**
- ✅ Business intelligence
- ✅ Identify trends
- ✅ Improve case prioritization

**Priority:** 💡 NICE TO HAVE - Analytics feature

---

## Summary & Next Steps

### What We Analyzed

✅ **Complete field inventory** - All 10 fields documented
✅ **Database mapping** - Field name translation requirements identified
✅ **Conditional logic** - Two conditional sections (police details, seatbelt explanation)
✅ **Validation rules** - Required fields and conditional requirements
✅ **localStorage structure** - Complete data schema documented
✅ **Navigation flow** - Page 9 → Page 10 → Page 12 (skips Page 11)
✅ **Code references** - All line numbers provided for easy lookup

### Critical Findings

🔴 **20% mapping success rate** - Second-worst performing page
🔴 **80% field name mismatch** - 8/10 fields need translation
⚠️ **Conditional logic enforcement** - Backend must validate conditional fields
⚠️ **Enum validation required** - Breath test options must be validated

### Immediate Action Items

**Priority 1 (URGENT):**
1. ✅ Implement `translatePage10FieldNames()` function in backend
2. ✅ Add translation to signup submission endpoint
3. ✅ Test field name mapping with real data
4. ✅ Verify all 10 fields reach database correctly

**Priority 2 (HIGH):**
5. ⚠️ Implement `sanitizeConditionalFields()` to enforce conditional logic
6. ⚠️ Add enum validation for breath test fields
7. ⚠️ Test conditional field nulling (police no → police fields null)

**Priority 3 (RECOMMENDED):**
8. 💡 Consider frontend field name alignment with database (future refactor)
9. 💡 Add UK police force autocomplete (UX enhancement)
10. 💡 Add breath test result tooltips (educational)

### Backend Implementation Checklist

```javascript
// ✅ TODO: Implement these functions

function translatePage10FieldNames(frontendData) {
  // Map all 8 mismatched field names
}

function sanitizeConditionalFields(data) {
  // Null police fields when police_attended === 'no'
  // Null seatbelt_reason when seatbelts_worn === 'yes'
}

function validatePage10Data(data) {
  // Required: police_attended, airbags_deployed, seatbelts_worn
  // Conditional: seatbelt_reason (if seatbelts_worn === 'no')
  // Enum: breath test options
}

// In signup controller:
app.post('/api/signup/submit', async (req, res) => {
  const page10Data = JSON.parse(req.body.page10_data);

  // 1. Validate
  const validation = validatePage10Data(page10Data);
  if (!validation.valid) return res.status(400).json({ errors: validation.errors });

  // 2. Sanitize conditional fields
  const sanitized = sanitizeConditionalFields(page10Data);

  // 3. Translate field names
  const translated = translatePage10FieldNames(sanitized);

  // 4. Save to database
  await supabase.from('incident_reports').upsert(translated);

  res.json({ success: true });
});
```

### Testing Strategy

**Test Case 1: Police attended, all details provided**
```json
{
  "police_attended": "yes",
  "accident_ref_number": "CAD123456",
  "police_force": "Thames Valley Police",
  "officer_name": "PC John Smith",
  "officer_badge": "12345",
  "user_breath_test": "negative_0mg",
  "other_breath_test": "not_tested",
  "airbags_deployed": "yes",
  "seatbelts_worn": "yes",
  "seatbelt_reason": null
}

Expected: All fields saved correctly with translated names
```

**Test Case 2: No police, seatbelts not worn**
```json
{
  "police_attended": "no",
  "accident_ref_number": null,
  "police_force": null,
  "officer_name": null,
  "officer_badge": null,
  "user_breath_test": null,
  "other_breath_test": null,
  "airbags_deployed": "no",
  "seatbelts_worn": "no",
  "seatbelt_reason": "Vehicle was stationary when hit from behind"
}

Expected: Police fields null, seatbelt_reason saved
```

**Test Case 3: Invalid breath test value**
```json
{
  "user_breath_test": "invalid_value"  // ❌ Not in allowed enum
}

Expected: Validation error returned
```

---

## Appendix: Complete Code References

### HTML Structure

- **Lines 1-419:** CSS styling and design system
- **Lines 420-429:** Header with progress bar (83.33%)
- **Lines 432-535:** Police attendance section (conditional container)
- **Lines 537-615:** Safety equipment section (airbags + seatbelts)
- **Lines 617-628:** Navigation buttons
- **Lines 631-829:** JavaScript implementation

### JavaScript Functions

- **Lines 642-644:** State variables (policeAttended, airbagsDeployed, seatbeltsWorn)
- **Lines 654-705:** Radio button click handler (all conditional logic)
- **Lines 707-713:** Character counter for seatbelt reason
- **Lines 715-720:** Save on input change listeners
- **Lines 722-743:** Form validation logic
- **Lines 745-762:** Save data to localStorage
- **Lines 764-812:** Load data from localStorage
- **Lines 814-824:** Navigation event handlers

### CSS Classes

- `.police-details-container` - Conditionally shown police details
- `.seatbelt-explanation` - Conditionally shown seatbelt reason
- `.safety-section` - Yellow-tinted safety equipment section
- `.radio-with-tooltip` - "No" seatbelt option with hover tooltip
- `.hover-tooltip` - Legal exemptions tooltip

### localStorage Keys

- `temp_session_id` - Shared session ID for temp uploads
- `page10_data` - Page 10 form data (JSON string)

### Navigation Targets

- **Back:** `/incident-form-page9-witnesses.html`
- **Next:** `/incident-form-page12-final-medical-check.html`

---

**End of Document**
