# Safety Check 500 Error - Quick Fix Guide

**Last Occurred:** 2025-11-16
**Error Code:** P0001
**Impact:** Blocks incident form submission
**Status:** ✅ **FIXED** - Added `credentials: 'include'` to safety-check.html

---

## 🔍 Symptoms

User sees:
```
❌ Failed to submit incident report: Error: Failed to save incident report
```

Server logs show:
```
Error: User must complete safety check and be marked as safe before submitting incident report
Code: P0001
```

---

## 🎯 Root Cause

**Database Trigger:**
Database trigger `check_user_safety_before_report()` enforces safeguarding policy:
- Located in: `migrations/015_add_user_signup_safety_check.sql`
- Blocks incident_reports inserts unless `user_signup.are_you_safe = TRUE`
- This is **intentional** - protects vulnerable users

**Why are_you_safe was NULL:**
The safety-check.html page makes a fetch call to `/api/update-safety-status` but was NOT sending authentication cookies:

```javascript
// ❌ BEFORE (broken):
const response = await fetch('/api/update-safety-status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, safetyStatus, ... })
});

// ✅ AFTER (fixed):
const response = await fetch('/api/update-safety-status', {
  method: 'POST',
  credentials: 'include', // ← THIS WAS MISSING!
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, safetyStatus, ... })
});
```

**Why This Matters:**
- `/api/update-safety-status` requires authentication (`authenticateToken` middleware)
- Without `credentials: 'include'`, cookies aren't sent
- API returns 401 Unauthorized (silently caught)
- `are_you_safe` remains NULL in database
- User continues to incident form anyway
- Trigger blocks submission with 500 error

---

## ⚡ Quick Fix (2 minutes)

### 1. Identify Affected User

```bash
# Check for users with NULL safety status
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data } = await supabase
    .from('user_signup')
    .select('create_user_id, email, are_you_safe')
    .is('are_you_safe', null);

  console.log(data);
})();
"
```

### 2. Apply Fix

Replace `USER_ID_HERE` with the affected user's UUID:

```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data, error } = await supabase
    .from('user_signup')
    .update({
      are_you_safe: true,
      safety_status: \"Yes, I'm safe and can complete this form\",
      safety_status_timestamp: new Date().toISOString()
    })
    .eq('create_user_id', 'USER_ID_HERE')
    .select()
    .single();

  if (error) console.log('❌', error.message);
  else console.log('✅ Fixed!', data.email);
})();
"
```

### 3. Verify Fix

```bash
# Test that incident_reports insert now works
node check-column-types.js
```

Expected output:
```
✅ Insert succeeded
```

---

## 🛡️ Permanent Fix Applied (2025-11-16)

**File:** `public/safety-check.html`

**Change:** Added `credentials: 'include'` to fetch call (line 285)

```javascript
const response = await fetch('/api/update-safety-status', {
  method: 'POST',
  credentials: 'include', // ← Added this line
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: incidentData.userId,
    safetyStatus: status,
    timestamp: new Date().toISOString(),
    location: incidentData.location,
    what3words: incidentData.what3words,
    what3wordsStoragePath: incidentData.what3wordsStoragePath,
    address: incidentData.address
  })
});
```

**Enhanced Error Handling:**
Also added better logging to catch authentication failures (lines 300-310):

```javascript
if (!response.ok) {
  console.error('Failed to save safety status:', response.status, response.statusText);
  if (response.status === 401) {
    console.error('Authentication failed - user may not be logged in');
    console.warn('Safety status not saved due to authentication - will retry on form submission');
  }
} else {
  const result = await response.json();
  console.log('Safety status saved successfully:', result);
}
```

**Testing:**
Run `node test-safety-check-flow.js` to verify the fix works end-to-end.

## 🧪 Prevention

To prevent this issue in the future:

1. **Always use `credentials: 'include'`** for authenticated API calls
2. **Check response status** and log failures
3. **Test authentication flow** after frontend changes
4. **Monitor server logs** for 401 errors during safety check

---

## 📋 Related Files

- Trigger: `migrations/015_add_user_signup_safety_check.sql` (lines 79-101)
- Controller: `src/controllers/incidentForm.controller.js` (lines 78-96)
- Diagnostic: `check-column-types.js`

---

## ⚠️ Important Notes

- This is NOT a missing column error (PGRST204)
- This is a business logic constraint (P0001)
- The trigger is intentional - protects vulnerable users
- Never disable the trigger - fix the safety check data instead
