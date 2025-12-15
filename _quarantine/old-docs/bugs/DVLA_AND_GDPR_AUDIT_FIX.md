# DVLA and GDPR Audit Fix Summary

**Date:** 2025-10-28
**Branch:** feat/audit-prep
**Commit:** 8e309a0

## Issues Identified

### 1. Missing DVLA Fields in user_signup Table ❌

**Problem:** CSV export showed empty `vehicle_make`, `vehicle_model`, `vehicle_colour` fields.

**Root Cause:**
- Frontend captures DVLA data (`dvla_make`, `dvla_model`, `dvla_colour`) via DVLA lookup
- Signup controller saved DVLA data to `dvla_vehicle_info_new` table
- **Did NOT populate** vehicle fields in `user_signup` table itself
- Result: `user_signup` export missing vehicle details

### 2. Empty GDPR Audit Logs ❌

**Problem:** No audit trail for user signups.

**Root Cause:**
- GDPR service exists and is initialized
- Signup controller **never called** `gdprService.logActivity()`
- Result: No audit logs created in storage

### 3. incident_reports Controller ✅

**Status:** **Already correct** - Verified in FIELD_MAPPING_VERIFICATION.md

- Uses Typeform field refs directly as database columns
- All 130+ fields map correctly
- No changes needed

## Fixes Applied

### 1. Add DVLA Fields to user_signup Record

**File:** `src/controllers/signup.controller.js` (lines 164-167)

```javascript
const userSignupData = {
  // ... existing fields ...

  // DVLA vehicle info (populated from DVLA lookup on Page 5)
  vehicle_make: formData.dvla_make || null,
  vehicle_model: formData.dvla_model || null,
  vehicle_colour: formData.dvla_colour || null,

  gdpr_consent: true,
  // ... rest of fields ...
};
```

**Data Flow:**
1. User enters car registration on Page 5
2. Frontend calls `/api/other-vehicles/dvla-lookup`
3. API returns vehicle details
4. Frontend stores in `formData.dvla_make`, `formData.dvla_model`, `formData.dvla_colour`
5. **NEW:** Signup controller now copies these to `vehicle_make`, `vehicle_model`, `vehicle_colour` in user_signup table

### 2. Create GDPR Audit Log on Signup

**File:** `src/controllers/signup.controller.js` (lines 189-207)

```javascript
// ===== 1.5. Create GDPR audit log for account creation =====
try {
  await gdprService.logActivity(
    userId,
    'ACCOUNT_CREATED',
    {
      method: 'custom_signup_form',
      email: formData.email,
      hasImages: uploadedImages.length > 0,
      imagesComplete: uploadedImages.length === 5,
      dvlaVerified: formData.dvla_verified === 'true'
    },
    req
  );
  logger.info('✅ GDPR audit log created for signup');
} catch (gdprError) {
  // Non-fatal - don't block signup if audit log fails
  logger.warn('⚠️ Failed to create GDPR audit log (non-fatal):', gdprError.message);
}
```

**Audit Log Storage:**
- Stored in Supabase Storage: `gdpr-audit-logs` bucket
- Path: `{userId}/gdpr-audit/{timestamp}_ACCOUNT_CREATED.json`
- Includes: timestamp, IP address, user agent, request details

**Non-Fatal Error Handling:**
- If audit log creation fails, signup continues
- Warning logged but doesn't block user registration
- Ensures user experience isn't impacted by audit system issues

## Architectural Consistency

### Typeform Webhook vs Custom Signup Form

**Typeform Webhook (incident_reports):**
```javascript
// webhook.controller.js - Already populates vehicle fields
const userData = {
  vehicle_make: getAnswerByRef(answers, 'vehicle_make'),
  vehicle_model: getAnswerByRef(answers, 'vehicle_model'),
  vehicle_colour: getAnswerByRef(answers, 'vehicle_colour'),
  // ... other fields
};
```

**Custom Signup Form (user_signup):**
```javascript
// signup.controller.js - NOW ALSO populates vehicle fields
const userSignupData = {
  vehicle_make: formData.dvla_make || null,
  vehicle_model: formData.dvla_model || null,
  vehicle_colour: formData.dvla_colour || null,
  // ... other fields
};
```

**Result:** Both signup methods now populate the same fields consistently.

## Database Schema

### user_signup Table - Vehicle Fields

| Column | Type | Source | Example |
|--------|------|--------|---------|
| `vehicle_make` | TEXT | DVLA lookup | "BMW" |
| `vehicle_model` | TEXT | DVLA lookup | "3 Series" |
| `vehicle_colour` | TEXT | DVLA lookup | "Blue" |

These columns **already existed** in the database but weren't being populated by custom signup form.

### dvla_vehicle_info_new Table

**Still Created:** DVLA data continues to be saved to dedicated table.

**Purpose:** Store full DVLA response with additional fields:
- `year_of_manufacture`
- `fuel_type`
- `engine_size`
- `verification_date`
- `verified` (boolean)

**Result:** DVLA data saved in TWO places:
1. `user_signup` table (make, model, colour only)
2. `dvla_vehicle_info_new` table (full DVLA response)

## GDPR Audit Log Format

### Example Audit Log JSON

```json
{
  "userId": "ef55fe35-5350-471c-974b-d37ce8fa901e",
  "activityType": "ACCOUNT_CREATED",
  "timestamp": "2025-10-28T03:20:57.261Z",
  "details": {
    "method": "custom_signup_form",
    "email": "user@example.com",
    "hasImages": true,
    "imagesComplete": false,
    "dvlaVerified": true
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "path": "/api/signup/submit",
  "requestId": "req-123456"
}
```

### Storage Location

**Bucket:** `gdpr-audit-logs`
**Path:** `{userId}/gdpr-audit/{timestamp}_ACCOUNT_CREATED.json`
**Example:** `ef55fe35-5350-471c-974b-d37ce8fa901e/gdpr-audit/1730084457261_ACCOUNT_CREATED.json`

## Testing

### Verification Steps

1. **Start Server:**
   ```bash
   npm start
   # ✅ Server starts without errors
   ```

2. **Complete Signup Flow:**
   - Navigate to http://localhost:3000/signup-form.html
   - Fill all 9 pages including DVLA lookup
   - Submit form

3. **Check Database:**
   ```sql
   -- user_signup table should have vehicle fields populated
   SELECT vehicle_make, vehicle_model, vehicle_colour
   FROM user_signup
   WHERE create_user_id = 'your-user-id';
   ```

4. **Check GDPR Audit Log:**
   - Supabase Storage → gdpr-audit-logs bucket
   - Navigate to `{userId}/gdpr-audit/`
   - Should see `{timestamp}_ACCOUNT_CREATED.json`

### Expected Results

**Before Fix:**
```csv
vehicle_make,vehicle_model,vehicle_colour
,,
```

**After Fix:**
```csv
vehicle_make,vehicle_model,vehicle_colour
BMW,3 Series,Blue
```

**GDPR Audit Logs:**
- Before: Empty folder
- After: JSON files for each signup

## Related Documentation

- **Field Mappings:** `FIELD_MAPPING_VERIFICATION.md`
- **Field Fixes:** `FIELD_MAPPING_FIX_SUMMARY.md`
- **Typeform Reference:** `/Users/ianring/Downloads/TYPEFORM_SUPABASE_FIELD_MAPPING.md`
- **GDPR Service:** `src/services/gdprService.js`

## Git History

**Commits:**
- `8e309a0` - Add DVLA fields and GDPR audit logging to signup
- `451740d` - Previous: Fix ALL form→database field mappings
- `38be7f9` - Fix address, emergency contact, insurance fields
- `442c34c` - Fix address field mapping

**Branch:** feat/audit-prep
**Status:** ✅ Ready for testing

## Next Steps

1. **Test Complete Signup Flow** - Verify fields populate correctly
2. **Verify Audit Logs** - Check storage bucket has logs
3. **Export CSV** - Confirm vehicle fields show in export
4. **Deploy to Production** - Merge to main when tested

## Summary

✅ **DVLA fields fixed** - vehicle_make, vehicle_model, vehicle_colour now populate in user_signup
✅ **GDPR audit logs fixed** - Activity tracking now enabled for all signups
✅ **Architectural consistency** - Both Typeform and custom form populate same fields
✅ **Non-breaking changes** - Graceful error handling, non-fatal audit failures
✅ **Committed and pushed** - Changes on GitHub (feat/audit-prep branch)

**Status:** Ready for end-to-end testing on http://localhost:3000/signup-form.html
