# 🧪 Signup Form Testing Checklist

**Date**: 2025-10-27
**Branch**: feat/audit-prep
**Server**: http://localhost:3000
**Target Issue**: ERR_UPLOAD_FILE_CHANGED on mobile image uploads

---

## ✅ Pre-Test Verification

- [x] Server running on localhost:3000 (PID: 22472)
- [x] Temp upload endpoint registered (/api/images/temp-upload)
- [x] Latest code committed (cfb4d60)
- [x] All fixes applied:
  - Image validation logic (checks for string temp paths)
  - Cache control headers (no-cache, no-store, must-revalidate)
  - Version tracking (FORM_VERSION = '2.1.0-temp-upload')
  - Defensive File object detection

---

## 📝 Manual Testing Steps

### Step 1: Load Form with Fresh Code

1. **Open browser** (Chrome or Safari)
2. **Navigate to**: http://localhost:3000/signup-form.html
3. **Hard refresh** to clear cache:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
4. **Open Developer Console** (F12 or Cmd+Option+I)

**Expected Console Output**:
```
🚀 Form initialized - v2.0 with Page 2
📄 Total pages defined: 9
📋 Pages found in DOM: 9
  - Page 1: ✅ ACTIVE
  [...]
✅ Event listeners attached (CSP-compliant)
✅ Supabase client initialized
```

**✅ PASS**: Form loads without errors
**❌ FAIL**: Console shows errors or old version

---

### Step 2: Navigate to Image Upload Page (Page 7)

1. **Page 1 (Account Creation)**:
   - Email: test@example.com
   - Password: Test123!@#
   - Click "Continue"

2. **Page 2 (Welcome)**:
   - Click "Continue"

3. **Page 3 (Personal Info)**:
   - First Name: Test
   - Last Name: User
   - Mobile: 07411005390
   - Date of Birth: 01/01/1990
   - Click "Continue"

4. **Page 4 (Address)**:
   - Address Line 1: 123 Test Street
   - City: London
   - Postcode: SW1A 1AA
   - Click "Continue"

5. **Page 5 (Vehicle Registration)**:
   - Enter any UK reg (e.g., F11NGO)
   - Wait for DVLA lookup
   - Click "Continue"

6. **Page 6 (Insurance)**:
   - License Number: 12345678901234
   - Insurance Company: Test Insurance
   - Policy Number: POL123456
   - Cover Type: Comprehensive
   - Click "Continue"

7. **Now on Page 7** - Ready to test image uploads!

**Expected**: Should reach Page 7 without errors

---

### Step 3: Test Image Upload (Critical Test)

**On Page 7 (Driving License & Vehicle Photos)**:

1. **Select/Capture Driving License Photo**:
   - Click "Take Photo" or "Choose File"
   - Select an image file (or take with camera if on mobile)

2. **Watch Console Immediately**:

**Expected Console Output**:
```
📤 Uploading driving_license_picture immediately to temp storage...
📝 Created new upload session: session_[timestamp]_[random]
✅ driving_license_picture uploaded successfully
```

**Check for these SUCCESS indicators**:
- ✅ No "ERR_UPLOAD_FILE_CHANGED" error
- ✅ Upload happens IMMEDIATELY when image selected
- ✅ Console shows session ID created
- ✅ Upload success message appears
- ✅ No File object validation errors

**Check for these FAILURE indicators**:
- ❌ "ERR_UPLOAD_FILE_CHANGED" error
- ❌ "404 Not Found" on /api/images/temp-upload
- ❌ "Found File objects in formData" alert
- ❌ Network errors or timeouts

3. **Repeat for Other Images** (Optional):
   - Vehicle Front Photo
   - Vehicle Driver Side Photo
   - Vehicle Passenger Side Photo
   - Vehicle Back Photo

**Expected**: Each image should upload immediately on selection

---

### Step 4: Test Form Submission

1. **After uploading at least one image**:
   - Fill remaining required fields
   - Click "Continue" through remaining pages

2. **On Final Page (Page 9)**:
   - Review summary
   - Check "I agree to terms"
   - Click "Submit"

3. **Watch Console for Submission**:

**Expected Console Output**:
```
📤 Submitting form (version: 2.1.0-temp-upload)
📤 Submitting form data: { ... }
✅ No File objects detected (all temp paths are strings)
[Server processes submission...]
✅ Signup completed successfully
```

**Check for SUCCESS**:
- ✅ Form submits without ERR_UPLOAD_FILE_CHANGED
- ✅ Version shows "2.1.0-temp-upload"
- ✅ No File object validation alert
- ✅ Server accepts submission (200 OK)
- ✅ Redirect to success page

**Check for FAILURE**:
- ❌ ERR_UPLOAD_FILE_CHANGED on submit
- ❌ "Found File objects in formData" alert
- ❌ Network error or 500 server error
- ❌ Form validation errors

---

### Step 5: Verify Backend Processing

1. **Check Server Logs** (Terminal where server is running):

**Expected Log Output**:
```
📝 Received signup form submission
📋 Form data: { hasSessionId: true, fields: 50, hasImages: 1 }
✅ User record created: [user-id]
📸 Processing temp uploads...
🔄 Moving driving_license_picture from temp to permanent storage...
📦 Moving: temp/session_xxx/driving_license_picture_xxx.jpg → user-id/driving_license_picture_xxx.jpg
✅ driving_license_picture moved successfully
🎉 User signup completed successfully
```

**Check for SUCCESS**:
- ✅ Temp paths received (not File objects)
- ✅ Files moved from temp/ to user-id/
- ✅ User record created in database
- ✅ No errors in server logs

**Check for FAILURE**:
- ❌ "Temp upload not found" errors
- ❌ "Failed to move file" errors
- ❌ Database insertion errors

---

## 🎯 Test Results

### Test Summary

- [ ] **Step 1**: Form loads with latest version ✅/❌
- [ ] **Step 2**: Navigate to Page 7 without errors ✅/❌
- [ ] **Step 3**: Image uploads immediately to temp storage ✅/❌
- [ ] **Step 4**: Form submits successfully ✅/❌
- [ ] **Step 5**: Backend processes temp→permanent conversion ✅/❌

### Critical Checks

- [ ] **No ERR_UPLOAD_FILE_CHANGED errors** ✅/❌
- [ ] **Version = 2.1.0-temp-upload** ✅/❌
- [ ] **Images upload on select (not on submit)** ✅/❌
- [ ] **Temp paths stored (not File objects)** ✅/❌
- [ ] **Backend converts temp→permanent** ✅/❌

---

## 🐛 Common Issues & Solutions

### Issue: "404 Not Found" on /api/images/temp-upload

**Cause**: Routes not registered or server needs restart
**Solution**:
```bash
# Kill and restart server
lsof -t -i:3000 | xargs kill
PORT=3000 npm start
```

### Issue: "Found File objects in formData" Alert

**Cause**: Browser serving cached HTML with old validation logic
**Solution**: Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: ERR_UPLOAD_FILE_CHANGED Still Occurs

**Possible Causes**:
1. Browser cache - Hard refresh didn't clear it
2. Service worker caching - Clear site data in DevTools
3. CDN caching (if deployed) - Wait for cache TTL

**Solutions**:
1. Try incognito/private window
2. Clear all site data in DevTools → Application → Clear Storage
3. Check console for version - should be "2.1.0-temp-upload"

### Issue: "Temp upload not found" on Submission

**Cause**: Temp upload expired (24hr limit) or database table doesn't exist
**Solution**:
```bash
# Verify temp_uploads table exists
node scripts/verify-temp-uploads-table.js

# If table missing, run migration
node scripts/run-temp-uploads-migration.js
```

---

## 🚀 Next Steps After Testing

### If All Tests Pass:

1. ✅ Commit any additional fixes
2. ✅ Merge feat/audit-prep to main
3. ✅ Deploy to Replit production
4. ✅ Test on actual mobile devices
5. ✅ Update CLAUDE.md with lessons learned

### If Tests Fail:

1. 📋 Document exact error messages
2. 📋 Note which step failed
3. 📋 Collect console logs and server logs
4. 📋 Report to Claude for debugging
5. 📋 Don't deploy until fixed!

---

## 📱 Mobile Testing (After Localhost Success)

Once localhost tests pass, test on actual mobile devices:

**iOS Safari**:
- iPhone with camera
- Test camera capture flow
- Test file upload from library
- Test backgrounding app during form

**Android Chrome**:
- Android phone with camera
- Test camera capture flow
- Test file upload from gallery
- Test app backgrounding

**Expected Behavior**:
- Images upload immediately when captured/selected
- No ERR_UPLOAD_FILE_CHANGED errors
- Form survives app backgrounding
- Submission succeeds with all images

---

**Testing Status**: 🔴 NOT STARTED
**Last Updated**: 2025-10-27 23:00 GMT
**Tester**: [Your Name]
**Environment**: Local Development (localhost:3000)
