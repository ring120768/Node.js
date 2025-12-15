# Signup JSON Parsing Error - Troubleshooting Guide

**Created:** 2025-10-24
**Status:** 🔴 CRITICAL - Blocking Typeform auth flow testing

## Problem

User gets error when signing up on Replit deployment:
```
Unexpected token 'I', "Internal S"... is not valid JSON
```

This is a **frontend JavaScript error** - the browser is trying to parse JSON but receiving plain text "Internal Server Error" instead.

## Root Cause Analysis

The signup controller (`src/controllers/auth.controller.js`) has proper error handling:
- Line 206-212: Try-catch block with `sendError()` that returns JSON
- All validation errors use `sendError()` for consistent JSON responses
- Authentication errors handled gracefully with JSON responses

**This means the error is happening BEFORE the controller code runs.**

### Possible Causes (in order of likelihood)

1. **Replit deployment running old code**
   - Replit might not have restarted after recent changes
   - Old code might not have proper error handling

2. **Environment variable missing on Replit**
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or `SUPABASE_ANON_KEY` missing
   - Causes authService initialization to fail
   - Server crashes on signup attempt before reaching controller

3. **Middleware crash before controller**
   - CORS middleware failing
   - Request parser crashing
   - Body size limit exceeded

4. **Express not handling async errors**
   - Unhandled promise rejection in middleware
   - Error thrown before error handlers are registered

## Evidence

✅ **Local server (localhost:5000) works perfectly:**
- All services initialize correctly
- Supabase ✅
- Auth service ✅
- Image processors ✅
- GDPR service ✅
- WebSocket ✅
- Cron jobs ✅

❌ **Replit deployment (nodejs-1-ring120768.replit.app) returns plain text errors**

This **confirms** it's an environment/deployment issue, not a code issue.

## Troubleshooting Steps

### Step 1: Check Replit Environment Variables

1. Go to Replit project settings
2. Navigate to "Secrets" (environment variables)
3. Verify these exist and are correct:

```bash
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx...
SUPABASE_ANON_KEY=eyJxxxx...
TYPEFORM_WEBHOOK_SECRET=xxx
OPENAI_API_KEY=sk-xxx
```

**Critical check:** Are the Supabase keys valid?
- Test by visiting: `https://YOUR_PROJECT.supabase.co/rest/v1/` (should show "ok")
- Invalid keys = signup will fail before controller runs

### Step 2: Restart Replit Deployment

Replit may be running old code. To restart:

```bash
# In Replit shell
pkill -f "node index.js"
npm start
```

Or use the "Stop" button in Replit and then "Run" again.

### Step 3: Check Replit Server Logs

Look for errors in Replit console output:

**Expected startup (good):**
```
✅ Supabase initialized
✅ Auth service initialized
✅ GDPR service initialized
✅ Image processor initialized
✅ WebSocket initialized
✅ Cron manager initialized
🚀 Server: 0.0.0.0:5000
⚡ System Ready!
```

**Error patterns to look for (bad):**
```
❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
❌ Supabase init failed: ...
❌ Auth service not configured
Error: Cannot read property 'signUp' of null
```

### Step 4: Test Signup Endpoint Directly

Test the signup API endpoint with curl to see actual error:

```bash
curl -X POST https://nodejs-1-ring120768.replit.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "fullName": "Test User",
    "gdprConsent": true
  }' \
  -v
```

**What to look for:**
- ✅ Status 200/400 with JSON response = Good (controller working)
- ❌ Status 500 with plain text "Internal Server Error" = Bad (crash before controller)
- ❌ Status 503 with "Auth service not configured" = Environment issue

### Step 5: Check Supabase Connection

Test Supabase connectivity:

```bash
# In Replit shell
node scripts/test-supabase-client.js
```

Expected output:
```
✅ Supabase connected
✅ user_signup table accessible
```

If this fails, the environment variables are wrong or Supabase is down.

## Quick Fixes

### Fix 1: Restart Replit Deployment

**Most likely fix** - Just restart:

1. Stop Replit server (Stop button)
2. Wait 5 seconds
3. Start server (Run button)
4. Wait for "System Ready!" message
5. Test signup again

### Fix 2: Re-add Environment Variables

If restart doesn't work, re-create Supabase secrets:

1. Go to Supabase dashboard
2. Copy FRESH keys (old ones may have been rotated)
3. Paste into Replit Secrets
4. Restart server

### Fix 3: Check Supabase Service Role Key

The signup uses SERVICE ROLE KEY (not anon key). Verify:

```javascript
// Check in Replit shell
echo $SUPABASE_SERVICE_ROLE_KEY
```

Should start with `eyJ` and be very long (500+ characters).

If missing → Add it from Supabase dashboard → Restart.

### Fix 4: Clear Replit Cache

Sometimes Replit caches old code:

```bash
# In Replit shell
rm -rf node_modules/.cache
npm cache clean --force
npm install
npm start
```

## Known Working Configuration

**Local server (proven working):**
- Node.js v18+
- All environment variables present
- Supabase accessible
- Auth service initializes correctly

**Replit requirements:**
- Same environment variables as local
- HTTPS enabled (Replit provides this)
- `trust proxy` set to true (already configured in app.js line 69)
- `sameSite: 'none'` cookies (already configured for Replit)

## Expected Behavior After Fix

**Successful signup should:**

1. Create user in Supabase Auth
2. Set `access_token` and `refresh_token` cookies
3. Return JSON response:
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "session": { ... }
  },
  "message": "Account created successfully..."
}
```

4. Frontend redirects to Typeform with hidden fields

**After Typeform completion:**
- Typeform webhook populates `user_signup` table
- Typeform redirects to `transcription-status.html`
- **ISSUE:** User has to login again (see TYPEFORM_AUTH_FIX.md for solution)

## Relationship to Typeform Auth Issue

**These are TWO separate issues:**

1. **THIS ISSUE:** Signup returning plain text error (blocking everything)
2. **TYPEFORM ISSUE:** After Typeform, user has to login again (see TYPEFORM_AUTH_FIX.md)

**Must fix this first** before testing Typeform auth flow.

## Testing After Fix

Once signup works, test complete flow:

```
1. Go to /signup-auth.html ✅
2. Fill form and submit ✅
3. Verify cookies set in DevTools → Application → Cookies
4. Should redirect to Typeform ✅
5. Complete Typeform ✅
6. Should redirect to transcription-status.html ⚠️ (may require login - separate issue)
```

## Prevention

**To avoid this in future:**

1. Always test on Replit after deployment
2. Verify environment variables are synced
3. Monitor Replit startup logs for initialization errors
4. Keep local and Replit environments in sync

## Related Files

- `/src/controllers/auth.controller.js` - Signup controller (has proper error handling ✅)
- `/src/app.js` - Error handlers (return JSON ✅)
- `/lib/services/authService.js` - Auth service implementation
- `/.env` - Local environment variables
- `TYPEFORM_AUTH_FIX.md` - Separate auth flow issue

## Next Steps

1. ✅ Fix signup error (this document)
2. ✅ Update Typeform redirect URL (see TYPEFORM_AUTH_FIX.md)
3. ✅ Test complete flow: signup → Typeform → transcription-status
4. ✅ Verify no login screen appears after Typeform

---

**Last Updated:** 2025-10-24
**Priority:** 🔴 CRITICAL
**Estimated Fix Time:** 5-10 minutes (restart + verify env vars)
