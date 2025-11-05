# Complete Field List: Page 2 → Supabase

**File:** `public/incident-form-page2.html`
**Page:** Medical Information (Page 2 of 12)
**Destination Table:** `incident_reports`
**Total Fields:** 20 (19 HTML + 1 JavaScript-generated)

---

## Field Categories

| Category | Field Count |
|----------|-------------|
| Primary Fields | 1 |
| Conditional Fields (Medical Details) | 5 |
| Medical Symptoms (Checkboxes) | 13 |
| System Fields (Generated) | 1 |
| **TOTAL** | **20** |

---

## Complete Field List

### 1. Primary Field (Always Visible)

| # | Field Name | HTML Type | Required | Data Type | Supabase Column | Notes |
|---|------------|-----------|----------|-----------|-----------------|-------|
| 1 | `medical_attention_needed` | Radio (yes/no) | ✅ Yes | BOOLEAN | `medical_attention_needed` | Converted: "yes"→TRUE, "no"→FALSE |

**Frontend Code (Line 578-585):**
```html
<input type="radio" name="medical_attention_needed" value="yes" required>
<input type="radio" name="medical_attention_needed" value="no" required>
```

**Backend Mapping (Line 419):**
```javascript
medical_attention_needed: page2.medical_attention_needed === 'yes'
```

---

### 2. Conditional Fields - Medical Details (Shown when medical attention = "yes")

| # | Field Name | HTML Type | Required | Data Type | Supabase Column | Notes |
|---|------------|-----------|----------|-----------|-----------------|-------|
| 2 | `medical_injury_details` | Textarea | ⚠️ Conditional | TEXT | `medical_injury_details` | Description of injuries |
| 3 | `medical_injury_severity` | Select Dropdown | ⚠️ Conditional | TEXT | `medical_injury_severity` | Values: minor, moderate, serious, severe, critical |
| 4 | `medical_hospital_name` | Text Input | ❌ No | TEXT | `medical_hospital_name` | Optional - hospital name |
| 5 | `medical_ambulance_called` | Radio (yes/no) | ⚠️ Conditional | BOOLEAN | `medical_ambulance_called` | Converted: "yes"→TRUE, "no"→FALSE |
| 6 | `medical_treatment_received` | Textarea | ❌ No | TEXT | `medical_treatment_received` | Only shown if ambulance=yes |

**Visibility Logic (Lines 768-789):**
```javascript
if (selectedValue === 'yes') {
  medicalDetailsGroup.style.display = 'block';
  document.getElementById('medical_injury_details').required = true;
  document.getElementById('medical_injury_severity').required = true;
} else {
  medicalDetailsGroup.style.display = 'none';
  // Fields cleared when hidden
}
```

**Backend Mapping (Lines 420-424):**
```javascript
medical_injury_details: page2.medical_injury_details || null,
medical_injury_severity: page2.medical_injury_severity || null,
medical_hospital_name: page2.medical_hospital_name || null,
medical_ambulance_called: page2.medical_ambulance_called === 'yes',
medical_treatment_received: page2.medical_treatment_received || null
```

---

### 3. Medical Symptoms (13 Checkboxes - Always Visible)

| # | Field Name | HTML ID | Required | Data Type | Supabase Column | User-Facing Label |
|---|------------|---------|----------|-----------|-----------------|-------------------|
| 7 | `medical_symptom_chest_pain` | `symptom_chest_pain` | ❌ No | BOOLEAN | `medical_symptom_chest_pain` | Chest Pain |
| 8 | `medical_symptom_uncontrolled_bleeding` | `symptom_uncontrolled_bleeding` | ❌ No | BOOLEAN | `medical_symptom_uncontrolled_bleeding` | Uncontrolled Bleeding |
| 9 | `medical_symptom_breathlessness` | `symptom_breathlessness` | ❌ No | BOOLEAN | `medical_symptom_breathlessness` | Breathlessness |
| 10 | `medical_symptom_limb_weakness` | `symptom_limb_weakness` | ❌ No | BOOLEAN | `medical_symptom_limb_weakness` | Limb Weakness or changes in sensation |
| 11 | `medical_symptom_dizziness` | `symptom_dizziness` | ❌ No | BOOLEAN | `medical_symptom_dizziness` | Dizziness |
| 12 | `medical_symptom_loss_of_consciousness` | `symptom_loss_of_consciousness` | ❌ No | BOOLEAN | `medical_symptom_loss_of_consciousness` | Loss of Consciousness |
| 13 | `medical_symptom_severe_headache` | `symptom_severe_headache` | ❌ No | BOOLEAN | `medical_symptom_severe_headache` | Severe Headache |
| 14 | `medical_symptom_change_in_vision` | `symptom_change_in_vision` | ❌ No | BOOLEAN | `medical_symptom_change_in_vision` | Change in Vision |
| 15 | `medical_symptom_abdominal_pain` | `symptom_abdominal_pain` | ❌ No | BOOLEAN | `medical_symptom_abdominal_pain` | Abdominal Pain |
| 16 | `medical_symptom_abdominal_bruising` | `symptom_abdominal_bruising` | ❌ No | BOOLEAN | `medical_symptom_abdominal_bruising` | Abdominal Bruising |
| 17 | `medical_symptom_limb_pain_mobility` | `symptom_limb_pain_mobility` | ❌ No | BOOLEAN | `medical_symptom_limb_pain_mobility` | Limb pain that's impeding mobility |
| 18 | `medical_symptom_life_threatening` | `symptom_life_threatening` | ❌ No | BOOLEAN | `medical_symptom_life_threatening` | Any other concerns that a life or limb threatening injury has occurred |
| 19 | `medical_symptom_none` | `symptom_none` | ❌ No | BOOLEAN | `medical_symptom_none` | None of these I feel fine and am ready to continue |

**Frontend Collection (Lines 856-870):**
```javascript
const symptoms = {
  medical_symptom_chest_pain: document.getElementById('symptom_chest_pain').checked,
  medical_symptom_uncontrolled_bleeding: document.getElementById('symptom_uncontrolled_bleeding').checked,
  // ... (11 more symptoms)
};
```

**Backend Mapping (Lines 427-439):**
```javascript
// Medical Symptoms (Page 2)
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
medical_symptom_none: page2.medical_symptom_none || false
```

**Default Value:** All symptoms default to `FALSE` if not checked (using `|| false`)

---

### 4. System Fields (Generated by JavaScript)

| # | Field Name | Source | Data Type | Supabase Column | Notes |
|---|------------|--------|-----------|-----------------|-------|
| 20 | `completed_at` | JavaScript | TIMESTAMP | N/A (sessionStorage only) | Generated on form submission |

**Frontend Generation (Line 881):**
```javascript
completed_at: new Date().toISOString()
```

**Note:** This field is stored in sessionStorage but **NOT directly sent to Supabase `incident_reports` table**. It's used for tracking form completion time in the frontend.

---

## Data Transformation Summary

### String → Boolean Conversions (2 fields)

| Frontend Value | Backend Conversion | Supabase Value |
|----------------|-------------------|----------------|
| `"yes"` | `=== 'yes'` → `true` | `TRUE` |
| `"no"` | `=== 'yes'` → `false` | `FALSE` |

**Applied to:**
- `medical_attention_needed`
- `medical_ambulance_called`

### Checkbox → Boolean (13 fields)

| Frontend Value | Backend Conversion | Supabase Value |
|----------------|-------------------|----------------|
| `.checked = true` | Direct boolean | `TRUE` |
| `.checked = false` | Direct boolean with `\|\| false` fallback | `FALSE` |

**Applied to:** All 13 medical symptom checkboxes

### Text Fields → String/NULL (4 fields)

| Frontend Value | Backend Conversion | Supabase Value |
|----------------|-------------------|----------------|
| User input text | `.trim()` or `\|\| null` | `TEXT` or `NULL` |
| Empty string | `\|\| null` | `NULL` |

**Applied to:**
- `medical_injury_details`
- `medical_injury_severity`
- `medical_hospital_name`
- `medical_treatment_received`

---

## Supabase Database Schema (incident_reports table)

```sql
-- Primary Field
medical_attention_needed BOOLEAN DEFAULT FALSE,

-- Conditional Medical Details
medical_injury_details TEXT,
medical_injury_severity TEXT,
medical_hospital_name TEXT,
medical_ambulance_called BOOLEAN DEFAULT FALSE,
medical_treatment_received TEXT,

-- Medical Symptoms (13 BOOLEAN columns)
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

## Submission Flow

### Step 1: User Completes Page 2
User fills out medical information form

### Step 2: Frontend Validation (Lines 814-847)
```javascript
function validateForm() {
  // Check required fields
  if (!medicalAttentionSelected) {
    alert('Please indicate whether you need medical attention.');
    return false;
  }

  // If medical attention = yes, validate conditional fields
  if (medicalAttentionSelected.value === 'yes') {
    // Check injury details, severity, ambulance
  }

  return true;
}
```

### Step 3: Data Collection (Lines 872-882)
```javascript
const pageData = {
  medical_attention_needed: '...',
  medical_injury_details: '...',
  ...symptoms,  // Spread 13 boolean values
  completed_at: new Date().toISOString()
};

sessionStorage.setItem('incident_page2', JSON.stringify(pageData));
```

### Step 4: Multi-Page Collection (Page 12)
All 12 pages merged into single object

### Step 5: HTTP POST to Backend
```javascript
POST /api/incident-form/submit
{
  page2: { ... 20 fields ... },
  // Other pages...
}
```

### Step 6: Backend Processing
```javascript
// src/controllers/incidentForm.controller.js
const incidentData = buildIncidentData(userId, formData);
```

### Step 7: Supabase Insert
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
| **Always Required** | 1 | `medical_attention_needed` |
| **Conditionally Required** | 3 | `medical_injury_details`, `medical_injury_severity`, `medical_ambulance_called` (when medical attention = yes) |
| **Optional** | 15 | `medical_hospital_name`, `medical_treatment_received`, 13 symptom checkboxes |
| **Generated** | 1 | `completed_at` |

---

## Data Type Summary

| Data Type | Field Count | Fields |
|-----------|-------------|--------|
| **BOOLEAN** | 15 | 2 radio groups + 13 checkboxes |
| **TEXT** | 4 | 2 textareas + 1 text input + 1 select |
| **TIMESTAMP** | 1 | `completed_at` (sessionStorage only) |

---

## Code References

### Frontend
- **File:** `public/incident-form-page2.html`
- **Data Collection:** Lines 856-882
- **Validation:** Lines 814-847
- **Conditional Logic:** Lines 768-789, 799-807
- **Data Restoration:** Lines 898-946

### Backend
- **File:** `src/controllers/incidentForm.controller.js`
- **Submit Handler:** Lines 52-100
- **Data Mapping:** Lines 391-490 (buildIncidentData function)
- **Medical Fields:** Lines 419-439

### Database
- **Table:** `incident_reports`
- **Schema:** 19 columns from Page 2 (excluding `completed_at`)
- **Types:** 15 BOOLEAN + 4 TEXT

---

## Example Data Payload

### Frontend (SessionStorage)
```json
{
  "medical_attention_needed": "yes",
  "medical_injury_details": "Whiplash and bruising on chest from seatbelt",
  "medical_injury_severity": "moderate",
  "medical_hospital_name": "Royal London Hospital",
  "medical_ambulance_called": "yes",
  "medical_treatment_received": "Paramedics checked vitals and applied ice pack",
  "medical_symptom_chest_pain": true,
  "medical_symptom_uncontrolled_bleeding": false,
  "medical_symptom_breathlessness": false,
  "medical_symptom_limb_weakness": false,
  "medical_symptom_dizziness": true,
  "medical_symptom_loss_of_consciousness": false,
  "medical_symptom_severe_headache": false,
  "medical_symptom_change_in_vision": false,
  "medical_symptom_abdominal_pain": false,
  "medical_symptom_abdominal_bruising": false,
  "medical_symptom_limb_pain_mobility": false,
  "medical_symptom_life_threatening": false,
  "medical_symptom_none": false,
  "completed_at": "2025-11-05T21:30:45.123Z"
}
```

### Backend (Supabase Insert)
```javascript
{
  create_user_id: "550e8400-e29b-41d4-a716-446655440000",
  medical_attention_needed: true,        // Converted from "yes"
  medical_injury_details: "Whiplash and bruising on chest from seatbelt",
  medical_injury_severity: "moderate",
  medical_hospital_name: "Royal London Hospital",
  medical_ambulance_called: true,        // Converted from "yes"
  medical_treatment_received: "Paramedics checked vitals and applied ice pack",
  medical_symptom_chest_pain: true,
  medical_symptom_uncontrolled_bleeding: false,
  medical_symptom_breathlessness: false,
  medical_symptom_limb_weakness: false,
  medical_symptom_dizziness: true,
  medical_symptom_loss_of_consciousness: false,
  medical_symptom_severe_headache: false,
  medical_symptom_change_in_vision: false,
  medical_symptom_abdominal_pain: false,
  medical_symptom_abdominal_bruising: false,
  medical_symptom_limb_pain_mobility: false,
  medical_symptom_life_threatening: false,
  medical_symptom_none: false
  // Note: completed_at NOT included in Supabase insert
}
```

---

## Summary

**Total Fields from Page 2:** 20
**Sent to Supabase incident_reports:** 19 (excluding `completed_at`)
**Boolean Fields:** 15
**Text Fields:** 4
**Always Required:** 1
**Conditionally Required:** 3
**Optional:** 15

---

**Generated:** 2025-11-05
**Author:** Claude Code Analysis
**Files Analyzed:**
- `public/incident-form-page2.html` (952 lines)
- `src/controllers/incidentForm.controller.js` (lines 391-490)
