# Login Redirect Debugging Guide

## Issue:
After clicking "Report an Incident" → Login → User gets redirected to index.html instead of incident.html

## Debug Changes Added:

### 1. login.html
Added detailed logging in `getRedirectUrl()` function that shows:
- Full URL
- Search parameters
- Redirect parameter value
- Final redirect URL

### 2. index.html
Added logging in navigation functions:
- Auth status check response
- Authentication state
- Redirect URLs being constructed

## Testing Steps:

### Step 1: Deploy the debug version

In Replit:
```bash
git pull origin feat/audit-prep
```

Restart the server (Ctrl+C, then Run)

### Step 2: Open browser DevTools

1. Open your app: `https://8eb321a3-1f5e-47c6-a6fe-e5b806ca8c54-00-3pzgrnpj2hcui.riker.replit.dev`
2. Press **F12** to open DevTools
3. Go to the **Console** tab
4. Clear the console (trash icon)

### Step 3: Test the flow

1. Click **"Report an Incident"** button
2. **Check console** - You should see:
   ```
   📝 Incident button clicked
   🔍 Auth status check: {authenticated: false, ...}
   ❌ User not authenticated, redirecting to login with redirect=incident.html
   ```

3. You'll be redirected to login page
4. **Check the URL bar** - It should show:
   ```
   .../login.html?redirect=incident.html
   ```

5. Enter your login credentials and click **Login**
6. **Watch the console** - You should see:
   ```
   🔍 Redirect Debug: {
     fullUrl: "https://.../login.html?redirect=incident.html",
     searchParams: "?redirect=incident.html",
     redirectParam: "incident.html",
     finalRedirectUrl: "/incident.html"
   }
   Login successful, redirecting to: /incident.html
   ```

### Step 4: Record what happens

**If it works correctly:**
- ✅ You'll be redirected to `incident.html`
- ✅ Console shows `finalRedirectUrl: "/incident.html"`

**If it fails:**
- ❌ You're redirected to `index.html` instead
- Check console for:
  - What is `redirectParam`? (should be "incident.html")
  - What is `finalRedirectUrl`? (should be "/incident.html")
  - Is the URL actually `/login.html?redirect=incident.html` or is the parameter missing?

## Expected Console Output (Full Flow):

```
1. Click "Report an Incident"
   📝 Incident button clicked
   🔍 Auth status check: {authenticated: false}
   ❌ User not authenticated, redirecting to login with redirect=incident.html

2. Page loads login.html
   [URL should be: .../login.html?redirect=incident.html]

3. Enter credentials and submit
   🔍 Redirect Debug: {
     fullUrl: "https://.../login.html?redirect=incident.html",
     searchParams: "?redirect=incident.html",
     redirectParam: "incident.html",
     finalRedirectUrl: "/incident.html"
   }
   Login successful, redirecting to: /incident.html

4. Page loads incident.html
   ✅ SUCCESS
```

## Common Issues to Check:

### Issue 1: URL Parameter Missing
**Symptom:** `searchParams: ""` or `redirectParam: null`
**Cause:** The redirect parameter is being lost in the URL
**Fix:** Check if browser extensions or security settings are stripping URL parameters

### Issue 2: Wrong Final URL
**Symptom:** `finalRedirectUrl: "/index.html"` even though redirectParam exists
**Cause:** Logic error in getRedirectUrl (but we've checked and it looks correct)

### Issue 3: Login API Overriding Redirect
**Symptom:** Console shows correct redirect URL but still goes to index
**Cause:** Something after the login response is changing the redirect

## Next Steps:

After testing, **copy the entire console output** and share it so we can see exactly where the flow breaks.

Pay special attention to:
1. The URL in the browser address bar when on login.html
2. The console output from the redirect debug
3. What page you actually land on after login

## Temporary Workaround:

If the issue persists, you can manually navigate to incident.html after logging in:
1. Log in normally
2. Manually navigate to: `.../incident.html`
