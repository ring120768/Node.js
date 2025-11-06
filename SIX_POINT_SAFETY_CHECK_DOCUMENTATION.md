# Six Point Safety Check Page - Complete Documentation

**File:** `public/six-point-safety-check.html`
**Purpose:** Detailed safety verification checklist before incident report
**Position in Flow:** Between `safety-check.html` and `incident-form-page1.html`
**Database Table:** `user_signup` or `incident_reports`
**Total Fields:** 6 checkboxes + 2 generated fields

---

## Executive Summary

The Six Point Safety Check page is a **mandatory safety verification step** that ensures users have addressed critical safety concerns before completing the incident report. It requires users to confirm all six safety points before proceeding.

**Key Features:**
- ✅ 6 mandatory safety checkboxes (all must be checked)
- ⚠️ Warning box for unsafe conditions
- 📞 Emergency 999 call integration with location
- 💾 Auto-save to sessionStorage
- 🔒 Validation prevents proceeding until all checks confirmed

---

## Data Flow Architecture

```
safety-check.html (user confirmed safe)
       ↓
six-point-safety-check.html (THIS PAGE)
       ↓
User checks all 6 safety points
       ↓
sessionStorage.six_point_safety_check
       ↓
Backend API (optional): POST /api/update-safety-checks
       ↓
incident-form-page1.html (begin incident report)
```

---

## Field Inventory

### Checkbox Fields (6 required fields)

| # | Field Name | HTML ID | Question | Required | Default |
|---|-----------|---------|----------|----------|---------|
| 1 | `safety_check_1` | `check1` | Are you or anyone else injured and do you need immediate medical assistance? | Yes | `false` |
| 2 | `safety_check_2` | `check2` | Are you in a safe location away from moving traffic, or are you still in the carriageway? | Yes | `false` |
| 3 | `safety_check_3` | `check3` | Are all vehicles involved switched off with hazard lights on, and are you wearing high-visibility clothing? | Yes | `false` |
| 4 | `safety_check_4` | `check4` | Is the road blocked or partially blocked, creating a hazard for other drivers? | Yes | `false` |
| 5 | `safety_check_5` | `check5` | Are there any fuel leaks, smoke, or signs of fire from any of the vehicles? | Yes | `false` |
| 6 | `safety_check_6` | `check6` | Can you confirm all occupants are out of the vehicles and in a place of safety? | Yes | `false` |

**HTML Structure (Example):**

```html
<!-- Check 1: Injuries -->
<div class="checklist-item" data-check="1">
    <input type="checkbox" id="check1" name="safety_check_1">
    <label for="check1" class="checklist-label">
        <span class="checklist-icon">✅</span>
        <strong>Are you or anyone else injured and do you need immediate medical assistance?</strong>
    </label>
</div>
```

**JavaScript State:**

All checkboxes stored as booleans:
- `true` = Checkbox checked (safety concern addressed)
- `false` = Checkbox unchecked (user must check before proceeding)

---

### Generated Fields (2 fields)

| Field Name | Type | Source | Purpose |
|-----------|------|--------|---------|
| `all_checks_completed` | Boolean | JavaScript | `true` if all 6 checks confirmed |
| `completed_at` | ISO String | Auto-generated | Timestamp when all checks completed |

**Code Location:** Lines 284-292

```javascript
const data = {
    safety_check_1: document.getElementById('check1').checked,
    safety_check_2: document.getElementById('check2').checked,
    safety_check_3: document.getElementById('check3').checked,
    safety_check_4: document.getElementById('check4').checked,
    safety_check_5: document.getElementById('check5').checked,
    safety_check_6: document.getElementById('check6').checked,
    all_checks_completed: Array.from(checkboxes).every(cb => cb.checked),
    completed_at: new Date().toISOString()
};
```

---

## Validation Logic

### Requirement: All 6 Checks Must Be Confirmed

**Code Location:** Lines 251-264

```javascript
function updateValidation() {
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);

    if (allChecked) {
        nextBtn.disabled = false;
        safeConfirmation.classList.add('show');
        validationMessage.classList.remove('show');
    } else {
        nextBtn.disabled = true;
        safeConfirmation.classList.remove('show');
    }

    // Update checklist item styling
    checkboxes.forEach(checkbox => {
        const item = checkbox.closest('.checklist-item');
        if (checkbox.checked) {
            item.classList.add('checked');
        } else {
            item.classList.remove('checked');
        }
    });

    // Save state
    saveData();
}
```

**Validation States:**

```
All 6 checks confirmed:
├── Next button: Enabled
├── Safe confirmation: Shown (green box)
├── Validation message: Hidden
└── User can proceed to incident form

Less than 6 checks confirmed:
├── Next button: Disabled
├── Safe confirmation: Hidden
├── Validation message: Shown if user tries to proceed
└── User cannot proceed
```

---

## Conditional Warning System

### Unsafe Conditions Detection

**Code Location:** Lines 240-249

```javascript
function checkForUnsafeConditions() {
    // Check 2: Still in carriageway (unsafe location)
    // Check 5: Fuel leaks/fire (immediate danger)

    const check2 = document.getElementById('check2').checked;
    const check5 = document.getElementById('check5').checked;

    if (check2 || check5) {
        warningBox.classList.add('show');
    } else {
        warningBox.classList.remove('show');
    }
}
```

**Warning Triggers:**

| Check # | Condition | Warning Shown |
|---------|-----------|---------------|
| 2 | Still in carriageway | ⚠️ IMMEDIATE SAFETY ACTIONS REQUIRED |
| 5 | Fuel leaks/smoke/fire | ⚠️ IMMEDIATE SAFETY ACTIONS REQUIRED |
| Others | N/A | No warning |

**Warning Box Content:**

```html
<div class="warning-box" id="warningBox">
    <h3>🚨 IMMEDIATE SAFETY ACTIONS REQUIRED</h3>
    <ul class="warning-list">
        <li>If still in carriageway: Move to hard shoulder or behind barrier immediately</li>
        <li>If vehicles can't move: Get out on side away from traffic and wait behind barrier</li>
        <li>If on motorway: Do not attempt to retrieve items from vehicle</li>
        <li>Priority order: Get people to safety first, make scene visible, prevent secondary accidents</li>
    </ul>

    <div class="emergency-actions">
        <h4>⚠️ Safety Priorities:</h4>
        <p>✓ Get people to safety first</p>
        <p>✓ Make the scene visible to other drivers</p>
        <p>✓ Prevent secondary accidents</p>
        <p>✓ Only deal with vehicle recovery once people are safe</p>
    </div>

    <button class="emergency-call-btn" id="call999Btn">
        📞 Call 999 Emergency Services
    </button>
</div>
```

---

## Emergency 999 Call Integration

### Call 999 with Location Data

**Code Location:** Lines 309-327

```javascript
call999Btn.addEventListener('click', function() {
    const incidentData = JSON.parse(sessionStorage.getItem('incidentData') || '{}');

    let message = 'This will call 999 Emergency Services.';

    if (incidentData.what3words) {
        message += `\n\nYour what3words location: ///${incidentData.what3words}`;
        message += '\n\nPlease provide this location to the operator.';
    } else if (incidentData.location) {
        message += `\n\nYour GPS coordinates: ${incidentData.location.lat.toFixed(6)}, ${incidentData.location.lng.toFixed(6)}`;
        message += '\n\nPlease provide these coordinates to the operator.';
    }

    if (confirm(message)) {
        window.location.href = 'tel:999';
    }
});
```

**Location Data Sources:**

1. **What3Words** (preferred): `///filled.count.soap`
2. **GPS Coordinates** (fallback): `51.507351, -0.127758`
3. **None**: Generic 999 call without location

**Confirmation Dialog Example:**

```
This will call 999 Emergency Services.

Your what3words location: ///filled.count.soap

Please provide this location to the operator.

[Cancel] [OK]
```

---

## sessionStorage Data Structure

### Storage Key

```javascript
sessionStorage.setItem('six_point_safety_check', JSON.stringify(data));
```

**Key:** `six_point_safety_check`
**Format:** JSON string

### Data Object Schema

**Complete Object:**

```javascript
{
  safety_check_1: true,             // Injuries checked
  safety_check_2: true,             // Safe location checked
  safety_check_3: true,             // Vehicles/hazards checked
  safety_check_4: false,            // Road blocked (not checked yet)
  safety_check_5: false,            // Fuel leaks (not checked yet)
  safety_check_6: true,             // Occupants safe checked
  all_checks_completed: false,      // Not all completed (4 and 5 missing)
  completed_at: "2025-11-06T16:30:45.123Z"
}
```

### Example Data States

**Example 1: All Checks Completed (Safe to Proceed)**

```json
{
  "safety_check_1": true,
  "safety_check_2": true,
  "safety_check_3": true,
  "safety_check_4": true,
  "safety_check_5": true,
  "safety_check_6": true,
  "all_checks_completed": true,
  "completed_at": "2025-11-06T16:30:45.123Z"
}
```

**Example 2: Partial Completion (Cannot Proceed)**

```json
{
  "safety_check_1": true,
  "safety_check_2": false,
  "safety_check_3": true,
  "safety_check_4": false,
  "safety_check_5": false,
  "safety_check_6": true,
  "all_checks_completed": false,
  "completed_at": null
}
```

### Load Function

**Code Location:** Lines 295-307

```javascript
function loadData() {
    const saved = sessionStorage.getItem('six_point_safety_check');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            console.log('Loading saved data:', data);

            // Restore checkbox states
            document.getElementById('check1').checked = data.safety_check_1 || false;
            document.getElementById('check2').checked = data.safety_check_2 || false;
            document.getElementById('check3').checked = data.safety_check_3 || false;
            document.getElementById('check4').checked = data.safety_check_4 || false;
            document.getElementById('check5').checked = data.safety_check_5 || false;
            document.getElementById('check6').checked = data.safety_check_6 || false;

            updateValidation();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
}
```

---

## Navigation Flow

### Back Button

**Code Location:** Lines 330-333

```javascript
backBtn.addEventListener('click', () => {
    console.log('Back button clicked - returning to safety check');
    window.location.href = '/safety-check.html';
});
```

**Destination:** `/safety-check.html` (initial safety triage page)

---

### Next Button (Continue to Report)

**Code Location:** Lines 335-347

```javascript
nextBtn.addEventListener('click', () => {
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);

    if (!allChecked) {
        validationMessage.classList.add('show');
        validationMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    console.log('Next button clicked - proceeding to incident form');
    saveData();

    // Proceed to incident form page 1
    window.location.href = '/incident-form-page1.html';
});
```

**Destination:** `/incident-form-page1.html` (begin incident report)

**Validation:**
- If not all checks completed: Show validation message, scroll to it, block navigation
- If all checks completed: Save data and redirect

---

## Complete User Flow

```
Previous Page: safety-check.html
       ↓
User confirmed they are safe (are_you_safe = TRUE)
       ↓
six-point-safety-check.html (THIS PAGE)
       ↓
User reviews 6 safety questions
       ↓
User checks each checkbox (can check/uncheck freely)
       ↓
Auto-save to sessionStorage after each change
       ↓
If unsafe conditions detected (checks 2 or 5):
    ├── Show warning box with safety instructions
    └── Provide 999 call button with location
       ↓
When all 6 checks confirmed:
    ├── Enable "Continue to Report" button
    ├── Show green confirmation message
    └── Hide validation warning
       ↓
User clicks "Continue to Report"
       ↓
Save final state to sessionStorage
       ↓
Redirect to incident-form-page1.html
```

---

## Database Schema Recommendations

### Add Six Point Safety Check Fields

```sql
-- Add six point safety check columns to user_signup table
ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS six_point_check_1 BOOLEAN DEFAULT NULL;

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS six_point_check_2 BOOLEAN DEFAULT NULL;

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS six_point_check_3 BOOLEAN DEFAULT NULL;

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS six_point_check_4 BOOLEAN DEFAULT NULL;

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS six_point_check_5 BOOLEAN DEFAULT NULL;

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS six_point_check_6 BOOLEAN DEFAULT NULL;

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS six_point_check_all_completed BOOLEAN DEFAULT NULL;

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS six_point_check_completed_at TIMESTAMP WITH TIME ZONE;

-- Comments for documentation
COMMENT ON COLUMN user_signup.six_point_check_1 IS
'Safety Check 1: Are you or anyone else injured and do you need immediate medical assistance?';

COMMENT ON COLUMN user_signup.six_point_check_2 IS
'Safety Check 2: Are you in a safe location away from moving traffic, or are you still in the carriageway?';

COMMENT ON COLUMN user_signup.six_point_check_3 IS
'Safety Check 3: Are all vehicles involved switched off with hazard lights on, and are you wearing high-visibility clothing?';

COMMENT ON COLUMN user_signup.six_point_check_4 IS
'Safety Check 4: Is the road blocked or partially blocked, creating a hazard for other drivers?';

COMMENT ON COLUMN user_signup.six_point_check_5 IS
'Safety Check 5: Are there any fuel leaks, smoke, or signs of fire from any of the vehicles?';

COMMENT ON COLUMN user_signup.six_point_check_6 IS
'Safety Check 6: Can you confirm all occupants are out of the vehicles and in a place of safety?';

COMMENT ON COLUMN user_signup.six_point_check_all_completed IS
'TRUE if all six safety checks were confirmed, FALSE otherwise';

COMMENT ON COLUMN user_signup.six_point_check_completed_at IS
'ISO 8601 timestamp when all six safety checks were completed';

-- Index for quick filtering
CREATE INDEX IF NOT EXISTS idx_user_signup_six_point_check_completed
ON user_signup(six_point_check_all_completed)
WHERE six_point_check_all_completed = TRUE;
```

---

## Backend API Endpoint (Optional)

### POST /api/update-safety-checks

**Purpose:** Save six point safety check data to database

**Request Body:**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "safety_check_1": true,
  "safety_check_2": true,
  "safety_check_3": true,
  "safety_check_4": true,
  "safety_check_5": true,
  "safety_check_6": true,
  "all_checks_completed": true,
  "completed_at": "2025-11-06T16:30:45.123Z"
}
```

**Backend Controller:**

```javascript
async function updateSafetyChecks(req, res) {
  try {
    const {
      userId,
      safety_check_1,
      safety_check_2,
      safety_check_3,
      safety_check_4,
      safety_check_5,
      safety_check_6,
      all_checks_completed,
      completed_at
    } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Verify all checks are boolean
    const checks = [
      safety_check_1, safety_check_2, safety_check_3,
      safety_check_4, safety_check_5, safety_check_6
    ];

    if (!checks.every(check => typeof check === 'boolean')) {
      return res.status(400).json({ error: 'All safety checks must be boolean values' });
    }

    // Verify all_checks_completed matches actual state
    const expectedAllCompleted = checks.every(check => check === true);
    if (all_checks_completed !== expectedAllCompleted) {
      console.warn(`Mismatch: all_checks_completed=${all_checks_completed} but expected ${expectedAllCompleted}`);
      // Override with correct value
      all_checks_completed = expectedAllCompleted;
    }

    // Update database
    const { data, error } = await supabase
      .from('user_signup')
      .update({
        six_point_check_1: safety_check_1,
        six_point_check_2: safety_check_2,
        six_point_check_3: safety_check_3,
        six_point_check_4: safety_check_4,
        six_point_check_5: safety_check_5,
        six_point_check_6: safety_check_6,
        six_point_check_all_completed: all_checks_completed,
        six_point_check_completed_at: completed_at,
        updated_at: new Date().toISOString()
      })
      .eq('create_user_id', userId);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to save safety checks' });
    }

    console.log(`Six point safety checks saved for user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Safety checks saved successfully',
      data: {
        userId,
        all_checks_completed,
        completed_at
      }
    });

  } catch (error) {
    console.error('Error in updateSafetyChecks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

## Analytics Queries

### Query 1: Six Point Check Completion Rate

```sql
SELECT
  six_point_check_all_completed,
  COUNT(*) as user_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM user_signup
WHERE are_you_safe = TRUE  -- Only users who passed initial safety check
  AND deleted_at IS NULL
GROUP BY six_point_check_all_completed
ORDER BY six_point_check_all_completed DESC NULLS LAST;
```

**Expected Output:**
```
six_point_check_all_completed | user_count | percentage
------------------------------|------------|------------
TRUE                          | 980        | 93.33
FALSE                         | 50         | 4.76
NULL                          | 20         | 1.91
```

---

### Query 2: Individual Check Completion Rates

```sql
SELECT
  SUM(CASE WHEN six_point_check_1 THEN 1 ELSE 0 END) as check_1_count,
  SUM(CASE WHEN six_point_check_2 THEN 1 ELSE 0 END) as check_2_count,
  SUM(CASE WHEN six_point_check_3 THEN 1 ELSE 0 END) as check_3_count,
  SUM(CASE WHEN six_point_check_4 THEN 1 ELSE 0 END) as check_4_count,
  SUM(CASE WHEN six_point_check_5 THEN 1 ELSE 0 END) as check_5_count,
  SUM(CASE WHEN six_point_check_6 THEN 1 ELSE 0 END) as check_6_count,
  COUNT(*) as total_users
FROM user_signup
WHERE are_you_safe = TRUE
  AND deleted_at IS NULL;
```

**Use Case:** Identify which checks are most/least commonly confirmed

---

### Query 3: Users Who Abandoned Six Point Check

```sql
SELECT
  create_user_id,
  name,
  email,
  are_you_safe,
  six_point_check_all_completed,
  safety_status_timestamp,
  six_point_check_completed_at
FROM user_signup
WHERE are_you_safe = TRUE
  AND (six_point_check_all_completed IS NULL OR six_point_check_all_completed = FALSE)
  AND deleted_at IS NULL
ORDER BY safety_status_timestamp DESC
LIMIT 100;
```

**Use Case:** Identify users who passed initial safety check but didn't complete six point check

---

## Testing Strategy

### Test Case 1: Complete All Checks (Happy Path)

**Input:**
- User checks all 6 checkboxes

**Expected:**
- All checkboxes visually marked as checked (green background)
- "Continue to Report" button enabled
- Green confirmation message shown
- Data saved to sessionStorage
- Clicking "Continue" redirects to incident form

**Verification:**
```javascript
// sessionStorage should contain:
{
  "safety_check_1": true,
  "safety_check_2": true,
  "safety_check_3": true,
  "safety_check_4": true,
  "safety_check_5": true,
  "safety_check_6": true,
  "all_checks_completed": true,
  "completed_at": "2025-11-06T16:30:45.123Z"
}
```

---

### Test Case 2: Partial Completion (Validation Block)

**Input:**
- User checks only 4 out of 6 checkboxes
- User clicks "Continue to Report"

**Expected:**
- "Continue to Report" button disabled
- Validation message shown: "⚠️ Please complete all six safety checks before proceeding"
- User cannot proceed to incident form
- Unchecked items remain with gray background

---

### Test Case 3: Unsafe Conditions Warning

**Input:**
- User checks Check 2 (still in carriageway) or Check 5 (fuel leaks)

**Expected:**
- Warning box appears: "🚨 IMMEDIATE SAFETY ACTIONS REQUIRED"
- Safety instructions displayed
- "Call 999 Emergency Services" button shown
- User can still complete other checks

---

### Test Case 4: 999 Call with Location

**Input:**
- Warning box shown
- User clicks "Call 999 Emergency Services"

**Expected:**
- Confirmation dialog shows location (What3Words or GPS)
- If confirmed: Initiates `tel:999` call
- If cancelled: User stays on page

---

### Test Case 5: Navigation Flow

**Input:**
- User clicks "Back" button

**Expected:**
- Data saved to sessionStorage
- Redirect to `/safety-check.html`
- User can return and resume from saved state

---

## Critical Issues & Recommendations

### 🔴 Issue 1: No Backend Persistence

**Problem:**
Data only saved to sessionStorage (lost if browser closed)

**Solution:**
Implement `/api/update-safety-checks` endpoint to persist to database

**Priority:** 🔴 HIGH

---

### ⚠️ Issue 2: Warning Logic May Be Too Simple

**Problem:**
Current implementation only checks if Check 2 or 5 are checked, doesn't consider the semantic meaning

**Consideration:**
Check 2 asks "Are you in a SAFE location or STILL in carriageway?"
- If user is SAFE, they check it = no warning needed
- If user is UNSAFE (in carriageway), they also check it = warning should show

**Recommendation:**
Consider rephrasing questions or using radio buttons for clearer yes/no answers

**Priority:** ⚠️ MEDIUM

---

### 💡 Recommendation 1: Add "I'm Not Sure" Options

**Enhancement:**
For each check, allow "Yes / No / Not Sure" to capture uncertainty

**Benefit:**
- More accurate data
- Identify users needing guidance
- Trigger appropriate warnings

**Priority:** 💡 NICE TO HAVE

---

### 💡 Recommendation 2: Track Checkbox Timestamps

**Enhancement:**
Record timestamp for each individual check completion

**Implementation:**
```javascript
const data = {
  safety_check_1: document.getElementById('check1').checked,
  safety_check_1_timestamp: check1Timestamp,
  // ... repeat for all checks
};
```

**Benefit:**
- Analyze which checks users hesitate on
- Identify confusion points
- Improve UX based on data

**Priority:** 💡 NICE TO HAVE

---

## Summary

### What This Page Does

✅ **Validates safety** - Ensures users addressed 6 critical safety concerns
✅ **Blocks progression** - Cannot proceed until all checks confirmed
✅ **Provides guidance** - Shows safety instructions for unsafe conditions
✅ **Emergency integration** - 999 call with location if needed
✅ **Auto-saves progress** - sessionStorage preserves state

### Key Data Points

| Data Point | Type | Purpose |
|-----------|------|---------|
| 6 Safety Checks | Boolean | Track which safety points confirmed |
| All Completed Flag | Boolean | Quick validation check |
| Completed Timestamp | ISO String | When checks finished |
| Warning State | Boolean | Whether unsafe conditions detected |

### Integration Points

- **Previous Page:** `safety-check.html` (initial safety triage)
- **Next Page:** `incident-form-page1.html` (begin incident report)
- **Emergency:** `tel:999` with location data
- **Storage:** `sessionStorage.six_point_safety_check`
- **Database:** `user_signup` table (recommended schema provided)

---

**End of Document**
