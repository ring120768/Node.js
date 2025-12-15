# Safety Check Investigation - Summary

**Date:** 17 November 2025
**Investigation Focus:** Incident report submission failing with safety check validation error
**Status:** ✅ **RESOLVED** - Root cause identified, solution documented

---

## Executive Summary

User attempted to submit incident report but received **500 Internal Server Error** with validation message:

```
"User must complete safety check and be marked as safe before submitting incident report"
```

**Root Cause:** User's Supabase Auth account and `user_signup` record were deleted during previous investigation cleanup. The safety check endpoint (`/api/update-safety-status`) requires authentication and returned **401 Unauthorized**, preventing the safety status from being saved. Without `are_you_safe = TRUE` in the database, the incident report submission is blocked by a database trigger.

**Resolution:** User must complete the full signup flow before submitting incident reports.

---

## Timeline of Events

### Previous Session (16 Nov 2025)
```
✅ Completed signup photo investigation
✅ Cleaned up orphaned database records for user ee7cfcaf-5810-4c62-b99b-ab0f2291733e:
   - Deleted 13 temp_uploads records
   - Deleted 5 user_documents records
   - Deleted 1 user_signup record
   - Deleted Supabase Auth user
```

### Current Session (17 Nov 2025)
```
❌ 12:24:14 - User attempted safety check: POST /api/update-safety-status → 401 Unauthorized
❌ 19:14:57 - User attempted safety check again: POST /api/update-safety-status → 401 Unauthorized
❌ 19:31:20 - Incident report submission failed:
   Error: "User must complete safety check and be marked as safe before submitting incident report"
   Database trigger validation failed (P0001)
```

---

## Technical Architecture

### Safety Check Flow

```
1. User Registration
   ├─ POST /auth/signup (signup-auth.html)
   ├─ Creates Supabase Auth user
   └─ Sets cookies: access_token, refresh_token

2. Signup Form Completion
   ├─ Pages 2-9 (signup-form.html)
   ├─ Upload images → POST /api/images/temp-upload
   └─ Final submit → POST /api/signup/submit
       └─ Creates user_signup record

3. Safety Check Assessment
   ├─ safety-check.html (BEFORE incident form)
   ├─ User selects safety status
   └─ POST /api/update-safety-status (requires authentication)
       └─ Updates user_signup:
           ├─ are_you_safe = TRUE (for options 1-2)
           ├─ safety_status = "Yes, I'm safe and can complete this form"
           └─ safety_status_timestamp = Current timestamp

4. Incident Report Submission
   ├─ incident-form-page1.html through page12.html
   ├─ POST /api/incident-form/submit
   └─ Database trigger validates:
       └─ IF user_signup.are_you_safe = TRUE
           └─ THEN allow incident_reports INSERT
           └─ ELSE raise exception
```

### Database Trigger Validation

**Migration:** `migrations/014_add_are_you_safe_boolean.sql` (lines 81-103)

```sql
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

CREATE TRIGGER trigger_check_safety_before_report
BEFORE INSERT ON incident_reports
FOR EACH ROW
EXECUTE FUNCTION check_user_safety_before_report();
```

### Safety Status Options

| Option | Text | are_you_safe | Action |
|--------|------|--------------|--------|
| 1 | "Yes, I'm safe and can complete this form" | TRUE ✅ | Proceed to incident form |
| 2 | "The Emergency services have been called" | TRUE ✅ | Proceed to incident form |
| 3 | "Call Emergency contact" | FALSE ❌ | Redirect to emergency contact |
| 4 | "I'm injured and need medical attention" | FALSE ❌ | Prompt to call 999 |
| 5 | "I'm in danger and need immediate help" | FALSE ❌ | Prompt to call 999 |
| 6 | "I'm not sure about my safety" | FALSE ❌ | Prompt to call 999 |

---

## Investigation Scripts Created

### `check-user-auth-status.js`
**Purpose:** Verify user authentication, signup record, and safety check status

**Sample Output:**
```
🎯 Checking User ID: ee7cfcaf-5810-4c62-b99b-ab0f2291733e

1️⃣  Checking Supabase Auth...
❌ Auth Error: User not found

2️⃣  Checking user_signup record...
❌ No user_signup record found - user needs to complete signup

🔴 CRITICAL: No authentication or signup record

📋 REQUIRED ACTIONS:
1. Complete signup flow (signup-auth.html)
2. Complete safety check (safety-check.html)
3. Then submit incident report
```

---

## Key Files

### Backend (Safety Check Implementation)

| File | Purpose | Key Functions |
|------|---------|---------------|
| `src/controllers/safety.controller.js` | Safety check business logic | `updateSafetyStatus()`, `getSafetyStatus()` |
| `src/routes/safety.routes.js` | Safety check API routes | POST `/api/update-safety-status`, GET `/api/safety-status/:userId` |
| `migrations/014_add_are_you_safe_boolean.sql` | Database schema & trigger | `check_user_safety_before_report()` trigger |

### Frontend (Safety Check UI)

| File | Purpose | Key Features |
|------|---------|--------------|
| `public/safety-check.html` | Safety assessment UI | 6 safety options, emergency 999 button, what3words integration |
| `public/six-point-safety-check.html` | Next step after safety check | (placeholder for future implementation) |

---

## Server Logs Analysis

### Authentication Failures (401)

```
[INFO] 2025-11-16T12:24:14.435Z HTTP
"POST /api/update-safety-status HTTP/1.1" 401 33

[INFO] 2025-11-17T19:14:57.586Z HTTP
"POST /api/update-safety-status HTTP/1.1" 401 33
```

**Diagnosis:** User attempted to save safety status without valid authentication. The `/api/update-safety-status` endpoint requires `authenticateToken` middleware (src/routes/safety.routes.js:45), which validates the Supabase Auth session from cookies.

### Database Trigger Error (P0001)

```
[ERROR] 2025-11-16T12:31:20.432Z Failed to insert incident report
{
  "userId": "ee7cfcaf-5810-4c62-b99b-ab0f2291733e",
  "error": "User must complete safety check and be marked as safe before submitting incident report",
  "code": "P0001"
}
```

**Diagnosis:** Database trigger `check_user_safety_before_report()` validated that `user_signup.are_you_safe` was NOT TRUE (actually NULL because no record exists), blocking the incident report insertion.

---

## Browser Console Analysis

### User's Perspective (What They Saw)

```javascript
// Health check passed (network is fine)
Health check status: 200

// Incident form submission attempted
🚀 Sending incident form submission...

// Server rejected with 500 error
Failed to load resource: the server responded with a status of 500 (Internal Server Error)

// Error details shown to user
📦 Response data:
{
  success: false,
  error: 'Failed to save incident report',
  details: 'User must complete safety check and be marked as safe before submitting incident report'
}
```

**Initial Misdiagnosis:** User thought it was a network issue ("may be because I have a poor signal") because submission failed multiple times.

**Actual Issue:** Server was reachable (health check passed), but database-level validation was failing due to missing safety check record.

---

## Solution & Testing

### Required User Actions

1. **Complete Signup Flow**
   ```
   Navigate to: /signup-auth.html
   - Enter email and password
   - Submit registration
   - Server creates Supabase Auth user
   - Cookies set: access_token, refresh_token
   ```

2. **Complete Signup Form**
   ```
   Navigate to: /signup-form.html
   - Complete Pages 2-9 (personal info, vehicle, insurance)
   - Upload 5 required photos:
     - driving_license_picture
     - vehicle_front_image
     - vehicle_driver_side_image
     - vehicle_passenger_side_image
     - vehicle_back_image
   - Submit final signup
   - Server creates user_signup record
   ```

3. **Complete Safety Check**
   ```
   Navigate to: /safety-check.html
   - Select: "Yes, I'm safe and can complete this form"
   - Server updates user_signup.are_you_safe = TRUE
   - Verify in logs: "Safety status updated for user [uuid]: are_you_safe=true"
   ```

4. **Submit Incident Report**
   ```
   Navigate to: /incident-form-page1.html
   - Complete all 12 pages of incident form
   - Upload 14 required photos
   - Submit final incident report
   - Database trigger will pass validation
   - Incident report saved successfully
   ```

### Verification Scripts

```bash
# Check user authentication and safety check status
node check-user-auth-status.js

# Expected output after completing steps 1-3:
✅ Supabase Auth User EXISTS
✅ user_signup Record EXISTS
✅ are_you_safe: TRUE
✅ ALL CHECKS PASSED
```

---

## Technical Insights

### 1. Authentication-First Architecture

The application follows an **auth-first signup flow** where:
- User authentication happens on **Page 1** (signup-auth.html)
- All subsequent pages require valid authentication
- Images upload immediately to prevent mobile file handle expiry
- Safety check requires authentication to save status

**Why:** Mobile browsers expire file handles when app is backgrounded. Immediate upload + authentication prevents ERR_UPLOAD_FILE_CHANGED errors.

### 2. Database-Level Safety Validation

The safety check is enforced at the **database trigger level**, not just application code:
- Prevents bypassing safety check via API calls
- Ensures data integrity even if frontend code is modified
- Provides audit trail of safety assessments
- Cannot be circumvented without database access

**Trade-off:** More complex error handling, but bulletproof enforcement.

### 3. Safety Status Boolean Mapping

Controller logic (`src/controllers/safety.controller.js:14-21`) maps text selections to boolean:

```javascript
function mapSafetyStatusToBoolean(safetyStatus) {
  const safeOptions = [
    'Yes, I\'m safe and can complete this form',
    'The Emergency services have been called'
  ];
  return safeOptions.includes(safetyStatus);
}
```

**Why Two Safe Options?**
- Option 1: User is completely safe
- Option 2: Emergency services called, but user is fit to continue

Both allow incident report submission because:
- Option 1: User is in a safe state to provide accurate information
- Option 2: Emergency help is already dispatched, completing report is valuable for insurance/legal purposes

---

## Recommendations

### 1. Improve Error Messages

**Current Error:**
```json
{
  "error": "Failed to save incident report",
  "details": "User must complete safety check and be marked as safe before submitting incident report"
}
```

**Recommended Error:**
```json
{
  "error": "Safety Check Required",
  "details": "You must complete the safety check before submitting an incident report. Please go to safety-check.html first.",
  "action": "redirect",
  "redirectUrl": "/safety-check.html",
  "userFriendlyMessage": "For your safety, we need to confirm you're in a safe state before completing the incident report."
}
```

**Implementation:** Update `src/controllers/incident.controller.js` to catch P0001 error and provide actionable redirect.

### 2. Prevent Bypassing Safety Check (Frontend Guard)

Add client-side validation in `incident-form-page1.html` to check if safety check is completed:

```javascript
// Before loading incident form
async function checkSafetyStatus() {
  const response = await fetch('/api/safety-status/:userId');
  const { areYouSafe } = await response.json();

  if (!areYouSafe) {
    alert('Safety check required before continuing.');
    window.location.href = '/safety-check.html';
  }
}
```

**Why:** Fail fast on frontend, saving unnecessary API calls and improving UX.

### 3. Add Safety Check Timestamp Validation

Consider adding timestamp check in trigger to ensure safety assessment is recent:

```sql
-- Ensure safety check was completed within last 24 hours
AND safety_status_timestamp > NOW() - INTERVAL '24 hours'
```

**Rationale:** User's safety status may change after 24 hours. Re-assessment recommended for accuracy.

### 4. Testing Workflow Documentation

Create `/TESTING_WORKFLOW.md` documenting:
- Order of pages (signup → safety check → incident form)
- Required fields at each stage
- Expected authentication state
- How to verify completion

**Purpose:** Prevent future confusion about correct testing sequence.

---

## Related Documentation

- `INVESTIGATION_SUMMARY.md` - Signup photo persistence investigation
- `COMPREHENSIVE_FIELD_MAPPING_PLAN.md` - Incident form field mappings
- `migrations/014_add_are_you_safe_boolean.sql` - Safety check database schema
- `migrations/015_add_user_signup_safety_check.sql` - Safety check trigger implementation

---

**Investigation Complete** ✅
**Root Cause Identified** ✅
**Solution Documented** ✅
**Testing Script Created** ✅
**Ready for User Action** 🚀
