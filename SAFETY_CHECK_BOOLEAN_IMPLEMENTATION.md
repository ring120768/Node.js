# Safety Check Boolean Field Implementation

**Field:** `are_you_safe`
**Type:** BOOLEAN
**Purpose:** Quick indicator that user was safe to proceed with incident report

---

## Business Logic

### When `are_you_safe = TRUE` (Safe to Proceed)

User selected one of these options:
1. ✅ **"Yes, I'm safe and can complete this form"**
2. 📞 **"The Emergency services have been called"** (and I'm fit to continue)

**Actions:**
- Set `are_you_safe = TRUE`
- Save `safety_status` (full text description)
- Allow user to proceed to incident form
- Redirect to `/typeform-incident-report.html`

### When `are_you_safe = FALSE` or NULL (Not Safe / Uncertain)

User selected one of these options:
3. 👤 **"Call Emergency contact"** - User needs assistance
4. 🏥 **"I'm injured and need medical attention"** - Requires emergency services
5. ⚠️ **"I'm in danger and need immediate help"** - Requires emergency services
6. 😟 **"I'm not sure about my safety"** - Uncertain status

**Actions:**
- Set `are_you_safe = FALSE` (or NULL if user didn't proceed)
- Trigger emergency assistance (999 call or emergency contact)
- User may stay on page or leave to get help
- Form submission NOT allowed until safe

---

## Database Schema

### Add Boolean Field to user_signup Table

```sql
-- Add are_you_safe boolean field
ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS are_you_safe BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN user_signup.are_you_safe IS
'Boolean indicator: TRUE if user was safe to complete incident report (selected option 1 or 2), FALSE if user needed assistance (options 3-6), NULL if safety check not completed';

-- Keep the detailed safety_status for audit trail
ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS safety_status TEXT;

COMMENT ON COLUMN user_signup.safety_status IS
'Full text of safety status selected: "Yes, I''m safe and can complete this form", "The Emergency services have been called", "Call Emergency contact", "I''m injured and need medical attention", "I''m in danger and need immediate help", "I''m not sure about my safety"';

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS safety_status_timestamp TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN user_signup.safety_status_timestamp IS
'Timestamp when safety status was assessed (ISO 8601 format)';

-- Index for quick filtering of safe users
CREATE INDEX IF NOT EXISTS idx_user_signup_are_you_safe
ON user_signup(are_you_safe)
WHERE are_you_safe IS NOT NULL;

-- Partial index for users who were safe to proceed
CREATE INDEX IF NOT EXISTS idx_user_signup_safe_to_proceed
ON user_signup(are_you_safe, created_at)
WHERE are_you_safe = TRUE;
```

---

## Backend Implementation

### JavaScript Mapping Function

```javascript
/**
 * Map safety status selection to are_you_safe boolean
 * @param {string} safetyStatus - Selected safety status text
 * @returns {boolean} - TRUE if safe to proceed, FALSE if needs assistance
 */
function mapSafetyStatusToBoolean(safetyStatus) {
  const safeOptions = [
    'Yes, I\'m safe and can complete this form',
    'The Emergency services have been called'
  ];

  return safeOptions.includes(safetyStatus);
}

// Usage in saveSafetyStatus function (safety-check.html line 279)
async function saveSafetyStatus(status) {
  try {
    if (incidentData.userId || incidentData.what3wordsStoragePath) {
      const response = await fetch('/api/update-safety-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: incidentData.userId,
          safetyStatus: status,
          areYouSafe: mapSafetyStatusToBoolean(status),  // ADD THIS
          timestamp: new Date().toISOString(),
          location: incidentData.location,
          what3words: incidentData.what3words,
          what3wordsStoragePath: incidentData.what3wordsStoragePath,
          address: incidentData.address
        })
      });

      if (!response.ok) {
        console.error('Failed to save safety status');
      } else {
        console.log('Safety status saved successfully');
      }
    }
  } catch (error) {
    console.error('Error saving safety status:', error);
  }
}
```

### Backend Controller (Node.js/Express)

```javascript
// src/controllers/safety.controller.js

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Save safety status assessment
 * POST /api/update-safety-status
 */
async function updateSafetyStatus(req, res) {
  try {
    const {
      userId,
      safetyStatus,
      areYouSafe,  // NEW: Boolean field
      timestamp,
      location,
      what3words,
      what3wordsStoragePath,
      address
    } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!safetyStatus) {
      return res.status(400).json({ error: 'safetyStatus is required' });
    }

    if (typeof areYouSafe !== 'boolean') {
      return res.status(400).json({ error: 'areYouSafe must be a boolean' });
    }

    // Valid safety status options
    const validStatuses = [
      'Yes, I\'m safe and can complete this form',
      'The Emergency services have been called',
      'Call Emergency contact',
      'I\'m injured and need medical attention',
      'I\'m in danger and need immediate help',
      'I\'m not sure about my safety'
    ];

    if (!validStatuses.includes(safetyStatus)) {
      return res.status(400).json({ error: 'Invalid safety status' });
    }

    // Business logic validation: are_you_safe should only be TRUE for safe options
    const safeOptions = [
      'Yes, I\'m safe and can complete this form',
      'The Emergency services have been called'
    ];

    const expectedAreYouSafe = safeOptions.includes(safetyStatus);

    if (areYouSafe !== expectedAreYouSafe) {
      console.warn(`Mismatch: safetyStatus="${safetyStatus}" but areYouSafe=${areYouSafe}, expected ${expectedAreYouSafe}`);
      // Override with correct value
      areYouSafe = expectedAreYouSafe;
    }

    // Update user_signup record
    const { data, error } = await supabase
      .from('user_signup')
      .update({
        are_you_safe: areYouSafe,
        safety_status: safetyStatus,
        safety_status_timestamp: timestamp || new Date().toISOString(),
        safety_check_location_lat: location?.lat || null,
        safety_check_location_lng: location?.lng || null,
        safety_check_what3words: what3words || null,
        safety_check_address: address || null,
        updated_at: new Date().toISOString()
      })
      .eq('create_user_id', userId);

    if (error) {
      console.error('Supabase error saving safety status:', error);
      return res.status(500).json({ error: 'Failed to save safety status' });
    }

    // Log for audit trail
    console.log(`Safety status updated for user ${userId}: are_you_safe=${areYouSafe}, status="${safetyStatus}"`);

    res.status(200).json({
      success: true,
      message: 'Safety status saved successfully',
      data: {
        userId,
        areYouSafe,
        safetyStatus,
        timestamp
      }
    });

  } catch (error) {
    console.error('Error in updateSafetyStatus:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  updateSafetyStatus
};
```

---

## Analytics Queries

### Query 1: Count Users by Safety Status

```sql
-- Overall safety status distribution
SELECT
  are_you_safe,
  COUNT(*) as user_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM user_signup
WHERE safety_status IS NOT NULL
  AND deleted_at IS NULL
GROUP BY are_you_safe
ORDER BY are_you_safe DESC NULLS LAST;
```

**Expected Output:**
```
are_you_safe | user_count | percentage
-------------|------------|------------
TRUE         | 1050       | 84.00
FALSE        | 150        | 12.00
NULL         | 50         | 4.00
```

### Query 2: Detailed Breakdown of Safe vs Unsafe

```sql
-- Detailed breakdown showing both boolean and text status
SELECT
  are_you_safe,
  safety_status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM user_signup
WHERE safety_status IS NOT NULL
  AND deleted_at IS NULL
GROUP BY are_you_safe, safety_status
ORDER BY are_you_safe DESC NULLS LAST, count DESC;
```

**Expected Output:**
```
are_you_safe | safety_status                                    | count | percentage
-------------|--------------------------------------------------|-------|------------
TRUE         | Yes, I'm safe and can complete this form         | 900   | 72.00
TRUE         | The Emergency services have been called          | 150   | 12.00
FALSE        | I'm injured and need medical attention           | 80    | 6.40
FALSE        | I'm in danger and need immediate help            | 30    | 2.40
FALSE        | Call Emergency contact                           | 25    | 2.00
FALSE        | I'm not sure about my safety                     | 15    | 1.20
NULL         | (Safety check abandoned)                         | 50    | 4.00
```

### Query 3: Users Who Were Not Safe (Require Follow-Up)

```sql
-- Identify users who needed assistance (are_you_safe = FALSE)
SELECT
  create_user_id,
  name,
  email,
  mobile,
  are_you_safe,
  safety_status,
  safety_status_timestamp,
  safety_check_what3words,
  safety_check_address
FROM user_signup
WHERE are_you_safe = FALSE
  AND deleted_at IS NULL
ORDER BY safety_status_timestamp DESC
LIMIT 100;
```

**Use Case:**
- Follow up with users who selected emergency options
- Ensure they received necessary help
- Legal duty of care compliance

### Query 4: Conversion Rate (Safety Check → Form Completion)

```sql
-- Compare users who were safe vs those who completed incident reports
SELECT
  us.are_you_safe,
  COUNT(DISTINCT us.create_user_id) as users_safe,
  COUNT(DISTINCT ir.create_user_id) as users_completed_report,
  ROUND(100.0 * COUNT(DISTINCT ir.create_user_id) / NULLIF(COUNT(DISTINCT us.create_user_id), 0), 2) as completion_rate
FROM user_signup us
LEFT JOIN incident_reports ir ON us.create_user_id = ir.create_user_id
WHERE us.safety_status IS NOT NULL
  AND us.deleted_at IS NULL
GROUP BY us.are_you_safe
ORDER BY us.are_you_safe DESC NULLS LAST;
```

**Expected Output:**
```
are_you_safe | users_safe | users_completed_report | completion_rate
-------------|------------|------------------------|----------------
TRUE         | 1050       | 945                    | 90.00
FALSE        | 150        | 0                      | 0.00
NULL         | 50         | 0                      | 0.00
```

**Insight:** Users who are safe (`are_you_safe = TRUE`) have high form completion rates, while those needing assistance (`FALSE`) do not complete the form (as expected).

---

## Business Rules

### Rule 1: Form Access Control

```sql
-- Only allow incident report submission if are_you_safe = TRUE
CREATE OR REPLACE FUNCTION check_user_safety_before_report()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user was marked as safe
  IF EXISTS (
    SELECT 1 FROM user_signup
    WHERE create_user_id = NEW.create_user_id
      AND are_you_safe = TRUE
  ) THEN
    RETURN NEW;  -- Allow insert
  ELSE
    RAISE EXCEPTION 'User must complete safety check and be marked as safe before submitting incident report';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to incident_reports table
CREATE TRIGGER trigger_check_safety_before_report
BEFORE INSERT ON incident_reports
FOR EACH ROW
EXECUTE FUNCTION check_user_safety_before_report();
```

### Rule 2: Frontend Guard

```javascript
// In typeform-incident-report.html or incident form submission
async function checkUserSafety(userId) {
  try {
    const response = await fetch(`/api/safety-status/${userId}`);
    const data = await response.json();

    if (!data.areYouSafe) {
      alert('You must complete the safety check and confirm you are safe before proceeding.');
      window.location.href = '/safety-check.html';
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to check user safety:', error);
    return false;
  }
}

// Call before allowing form submission
async function submitIncidentReport(formData) {
  const isSafe = await checkUserSafety(formData.userId);

  if (!isSafe) {
    return; // Block submission
  }

  // Proceed with submission
  // ...
}
```

---

## Data Migration

### For Existing Records

```sql
-- Backfill are_you_safe for existing records based on safety_status
UPDATE user_signup
SET are_you_safe = (
  CASE
    WHEN safety_status IN (
      'Yes, I''m safe and can complete this form',
      'The Emergency services have been called'
    ) THEN TRUE
    WHEN safety_status IN (
      'Call Emergency contact',
      'I''m injured and need medical attention',
      'I''m in danger and need immediate help',
      'I''m not sure about my safety'
    ) THEN FALSE
    ELSE NULL
  END
)
WHERE safety_status IS NOT NULL
  AND are_you_safe IS NULL;

-- Verify migration
SELECT
  safety_status,
  are_you_safe,
  COUNT(*) as count
FROM user_signup
WHERE safety_status IS NOT NULL
GROUP BY safety_status, are_you_safe
ORDER BY are_you_safe DESC NULLS LAST;
```

---

## Testing Strategy

### Test Case 1: User is Safe (Option 1)

**Input:**
- User clicks: "Yes, I'm safe and can complete this form"

**Expected:**
- `are_you_safe = TRUE`
- `safety_status = "Yes, I'm safe and can complete this form"`
- Redirect to incident form

**SQL Verification:**
```sql
SELECT are_you_safe, safety_status, safety_status_timestamp
FROM user_signup
WHERE create_user_id = 'test-user-id';
```

### Test Case 2: Emergency Services Called (Option 2)

**Input:**
- User clicks: "The Emergency services have been called"

**Expected:**
- `are_you_safe = TRUE`
- `safety_status = "The Emergency services have been called"`
- Redirect to incident form

### Test Case 3: User Injured (Option 4)

**Input:**
- User clicks: "I'm injured and need medical attention"

**Expected:**
- `are_you_safe = FALSE`
- `safety_status = "I'm injured and need medical attention"`
- Trigger 999 call with location
- User stays on page (does NOT redirect to form)

### Test Case 4: Form Submission Guard

**Input:**
- User with `are_you_safe = FALSE` tries to submit incident report

**Expected:**
- Frontend blocks submission
- Redirect back to safety check
- Alert: "You must complete the safety check..."

---

## Summary

### Why This Approach Works

✅ **Simple Querying:** `WHERE are_you_safe = TRUE` vs parsing text strings
✅ **Access Control:** Easy to enforce "must be safe to proceed" rule
✅ **Analytics:** Quick metrics on safe vs unsafe users
✅ **Audit Trail:** Keep detailed `safety_status` text + simple boolean
✅ **Business Logic:** Clear TRUE/FALSE for decision-making

### Data Model

```
are_you_safe (BOOLEAN):
├── TRUE  → User safe to proceed (options 1 & 2)
├── FALSE → User needs assistance (options 3-6)
└── NULL  → Safety check not completed/abandoned

safety_status (TEXT):
└── Full text description for audit trail and detailed reporting
```

### Implementation Checklist

- [ ] Add `are_you_safe` column to `user_signup` table
- [ ] Update `saveSafetyStatus()` function in safety-check.html
- [ ] Implement backend validation in `/api/update-safety-status`
- [ ] Add frontend guard to prevent form submission if not safe
- [ ] Backfill existing records (data migration)
- [ ] Update analytics dashboards to use boolean field
- [ ] Test all 6 safety status options
- [ ] Verify form submission blocking works

---

**End of Document**
