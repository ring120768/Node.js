# Supabase Data Not Saving - Debugging Guide

**Issue:** User reports "we have no fields populated in supabase" after completing Typeform

**Status:** 🔴 **CRITICAL** - Blocking production launch

**Created:** 2025-10-25

---

## 🎯 ACTUAL ROOT CAUSE (2025-10-26)

**Your server logs revealed the real issue!**

### The Problem
```
❌ Database insertion failed:
   Code: PGRST204
   Message: Could not find the 'special_conditions_animals' column of 'incident_reports' in the schema cache
```

### What This Means
- ✅ Webhook IS working correctly (signature verified, data extracted)
- ✅ User Signup form IS saving data successfully
- ❌ Incident Report form FAILING due to **missing database column**

### The Missing Column
Your webhook controller code (`webhook.controller.js` line 889) references:
```javascript
special_conditions_animals: getAnswerByRefWithDefault(answers, 'special_conditions_animals', 'boolean')
```

But this column **doesn't exist** in your `incident_reports` table!

### The Fix (2 minutes)
1. Go to Supabase Dashboard → SQL Editor
2. Run this migration: `migrations/add-missing-special-conditions-columns.sql`
3. Test form submission again
4. ✅ Data will save successfully!

### Why This Happened
The field mapping documentation (`TYPEFORM_SUPABASE_FIELD_MAPPING.md`) was incomplete. The `special_conditions_animals` field existed in the code but was never:
- Documented in the field mapping
- Added to the database schema

This has now been fixed:
- ✅ Migration script created
- ✅ Field mapping documentation updated
- ⏳ Waiting for you to run migration in Supabase

---

## Original Debugging Guide (For Reference)

## Quick Diagnosis: Is Typeform Sending Webhooks?

The most likely cause is that **Typeform isn't sending webhooks to your server at all**.

### Step 1: Check Typeform Webhook Configuration

**Go to Typeform Dashboard:**

1. Login to https://admin.typeform.com
2. Select your form: **"Car Crash Lawyer AI - Incident Report"** (ID: `WvM2ejru`)
3. Click **Connect** → **Webhooks**

**Verify webhook settings:**

✅ **Webhook URL must be:**
```
https://nodejs-1-ring120768.replit.app/api/webhook/typeform
```

❌ **NOT localhost** (Typeform can't reach localhost):
```
http://localhost:5000/webhooks/typeform  ❌ WRONG
```

✅ **Webhook must be ENABLED** (toggle switch is green)

✅ **Events:** Select **"Form is submitted"**

✅ **Secret:** Should match your `.env` file's `TYPEFORM_WEBHOOK_SECRET`

---

## Step 2: Check Webhook Delivery Logs

**In Typeform dashboard (same Webhooks page):**

1. Scroll down to **"Delivery Log"** section
2. Look for recent webhook delivery attempts

### What to Check:

**🟢 SUCCESS (200 OK):**
- ✅ Webhook is reaching your server
- ✅ Problem is in data processing (see Step 4)

**🔴 FAILED (401/403):**
- ❌ Signature verification failed
- Check `TYPEFORM_WEBHOOK_SECRET` in `.env` matches Typeform dashboard

**🔴 FAILED (500):**
- ❌ Server error during processing
- Check server logs (see Step 3)

**🔴 FAILED (Connection refused/Timeout):**
- ❌ Server is down or URL is wrong
- Verify Replit deployment is running
- Check URL in webhook configuration

**📭 NO DELIVERY LOGS:**
- ❌ Webhook not configured or not triggered
- User needs to submit the form AFTER webhook is configured

---

## Step 3: Check Server Logs for Webhook Receipts

The webhook controller has extensive logging. Every webhook should show:

### Expected Log Output (from `webhook.controller.js`):

```
================================================================================
🎯 TYPEFORM WEBHOOK [<requestId>]
================================================================================
📥 Incoming: application/json | <bytes> bytes | Signature: ✅
🕐 Timestamp: 2025-10-25T...

🔍 VALIDATION PHASE
----------------------------------------
✅ Raw body present
✅ Body is valid JSON object
🔐 Signature verification required
🔑 Signature received: sha256=...
✅ Signature verified successfully
✅ Event ID: evt_...
✅ Event Type: form_response
✅ Form response data present

📝 FORM DETAILS
----------------------------------------
📋 Form ID: WvM2ejru
📄 Form Title: Car Crash Lawyer AI - Incident Report
👤 User ID: <uuid>
📧 Email: user@example.com
📊 Answers: 50 fields

⚡ PROCESSING
----------------------------------------
🕐 Validation completed in: 15ms
🚀 Sending 200 OK response (processing continues async)
⏳ Starting async processing...
================================================================================
```

### How to Check:

**On Replit:**
1. Open your Replit console
2. Watch for the `🎯 TYPEFORM WEBHOOK` headers
3. Look for errors or missing logs

**If NO logs appear when you submit the form:**
- ❌ Webhook is NOT reaching your server
- Go back to Step 1 and verify webhook URL

---

## Step 4: Test Webhook Locally (If Server is Receiving)

If Typeform IS sending webhooks but data still not saving, run this test:

### Local Test Script:

```bash
# Make sure server is running locally
npm start

# In another terminal, run the test
node scripts/test-typeform-webhook.js --type incident
```

### What This Tests:

1. **Signature verification** - Is your secret correct?
2. **Data extraction** - Is field mapping working?
3. **Database insertion** - Is Supabase connection working?
4. **Image processing** - Are images being downloaded/uploaded?

### Expected Output:

```
🧪 TYPEFORM WEBHOOK SIMULATOR & TESTER
================================================================================

📋 Test Type: incident
🔐 Signature: Enabled
🌐 Server URL: http://localhost:5000

Environment Configuration
----------------------------------------
TYPEFORM_WEBHOOK_SECRET: ✅ Configured
SUPABASE_URL: ✅ Configured
DATABASE_URL: ✅ Configured

🏥 Checking server health...
✅ Server is running and healthy

Sending Test Webhook
----------------------------------------
🚀 Sending POST request to: http://localhost:5000/api/webhook/typeform
📦 Payload size: 2345 bytes
⏱️  Response time: 234ms
📊 Status: 200 OK

⏳ Waiting 3 seconds for async processing...

Verifying Database Changes
----------------------------------------
📊 Checking incident_reports table...
✅ Incident report found in database!
```

### If Test Fails:

**401/403 Error:**
- Signature verification failed
- Check `TYPEFORM_WEBHOOK_SECRET` matches

**500 Error:**
- Server error during processing
- Check full server logs for stack trace
- Likely database permission or field mapping issue

**No database record found:**
- Webhook processed but data not saved
- Check Supabase connection
- Check RLS policies (should use service role key)

---

## Step 5: Test Typeform → Replit Flow

If local test passes but production doesn't work:

### Test Production Webhook URL:

Use curl to manually trigger webhook (replace with your data):

```bash
curl -X POST https://nodejs-1-ring120768.replit.app/api/webhook/typeform \
  -H "Content-Type: application/json" \
  -H "Typeform-Signature: sha256=<signature>" \
  -d '{
    "event_id": "test_event_123",
    "event_type": "form_response",
    "form_response": {
      "form_id": "WvM2ejru",
      "token": "test_token",
      "submitted_at": "2025-10-25T10:00:00Z",
      "hidden": {
        "user_id": "test_user_123"
      },
      "definition": {
        "title": "Car Crash Lawyer AI - Incident Report",
        "fields": []
      },
      "answers": [
        {
          "type": "text",
          "text": "Test answer",
          "field": {
            "ref": "where_exactly_did_this_happen",
            "type": "short_text"
          }
        }
      ]
    }
  }'
```

### Expected Response:

```json
{
  "success": true,
  "message": "Webhook accepted",
  "event_id": "test_event_123",
  "processing": "async",
  "verification_time_ms": 12
}
```

---

## Step 6: Check Supabase Connection

Verify Supabase credentials and RLS policies:

### Run Supabase Connection Test:

```bash
node scripts/test-supabase-client.js
```

### Check `.env` File:

```bash
# CRITICAL: Webhook processing uses SERVICE ROLE KEY (not anon key)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx  # ✅ MUST be service role (bypasses RLS)
SUPABASE_ANON_KEY=xxx          # Only for client-side auth

# Typeform webhook configuration
TYPEFORM_WEBHOOK_SECRET=xxx     # ✅ MUST match Typeform dashboard
```

### Verify Service Role Key:

**In Supabase Dashboard:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy **service_role** key (NOT anon key)
5. Update `.env` file if incorrect

---

## Step 7: Check Database Schema

Verify incident_reports table has all expected columns:

### Run in Supabase SQL Editor:

```sql
-- Get all column names in incident_reports table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'incident_reports'
ORDER BY ordinal_position;
```

### Expected Columns (sample):

```
create_user_id                       uuid
are_you_safe                         text
medical_chest_pain                   boolean
medical_breathlessness               boolean
when_did_the_accident_happen         date
where_exactly_did_this_happen        text
weather_clear_and_dry                boolean
make_of_car                          text
model_of_car                         text
... (150+ total fields)
```

### If Columns Missing:

- Run database migration to add missing columns
- Check `TYPEFORM_SUPABASE_FIELD_MAPPING.md` for complete schema

---

## Step 8: Debug Boolean Field Handling

**IMPORTANT:** Unchecked checkboxes should save as `false`, NOT be deleted.

### Check Code (webhook.controller.js lines 1029-1048):

```javascript
// ✅ CORRECT: Preserve boolean false and empty strings
Object.keys(incidentData).forEach(key => {
  const value = incidentData[key];

  // Keep boolean false values - they mean "checkbox was shown but unchecked"
  if (value === false) {
    return;  // Don't delete
  }

  // Keep empty strings - they mean "field was shown but not filled"
  if (value === '') {
    return;  // Don't delete
  }

  // Remove only null/undefined (field not in payload or genuinely missing)
  if (value === null || value === undefined) {
    delete incidentData[key];
  }
});
```

### Expected Behavior:

✅ `medical_chest_pain: false` → Saved to database as `false`
✅ `weather_clear_and_dry: true` → Saved to database as `true`
❌ ~~`medical_chest_pain: null` → DELETED~~ (old broken behavior)

---

## Common Root Causes (Ranked by Likelihood)

### 1. 🔴 **Webhook Not Configured in Typeform** (90% of cases)
**Symptoms:**
- No webhook delivery logs in Typeform dashboard
- No logs in server console when submitting form
- User submits form, nothing happens

**Fix:**
- Add webhook URL to Typeform dashboard
- Enable webhook toggle (make it green)
- Test by submitting the form again

---

### 2. 🔴 **Wrong Webhook URL**
**Symptoms:**
- Webhook delivery logs show "Connection refused" or "Timeout"
- No 200 OK responses in delivery logs

**Fix:**
- Change webhook URL from `localhost` to `https://nodejs-1-ring120768.replit.app`
- Verify Replit deployment is running
- Test webhook URL with curl

---

### 3. 🔴 **Signature Verification Failing**
**Symptoms:**
- Webhook delivery logs show 401/403 errors
- Server logs show "Invalid signature"

**Fix:**
- Copy webhook secret from Typeform dashboard
- Update `TYPEFORM_WEBHOOK_SECRET` in `.env`
- Restart server
- Test again

---

### 4. 🟡 **Service Role Key Missing/Wrong**
**Symptoms:**
- Webhook reaches server (200 OK)
- But no data in database
- Server logs show RLS policy errors

**Fix:**
- Use `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
- Service role key bypasses RLS policies
- Verify in `.env` file

---

### 5. 🟡 **Database Schema Missing Columns**
**Symptoms:**
- Webhook processes successfully
- But some fields don't save
- Database errors about unknown columns

**Fix:**
- Run database migration to add missing columns
- Check field mapping in webhook controller

---

### 6. 🟢 **User Submitted Form BEFORE Webhook Was Configured**
**Symptoms:**
- Typeform shows submission in responses
- But no webhook delivery log entry
- No data in database

**Fix:**
- User needs to submit form AGAIN after webhook is configured
- Webhooks are not retroactive - only work for NEW submissions

---

## Next Steps (Priority Order)

### Priority 1: Verify Webhook Configuration
1. [ ] Check Typeform webhook URL is correct
2. [ ] Check webhook is ENABLED (green toggle)
3. [ ] Submit test form
4. [ ] Check Typeform delivery logs for 200 OK response

### Priority 2: Test Locally
1. [ ] Run `node scripts/test-typeform-webhook.js --type incident`
2. [ ] Verify test data appears in Supabase
3. [ ] If test fails, fix local environment first

### Priority 3: Debug Production
1. [ ] Check Replit server logs when submitting form
2. [ ] Look for `🎯 TYPEFORM WEBHOOK` headers
3. [ ] If no logs, webhook isn't reaching server (go back to Priority 1)
4. [ ] If logs show errors, investigate stack traces

### Priority 4: Verify Database
1. [ ] Run `node scripts/test-supabase-client.js`
2. [ ] Verify service role key is correct
3. [ ] Check RLS policies are not blocking inserts

---

## Success Criteria

You'll know it's fixed when:

✅ Typeform delivery logs show **200 OK** responses
✅ Server logs show **`🎯 TYPEFORM WEBHOOK`** headers
✅ Server logs show **`✅ Incident report inserted successfully`**
✅ Database queries show **new records in `incident_reports` table**
✅ User can see their data in the dashboard

---

## Useful Commands

```bash
# Test webhook locally
node scripts/test-typeform-webhook.js --type incident

# Test Supabase connection
node scripts/test-supabase-client.js

# Check server health
curl http://localhost:5000/api/health

# Monitor image processing status
node scripts/monitor-image-processing.js

# View recent server logs (if using nohup)
tail -f nohup.out

# Check environment variables
printenv | grep -E '(TYPEFORM|SUPABASE)'
```

---

## Related Files

- `src/controllers/webhook.controller.js` - Main webhook handler with logging
- `scripts/test-typeform-webhook.js` - Local testing tool
- `TYPEFORM_SUPABASE_FIELD_MAPPING.md` - Complete field mapping reference
- `TYPEFORM_QUESTIONS_REFERENCE.md` - Form structure documentation

---

**Last Updated:** 2025-10-26
**Status:** ✅ ROOT CAUSE IDENTIFIED - Database schema missing special_conditions_animals column
**Solution:** Run migration script: `migrations/add-missing-special-conditions-columns.sql`
