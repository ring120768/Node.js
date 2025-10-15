# Typeform to Supabase Webhook Setup Guide

## ✅ Issues Fixed

### 1. Form ID Mismatch - RESOLVED
**Problem:** Webhook controller was checking for wrong form ID
**Fixed:**
- **Before:** `b83aFxE0` (incorrect)
- **After:** `b03aFxEO` (correct)

**Files Updated:**
- `src/controllers/webhook.controller.js` line 354
- `scripts/test-typeform-webhook.js` lines 19, 30

### 2. Field Mappings - Verified
All 33 field mappings are correctly configured in `processUserSignup()` function

---

## 🎯 Current Status

### ✅ What's Working
- [x] Form ID correctly set to `b03aFxEO`
- [x] Webhook endpoint configured (`/webhooks/typeform`)
- [x] Signature verification implemented (BASE64 encoding)
- [x] 33 user signup fields mapped
- [x] Async processing with immediate 200 response
- [x] Comprehensive logging
- [x] Error handling

### ⚠️ What Needs Configuration
- [ ] Supabase credentials in `.env`
- [ ] Typeform webhook secret in `.env`
- [ ] Test with actual Typeform submission

---

## 📝 Field Mappings (All 33 Fields)

### Personal Information (6 fields)
1. `name` → `create_user_id.name`
2. `surname` → `surname`
3. `email` → `email`
4. `mobile` → `mobile`
5. `country` → `country`
6. `gdpr_consent` → `gdpr_consent`

### Address Information (4 fields)
7. `street_address` → `street_address`
8. `street_address_optional` → `street_address_optional`
9. `town` → `town`
10. `postcode` → `postcode`

### Vehicle Information (7 fields)
11. `car_registration_number` → `car_registration_number`
12. `vehicle_make` → `vehicle_make`
13. `vehicle_model` → `vehicle_model`
14. `vehicle_colour` → `vehicle_colour`
15. `vehicle_condition` → `vehicle_condition`
16. `driving_license_number` → `driving_license_number`
17. `driving_license_picture` → `driving_license_picture` (file URL)

### Vehicle Pictures (4 fields)
18. `vehicle_picture_front` → `vehicle_picture_front` (file URL)
19. `vehicle_picture_driver_side` → `vehicle_picture_driver_side` (file URL)
20. `vehicle_picture_passenger_side` → `vehicle_picture_passenger_side` (file URL)
21. `vehicle_picture_back` → `vehicle_picture_back` (file URL)

### Insurance Information (4 fields)
22. `insurance_company` → `insurance_company`
23. `policy_number` → `policy_number`
24. `policy_holder` → `policy_holder`
25. `cover_type` → `cover_type`

### Recovery/Breakdown Information (3 fields)
26. `recovery_company` → `recovery_company`
27. `recovery_breakdown_number` → `recovery_breakdown_number` ✅ **FIXED** (was recovery_breakdown_number_1)
28. `recovery_breakdown_email` → `recovery_breakdown_email`

### Emergency Contact (1 field)
29. `emergency_contact` → `emergency_contact`

### Metadata (4 fields)
30. `create_user_id` → from `hidden.auth_user_id` or `token`
31. `email` → from `hidden.email`
32. `product_id` → from `hidden.product_id`
33. `time_stamp` → from `submitted_at`

---

## 🔧 Environment Configuration

### Required Variables in `.env`

```bash
# Supabase Configuration (REQUIRED)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# Typeform Webhook Secret (RECOMMENDED)
TYPEFORM_WEBHOOK_SECRET=your-typeform-webhook-secret-here

# Server Port (OPTIONAL)
PORT=5000

# Node Environment
NODE_ENV=development
```

### Where to Find These Values

#### Supabase Credentials
1. Go to [supabase.com](https://supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`
   - **anon public key** → `SUPABASE_ANON_KEY`

#### Typeform Webhook Secret
1. Go to [typeform.com](https://www.typeform.com)
2. Open your form (`b03aFxEO`)
3. Go to **Connect** → **Webhooks**
4. Click on your webhook
5. Find the **Secret** → `TYPEFORM_WEBHOOK_SECRET`

---

## 🚀 Testing the Webhook

### Option 1: Test with Script (Local Testing)

```bash
# 1. Set up environment
cp .env.example .env
# Edit .env and add your Supabase credentials

# 2. Start server
npm start

# 3. In another terminal, run test
node scripts/test-typeform-webhook.js
```

### Option 2: Test with Actual Typeform Submission

1. **Configure Typeform Webhook:**
   - Go to form settings
   - Navigate to **Connect** → **Webhooks**
   - Add webhook URL: `https://your-domain.com/webhooks/typeform`
   - Set secret (copy to `.env` as `TYPEFORM_WEBHOOK_SECRET`)

2. **Submit Test Form:**
   - Fill out your signup form completely
   - Submit

3. **Verify in Logs:**
   ```bash
   # Watch logs for webhook processing
   tail -f logs/app.log
   ```

4. **Check Supabase:**
   - Go to Supabase dashboard
   - Select `user_signup` table
   - Verify new row with all 33 fields populated

### Option 3: Test with Zapier (Alternative)

If using Zapier as intermediary:
1. Configure Zapier webhook
2. Point to: `https://your-domain.com/webhooks/typeform`
3. Use same secret as Typeform

---

## 📊 Expected Webhook Flow

```
1. User submits Typeform (b03aFxEO)
   ↓
2. Typeform sends webhook to your server
   ↓
3. Server validates signature (if secret configured)
   ↓
4. Server responds 200 OK immediately
   ↓
5. Server processes async:
   - Extracts 33 fields from Typeform payload
   - Maps to user_signup table schema
   - Inserts into Supabase
   - Stores audit log
   - Updates account status (if applicable)
   ↓
6. Done! User data in Supabase
```

---

## 🔍 Debugging Tips

### Check Webhook Is Receiving Requests

```bash
# Test endpoint is accessible
curl http://localhost:5000/webhooks/test

# Should return:
{
  "success": true,
  "message": "Webhook endpoint is working",
  ...
}
```

### Check Server Logs

The webhook controller has comprehensive logging:
- `🎯 TYPEFORM WEBHOOK` - Webhook received
- `📥 Incoming:` - Request details
- `🔍 VALIDATION PHASE` - Validation checks
- `🔐 Signature verification` - Signature status
- `📝 FORM DETAILS` - Form identification
- `🚀 Processing USER SIGNUP` - Processing start
- `📊 Data mapping completed` - Field extraction
- `💾 Inserting into Supabase` - Database insert
- `✅ User record inserted` - Success
- `🎉 ASYNC PROCESSING COMPLETE` - Done

### Common Issues

#### Issue 1: 403 Signature Verification Failed
**Cause:** Webhook secret mismatch
**Fix:**
1. Check `TYPEFORM_WEBHOOK_SECRET` in `.env`
2. Verify it matches Typeform webhook settings
3. Ensure no extra spaces or quotes

#### Issue 2: Form Not Recognized
**Cause:** Form ID mismatch
**Fix:** ✅ Already fixed! Form ID is now `b03aFxEO`

#### Issue 3: Fields Not Populating
**Cause:** Field ref mismatch in Typeform
**Fix:**
1. Go to Typeform form builder
2. For each field, set the **reference** to match our mappings
3. Example: Name field → ref: `name`

#### Issue 4: Database Insert Error
**Cause:** Schema mismatch or missing table
**Fix:**
1. Verify `user_signup` table exists in Supabase
2. Check column names match exactly
3. Ensure columns allow NULL if fields are optional

---

## 📋 Supabase Table Schema

Your `user_signup` table should have these columns:

```sql
CREATE TABLE user_signup (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- User Identity
  create_user_id TEXT NOT NULL,
  email TEXT,

  -- Personal Info
  name TEXT,
  surname TEXT,
  mobile TEXT,
  country TEXT,

  -- Address
  street_address TEXT,
  street_address_optional TEXT,
  town TEXT,
  postcode TEXT,

  -- Vehicle
  car_registration_number TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_colour TEXT,
  vehicle_condition TEXT,

  -- License
  driving_license_number TEXT,
  driving_license_picture TEXT,

  -- Vehicle Pictures
  vehicle_picture_front TEXT,
  vehicle_picture_driver_side TEXT,
  vehicle_picture_passenger_side TEXT,
  vehicle_picture_back TEXT,

  -- Insurance
  insurance_company TEXT,
  policy_number TEXT,
  policy_holder TEXT,
  cover_type TEXT,

  -- Recovery
  recovery_company TEXT,
  recovery_breakdown_number TEXT,
  recovery_breakdown_email TEXT,

  -- Emergency
  emergency_contact TEXT,

  -- Metadata
  gdpr_consent BOOLEAN,
  account_status TEXT DEFAULT 'pending',
  time_stamp TIMESTAMPTZ
);
```

---

## ✅ Next Steps

1. **Set Up Environment**
   ```bash
   # Copy example
   cp .env.example .env

   # Edit and add your Supabase credentials
   nano .env
   ```

2. **Verify Supabase Table**
   - Check `user_signup` table exists
   - Verify all 33 columns are present
   - Ensure column types match

3. **Start Server**
   ```bash
   npm start
   ```

4. **Test Locally First**
   ```bash
   # In another terminal
   node scripts/test-typeform-webhook.js
   ```

5. **Check Supabase**
   - Go to Supabase dashboard
   - Open `user_signup` table
   - Look for test user: `test-user-[timestamp]`

6. **Configure Typeform Webhook**
   - Add your production URL
   - Copy webhook secret to `.env`
   - Test with real form submission

7. **Monitor & Verify**
   - Submit test form
   - Check logs for processing
   - Verify all 33 fields in Supabase
   - Check for any errors

---

## 🎉 Success Criteria

You'll know it's working when:
- ✅ Server starts without errors
- ✅ Test script returns 200 OK
- ✅ Logs show "User signup processed successfully"
- ✅ New row appears in Supabase `user_signup` table
- ✅ All 33 fields are populated correctly
- ✅ No errors in logs

---

## 📞 Troubleshooting Support

If you encounter issues:

1. **Check Server Logs**
   - Look for 🎯, 📥, 🔍, 🚀, 💾, ✅ emojis
   - Errors will show ❌ with details

2. **Test Components Individually**
   ```bash
   # Test Supabase connection
   node -e "const {createClient} = require('@supabase/supabase-js'); const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); c.from('user_signup').select('*').limit(1).then(console.log)"

   # Test webhook endpoint
   curl http://localhost:5000/webhooks/test
   ```

3. **Verify Field References in Typeform**
   - Each field must have a `ref` set
   - Refs must match our field mapping exactly

---

**Last Updated:** October 15, 2025
**Status:** Ready for testing
**Form ID:** b03aFxEO ✅
**Fields Mapped:** 33/33 ✅
