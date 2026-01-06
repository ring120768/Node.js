# Stripe Payment Auth Fix - Testing Guide

## Summary of Fixes Applied

Two critical fixes have been implemented to resolve authentication loss after Stripe payment:

### Fix #1: Missing Supabase Client Session Initialization
**Problem:** Server was returning session tokens but client JavaScript never initialized the Supabase SDK with them.

**Solution:** Added `supabaseClient.auth.setSession()` call in `payment-success.html` after receiving tokens from `/api/auth/login-after-payment`.

**Files Modified:** `public/payment-success.html` (lines 590-611)

### Fix #2: Property Name Mismatch (Blocking Fix #1)
**Problem:** Client code was checking for `config.supabaseKey` but server sends `config.supabaseAnonKey`, preventing Supabase client initialization.

**Solution:** Fixed property names in both payment-success and report-complete pages.

**Files Modified:**
- `public/payment-success.html` (lines 515-518)
- `public/report-complete.html` (lines 623-626)

**Git Commit:** `cfd048c`

---

## Testing Steps

### 1. Deploy the Fixes

```bash
# The fixes are already committed - deploy to Railway
git push origin main

# Or if you use Railway CLI:
railway up
```

### 2. Verify Stripe Webhook Configuration

**CRITICAL:** The webhook processing delay (all 10 retries failing) suggests the Stripe webhook may not be configured correctly.

#### Check Stripe Dashboard

1. Go to: https://dashboard.stripe.com/webhooks
2. Verify webhook endpoint exists: `https://carcrashlawyerai.co.uk/api/stripe/webhook`
3. Check "Events to send" includes: `checkout.session.completed`
4. Verify webhook signing secret matches `.env` variable: `STRIPE_WEBHOOK_SECRET`

#### If Webhook Not Configured:

1. Click "Add endpoint" in Stripe Dashboard
2. Endpoint URL: `https://carcrashlawyerai.co.uk/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed` (REQUIRED for V2 auth)
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy the webhook signing secret
5. Update Railway environment variable: `STRIPE_WEBHOOK_SECRET=whsec_xxx`
6. Restart the Railway deployment

### 3. Test Payment Flow (End-to-End)

#### A. Start Fresh Signup

1. Open browser in **incognito mode** (important!)
2. Go to: `https://carcrashlawyerai.co.uk/signup-form.html`
3. Fill in form with test data:
   - Email: `test+$(date +%s)@example.com` (unique email)
   - Password: Any test password (e.g., `TestPass123!`)
   - Name: Test User
4. Submit form

#### B. Select Plan

1. You should be redirected to: `/select-plan.html?signup_id=xxx&email=xxx`
2. **Check browser console** for these logs:
   ```
   ✅ V2 flow working correctly
   ✅ signup_id captured: [uuid]
   ✅ email captured: [your-email]
   📋 Set client-reference-id to signup_id: [uuid]
   ```
3. Select any plan (use Stripe test card)

#### C. Stripe Payment

1. Enter Stripe test card: `4242 4242 4242 4242`
2. Expiry: Any future date (e.g., `12/34`)
3. CVC: Any 3 digits (e.g., `123`)
4. Complete payment

#### D. Payment Success Page (CRITICAL TESTING POINT)

1. After payment, you'll be redirected to: `/payment-success.html`
2. **Open browser console immediately** (F12)
3. Look for these logs:

**Expected Success Logs:**
```
✅ Supabase initialized with URL: [url]
🔄 V2 Auto-login attempt 1/10...
✅ V2: Login successful on attempt 1
✅ Supabase client session initialized
✅ Auto-login successful, redirecting to dashboard...
```

**Previous Failure Logs (should NOT see these anymore):**
```
⚠️ Supabase config not available  ← FIXED by property name fix
⏳ V2: Auth account not ready yet, waiting...  ← Indicates webhook issue
⚠️ V2 Auto-login: Max attempts reached  ← Webhook timeout
```

#### E. Verify Dashboard Access

1. After redirect, you should land on: `/dashboard.html`
2. You should see dashboard content (not login redirect)
3. Check browser console for: `✅ User authenticated`

### 4. Check Webhook Logs (If Issues Persist)

#### A. Check Railway Logs

```bash
# If using Railway CLI:
railway logs

# Look for webhook logs:
[Stripe] Webhook received: checkout.session.completed
[Stripe] Checkout complete: [session-id]
[Stripe] v2 flow detected - creating auth account for: [email]
[Stripe] Auth account created: [user-id] for email: [email]
[Stripe] v2 flow: Updated all records from temp ID [...] to auth ID [...]
[Stripe] User subscription activated: [user-id] tier: [tier]
```

#### B. Check Stripe Dashboard Webhook Logs

1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint
3. Check "Recent events" tab
4. Look for recent `checkout.session.completed` events
5. Check if they have "Succeeded" status
6. If failed, check error message

### 5. Troubleshooting

#### Issue: "⚠️ Supabase config not available"

**Status:** FIXED in commit `cfd048c`
**Cause:** Property name mismatch
**Solution:** Already applied - redeploy if you see this

#### Issue: "⏳ V2: Auth account not ready yet, waiting..." (all 10 attempts)

**Status:** NEEDS INVESTIGATION
**Likely causes:**
1. Stripe webhook not configured (most likely)
2. Wrong webhook URL in Stripe Dashboard
3. Wrong `STRIPE_WEBHOOK_SECRET` in Railway
4. Webhook signature verification failing
5. Auth account creation failing (check logs)

**Debug steps:**
1. Check Stripe Dashboard webhook configuration (see section 2 above)
2. Check Railway logs for webhook events: `railway logs | grep Stripe`
3. Test webhook delivery manually:
   - Go to Stripe Dashboard → Webhooks → [your endpoint]
   - Click "Send test event"
   - Select "checkout.session.completed"
   - Check if event appears in Railway logs

#### Issue: Webhook appears in Stripe logs but not Railway logs

**Possible causes:**
1. Firewall blocking Stripe IPs
2. Rate limiting blocking webhook requests
3. Request timeout (webhook endpoint taking too long)

**Solution:**
- Check Railway deployment logs for 5xx errors
- Verify `/api/stripe/webhook` endpoint is accessible
- Test webhook endpoint: `curl -X POST https://carcrashlawyerai.co.uk/api/stripe/webhook`

---

## Expected Behavior After Fixes

### V2 Signup Flow (Auth-After-Payment)

```
1. User fills signup form → temp signup created (auth_pending=true)
   ↓
2. User selects plan → Stripe pricing table loads
   ↓
3. User completes payment → Stripe redirect to payment-success.html
   ↓
4. Stripe sends webhook → Auth account created (auth_pending=false)
   ↓
5. payment-success.html polls /api/auth/login-after-payment
   ↓
6. Server generates magic link token → returns session tokens
   ↓
7. Client calls supabaseClient.auth.setSession() ← FIX #1
   ↓
8. User redirected to dashboard (fully authenticated)
```

### Key Timing Requirements

- **Webhook processing:** Should complete within ~5-10 seconds
- **Auto-login polling:** 10 attempts × 2 seconds = 20 seconds max
- **Expected result:** Login succeeds on attempt 1-3 (webhook completes in <6 seconds)

---

## Rollback Instructions

If these fixes cause issues, rollback with:

```bash
# Revert the property name fixes
git revert cfd048c

# Redeploy
git push origin main
```

Note: Reverting will restore the previous behavior (auth loss after payment).

---

## Next Steps After Successful Test

1. ✅ Verify webhook configuration in Stripe Dashboard
2. ✅ Test with Stripe test payment
3. ✅ Confirm dashboard access without login redirect
4. ✅ Test with real payment (optional - use lowest tier)
5. ✅ Monitor Railway logs for any errors
6. ✅ Update Stripe webhook URL if using custom domain

---

## Contact Points for Issues

**Webhook not receiving events:**
- Check: Stripe Dashboard → Webhooks → Recent events
- Verify: Webhook URL matches Railway deployment URL
- Test: Use "Send test event" in Stripe Dashboard

**Auth account creation failing:**
- Check: Railway logs for `[Stripe] Failed to create auth account`
- Verify: `SUPABASE_SERVICE_ROLE_KEY` is correct
- Test: Create user manually via Supabase Dashboard

**Client session initialization failing:**
- Check: Browser console for Supabase errors
- Verify: `/api/config` returns correct `supabaseAnonKey`
- Test: Visit `/api/config` directly in browser

---

**Last Updated:** 2026-01-06
**Fixes Applied:** Property name mismatch, Supabase client session initialization
**Status:** Ready for testing
