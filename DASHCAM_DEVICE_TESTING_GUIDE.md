# Dashcam Video Share Intent - Device Testing Guide

**Version:** 1.0
**Last Updated:** 2026-01-11
**APK Version:** carcrashlawyerai-dashcam-test.apk (88MB)

---

## Overview

This guide covers testing the dashcam video sharing feature on Android devices. The feature allows users to share video files from their Gallery, Files app, or any other app that supports the Android share intent, directly to the Car Crash Lawyer AI app.

**What Gets Tested:**
- Android share intent handling (`video/*` MIME types)
- Video file loading from content URI
- Upload progress tracking
- Server-side video processing and storage
- End-to-end flow from share → upload → confirmation

---

## Prerequisites

### Required Hardware
- Android device (physical device recommended)
- USB cable for ADB installation
- Test video file stored on device

### Required Software
- Android SDK Platform Tools (for ADB)
- APK file: `carcrashlawyerai-dashcam-test.apk` (located in project root)

### Test Video Requirements
- **Format:** MP4, MOV, AVI, or any common video format
- **Size:** 5-50MB recommended for testing
- **Source:** Gallery app, Files app, or Downloads folder

---

## Installation

### Method 1: ADB Install (Recommended)

```bash
# Verify device connected
adb devices

# Expected output:
# List of devices attached
# ABC123DEF456    device

# Install APK
adb install carcrashlawyerai-dashcam-test.apk

# Expected output:
# Performing Streamed Install
# Success
```

**Troubleshooting:**
- "device unauthorized" → Check device for USB debugging prompt, tap "Allow"
- "more than one device" → Use `adb -s ABC123DEF456 install carcrashlawyerai-dashcam-test.apk`
- "INSTALL_FAILED_UPDATE_INCOMPATIBLE" → Uninstall previous version first: `adb uninstall com.carcrashlawyerai.app`

### Method 2: Manual Transfer

1. Copy `carcrashlawyerai-dashcam-test.apk` to device (USB, email, cloud storage)
2. On device: Open Files app → Locate APK
3. Tap APK → "Install" → "Allow from this source" (if prompted) → "Install"

---

## Testing Procedure

### Step 1: Prepare Test Environment

**On Computer:**
```bash
# Start development server (for local testing)
npm run dev

# OR use production URL (already configured in APK):
# https://carcrashlawyerai.co.uk
```

**On Device:**
1. Launch "Car Crash Lawyer AI" app
2. Log in with test account
3. Navigate to main dashboard
4. Keep app running in background

### Step 2: Initiate Share Intent

1. **Open Gallery app** (or Files app)
2. **Navigate to Videos folder**
3. **Long-press a video file** → Tap "Share" icon
4. **Scroll through share options** → Select "Car Crash Lawyer AI"

**Expected Result:**
- App launches immediately
- URL shows: `https://carcrashlawyerai.co.uk/attach-dashcam.html?source=share`
- Video preview loads in attachment interface

**If app doesn't appear in share menu:**
- Reinstall APK
- Check Android intent filters in `AndroidManifest.xml`
- Try restarting device

### Step 3: Verify Video Loading

**What You Should See:**

1. **Attachment Interface Loads:**
   - Page title: "Attach Dashcam Video"
   - Video preview player visible
   - Upload button enabled

2. **Video Preview:**
   - Video thumbnail displays
   - Play/pause controls work
   - Duration displays correctly

3. **File Information:**
   - Filename displayed above preview
   - File size shown
   - Format detected

**Expected Console Logs (Browser DevTools):**
```
[Share Intent] Detected share source
[Share Intent] Loading shared video from URI: content://...
[Video] File loaded successfully: 12.5 MB
[Video] Format: video/mp4
```

**If video doesn't load:**
- Check localStorage: `pending_video_share` should contain video URI
- Verify Capacitor Filesystem plugin access
- Check file permissions on device

### Step 4: Test Upload

1. **Tap "Upload Video" button**
2. **Monitor progress:**
   - Progress bar animates 0% → 100%
   - File size and upload speed displayed
   - ETA countdown shown

**Expected Behaviour:**
- Upload starts immediately
- Progress updates every second
- No errors or freezes

**Expected Network Request:**
```
POST https://carcrashlawyerai.co.uk/api/images/temp-upload
Content-Type: multipart/form-data
Authorization: Bearer <jwt-token>

Response 200:
{
  "success": true,
  "tempUploadId": "uuid-here",
  "originalFilename": "dashcam_video.mp4",
  "fileSize": 13107200,
  "mimeType": "video/mp4",
  "mediaType": "video"
}
```

3. **Upload completion:**
   - Green checkmark displayed
   - "Video uploaded successfully!" message
   - Filename confirmation shown

### Step 5: Server-Side Verification

**On Computer (Server Logs):**

```bash
# Watch server logs for upload confirmation
npm run dev

# Expected log output:
[2026-01-11T16:57:23.000Z] INFO: Temp upload received
  tempUploadId: abc123...
  originalFilename: dashcam_video.mp4
  fileSize: 13107200
  mimeType: video/mp4
  mediaType: video
  userId: def456...

[2026-01-11T16:57:24.000Z] INFO: File stored in Supabase Storage
  storagePath: temp_uploads/abc123.../dashcam_video.mp4
  bucket: user-uploads
```

**Database Verification:**

```bash
# Check temp_uploads table
node scripts/check-temp-uploads.js

# Expected output:
✅ Found temp upload:
  - ID: abc123...
  - Filename: dashcam_video.mp4
  - Size: 13,107,200 bytes
  - Media Type: video
  - Storage Path: temp_uploads/abc123.../dashcam_video.mp4
  - Created: 2026-01-11T16:57:23.000Z
  - Expires: 2026-01-12T16:57:23.000Z (24 hours)
```

**Storage Verification:**

Check Supabase Storage dashboard:
- Bucket: `user-uploads`
- Folder: `temp_uploads/<user-id>/`
- File: `dashcam_video.mp4`
- Size: Matches uploaded file size

---

## Test Scenarios

### Scenario 1: Happy Path (Standard Video)

**Setup:**
- 10-30MB MP4 video
- Good network connection
- Fresh app install

**Steps:**
1. Gallery → Share video → Car Crash Lawyer AI
2. Verify video preview loads
3. Upload video
4. Confirm success message

**Expected Result:** ✅ Complete upload in 10-30 seconds

---

### Scenario 2: Large Video File

**Setup:**
- 50-100MB video
- Variable network connection

**Steps:**
1. Share large video from Gallery
2. Monitor upload progress
3. Test pause/resume (if backgrounding)

**Expected Result:**
- Progress bar updates smoothly
- Upload completes without timeout
- File stored successfully

**Note:** Railway has a 100MB request body limit. Files >100MB may fail.

---

### Scenario 3: Poor Network Conditions

**Setup:**
- Enable "Airplane mode" → Re-enable WiFi (simulates poor connection)
- Share video from Gallery

**Steps:**
1. Start upload with poor network
2. Observe retry behaviour
3. Wait for completion

**Expected Result:**
- Upload retries automatically on network errors
- Progress persists (not reset to 0%)
- User sees "Retrying upload..." message

---

### Scenario 4: App Backgrounding During Upload

**Setup:**
- Start large video upload
- Switch to another app mid-upload

**Steps:**
1. Gallery → Share video → Car Crash Lawyer AI
2. Start upload
3. Press Home button → Open another app
4. Return to Car Crash Lawyer AI after 30 seconds

**Expected Result:**
- Upload continues in background (Android service)
- Progress resumes from last checkpoint
- Completion notification when done

**Known Limitation:** iOS may pause uploads when backgrounded. This is a platform restriction.

---

### Scenario 5: Multiple Videos in Succession

**Setup:**
- 3-5 videos ready in Gallery
- Share each one immediately after previous upload

**Steps:**
1. Share video 1 → Upload → Wait for success
2. Share video 2 → Upload → Wait for success
3. Share video 3 → Upload → Wait for success

**Expected Result:**
- Each video uploads independently
- No file conflicts or overwrites
- All videos stored with unique temp IDs

---

## Error Scenarios

### Error 1: "Share functionality is only available in the mobile app"

**Trigger:** Opening `attach-dashcam.html?source=share` in browser

**Root Cause:** Platform detection check fails (not Capacitor native)

**Expected Behaviour:** This is CORRECT - web browser should show this error

**Fix:** None needed - working as designed

---

### Error 2: "Failed to load shared video"

**Possible Causes:**
- Invalid content URI
- File permissions denied
- Storage access revoked

**Debugging Steps:**
1. Check localStorage: `pending_video_share` contains valid URI
2. Verify Capacitor Filesystem plugin has permissions:
   ```xml
   <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
   ```
3. Check Android logs: `adb logcat | grep "Filesystem"`

**Fix:** Reinstall app and grant storage permissions when prompted

---

### Error 3: Upload stalls at 0%

**Possible Causes:**
- Network timeout
- CORS issue (if using localhost)
- Server not running

**Debugging Steps:**
1. Check server is running: `npm run dev` (or verify Railway deployment)
2. Check network in Android: Settings → Network → WiFi connected
3. Check browser console for CORS errors

**Fix:**
- Restart server
- Switch to production URL in `capacitor.config.json`
- Check firewall settings

---

### Error 4: "File too large"

**Possible Causes:**
- Video exceeds 100MB (Railway limit)
- Insufficient device storage

**Expected Behaviour:**
- Error message: "File size exceeds maximum allowed (100MB)"
- Upload does not start

**Fix:** Use smaller video for testing (or increase Railway body parser limit)

---

### Error 5: Upload fails mid-transfer

**Possible Causes:**
- Network interruption
- Server timeout
- Storage quota exceeded

**Expected Behaviour:**
- Progress bar stops
- Error message: "Upload failed. Retrying..."
- Automatic retry after 3 seconds

**Debugging:**
```bash
# Check server logs for error
npm run dev

# Check storage quota
node scripts/check-storage-usage.js
```

---

## Server-Side Diagnostics

### Check Temp Uploads Table

```bash
# Script to verify uploads are stored
node scripts/check-temp-uploads.js

# Expected output:
Temp Uploads (Last 24 hours):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID: abc123...
User: user@example.com
Filename: dashcam_video.mp4
Size: 13.1 MB
Media Type: video
Created: 2 hours ago
Expires: 22 hours from now
Storage Path: temp_uploads/abc123.../dashcam_video.mp4
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Check Storage Bucket

```bash
# List files in temp_uploads folder
node scripts/list-temp-uploads-storage.js

# Expected output:
Supabase Storage: user-uploads/temp_uploads/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ dashcam_video.mp4 (13.1 MB)
   Path: temp_uploads/abc123.../dashcam_video.mp4
   Created: 2 hours ago
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Monitor Real-Time Logs

```bash
# Watch server logs during testing
npm run dev | grep -E "(temp-upload|video|dashcam)"

# Expected log patterns:
[INFO] POST /api/images/temp-upload - 200 (2345ms)
[INFO] Video upload received: dashcam_video.mp4 (13.1 MB)
[INFO] Stored in Supabase: temp_uploads/abc123.../dashcam_video.mp4
[INFO] Media type detected: video
```

---

## Cleanup After Testing

### Remove Test Data

```bash
# Clean up test temp uploads (older than 24 hours auto-expire)
node scripts/cleanup-test-uploads.js

# Manual cleanup of specific user's test data
node cleanup-incident-data.js <user-uuid>
```

### Uninstall Test APK

```bash
# Via ADB
adb uninstall com.carcrashlawyerai.app

# Or on device:
# Settings → Apps → Car Crash Lawyer AI → Uninstall
```

---

## Success Criteria

A successful test must meet ALL of these criteria:

✅ **Share Intent Recognition:**
- App appears in Android share menu when sharing video
- App launches with `?source=share` parameter

✅ **Video Loading:**
- Video preview displays correctly
- Play/pause controls work
- Filename and size displayed

✅ **Upload Functionality:**
- Progress bar updates smoothly 0% → 100%
- Upload completes without errors
- Success message displayed

✅ **Server Storage:**
- File stored in Supabase Storage (`user-uploads` bucket)
- Database record created in `temp_uploads` table
- `mediaType: "video"` correctly identified

✅ **24-Hour Expiry:**
- Temp upload record includes `expires_at` timestamp
- Cron job cleans up after 24 hours

---

## Known Issues & Limitations

### Platform-Specific

**Android:**
- ✅ Share intent fully supported
- ✅ Background uploads continue
- ⚠️ Files >100MB may fail (Railway limit)

**iOS:**
- ✅ Share intent supported (via Share Extension)
- ⚠️ Background uploads may pause when app backgrounds
- ⚠️ Requires explicit storage permissions

### Network

- **Slow networks:** Upload may take several minutes for large files
- **Mobile data:** Users may hit data caps with large videos
- **Railway timeout:** Uploads >5 minutes may timeout (increase if needed)

### Storage

- **Device storage:** Requires sufficient space for video file
- **Supabase quota:** Free tier has 1GB storage limit
- **Temp upload cleanup:** Cron job runs every 24 hours (not real-time)

---

## Troubleshooting Commands

```bash
# Check if server is running
curl https://carcrashlawyerai.co.uk/healthz

# Check temp uploads table schema
node scripts/verify-temp-uploads-schema.js

# Monitor upload in real-time
npm run dev | grep "temp-upload"

# Check Android device logs
adb logcat | grep "CarCrashLawyerAI"

# Check Supabase storage usage
node scripts/check-storage-usage.js

# Manually clean up test uploads
node scripts/cleanup-test-uploads.js --user=<user-uuid>
```

---

## Next Steps After Successful Testing

Once device testing is complete and successful:

1. **Document Results:**
   - Record test outcomes for each scenario
   - Note any edge cases or bugs found
   - Screenshot success flows for documentation

2. **Code Review:**
   - Review `public/attach-dashcam.html` for improvements
   - Check error handling completeness
   - Verify security considerations (file type validation)

3. **Update Documentation:**
   - Add to `README.md` or user guide
   - Update `MOBILE_APP_TRANSITION_PLAN.md`
   - Create user-facing instructions for dashcam sharing

4. **Production Readiness:**
   - Test with production Railway deployment
   - Verify storage quotas adequate for scale
   - Set up monitoring/alerts for failed uploads

5. **User Communication:**
   - Announce feature in app changelog
   - Create help docs or tutorial video
   - Add in-app tooltip/guide for first-time users

---

## Contact & Support

**Issues or Questions:**
- Check server logs first: `npm run dev`
- Review this guide's error scenarios
- Check `attach-dashcam.html` code for implementation details

**Further Debugging:**
- Supabase Dashboard: https://supabase.com/dashboard
- Railway Logs: https://railway.app/project/logs
- Android Studio Logcat: Device File Explorer → System Logs

---

**Last Updated:** 2026-01-11
**Tested By:** [Awaiting device testing]
**Status:** 🟡 Ready for device testing
