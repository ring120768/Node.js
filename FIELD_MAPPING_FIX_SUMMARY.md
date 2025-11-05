# Field Mapping Fix Summary

**Date:** 2025-10-28
**Branch:** feat/audit-prep
**Commits:** 442c34c, 38be7f9, dae137c

## Problem

Controller (`src/controllers/signup.controller.js`) was using frontend field names instead of actual database column names, causing PGRST204 errors on form submission.

## Root Cause

After user explicitly requested: *"can you check that allfield names are correct before we test over and over again potentially? attached .md for reference"*

Systematic verification against `TYPEFORM_SUPABASE_FIELD_MAPPING.md` revealed **10+ field name mismatches**.

## All Field Mapping Fixes

### Personal Information
| Frontend Field | Controller (OLD) | Database Column (CORRECT) | Fixed |
|----------------|------------------|---------------------------|-------|
| `first_name` | ❌ `first_name` | ✅ `name` | ✅ |
| `last_name` | ❌ `last_name` | ✅ `surname` | ✅ |
| `mobile_number` | ❌ `mobile_number` | ✅ `mobile` | ✅ |

### Address Information
| Frontend Field | Controller (OLD) | Database Column (CORRECT) | Fixed |
|----------------|------------------|---------------------------|-------|
| `address_line_1` | ❌ `address_line_1` | ✅ `street_address` | ✅ |
| `address_line_2` | ❌ `address_line_2` | ✅ `street_address_optional` | ✅ |
| `city` | ❌ `city` | ✅ `town` | ✅ |
| `county` | ❌ `county` | ✅ **DOESN'T EXIST** (removed) | ✅ |
| `country` | ❌ **MISSING** | ✅ `country` (default: "United Kingdom") | ✅ |

### Emergency Contact
| Frontend Fields (5 separate) | Controller (OLD) | Database Column (CORRECT) | Fixed |
|-------------------------------|------------------|---------------------------|-------|
| `emergency_contact_first_name`<br>`emergency_contact_last_name`<br>`emergency_contact_phone`<br>`emergency_contact_email`<br>`emergency_contact_company` | ❌ Tried to insert separately | ✅ `emergency_contact`<br>(pipe-delimited: "FirstName LastName \| Phone \| Email \| Company") | ✅ |

### Insurance Information
| Frontend Field | Controller (OLD) | Database Column (CORRECT) | Fixed |
|----------------|------------------|---------------------------|-------|
| `cover_type` | ❌ `policy_cover` | ✅ `cover_type` | ✅ |

## Code Changes

### src/controllers/signup.controller.js (lines 136-169)

**Before (❌ WRONG):**
```javascript
const userSignupData = {
  create_user_id: userId,
  first_name: formData.first_name,        // ❌ Column doesn't exist
  last_name: formData.last_name,          // ❌ Column doesn't exist
  mobile_number: formData.mobile_number,  // ❌ Column doesn't exist
  address_line_1: formData.address_line_1,// ❌ Column doesn't exist
  address_line_2: formData.address_line_2,// ❌ Column doesn't exist
  city: formData.city,                    // ❌ Column doesn't exist
  county: formData.county,                // ❌ Column doesn't exist
  policy_cover: formData.cover_type,      // ❌ Column doesn't exist
  // emergency_contact fields...          // ❌ Wrong format
};
```

**After (✅ CORRECT):**
```javascript
const userSignupData = {
  create_user_id: userId,
  name: formData.first_name,              // ✅ Maps to 'name'
  surname: formData.last_name,            // ✅ Maps to 'surname'
  email: formData.email.toLowerCase(),
  mobile: formData.mobile_number,         // ✅ Maps to 'mobile'
  date_of_birth: convertDateFormat(formData.date_of_birth),
  street_address: formData.address_line_1,// ✅ Maps to 'street_address'
  street_address_optional: formData.address_line_2 || null, // ✅
  town: formData.city,                    // ✅ Maps to 'town'
  country: formData.country || 'United Kingdom', // ✅ Added with default
  postcode: formData.postcode.toUpperCase(),
  car_registration_number: formData.car_registration_number.toUpperCase(),
  driving_license_number: formData.driving_license_number.toUpperCase(),
  insurance_company: formData.insurance_company,
  policy_number: formData.policy_number.toUpperCase(),
  policy_holder: formData.policy_holder,
  cover_type: formData.cover_type,        // ✅ Correct column name
  recovery_company: formData.recovery_company || null,
  recovery_breakdown_number: formData.recovery_breakdown_number || null,
  recovery_breakdown_email: formData.recovery_breakdown_email ?
    formData.recovery_breakdown_email.toLowerCase() : null,
  // Combine emergency contact into pipe-delimited format ✅
  emergency_contact: [
    `${formData.emergency_contact_first_name} ${formData.emergency_contact_last_name}`,
    formData.emergency_contact_phone,
    formData.emergency_contact_email.toLowerCase(),
    formData.emergency_contact_company || ''
  ].join(' | '),
  gdpr_consent: true,
  images_status: uploadedImages.length === 5 ? 'complete' : 'partial',
  missing_images: missingImages.length > 0 ? missingImages : null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

## Verification

Created `test-field-mappings.js` to validate all field names against database:

```bash
$ node test-field-mappings.js

🧪 Testing Field Mappings
📊 Database: https://kctlcmbjmhcfoobmkfrs.supabase.co

1️⃣  Testing ALL field mappings with database insert...
✅ ALL field mappings are CORRECT!

2️⃣  Verifying inserted data...
   ✅ name: Test
   ✅ surname: User
   ✅ mobile: 07411005390
   ✅ street_address: 123 Test Street
   ✅ street_address_optional: Apt 4B
   ✅ town: London
   ✅ country: United Kingdom
   ✅ cover_type: Fully Comprehensive
   ✅ emergency_contact: John Doe | +447411005390 | john@example.com | Emergency Services Ltd

✅ Data verification PASSED!

3️⃣  Cleaning up test record...
✅ Test record cleaned up

✅ Field Mapping Test PASSED!
🎯 All controller field mappings match database schema

📋 Verified fields:
   • Personal: name, surname, mobile
   • Address: street_address, street_address_optional, town, country
   • Insurance: cover_type
   • Emergency: pipe-delimited format

🚀 Ready for end-to-end form submission test!
```

## Git Commits

**Commit 442c34c:**
```
fix: Fix address field mapping in signup controller

- street_address (not address_line_1)
- street_address_optional (not address_line_2)
- town (not city)
```

**Commit 38be7f9:**
```
fix: Fix ALL form→database field mappings in signup controller

Comprehensive field mapping fixes:
- Personal: first_name→name, last_name→surname, mobile_number→mobile
- Address: address_line_1→street_address, city→town
- Insurance: policy_cover→cover_type
- Emergency: Combined 5 fields into pipe-delimited format
- Added country field with UK default
```

**Commit dae137c:**
```
fix: Remove non-existent county field from user_signup

- Removed county field (doesn't exist in database)
- Created test-field-mappings.js for validation
- All field mappings verified against database
```

## Status

✅ **COMPLETE** - All field mappings fixed and verified

**Next Step:** Test complete signup flow on http://localhost:3000/signup-form.html

**Expected Results:**
1. ✅ Images upload to temp storage (session-based)
2. ✅ Form submission succeeds (no 500 error)
3. ✅ User record created with correct field names
4. ✅ Files move from temp/ to permanent storage
5. ✅ Redirect to dashboard

**Server Status:**
```
✅ Running on http://localhost:3000
✅ All services initialized
✅ Field mappings corrected
✅ Ready for testing
```

## Reference Documents

- **TYPEFORM_SUPABASE_FIELD_MAPPING.md** - Complete field reference (160+ fields)
- **test-field-mappings.js** - Validation script for all mappings
- **src/controllers/signup.controller.js** - Fixed controller

## Lessons Learned

1. **Always verify field names against database schema** - Don't assume frontend field names match database columns
2. **Test each field group systematically** - Personal, address, vehicle, insurance, emergency contact
3. **Use reference documents** - TYPEFORM_SUPABASE_FIELD_MAPPING.md was critical
4. **Create validation scripts** - test-field-mappings.js prevents regressions
5. **User feedback was right** - "check that allfield names are correct before we test over and over again" saved repeated test cycles
