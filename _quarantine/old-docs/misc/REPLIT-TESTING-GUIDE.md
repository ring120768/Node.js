# 🔧 Testing on Replit - Complete Guide

## Important: Replit vs Localhost

You're running this on **Replit**, not your local machine. Key differences:

### URLs:
- ❌ **DON'T USE:** `http://localhost:5000` or `http://localhost:5001`
- ✅ **USE:** Your Replit URL: `https://your-repl-name.replit.app`

### How to Find Your Replit URL:

1. Look at the top of your Replit window
2. Click the **Webview** tab (or click the URL icon)
3. Your URL will be something like:
   - `https://car-crash-lawyer-ai.replit.app` OR
   - `https://[your-repl-id].replit.app`

## Testing Cookie Mechanism on Replit

### Step 1: Start Server (if not already running)

In Replit Shell/Console:
```bash
npm start
```

Or use Replit's green "Run" button at the top.

### Step 2: Open Cookie Test Page

Replace `YOUR-REPL-URL` with your actual Replit URL:

```
https://YOUR-REPL-URL/test-cookies-simple.html
```

For example:
```
https://car-crash-lawyer-ai.replit.app/test-cookies-simple.html
```

### Step 3: Run Tests

1. Click **"1. Set Test Cookie"**
2. Click **"2. Verify Test Cookie"**
3. Click **"1. Set Auth Cookies"**
4. Click **"2. Verify Auth Cookies"**

### Step 4: Check Results

Look at the **Summary** section:
- ✅ **GREEN** = Cookies work!
- ❌ **RED** = Cookie issue found

## Testing Login Flow on Replit

### Step 1: Go to Login Page

```
https://YOUR-REPL-URL/login.html
```

### Step 2: Open Browser DevTools

- Press **F12** (or right-click → Inspect)
- Go to **Console** tab

### Step 3: Login

1. Enter email and password
2. Check "Keep me logged in" ✓
3. Click Login
4. **Watch the console output**

You should see:
```
========================================
✅ LOGIN SUCCESSFUL
========================================
🔍 Testing session immediately after login...
✅ Session is VALID - cookies are working!
Redirecting to: ...
========================================
```

### Step 4: Test Navigation

After successful login:
1. Go to home page: `https://YOUR-REPL-URL/`
2. Click "Incident Report" button
3. You should go to incident page **WITHOUT** being asked to login again

If you're redirected to login = cookies not working on Replit!

## Common Replit Issues

### Issue 1: Third-Party Cookies

**Problem:** Browsers might block cookies on Replit subdomains.

**Solution:** Check browser console for errors like:
```
This Set-Cookie was blocked because it came from a response
with a cross-site context set to 'none' or 'lax'.
```

**Fix:** Update `sameSite` cookie setting in `src/controllers/auth.controller.js`:
```javascript
sameSite: 'none',  // Required for Replit
secure: true,      // Required when using sameSite: 'none'
```

### Issue 2: HTTPS Required

**Problem:** `sameSite: 'none'` requires `secure: true`, which requires HTTPS.

**Solution:** Replit provides HTTPS by default! Just ensure your `.env` has:
```
NODE_ENV=production
```

This will set `secure: true` in cookies automatically.

### Issue 3: CORS Configuration

**Problem:** Cookies blocked by CORS.

**Solution:** Already handled! Your `.replit` file sets:
```
CORS_ALLOW_REPLIT_SUBDOMAINS = "true"
```

And `src/middleware/corsConfig.js` should allow Replit domains.

## Quick Debug Commands (Replit Shell)

### Check if server is running:
```bash
curl http://localhost:5000/healthz
```

Should return: `{"status":"ok",...}`

### Check environment:
```bash
echo "NODE_ENV=$NODE_ENV"
echo "PORT=$PORT"
```

### View server logs:
Look at the Console output in Replit

## Step-by-Step: Test Session Persistence

### Test 1: Basic Login
1. Go to: `https://YOUR-REPL-URL/login.html`
2. Login successfully
3. Check console for ✅ "Session is VALID"

### Test 2: Navigation Test
1. From home page, click "Incident Report"
2. Should load incident page (not redirect to login)

### Test 3: Refresh Test
1. After login, go to: `https://YOUR-REPL-URL/incident.html`
2. Refresh the page (F5)
3. Should stay on incident page (not redirect to login)

### Test 4: New Tab Test
1. After login, open a **NEW TAB**
2. Go to: `https://YOUR-REPL-URL/dashboard.html`
3. Should load dashboard (not redirect to login)

## If Tests Still Fail on Replit:

The issue is likely **browser blocking third-party cookies**. Modern browsers (especially Safari and Firefox) are strict about this.

### Solution: Update Cookie Settings for Replit

In `src/controllers/auth.controller.js`, change cookie settings to:

```javascript
res.cookie('access_token', authResult.session.access_token, {
  httpOnly: true,
  secure: true,  // MUST be true on Replit (HTTPS)
  sameSite: 'none',  // Required for cross-site cookies
  maxAge: cookieMaxAge
});
```

**Why this is needed on Replit:**
- Replit URLs are considered "cross-site" by browsers
- `sameSite: 'none'` allows cross-site cookies
- `secure: true` is required when using `sameSite: 'none'`
- This only works over HTTPS (Replit provides this)

## Next Steps:

1. ✅ Find your Replit URL
2. ✅ Test at: `https://YOUR-REPL-URL/test-cookies-simple.html`
3. ✅ If tests fail, update cookie settings for Replit
4. ✅ Re-test login flow

---

**Key Takeaway:** On Replit, you need `sameSite: 'none'` and `secure: true` for cookies to work across the Replit subdomain.
