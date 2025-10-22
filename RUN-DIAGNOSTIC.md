# How to Run Session Diagnostic

## Quick Steps:

### 1. Start the Server

Open a terminal and run:
```bash
cd "/Users/ianring/Cursor/Car Crash Lawyer AI /Node.js"
npm start
```

You should see:
```
🚀 Server is running on port 5000
✅ Connected to Supabase
```

### 2. Open the Diagnostic Tool

Open your web browser (Chrome, Firefox, Safari, etc.) and go to:
```
http://localhost:5000/test-cookies.html
```

### 3. Run the Tests

In the browser page you'll see 4 sections. Follow these steps:

**Step 1: Login Test**
- Enter your email (the one you use to login)
- Enter your password
- Make sure "Keep me logged in" is checked ✓
- Click **"🔐 Test Login"** button
- Watch the output - it will show if login succeeded

**Step 2: Cookie Inspection**
- Click **"🔍 Inspect Cookies"** button
- It will explain why you can't see httpOnly cookies (this is normal)

**Step 3: Session Validation**
- Click **"✅ Test Session Endpoint"** button
- This is the CRITICAL test - it shows if cookies are working
- If this shows ❌ then we found the problem!

**Step 4: Network Analysis**
- Click **"📊 Analyze Network Headers"** button
- This shows the response headers

### 4. Check the Summary

Scroll to the bottom - you'll see **"Diagnostic Summary"** section.

It will tell you:
- ✅ If everything is working
- ❌ If there's a problem (and what the problem is)

---

## What to Look For:

### If Session is Working:
```
✅ Login successful
✅ Session is valid - cookies are working!
```

### If Session is BROKEN (current issue):
```
✅ Login successful
❌ Session is NOT valid
   Problem: Cookies are not being sent or are invalid

PROBLEM IDENTIFIED:
  Login succeeds but session check fails.
  This means cookies are NOT being stored by the browser.

Possible causes:
  1. Server not sending Set-Cookie headers
  2. CORS blocking cookies
  3. Browser blocking third-party cookies
  4. httpOnly or secure flags incorrectly set
```

---

## Alternative: Command Line Diagnostic

If you prefer command line, open TWO terminals:

**Terminal 1: Start server**
```bash
cd "/Users/ianring/Cursor/Car Crash Lawyer AI /Node.js"
npm start
```

**Terminal 2: Run diagnostic**
```bash
cd "/Users/ianring/Cursor/Car Crash Lawyer AI /Node.js"
node diagnose-login-flow.js
```

---

## What to Send Me:

After running the diagnostic, send me a screenshot or copy/paste of:
1. The "Diagnostic Summary" section at the bottom
2. Any ❌ error messages you see
3. The output from "Step 3: Session Validation"

This will tell me EXACTLY where the cookie flow is breaking!

---

## Troubleshooting:

**"Server is not running"**
- Make sure you ran `npm start` first
- Check if port 5000 is already in use

**"Cannot access page"**
- Make sure you're using `http://localhost:5000` (not https)
- Try `http://127.0.0.1:5000/test-cookies.html` instead

**"Login failed"**
- Use your actual credentials from the database
- Check the server terminal for error messages
