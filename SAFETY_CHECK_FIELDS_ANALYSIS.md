# Safety Check Page - Complete Field and Data Analysis

**File:** `public/safety-check.html`
**Purpose:** Pre-incident report safety triage page
**Database Table:** Likely `user_signup` or `incident_reports` (via `/api/update-safety-status`)
**Total Fields:** 6 user-selection options + 7 generated/derived fields

---

## Executive Summary

The Safety Check page is a **pre-incident report triage screen** that assesses user safety before allowing them to proceed with the incident report form. It does **NOT collect form inputs** but rather:

1. **Reads incident data** from sessionStorage (passed from previous page)
2. **User selects safety status** from 6 predefined options
3. **Generates metadata** (timestamp, processed status)
4. **Saves to backend** via API endpoint
5. **Redirects** to appropriate next page based on selection

---

## Data Flow Architecture

```
Previous Page (incident.html)
       ↓
sessionStorage.incidentData
       ↓
safety-check.html (THIS PAGE)
       ↓
User selects safety status (1 of 6 options)
       ↓
POST /api/update-safety-status
       ↓
Backend saves to database
       ↓
sessionStorage.safetyStatus
       ↓
Redirect to /typeform-incident-report.html
```

---

## User Input Fields (Selection Buttons)

### Field 1: Safety Status Selection

**HTML Type:** Button Group (6 options)
**Required:** Yes (user must select one to proceed)
**Code Location:** Lines 157-191

**Option Values (data-status attribute):**

| Option # | Value | Action Triggered | Redirect |
|----------|-------|------------------|----------|
| 1 | `"Yes, I'm safe and can complete this form"` | Save status → Proceed | `/typeform-incident-report.html` |
| 2 | `"The Emergency services have been called"` | Save status → Proceed | `/typeform-incident-report.html` |
| 3 | `"Call Emergency contact"` | Fetch & call emergency contact | Stay on page or redirect after call |
| 4 | `"I'm injured and need medical attention"` | Trigger 999 call with location | Stay on page (user may call) |
| 5 | `"I'm in danger and need immediate help"` | Trigger 999 call with location | Stay on page (user may call) |
| 6 | `"I'm not sure about my safety"` | Trigger 999 call with location | Stay on page (user may call) |

**HTML Structure:**

```html
<!-- Lines 157-191: Six safety option buttons -->
<button class="safety-option safe" data-status="Yes, I'm safe and can complete this form">
    <span class="icon">✅</span>
    <strong>Yes, I'm safe and can complete this form</strong>
    <div class="description">Continue to incident report</div>
</button>

<button class="safety-option emergency" data-status="The Emergency services have been called">
    <span class="icon">📞</span>
    <strong>The Emergency services have been called</strong>
    <div class="description">I'm fit to continue completing this report</div>
</button>

<button class="safety-option contact" data-status="Call Emergency contact">
    <span class="icon">👤</span>
    <strong>Call Emergency contact</strong>
    <div class="description">You provided previously</div>
</button>

<button class="safety-option injured" data-status="I'm injured and need medical attention">
    <span class="icon">🏥</span>
    <strong>I'm injured and need medical attention</strong>
    <div class="description">Call 999 immediately</div>
</button>

<button class="safety-option danger" data-status="I'm in danger and need immediate help">
    <span class="icon">⚠️</span>
    <strong>I'm in danger and need immediate help</strong>
    <div class="description">Call 999 now</div>
</button>

<button class="safety-option unsure" data-status="I'm not sure about my safety">
    <span class="icon">😟</span>
    <strong>I'm not sure about my safety</strong>
    <div class="description">Get guidance</div>
</button>
```

**JavaScript Handler:** Lines 227-277

```javascript
document.querySelectorAll('.safety-option').forEach(button => {
    button.addEventListener('click', async function() {
        const safetyStatus = this.dataset.status;
        console.log('Safety status selected:', safetyStatus);

        // Handle emergency situations (injured or danger)
        if (safetyStatus.includes('injured') || safetyStatus.includes('danger')) {
            call999WithWhat3Words();
            return;
        }

        // Handle emergency contact
        if (safetyStatus === 'Call Emergency contact') {
            // Fetch emergency contact via API and initiate call
            // ...
        }

        // Handle unsure situation
        if (safetyStatus.includes('not sure')) {
            call999WithWhat3Words();
            return;
        }

        // For safe or emergency services called - proceed with report
        document.getElementById('safetyOptions').style.display = 'none';
        document.getElementById('loadingIndicator').classList.add('active');

        // Save safety status to Supabase
        await saveSafetyStatus(safetyStatus);

        // Redirect to Typeform
        proceedToTypeform(safetyStatus);
    });
});
```

---

## Generated & Derived Fields

### Field 2: incident Data (Read from sessionStorage)

**Source:** `sessionStorage.getItem('incidentData')`
**Generated By:** Previous page (incident.html)
**Type:** JSON Object
**Code Location:** Line 206

```javascript
const incidentData = JSON.parse(sessionStorage.getItem('incidentData') || '{}');
```

**Expected Structure:**

```javascript
{
  userId: "uuid-string",                    // User ID
  what3words: "filled.count.soap",          // What3Words address
  location: {                               // GPS coordinates
    lat: 51.507351,
    lng: -0.127758
  },
  what3wordsStoragePath: "path/to/w3w",    // Storage path for w3w data
  address: "123 Main St, London, UK"        // Reverse-geocoded address
}
```

**Usage:**
- Display location info when calling 999
- Fetch emergency contact via API
- Pass to backend when saving safety status

---

### Field 3: Safety Status (Selected by User)

**Source:** Button click `data-status` attribute
**Generated By:** User selection
**Type:** String (one of 6 predefined values)
**Code Location:** Line 229

```javascript
const safetyStatus = this.dataset.status;
```

**Possible Values:**
1. `"Yes, I'm safe and can complete this form"`
2. `"The Emergency services have been called"`
3. `"Call Emergency contact"`
4. `"I'm injured and need medical attention"`
5. `"I'm in danger and need immediate help"`
6. `"I'm not sure about my safety"`

**Stored In:**
- Backend database (via API)
- sessionStorage (for next page)

---

### Field 4: Timestamp (Auto-Generated)

**Source:** `new Date().toISOString()`
**Generated By:** JavaScript when saving status
**Type:** String (ISO 8601 timestamp)
**Code Location:** Line 291

```javascript
timestamp: new Date().toISOString()
```

**Example Value:**
```
"2025-11-06T15:42:37.123Z"
```

**Purpose:**
- Record when safety status was assessed
- Audit trail for legal compliance

---

### Field 5: Emergency Contact (Fetched from API)

**Source:** `GET /api/emergency/contacts/${userId}`
**Generated By:** Backend database query
**Type:** String (phone number)
**Code Location:** Lines 243-255

```javascript
const response = await fetch(`/api/emergency/contacts/${incidentData.userId}`);
if (response.ok) {
    const contacts = await response.json();
    if (contacts.emergency_contact) {
        // Use emergency contact phone number
        window.location.href = `tel:${contacts.emergency_contact}`;
    }
}
```

**Expected Response:**

```json
{
  "emergency_contact": "+447411005390",
  "recovery_breakdown_number": "07411005390",
  "emergency_services_number": "999"
}
```

**Usage:**
- Only fetched if user selects "Call Emergency contact" option
- Initiates phone call via `tel:` link

---

### Field 6: What3Words Location Message (Generated)

**Source:** `incidentData.what3words`
**Generated By:** JavaScript string concatenation
**Type:** String (formatted message)
**Code Location:** Lines 213-215

```javascript
if (incidentData.what3words) {
    message += `\n\nYour what3words location: ///${incidentData.what3words}`;
    message += '\n\nPlease provide this location to the operator.';
}
```

**Example Output:**
```
This will call 999 Emergency Services.

Your what3words location: ///filled.count.soap

Please provide this location to the operator.
```

**Purpose:**
- Help user communicate precise location to 999 operator
- Improves emergency response accuracy

---

### Field 7: GPS Coordinates Message (Generated)

**Source:** `incidentData.location`
**Generated By:** JavaScript string formatting
**Type:** String (formatted coordinates)
**Code Location:** Lines 216-218

```javascript
else if (incidentData.location) {
    message += `\n\nYour GPS coordinates: ${incidentData.location.lat.toFixed(6)}, ${incidentData.location.lng.toFixed(6)}`;
    message += '\n\nPlease provide these coordinates to the operator.';
}
```

**Example Output:**
```
This will call 999 Emergency Services.

Your GPS coordinates: 51.507351, -0.127758

Please provide these coordinates to the operator.
```

**Purpose:**
- Fallback if What3Words unavailable
- Provide location to emergency services

---

## Backend API Integration

### POST /api/update-safety-status

**Purpose:** Save safety status and incident metadata to database
**Content-Type:** application/json
**Code Location:** Lines 283-309

**Request Body:**

```javascript
{
    userId: incidentData.userId,                          // UUID or user identifier
    safetyStatus: status,                                 // Selected safety option
    timestamp: new Date().toISOString(),                  // ISO timestamp
    location: incidentData.location,                      // GPS coordinates object
    what3words: incidentData.what3words,                  // What3Words address
    what3wordsStoragePath: incidentData.what3wordsStoragePath,  // Storage path
    address: incidentData.address                         // Reverse-geocoded address
}
```

**Example Request:**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "safetyStatus": "Yes, I'm safe and can complete this form",
  "timestamp": "2025-11-06T15:42:37.123Z",
  "location": {
    "lat": 51.507351,
    "lng": -0.127758
  },
  "what3words": "filled.count.soap",
  "what3wordsStoragePath": "users/550e8400-e29b-41d4-a716-446655440000/w3w-map.png",
  "address": "10 Downing Street, Westminster, London SW1A 2AA, UK"
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Safety status saved successfully"
}
```

**Database Table (Assumed):**

Likely saved to `user_signup` or `incident_reports` table:

```sql
-- Assumed columns (may need to be added)
ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS safety_status TEXT;

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS safety_status_timestamp TIMESTAMP;

COMMENT ON COLUMN user_signup.safety_status IS
'Safety triage status selected before incident report. Values: "Yes, I'm safe and can complete this form", "The Emergency services have been called", "Call Emergency contact", "I'm injured and need medical attention", "I'm in danger and need immediate help", "I'm not sure about my safety"';

COMMENT ON COLUMN user_signup.safety_status_timestamp IS
'Timestamp when safety status was assessed (ISO 8601 format)';
```

---

### GET /api/emergency/contacts/:userId

**Purpose:** Fetch emergency contact phone number for user
**Code Location:** Lines 243-255

**Request:**
```
GET /api/emergency/contacts/550e8400-e29b-41d4-a716-446655440000
```

**Response:**

```json
{
  "emergency_contact": "+447411005390",
  "recovery_breakdown_number": "07411005390",
  "emergency_services_number": "999"
}
```

**Usage:**
- Only called if user selects "Call Emergency contact" option
- Parses pipe-delimited `emergency_contact` field from database
- See `EMERGENCY_CONTACT_API_FIX.md` for field format details

---

## sessionStorage Data Flow

### Input Data (Read)

**Key:** `incidentData`
**Source:** Previous page (incident.html)

```javascript
const incidentData = JSON.parse(sessionStorage.getItem('incidentData') || '{}');
```

**Expected Content:**
```javascript
{
  userId: "uuid",
  what3words: "filled.count.soap",
  location: { lat: 51.507351, lng: -0.127758 },
  what3wordsStoragePath: "path/to/w3w",
  address: "10 Downing Street, London"
}
```

---

### Output Data (Written)

**Key:** `safetyStatus`
**Destination:** Next page (typeform-incident-report.html)

```javascript
sessionStorage.setItem('safetyStatus', safetyStatus);
```

**Stored Value (Example):**
```
"Yes, I'm safe and can complete this form"
```

**Purpose:**
- Pass safety status to embedded Typeform
- May be included in final incident report submission

---

## Conditional Logic & Action Flows

### Flow 1: User is Safe (Options 1 & 2)

```
User clicks "Yes, I'm safe" OR "Emergency services called"
       ↓
Hide safety options
       ↓
Show loading indicator
       ↓
POST /api/update-safety-status (save status + metadata)
       ↓
sessionStorage.setItem('safetyStatus', status)
       ↓
window.location.href = '/typeform-incident-report.html'
```

---

### Flow 2: User Needs Emergency Contact (Option 3)

```
User clicks "Call Emergency contact"
       ↓
GET /api/emergency/contacts/${userId}
       ↓
If contact found:
    ├── Confirm dialog: "Call your emergency contact: +44..."
    └── If confirmed: window.location.href = 'tel:+44...'
       ↓
If contact NOT found:
    └── Alert: "Emergency contact not found. Please call 999..."
       ↓
User stays on page (can select different option)
```

---

### Flow 3: User Injured or in Danger (Options 4, 5, 6)

```
User clicks "Injured" OR "Danger" OR "Not sure"
       ↓
call999WithWhat3Words() function
       ↓
Build message with location info:
    ├── If what3words available: Include ///filled.count.soap
    └── Else if GPS available: Include lat/lng coordinates
       ↓
Confirm dialog with location info
       ↓
If confirmed: window.location.href = 'tel:999'
       ↓
User stays on page (can proceed after calling 999)
```

---

## Emergency Call Integration

### Function: call999WithWhat3Words()

**Purpose:** Initiate 999 call with location information
**Code Location:** Lines 210-224

```javascript
function call999WithWhat3Words() {
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
}
```

**Location Priority:**
1. **First Choice:** What3Words address (more precise, easier to communicate)
2. **Fallback:** GPS coordinates (lat/lng)
3. **None:** Just call 999 without location info

**User Experience:**
- Confirmation dialog shows location before dialing
- User can cancel if they want to check location first
- Location info displayed in easy-to-read format

---

## Database Schema Requirements

### Recommended Columns (user_signup or incident_reports table)

```sql
-- Safety status fields
ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS safety_status TEXT;

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS safety_status_timestamp TIMESTAMP WITH TIME ZONE;

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS safety_check_location_lat DECIMAL(10, 8);

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS safety_check_location_lng DECIMAL(11, 8);

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS safety_check_what3words TEXT;

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS safety_check_address TEXT;

-- Comments for documentation
COMMENT ON COLUMN user_signup.safety_status IS
'Safety triage status selected before incident report. Options: Safe, Emergency services called, Call emergency contact, Injured, In danger, Not sure';

COMMENT ON COLUMN user_signup.safety_status_timestamp IS
'ISO 8601 timestamp when safety status was assessed';

COMMENT ON COLUMN user_signup.safety_check_location_lat IS
'GPS latitude at time of safety check (-90 to 90)';

COMMENT ON COLUMN user_signup.safety_check_location_lng IS
'GPS longitude at time of safety check (-180 to 180)';

COMMENT ON COLUMN user_signup.safety_check_what3words IS
'What3Words location address (e.g., filled.count.soap)';

COMMENT ON COLUMN user_signup.safety_check_address IS
'Reverse-geocoded human-readable address at time of safety check';

-- Index for querying safety status
CREATE INDEX IF NOT EXISTS idx_user_signup_safety_status
ON user_signup(safety_status)
WHERE safety_status IS NOT NULL;

-- Index for timestamp queries
CREATE INDEX IF NOT EXISTS idx_user_signup_safety_timestamp
ON user_signup(safety_status_timestamp)
WHERE safety_status_timestamp IS NOT NULL;
```

### Check Constraint for Valid Values

```sql
ALTER TABLE user_signup
DROP CONSTRAINT IF EXISTS safety_status_check;

ALTER TABLE user_signup
ADD CONSTRAINT safety_status_check
CHECK (
    safety_status IS NULL OR
    safety_status IN (
        'Yes, I''m safe and can complete this form',
        'The Emergency services have been called',
        'Call Emergency contact',
        'I''m injured and need medical attention',
        'I''m in danger and need immediate help',
        'I''m not sure about my safety'
    )
);
```

---

## Analytics & Reporting Queries

### Query 1: Safety Status Distribution

```sql
SELECT
    safety_status,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM user_signup
WHERE safety_status IS NOT NULL
  AND deleted_at IS NULL
GROUP BY safety_status
ORDER BY count DESC;
```

**Expected Output:**
```
safety_status                                    | count | percentage
-------------------------------------------------|-------|------------
Yes, I'm safe and can complete this form         | 850   | 68.00
The Emergency services have been called          | 200   | 16.00
I'm injured and need medical attention           | 120   | 9.60
Call Emergency contact                           | 50    | 4.00
I'm in danger and need immediate help            | 20    | 1.60
I'm not sure about my safety                     | 10    | 0.80
```

---

### Query 2: Emergency Cases Requiring Follow-Up

```sql
SELECT
    create_user_id,
    name,
    email,
    mobile,
    safety_status,
    safety_status_timestamp,
    safety_check_what3words,
    safety_check_address
FROM user_signup
WHERE safety_status IN (
    'I''m injured and need medical attention',
    'I''m in danger and need immediate help',
    'I''m not sure about my safety'
)
  AND deleted_at IS NULL
ORDER BY safety_status_timestamp DESC
LIMIT 100;
```

**Use Case:**
- Identify users who selected emergency options
- Follow up to ensure they received help
- Legal compliance and duty of care

---

### Query 3: Safety Check Response Time

```sql
SELECT
    DATE_TRUNC('hour', safety_status_timestamp) as hour,
    COUNT(*) as safety_checks_completed,
    AVG(EXTRACT(EPOCH FROM (safety_status_timestamp - created_at))) as avg_seconds_to_safety_check
FROM user_signup
WHERE safety_status IS NOT NULL
  AND deleted_at IS NULL
GROUP BY hour
ORDER BY hour DESC
LIMIT 24;
```

**Use Case:**
- Analyze how quickly users complete safety check
- Identify patterns (time of day, day of week)
- Optimize user flow if delays detected

---

## Critical Issues & Recommendations

### 🔴 Issue 1: No Validation on Backend

**Problem:**
Frontend sends safety status to `/api/update-safety-status` but backend validation is unknown.

**Risk:**
- Invalid safety status values could be saved
- Missing required fields (userId, timestamp)
- No enum constraint enforcement

**Solution:**

```javascript
// Backend validation in controller
function validateSafetyStatus(data) {
    const validStatuses = [
        'Yes, I\'m safe and can complete this form',
        'The Emergency services have been called',
        'Call Emergency contact',
        'I\'m injured and need medical attention',
        'I\'m in danger and need immediate help',
        'I\'m not sure about my safety'
    ];

    if (!data.userId) {
        throw new Error('userId is required');
    }

    if (!data.safetyStatus || !validStatuses.includes(data.safetyStatus)) {
        throw new Error('Invalid safety status');
    }

    if (!data.timestamp) {
        throw new Error('timestamp is required');
    }

    return true;
}
```

**Priority:** 🔴 HIGH - Prevents invalid data

---

### ⚠️ Issue 2: Emergency Contact Not Always Available

**Problem:**
User selects "Call Emergency contact" but contact may not be in database.

**Current Behavior:**
- Shows generic alert: "Emergency contact not found. Please call 999..."
- User must manually select different option

**Recommendation:**

```javascript
// Check if emergency contact exists BEFORE showing option
async function checkEmergencyContactAvailable() {
    if (incidentData.userId) {
        try {
            const response = await fetch(`/api/emergency/contacts/${incidentData.userId}`);
            if (response.ok) {
                const contacts = await response.json();
                if (!contacts.emergency_contact) {
                    // Hide "Call Emergency contact" option
                    document.querySelector('[data-status="Call Emergency contact"]').style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Failed to check emergency contact:', error);
        }
    }
}

// Call on page load
checkEmergencyContactAvailable();
```

**Priority:** ⚠️ MEDIUM - Improves UX

---

### 💡 Recommendation 1: Track 999 Call Completion

**Enhancement:**
Track whether user actually called 999 or cancelled the dialog.

**Implementation:**

```javascript
function call999WithWhat3Words() {
    let message = 'This will call 999 Emergency Services.';

    if (incidentData.what3words) {
        message += `\n\nYour what3words location: ///${incidentData.what3words}`;
        message += '\n\nPlease provide this location to the operator.';
    } else if (incidentData.location) {
        message += `\n\nYour GPS coordinates: ${incidentData.location.lat.toFixed(6)}, ${incidentData.location.lng.toFixed(6)}`;
        message += '\n\nPlease provide these coordinates to the operator.';
    }

    if (confirm(message)) {
        // Track that user initiated 999 call
        trackEmergencyCall('999', 'initiated');
        window.location.href = 'tel:999';
    } else {
        // Track that user cancelled 999 call
        trackEmergencyCall('999', 'cancelled');
    }
}

async function trackEmergencyCall(number, status) {
    try {
        await fetch('/api/track-emergency-call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: incidentData.userId,
                phoneNumber: number,
                callStatus: status,
                timestamp: new Date().toISOString()
            })
        });
    } catch (error) {
        console.error('Failed to track emergency call:', error);
    }
}
```

**Benefits:**
- Legal audit trail
- Duty of care compliance
- Identify users who cancelled emergency calls (may need follow-up)

**Priority:** 💡 RECOMMENDED - Legal protection

---

## Summary

### What This Page Does

✅ **Assesses user safety** before allowing incident report
✅ **Provides emergency assistance** (999 calls with location)
✅ **Fetches emergency contacts** from database
✅ **Saves safety status** to backend via API
✅ **Redirects to incident form** if user is safe

### Key Fields

| Field | Type | Source | Saved to DB |
|-------|------|--------|-------------|
| Safety Status | String (selection) | User button click | Yes |
| Timestamp | ISO String | Auto-generated | Yes |
| User ID | UUID | sessionStorage | Yes |
| Location (lat/lng) | Object | sessionStorage | Yes |
| What3Words | String | sessionStorage | Yes |
| Address | String | sessionStorage | Yes |
| Emergency Contact | String | API fetch | No (read-only) |

### Backend Requirements

🔴 **Implement:** `/api/update-safety-status` endpoint
⚠️ **Validate:** Safety status enum values
💡 **Enhance:** Track emergency call completion

---

**End of Document**
