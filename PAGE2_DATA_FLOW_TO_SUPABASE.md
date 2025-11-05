# Page 2 Medical Symptoms: Data Flow to Supabase

**Question:** Is the JavaScript generating TRUE/FALSE information and sending it to Supabase table `incident_reports`?

**Answer:** ✅ **YES** - The JavaScript converts checkbox states to boolean values and sends them to Supabase.

---

## Complete Data Flow

### Step 1: User Interaction (HTML)
**Location:** `public/incident-form-page2.html` (lines 682-746)

User checks/unchecks 13 symptom checkboxes:
```html
<input type="checkbox" id="symptom_chest_pain" name="medical_symptom_chest_pain" value="true">
<input type="checkbox" id="symptom_uncontrolled_bleeding" name="medical_symptom_uncontrolled_bleeding" value="true">
<!-- ... 11 more checkboxes -->
```

---

### Step 2: JavaScript Reads Checkbox States
**Location:** `public/incident-form-page2.html` (lines 856-870)

When user clicks "Continue", JavaScript reads the `.checked` property:
```javascript
const symptoms = {
  medical_symptom_chest_pain: document.getElementById('symptom_chest_pain').checked,
  medical_symptom_uncontrolled_bleeding: document.getElementById('symptom_uncontrolled_bleeding').checked,
  medical_symptom_breathlessness: document.getElementById('symptom_breathlessness').checked,
  medical_symptom_limb_weakness: document.getElementById('symptom_limb_weakness').checked,
  medical_symptom_dizziness: document.getElementById('symptom_dizziness').checked,
  medical_symptom_loss_of_consciousness: document.getElementById('symptom_loss_of_consciousness').checked,
  medical_symptom_severe_headache: document.getElementById('symptom_severe_headache').checked,
  medical_symptom_change_in_vision: document.getElementById('symptom_change_in_vision').checked,
  medical_symptom_abdominal_pain: document.getElementById('symptom_abdominal_pain').checked,
  medical_symptom_abdominal_bruising: document.getElementById('symptom_abdominal_bruising').checked,
  medical_symptom_limb_pain_mobility: document.getElementById('symptom_limb_pain_mobility').checked,
  medical_symptom_life_threatening: document.getElementById('symptom_life_threatening').checked,
  medical_symptom_none: document.getElementById('symptom_none').checked
};
```

**Output:** Each value is `true` (checked) or `false` (unchecked)

---

### Step 3: Save to SessionStorage
**Location:** `public/incident-form-page2.html` (line 884)

JavaScript stores the boolean values in browser sessionStorage:
```javascript
const pageData = {
  medical_attention_needed: 'yes', // or 'no'
  medical_injury_details: '...',
  ...symptoms,  // ⭐ Spreads boolean values
  completed_at: new Date().toISOString()
};

sessionStorage.setItem('incident_page2', JSON.stringify(pageData));
```

**Result:** Data persisted across pages in multi-page form

---

### Step 4: Collect All Pages (Final Submission)
**Location:** `public/incident-form-page12-final-medical-check.html` (lines 695-701)

On final page (Page 12), JavaScript collects all 12 pages:
```javascript
const allData = {};
for (let i = 1; i <= 12; i++) {
  const pageData = sessionStorage.getItem(`incident_page${i}`);
  if (pageData) {
    Object.assign(allData, JSON.parse(pageData));
  }
}
```

**Result:** Single object containing all form data including Page 2 symptoms

---

### Step 5: HTTP POST to Backend
**Location:** Triggered by frontend submission (Page 12 navigates to transcription-status.html)

Eventually, the data is sent via HTTP POST:
```javascript
// POST /api/incident-form/submit
{
  page1: { ... },
  page2: {
    medical_attention_needed: 'yes',
    medical_injury_details: '...',
    medical_symptom_chest_pain: true,      // ⭐ Boolean
    medical_symptom_breathlessness: false, // ⭐ Boolean
    medical_symptom_dizziness: false,      // ⭐ Boolean
    // ... etc
  },
  page3: { ... },
  // ... pages 4-12
}
```

---

### Step 6: Backend Controller Receives Data
**Location:** `src/controllers/incidentForm.controller.js` (lines 52-76)

Express controller receives the POST request:
```javascript
async function submitIncidentForm(req, res) {
  const userId = req.user?.id;
  const formData = req.body;  // Contains all pages

  // Build incident data for database
  const incidentData = buildIncidentData(userId, formData);

  // Insert into Supabase
  const { data: incident, error } = await supabase
    .from('incident_reports')
    .insert([incidentData])
    .select()
    .single();
}
```

---

### Step 7: Backend Maps to Database Columns
**Location:** `src/controllers/incidentForm.controller.js` (lines 427-439)

The `buildIncidentData` function extracts Page 2 symptom data:
```javascript
function buildIncidentData(userId, formData) {
  const { page2 = {} } = formData;

  return {
    create_user_id: userId,

    // Medical Symptoms (Page 2) - ⭐ BOOLEAN CONVERSION
    medical_symptom_chest_pain: page2.medical_symptom_chest_pain || false,
    medical_symptom_uncontrolled_bleeding: page2.medical_symptom_uncontrolled_bleeding || false,
    medical_symptom_breathlessness: page2.medical_symptom_breathlessness || false,
    medical_symptom_limb_weakness: page2.medical_symptom_limb_weakness || false,
    medical_symptom_dizziness: page2.medical_symptom_dizziness || false,
    medical_symptom_loss_of_consciousness: page2.medical_symptom_loss_of_consciousness || false,
    medical_symptom_severe_headache: page2.medical_symptom_severe_headache || false,
    medical_symptom_change_in_vision: page2.medical_symptom_change_in_vision || false,
    medical_symptom_abdominal_pain: page2.medical_symptom_abdominal_pain || false,
    medical_symptom_abdominal_bruising: page2.medical_symptom_abdominal_bruising || false,
    medical_symptom_limb_pain_mobility: page2.medical_symptom_limb_pain_mobility || false,
    medical_symptom_life_threatening: page2.medical_symptom_life_threatening || false,
    medical_symptom_none: page2.medical_symptom_none || false,

    // ... other fields from other pages
  };
}
```

**Key Logic:**
- Takes boolean value from `page2.medical_symptom_chest_pain`
- Uses `|| false` as fallback (if undefined, defaults to `false`)
- Returns object ready for Supabase insertion

---

### Step 8: Insert into Supabase Database
**Location:** `src/controllers/incidentForm.controller.js` (lines 79-83)

Data inserted into `incident_reports` table:
```javascript
const { data: incident, error } = await supabase
  .from('incident_reports')
  .insert([incidentData])  // ⭐ Contains boolean values
  .select()
  .single();
```

**Database Schema:** `incident_reports` table has BOOLEAN columns:
```sql
medical_symptom_chest_pain BOOLEAN DEFAULT FALSE,
medical_symptom_uncontrolled_bleeding BOOLEAN DEFAULT FALSE,
medical_symptom_breathlessness BOOLEAN DEFAULT FALSE,
medical_symptom_limb_weakness BOOLEAN DEFAULT FALSE,
medical_symptom_dizziness BOOLEAN DEFAULT FALSE,
medical_symptom_loss_of_consciousness BOOLEAN DEFAULT FALSE,
medical_symptom_severe_headache BOOLEAN DEFAULT FALSE,
medical_symptom_change_in_vision BOOLEAN DEFAULT FALSE,
medical_symptom_abdominal_pain BOOLEAN DEFAULT FALSE,
medical_symptom_abdominal_bruising BOOLEAN DEFAULT FALSE,
medical_symptom_limb_pain_mobility BOOLEAN DEFAULT FALSE,
medical_symptom_life_threatening BOOLEAN DEFAULT FALSE,
medical_symptom_none BOOLEAN DEFAULT FALSE
```

---

## Summary: TRUE/FALSE Generation

| Stage | TRUE/FALSE Source | Format |
|-------|-------------------|--------|
| **HTML** | Checkbox state | Native browser boolean |
| **JavaScript (Page 2)** | `.checked` property | JavaScript `true`/`false` |
| **SessionStorage** | Stored as string | `"true"` or `"false"` (JSON) |
| **HTTP POST** | Parsed from JSON | JavaScript `true`/`false` |
| **Backend Controller** | Extracted from request | JavaScript `true`/`false` |
| **Supabase Insert** | Database columns | PostgreSQL `TRUE`/`FALSE` |

---

## Answer to Your Question

### ✅ YES - JavaScript IS generating TRUE/FALSE information

**What JavaScript Does:**

1. **Reads** checkbox state (`.checked` returns boolean)
2. **Stores** boolean values in sessionStorage
3. **Sends** boolean values via HTTP POST to backend
4. **Backend** receives and inserts into Supabase

**What JavaScript Does NOT Do:**

❌ Manipulate or change symptom values
❌ Auto-check/uncheck based on logic
❌ Enforce validation on symptoms
❌ Generate false data - it only reads user input

---

## Example Data Flow

**User Action:**
- User checks "Chest Pain" checkbox
- User does NOT check "Breathlessness" checkbox

**JavaScript Generates:**
```javascript
{
  medical_symptom_chest_pain: true,        // ✅ Checked
  medical_symptom_breathlessness: false,   // ❌ Not checked
  // ... 11 more symptoms
}
```

**Sent to Backend:**
```json
{
  "page2": {
    "medical_symptom_chest_pain": true,
    "medical_symptom_breathlessness": false
  }
}
```

**Saved in Supabase:**
```sql
INSERT INTO incident_reports (
  create_user_id,
  medical_symptom_chest_pain,
  medical_symptom_breathlessness
) VALUES (
  'user-uuid',
  TRUE,   -- ✅ Checkbox was checked
  FALSE   -- ❌ Checkbox was NOT checked
);
```

---

## Key Takeaway

**JavaScript is transparently converting user checkbox selections into boolean values and storing them in Supabase.**

It's not manipulating the data - it's simply:
1. Reading what the user selected
2. Converting HTML checkbox states to database-compatible boolean values
3. Sending to backend for storage

This is standard form data processing and is working exactly as intended.

---

**Generated:** 2025-11-05
**Files Referenced:**
- `public/incident-form-page2.html` (lines 682-946)
- `public/incident-form-page12-final-medical-check.html` (lines 695-716)
- `src/controllers/incidentForm.controller.js` (lines 52-490)
