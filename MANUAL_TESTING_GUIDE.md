# Manual Testing Guide: End-to-End Signup Flow
## Stress Test & Verification

**Date:** October 15, 2025
**Purpose:** Verify webhook fix works correctly and all 33 fields populate in user_signup table
**Estimated Time:** 15-20 minutes

---

## ⚠️ PRE-TEST CHECKLIST

### 1. Verify Replit Has Latest Code

**Go to Replit:**
- Open: https://replit.com/@ring120768/workspace
- Click "Shell" tab
- Run:
  ```bash
  git pull origin feat/audit-prep
  git log --oneline -3
  ```

**Expected output should show:**
```
05f48cf docs: add webhook diagnostic and setup documentation
3641ea0 fix(webhook): correct Typeform signup form ID from b83aFxE0 to b03aFxEO
ec6848b Assistant checkpoint: Fix API endpoint mismatches in landing page
```

**If you see the fix commit (3641ea0), you're ready! ✅**

### 2. Restart Replit Server

**Option A: Use Run Button**
- Click "Stop" button (if running)
- Click "Run" button

**Option B: Manual Restart**
- In Shell tab:
  ```bash
  pkill node
  npm start
  ```

**Verify server started:**
- Look for: `🚀 Starting Car Crash Lawyer AI Server...`
- Should see: `✅ Server running on port 5000`

### 3. Open Monitoring Tools

**Open these in separate tabs for live monitoring:**

1. **Replit Logs** (Shell tab) - Watch for webhook processing
2. **Supabase Dashboard:**
   - https://supabase.com/dashboard/project/YOUR_PROJECT
   - Navigate to: Table Editor → `user_signup`
   - Keep this tab open to watch for new records

3. **Browser DevTools:**
   - Right-click → Inspect → Console tab
   - Watch for any JavaScript errors

---

## 🧪 MANUAL TEST STEPS

### Step 1: Access Signup Page

**URL:** `https://workspace.ring120768.replit.app/signup-auth.html`

**Visual Checks:**
- ✅ Page loads without errors
- ✅ Car Crash Lawyer AI logo displays
- ✅ Form fields are visible:
  - Email Address
  - Password (with strength meter)
  - Full Name
  - GDPR consent checkbox

**Browser Console:**
- ✅ No red errors
- ✅ Should see: `🚗 Car Crash Lawyer AI - Signup Page (Auth-Only Architecture)`

---

### Step 2: Fill Out Signup Form

**Use REAL test data that you can track:**

```
Email: test-[YOUR-INITIALS]-[TIMESTAMP]@example.com
Example: test-ir-1015@example.com

Password: TestPass123!
(Password strength bar should turn green)

Full Name: Test User [YOUR-INITIALS]
Example: Test User IR

GDPR Consent: ✅ CHECK THE BOX
```

**Visual Checks:**
- ✅ Password strength bar shows "strong" (green)
- ✅ No validation errors appear
- ✅ "Create Account" button is enabled

---

### Step 3: Submit Signup Form

**Click "Create Account" button**

**Expected Behavior (in order):**

1. **Loading State:**
   - ✅ Button shows spinner
   - ✅ Button text changes to loading state
   - ✅ Button disabled during submission

2. **Success Message:**
   - ✅ Green alert appears: "Account created successfully! Redirecting to onboarding..."
   - ✅ Message shows for ~1.5 seconds

3. **Redirect Begins:**
   - ✅ Page redirects to Typeform
   - ✅ URL should be: `https://form.typeform.com/to/b03aFxEO?auth_user_id=...`

**Check Replit Logs:**
Look for lines like:
```
🔐 Signup request received for: test-ir-1015@example.com
✅ User created successfully with ID: [uuid]
📧 User email: test-ir-1015@example.com
🎫 Nonce generated for Typeform redirect
```

**Check Supabase Auth:**
- Go to: Authentication → Users
- ✅ New user should appear with your test email
- ✅ Copy the UUID - you'll need it to verify later

---

### Step 4: Typeform Submission (The Critical Part!)

**You should now be on Typeform:** `https://form.typeform.com/to/b03aFxEO`

**URL Parameters Check:**
Look at the URL - should contain:
```
?auth_user_id=[YOUR-UUID]
&email=test-ir-1015@example.com
&product_id=car_crash_lawyer_ai
&auth_code=[NONCE]
```

**Fill Out ALL 33 Fields** (or at minimum, these key fields):

#### Personal Information (Required):
1. **First Name:** John
2. **Surname:** TestUser
3. **Email:** (should be pre-filled)
4. **Mobile:** +447700900123
5. **Country:** United Kingdom
6. **GDPR Consent:** ✅ Yes

#### Address Information:
7. **Street Address:** 123 Test Street
8. **Street Address (Optional):** Apartment 4B
9. **Town:** London
10. **Postcode:** SW1A 1AA

#### Vehicle Information:
11. **Car Registration Number:** AB12 CDE
12. **Vehicle Make:** Toyota
13. **Vehicle Model:** Corolla
14. **Vehicle Colour:** Silver
15. **Vehicle Condition:** Good
16. **Driving License Number:** TEST123456789
17. **Driving License Picture:** [Upload any image or skip]

#### Vehicle Pictures (Optional):
18-21. **Vehicle Photos:** [Can skip for test]

#### Insurance Information:
22. **Insurance Company:** Test Insurance Co
23. **Policy Number:** POL123456
24. **Policy Holder:** John TestUser
25. **Cover Type:** Comprehensive

#### Recovery/Breakdown Information:
26. **Recovery Company:** AA Roadside
27. **Recovery/Breakdown Number:** 0800123456
28. **Recovery/Breakdown Email:** recovery@test.com

#### Emergency Contact:
29. **Emergency Contact:** Jane Doe - 07700900999

**⏱️ Time Check:**
- Filling out form should take 5-10 minutes
- Don't rush - this tests the form UX

**Submit Typeform:**
- ✅ Click final "Submit" button
- ✅ Typeform shows completion screen

---

### Step 5: Monitor Webhook Processing (CRITICAL!)

**Switch to Replit Logs immediately after submission**

**Expected Log Sequence (in order):**

```
===========================================
🎯 TYPEFORM WEBHOOK [abc12345]
===========================================
📥 Incoming: application/json | ~2500 bytes | Signature: ✅
🕐 Timestamp: 2025-10-15T...

🔍 VALIDATION PHASE
-----------------------------------------
✅ Raw body present
✅ Body is valid JSON object
🔐 Signature verification required
🔑 Signature received: sha256=...
✅ Signature verified successfully
✅ Event ID: [event-id]
✅ Event Type: form_response
✅ Form response data present

📝 FORM DETAILS
-----------------------------------------
📋 Form ID: b03aFxEO          ← CRITICAL: Must be correct!
📄 Form Title: Car Crash Lawyer AI sign up
👤 User ID: [your-uuid]
📧 Email: test-ir-1015@example.com
📊 Answers: 33 fields

⚡ PROCESSING
-----------------------------------------
🕐 Validation completed in: ~50ms
🚀 Sending 200 OK response (processing continues async)
⏳ Starting async processing...
===========================================

⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡
🔄 ASYNC PROCESSING [abc12345]
⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡
📝 Processing: Car Crash Lawyer AI sign up
🆔 Event ID: [event-id]
📋 Form ID: b03aFxEO

🚀 Processing USER SIGNUP...    ← CRITICAL: Should NOT say "UNKNOWN FORM"!
👤 User: [your-uuid]
📧 Email: test-ir-1015@example.com
🏷️  Product: car_crash_lawyer_ai

📊 Data mapping completed:
   👤 Name: John TestUser
   📱 Mobile: +447700900123
   🏠 Address: 123 Test Street
   🚗 Vehicle: Toyota Corolla
   🆔 License: TEST123456789
   📋 Fields: 29 total

💾 Inserting into Supabase user_signup table...
✅ User record inserted successfully
   🆔 Database ID: [new-uuid]
   📅 Created: 2025-10-15T...

🔄 Updating account status...
   Setting status to: active
   ✅ Account status updated to: active

📁 Storing audit trail...
   Event: [event-id]
   User: [your-uuid]
   ✅ Audit log stored successfully

🎉 ASYNC PROCESSING COMPLETE
-----------------------------------------
⏱️  Total time: ~500ms
📊 Result: success
🗃️  Table: user_signup
👤 User: [your-uuid]
⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡
```

**🚨 RED FLAGS (What Should NOT Appear):**

❌ `⚠️ UNKNOWN FORM - Skipping processing`
❌ `Form ID: b83aFxE0` (wrong ID!)
❌ `❌ Database insertion failed`
❌ `❌ ASYNC PROCESSING ERROR`

**If you see any red flags, STOP and report the exact error message.**

---

### Step 6: Verify Database Population

**Go to Supabase Dashboard:**
- Table Editor → `user_signup`
- Sort by `created_at` (newest first)
- Find your test record

**Verification Checklist (All 33 Fields):**

#### ✅ Core Fields:
- [ ] `id` - UUID (auto-generated)
- [ ] `created_at` - Timestamp (auto-generated)
- [ ] `create_user_id` - Matches your Auth UUID
- [ ] `email` - test-ir-1015@example.com

#### ✅ Personal Info:
- [ ] `name` - John
- [ ] `surname` - TestUser
- [ ] `mobile` - +447700900123
- [ ] `country` - United Kingdom
- [ ] `gdpr_consent` - true

#### ✅ Address:
- [ ] `street_address` - 123 Test Street
- [ ] `street_address_optional` - Apartment 4B
- [ ] `town` - London
- [ ] `postcode` - SW1A 1AA

#### ✅ Vehicle:
- [ ] `car_registration_number` - AB12 CDE
- [ ] `vehicle_make` - Toyota
- [ ] `vehicle_model` - Corolla
- [ ] `vehicle_colour` - Silver
- [ ] `vehicle_condition` - Good
- [ ] `driving_license_number` - TEST123456789
- [ ] `driving_license_picture` - (URL if uploaded)

#### ✅ Vehicle Pictures:
- [ ] `vehicle_picture_front` - (URL if uploaded)
- [ ] `vehicle_picture_driver_side` - (URL if uploaded)
- [ ] `vehicle_picture_passenger_side` - (URL if uploaded)
- [ ] `vehicle_picture_back` - (URL if uploaded)

#### ✅ Insurance:
- [ ] `insurance_company` - Test Insurance Co
- [ ] `policy_number` - POL123456
- [ ] `policy_holder` - John TestUser
- [ ] `cover_type` - Comprehensive

#### ✅ Recovery:
- [ ] `recovery_company` - AA Roadside
- [ ] `recovery_breakdown_number` - 0800123456
- [ ] `recovery_breakdown_email` - recovery@test.com

#### ✅ Emergency:
- [ ] `emergency_contact` - Jane Doe - 07700900999

#### ✅ Metadata:
- [ ] `time_stamp` - Typeform submission time
- [ ] `account_status` - "active" (if set)

**Count populated fields:** Should have at least 25-30 fields with data (depending on optional fields skipped)

---

### Step 7: Verify Audit Trail

**Go to Supabase:**
- Table Editor → `audit_logs`
- Filter by `user_id` = your UUID
- Sort by `created_at` (newest first)

**Expected Record:**
- ✅ `event_type` - "typeform_webhook"
- ✅ `event_id` - Matches webhook event ID
- ✅ `user_id` - Your UUID
- ✅ `action` - "form_response"
- ✅ `details` - Contains form_id, form_title, submitted_at
- ✅ `metadata` - Complete Typeform payload (all answers)

---

### Step 8: Check Payment Success Page (Optional)

**Note:** This page isn't automatically shown yet, but you can access it manually:

**URL:** `https://workspace.ring120768.replit.app/payment-success.html`

**Visual Checks:**
- ✅ Page loads
- ✅ Welcome message displays
- ✅ User info section shows placeholder data
- ✅ Member checklist visible
- ✅ Emergency buttons work

**Future Enhancement:**
After Typeform submission, redirect to this page with user data populated.

---

## 📊 SUCCESS CRITERIA

### ✅ Test PASSES if:

1. **Signup Flow:**
   - [ ] signup-auth.html form submits successfully
   - [ ] Auth user created in Supabase
   - [ ] GDPR consent recorded
   - [ ] Redirect to Typeform works
   - [ ] Hidden fields passed correctly

2. **Typeform Submission:**
   - [ ] All fields accept input
   - [ ] Form submits successfully
   - [ ] Typeform shows completion screen

3. **Webhook Processing:**
   - [ ] Webhook received by server
   - [ ] Signature verified (if secret configured)
   - [ ] Form ID matches: `b03aFxEO` ✅
   - [ ] Routes to USER SIGNUP (NOT "UNKNOWN FORM")
   - [ ] All 33 fields extracted from answers
   - [ ] Database insert succeeds
   - [ ] Audit log created

4. **Database Verification:**
   - [ ] New record in `user_signup` table
   - [ ] `create_user_id` matches Auth UUID
   - [ ] At least 25+ fields populated
   - [ ] No NULL values for required fields
   - [ ] Timestamps correct

5. **No Errors:**
   - [ ] No JavaScript errors in browser console
   - [ ] No server errors in Replit logs
   - [ ] No database errors

---

## ❌ TEST FAILS if:

**Critical Failures:**

1. **Webhook goes to "UNKNOWN FORM"** - Form ID still wrong!
   - Check: `src/controllers/webhook.controller.js` line 354
   - Should be: `formId === 'b03aFxEO'`
   - NOT: `formId === 'b83aFxE0'`

2. **user_signup table empty** - Webhook not processing
   - Check Replit logs for errors
   - Check Supabase table permissions
   - Verify SUPABASE_SERVICE_ROLE_KEY is set

3. **Database insert fails** - Schema mismatch
   - Check error message in logs
   - Verify `user_signup` table schema matches
   - Check column types and constraints

**Non-Critical Issues:**

- Some optional fields NULL - Expected if not filled in Typeform
- Slight delay in processing - Acceptable if under 2 seconds
- Missing audit log - Non-critical, but should investigate

---

## 🐛 TROUBLESHOOTING

### Issue 1: "UNKNOWN FORM" Still Appearing

**Diagnosis:**
```bash
# In Replit Shell:
grep -n "b03aFxEO\|b83aFxE0" src/controllers/webhook.controller.js
```

**Expected:** Line 354 should show `b03aFxEO`
**If shows:** `b83aFxE0` - Git pull didn't work, manually update file

**Fix:**
```bash
git fetch origin
git reset --hard origin/feat/audit-prep
pkill node && npm start
```

---

### Issue 2: Webhook Not Received

**Check Typeform webhook configuration:**
1. Go to: https://admin.typeform.com
2. Open form: b03aFxEO
3. Navigate: Connect → Webhooks
4. Verify URL: `https://workspace.ring120768.replit.app/webhooks/typeform`
5. Check: "Send webhook" toggle is ON
6. Test: Click "Send test payload"

---

### Issue 3: Database Insert Fails

**Check Replit logs for error code:**

- **Error: "column does not exist"**
  - Schema mismatch - check Supabase table columns

- **Error: "permission denied"**
  - Check SUPABASE_SERVICE_ROLE_KEY in Replit Secrets

- **Error: "duplicate key"**
  - User already exists - use different email

---

### Issue 4: No Signature Secret

**If logs show:** `⚠️ Signature verification skipped (no secret configured)`

**Fix:**
1. Go to Typeform webhook settings
2. Copy the "Secret" value
3. In Replit: Tools → Secrets
4. Add: `TYPEFORM_WEBHOOK_SECRET` = [secret]
5. Restart server

---

## 📸 SCREENSHOTS TO CAPTURE

For documentation/debugging, take screenshots of:

1. **signup-auth.html** - Completed form before submission
2. **Typeform** - URL bar showing hidden parameters
3. **Typeform** - Completion screen
4. **Replit Logs** - Full webhook processing output
5. **Supabase** - user_signup table with new record
6. **Supabase** - Auth users showing new user

---

## 📝 TEST RESULTS TEMPLATE

```
=== MANUAL TEST RESULTS ===
Date: October 15, 2025
Tester: [Your Name]
Test Duration: [X] minutes

STEP 1: Signup Page ✅/❌
- Form loaded: ✅
- No errors: ✅

STEP 2: Form Submission ✅/❌
- Account created: ✅
- Redirect to Typeform: ✅
- Hidden params present: ✅

STEP 3: Typeform Submission ✅/❌
- Form filled: ✅
- Submitted successfully: ✅

STEP 4: Webhook Processing ✅/❌
- Webhook received: ✅
- Form ID correct (b03aFxEO): ✅
- Routed to USER SIGNUP: ✅
- No "UNKNOWN FORM": ✅

STEP 5: Database Population ✅/❌
- Record created: ✅
- Fields populated: 28/33
- create_user_id matches: ✅

STEP 6: Audit Log ✅/❌
- Audit record created: ✅
- Event ID matches: ✅

OVERALL RESULT: ✅ PASS / ❌ FAIL

NOTES:
[Any observations, issues, or anomalies]

TEST USER:
Email: test-ir-1015@example.com
UUID: [your-uuid]
Database ID: [record-id]
```

---

## 🎯 NEXT STEPS AFTER SUCCESSFUL TEST

1. **Clean Up Test Data:**
   ```sql
   -- In Supabase SQL Editor:
   DELETE FROM user_signup WHERE email LIKE 'test-%@example.com';
   DELETE FROM audit_logs WHERE user_id = '[test-uuid]';
   ```

2. **Document Results:**
   - Save test results template
   - Share with team if needed

3. **Production Verification:**
   - Test with real user data
   - Monitor first few real signups
   - Check logs for any issues

4. **Future Enhancements:**
   - Implement payment-success.html redirect after Typeform
   - Add email confirmation to new users
   - Set up monitoring/alerts for failed webhooks

---

**Good luck with your test! 🚀**

**Remember:** Take your time, monitor logs closely, and document everything!
