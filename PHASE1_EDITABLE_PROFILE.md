# Phase 1: Editable Profile Implementation

**Status:** ✅ Complete
**Date:** 2026-02-02
**Risk Level:** ⭐ Very Low (Safe fields only)

---

## Overview

Phase 1 implements the ability for users to edit their contact details (address, mobile, emergency contact, recovery email) from the dashboard. These fields are considered **safe** because they:

- Don't affect legal documentation validity
- Can be changed without breaking the incident reporting flow
- Don't require cross-validation with external systems
- Don't need to be locked after incidents are created

---

## What Was Implemented

### 1. Database Migration

**File:** `migrations/20260202_profile_edit_audit.sql`
**Rollback:** `migrations/20260202_profile_edit_audit_rollback.sql`

Created `profile_edit_audit` table for GDPR-compliant audit logging:
- Tracks who changed what and when
- Stores old and new values
- Logs IP address and user agent
- Users can view their own audit logs (RLS enabled)

**Apply migration:**
```bash
psql $SUPABASE_URL -f migrations/20260202_profile_edit_audit.sql
```

---

### 2. Backend API

**File:** `src/controllers/profile.controller.js`

Added two new functions:
1. `getContactDetails()` - GET /api/profile/contact-details
2. `updateContactDetails()` - PATCH /api/profile/contact-details

**Features:**
- Full validation (UK postcode format, phone numbers, email)
- Automatic phone number normalization (+44 format)
- GDPR audit logging for all changes
- Returns validation errors with details

**File:** `src/routes/profile.routes.js`

Added routes:
```javascript
router.get('/contact-details', profileController.getContactDetails);
router.patch('/contact-details', profileController.updateContactDetails);
```

---

### 3. Dashboard UI

**File:** `public/dashboard.html`

Added **Contact Details** card with 4 sections:
1. 🏠 Address (address_line1, address_line2, city, county, postcode)
2. 📱 Mobile Number
3. 🚨 Emergency Contact (name, phone)
4. 📧 Recovery Email

Each section has an "Edit" button that opens a prompt dialog.

**Location:** Inserted after Dashcam Upload card, before Quick Actions

---

### 4. JavaScript Functions

**Functions added:**
- `loadContactDetails()` - Loads and displays contact details (called on page load)
- `editAddress()` - Edit address fields via prompts
- `editMobile()` - Edit mobile number
- `editEmergency()` - Edit emergency contact
- `editRecoveryEmail()` - Edit recovery email

**Event handlers:** Added to event delegation switch (lines 3047-3058)

---

## Editable Fields

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| `address_line1` | String (required) | Max 200 chars | Must not be empty |
| `address_line2` | String (optional) | Max 200 chars | Can be blank |
| `city` | String (required) | Max 100 chars | Must not be empty |
| `county` | String (optional) | Max 100 chars | Can be blank |
| `postcode` | String (required) | UK format | Validated with regex |
| `mobile_number` | String (optional) | UK phone format | Normalized to +44 |
| `emergency_contact_name` | String (optional) | Max 100 chars | - |
| `emergency_contact_phone` | String (optional) | UK phone format | Normalized to +44 |
| `recovery_email` | String (optional) | Email format | Can be blank |

---

## User Flow

1. User logs into dashboard
2. Dashboard loads contact details from `/api/profile/contact-details`
3. User clicks "Edit" button on any section
4. Browser prompts appear for each field (simple UI)
5. User submits changes
6. Backend validates inputs
7. If valid:
   - Updates `user_signup` table
   - Logs change to `profile_edit_audit` table
   - Returns success
8. Frontend reloads contact details and shows success toast

---

## Testing

### 1. Test Database Setup

```bash
# Apply migration
psql $SUPABASE_URL -f migrations/20260202_profile_edit_audit.sql

# Verify table exists
node test-contact-details-api.js user@example.com
```

### 2. Test API Endpoints

**GET contact details:**
```bash
curl -X GET https://carcrashlawyerai.co.uk/api/profile/contact-details \
  -H "Cookie: your-session-cookie"
```

**PATCH contact details:**
```bash
curl -X PATCH https://carcrashlawyerai.co.uk/api/profile/contact-details \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "address_line1": "123 Updated Street",
    "city": "London",
    "postcode": "SW1A 1AA",
    "mobile_number": "+447700900123"
  }'
```

### 3. Test Dashboard UI

1. Open `/dashboard.html`
2. Scroll to "Contact Details" card
3. Click "Edit" on Address section
4. Enter new values:
   - Address Line 1: 123 Test Street
   - City: London
   - Postcode: SW1A 1AA
5. Verify success toast appears
6. Refresh page and confirm changes persisted
7. Check `profile_edit_audit` table for audit logs

---

## Validation Examples

### ✅ Valid Inputs

**Address:**
```javascript
{
  "address_line1": "10 Downing Street",
  "address_line2": "Westminster",
  "city": "London",
  "county": "Greater London",
  "postcode": "SW1A 2AA"
}
```

**Phone numbers (all normalized to +44):**
- `07700 900123` → `+447700900123`
- `+447700900123` → `+447700900123`
- `447700900123` → `+447700900123`

### ❌ Invalid Inputs

**Address:**
```javascript
{
  "address_line1": "",  // Error: Cannot be empty
  "postcode": "12345"   // Error: Invalid UK postcode format
}
```

**Phone:**
```javascript
{
  "mobile_number": "123"  // Error: Invalid UK mobile number format
}
```

**Email:**
```javascript
{
  "recovery_email": "not-an-email"  // Error: Invalid recovery email format
}
```

---

## GDPR Compliance

### Audit Logging

Every field change is logged in `profile_edit_audit` table:
```sql
SELECT * FROM profile_edit_audit
WHERE user_id = 'xxx'
ORDER BY changed_at DESC;
```

**Audit record example:**
```json
{
  "id": "uuid",
  "user_id": "xxx",
  "field_name": "mobile_number",
  "old_value": "+447700900001",
  "new_value": "+447700900123",
  "changed_at": "2026-02-02T12:00:00Z",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

### RLS Policy

Users can only view their own audit logs:
```sql
CREATE POLICY profile_audit_select_own
    ON profile_edit_audit
    FOR SELECT
    USING (user_id = CAST(auth.uid() AS TEXT));
```

---

## What's NOT Included (Future Phases)

Phase 1 deliberately excludes:
- **Vehicle details** (car registration, make, model) - Phase 2
- **Insurance details** (policy number, company) - Phase 3
- **Personal info** (name, email, DOB) - Phase 3
- **Driving license** (number, dates) - Phase 3
- **Field locking** (not needed for Phase 1 fields)

These will be added in future phases with appropriate locking logic and validation.

---

## Security Notes

1. **Authentication Required:** All endpoints require `requireAuth` middleware
2. **Ownership Verification:** Users can only edit their own profile
3. **Input Validation:** All fields validated before database update
4. **XSS Prevention:** Uses safe DOM methods (createElement, textContent)
5. **Audit Logging:** All changes tracked for GDPR compliance
6. **RLS Enabled:** Database-level access control

---

## Rollback

If issues occur, rollback the migration:
```bash
psql $SUPABASE_URL -f migrations/20260202_profile_edit_audit_rollback.sql
```

This will:
- Drop `profile_edit_audit` table
- Remove RLS policies
- Remove indexes

The API endpoints and UI can be left in place (they'll gracefully handle missing table).

---

## Next Steps

### For User Testing:
1. ✅ Apply migration
2. ✅ Test dashboard UI editing
3. ✅ Verify audit logs in database
4. ✅ Confirm validation works (try invalid postcode)

### For Production Deployment:
1. Run migration on production database
2. Deploy updated code to Railway
3. Test with real user account
4. Monitor error logs for validation issues

### Future Phases:
- **Phase 2:** Vehicle details (with smart locking)
- **Phase 3:** Insurance + personal info (with stronger validation)
- **Phase 4:** Driving license (with DVLA integration)
- **Phase 5:** Advanced features (bulk edits, change history UI)

---

## Summary

✅ **What was added:**
- GDPR-compliant audit logging table
- Backend API for contact details (GET + PATCH)
- Dashboard UI with 4 editable sections
- Full validation and error handling
- Automatic phone number normalization

✅ **Risk level:** Very low (safe fields only)
✅ **Testing:** `test-contact-details-api.js` script provided
✅ **Rollback:** Migration rollback script provided

**Ready for testing!** 🚀
