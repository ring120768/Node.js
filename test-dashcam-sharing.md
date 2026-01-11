# Dashcam Video Sharing - Testing Guide

## Test Environment Setup

### Prerequisites
- Node.js server running: `npm start`
- Android device or emulator with the app installed
- Test video file (recommended: 10-50MB MP4)
- Network connectivity for Supabase upload

## Phase 1: Web Interface Testing (Browser)

### Test 1.1: Direct Page Access
**URL**: `http://localhost:3000/attach-dashcam.html`

**Expected**:
- ✅ Page loads without errors
- ✅ Drag & drop zone is visible
- ✅ "Choose File" button works
- ✅ Instructions are clear

**How to verify**: Open browser console, check for JavaScript errors

---

### Test 1.2: Video File Selection
**Steps**:
1. Click "Choose File" button
2. Select a video file (MP4, MOV, AVI)
3. Observe preview area

**Expected**:
- ✅ Video preview loads and displays first frame
- ✅ File name is shown
- ✅ File size is displayed
- ✅ Video is playable in preview
- ✅ "Upload Video" button becomes active

**Test with**:
- Small video (< 10MB)
- Medium video (50-100MB)
- Large video (200-300MB)
- Invalid file type (image, PDF) - should reject

---

### Test 1.3: Drag & Drop
**Steps**:
1. Drag a video file from desktop
2. Drop onto the drop zone

**Expected**:
- ✅ Drop zone highlights on drag-over
- ✅ Video loads after drop
- ✅ Same behavior as file selection

---

### Test 1.4: Video Upload
**Steps**:
1. Select a test video
2. Click "Upload Video"
3. Monitor progress bar
4. Wait for completion

**Expected**:
- ✅ Progress bar updates (0% → 100%)
- ✅ Upload speed is shown
- ✅ Success message appears
- ✅ "Done" button becomes active
- ✅ Console shows upload confirmation with session ID

**Verify in Network tab**:
- POST to `/api/images/temp-upload`
- multipart/form-data request
- Response includes `mediaType: 'video'`

---

### Test 1.5: Error Handling
**Scenario A: Server offline**
- Stop Node.js server
- Try uploading
- Expected: Error message "Failed to upload video"

**Scenario B: Invalid file type**
- Try uploading a PDF or text file
- Expected: Browser file picker filters out non-video files

**Scenario C: Network interruption**
- Start upload of large file
- Disable network mid-upload
- Expected: Error message with retry option

---

### Test 1.6: Session Management
**Steps**:
1. Upload first video
2. Note the session ID in console
3. Click "Done"
4. Verify redirect to main page

**Expected**:
- ✅ Session ID format: `dashcam_TIMESTAMP_RANDOM`
- ✅ Same session ID persists in URL
- ✅ Can upload multiple videos to same session

---

## Phase 2: Share Intent Simulation (Browser)

### Test 2.1: Simulate Native Share
**Steps**:
1. Open browser console on index.html
2. Run this code to simulate share:
```javascript
const shareData = {
  videoUri: 'content://com.android.providers.media.documents/video/12345',
  timestamp: Date.now(),
  source: 'share_intent'
};
localStorage.setItem('pending_video_share', JSON.stringify(shareData));
window.location.href = '/attach-dashcam.html?source=share';
```

**Expected**:
- ✅ Redirects to attach-dashcam.html
- ✅ Console shows "📥 Processing shared video"
- ✅ Shows message "Shared video detected (simulated)"
- ✅ localStorage is cleared after processing

---

## Phase 3: Android Device Testing

### Test 3.1: Build and Deploy
**Commands**:
```bash
# Sync Capacitor
npx cap sync android

# Build debug APK
cd android
./gradlew assembleDebug

# Or run directly on connected device
npx cap run android
```

**Expected**:
- ✅ Build completes without errors
- ✅ APK installs on device
- ✅ App launches successfully

---

### Test 3.2: App Share Sheet Visibility
**Steps**:
1. Open Gallery or Files app on Android
2. Navigate to a video file
3. Tap the Share button
4. Scroll through share options

**Expected**:
- ✅ "Car Crash Lawyer AI" appears in share sheet
- ✅ App icon is visible
- ✅ Tapping the app opens it

---

### Test 3.3: Single Video Share (ACTION_SEND)
**Steps**:
1. Open Gallery app
2. Select ONE video file
3. Tap Share → Car Crash Lawyer AI
4. Observe app behavior

**Expected**:
- ✅ App opens to attach-dashcam.html
- ✅ URL includes `?source=share`
- ✅ Video preview auto-loads (may take a moment)
- ✅ Video is playable
- ✅ Can upload successfully

**Debug**: Check Android logcat for errors:
```bash
adb logcat | grep "CarCrashLawyer"
```

---

### Test 3.4: Multiple Video Share (ACTION_SEND_MULTIPLE)
**Steps**:
1. Open Gallery app
2. Select MULTIPLE video files
3. Tap Share → Car Crash Lawyer AI
4. Observe app behavior

**Expected** (current implementation):
- ✅ App opens
- ⚠️ Only first video is processed (limitation of current implementation)
- 📝 Note: Multi-file support can be added in future

---

### Test 3.5: Share While App Already Running
**Steps**:
1. Open Car Crash Lawyer AI app
2. Keep it running (don't close)
3. Switch to Gallery app
4. Share a video to Car Crash Lawyer AI

**Expected**:
- ✅ Existing app comes to foreground
- ✅ `appUrlOpen` event fires
- ✅ Video processing works correctly
- ✅ No duplicate app instances

**Why this works**: `android:launchMode="singleTask"` in AndroidManifest.xml

---

### Test 3.6: Share from Different Apps
Test sharing from multiple sources:

**Gallery App**:
- ✅ Google Photos
- ✅ Samsung Gallery
- ✅ OnePlus Gallery

**File Managers**:
- ✅ Files by Google
- ✅ Samsung My Files
- ✅ Solid Explorer

**Dashcam Apps** (if available):
- ✅ BlackVue
- ✅ Nextbase
- ✅ Generic dashcam apps

**Expected**: Should work from all apps that support standard Android share

---

### Test 3.7: Permission Handling
**Steps**:
1. Fresh app install
2. Try sharing a video
3. Check for permission prompts

**Expected**:
- ✅ Android 13+: READ_MEDIA_VIDEO permission requested
- ✅ User grants permission
- ✅ Video loads after permission granted
- ⚠️ If denied: Shows error message

---

## Phase 4: Backend Integration Testing

### Test 4.1: Verify Supabase Upload
**Steps**:
1. Upload a video through the app
2. Check Supabase dashboard

**Expected**:
- ✅ File appears in `user-documents` bucket
- ✅ Path format: `temp/{sessionId}/{filename}`
- ✅ File size matches original
- ✅ File is accessible via signed URL

**Supabase Dashboard**: https://supabase.com/dashboard/project/YOUR_PROJECT/storage/buckets

---

### Test 4.2: Database Record Creation
**Query**:
```sql
SELECT * FROM temp_uploads
WHERE file_type LIKE 'video/%'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected**:
- ✅ Record exists with correct session_id
- ✅ `file_type` is 'video/mp4' (or appropriate)
- ✅ `storage_path` matches Supabase file
- ✅ `media_type` is 'video'
- ✅ `file_size` is accurate

---

### Test 4.3: Linking to Incident Report
**Steps**:
1. Upload a dashcam video
2. Create a new incident report
3. Link the uploaded video

**Expected**:
- ✅ Video appears in attachments list
- ✅ Can be associated with incident
- ✅ Video is included in final PDF/report

---

## Performance Testing

### Test 5.1: Upload Speed
**Test with different file sizes**:
- 10MB video: Should complete in < 5 seconds on 4G
- 50MB video: Should complete in < 20 seconds on 4G
- 200MB video: Should complete in < 60 seconds on 4G
- 500MB video: Should complete in < 150 seconds on 4G

**Monitor**: Progress bar should update smoothly (every 100ms)

---

### Test 5.2: Memory Usage
**Large file uploads**:
- Upload 500MB video
- Monitor device memory usage
- Expected: No memory errors or crashes

---

### Test 5.3: Background Upload Resilience
**Steps**:
1. Start uploading large video
2. Switch to another app (home screen)
3. Wait 30 seconds
4. Return to app

**Expected**:
- ✅ Upload continues (or resumes if paused)
- ✅ Progress is preserved
- ⚠️ Some mobile browsers may pause upload when backgrounded

---

## Edge Cases & Error Scenarios

### Test 6.1: Corrupted Video File
- Share a corrupted/incomplete video
- Expected: Upload succeeds, but playback may fail

### Test 6.2: Unsupported Format
- Try sharing a proprietary video format
- Expected: Browser/Android may reject, or upload succeeds but preview fails

### Test 6.3: Network Timeout
- Upload on very slow connection (< 1 Mbps)
- Expected: Upload eventually completes, or shows timeout error

### Test 6.4: Storage Quota Exceeded
- Supabase storage limit reached
- Expected: Error message "Storage quota exceeded"

### Test 6.5: Session Expiry
- Start upload, close app, wait 24 hours, reopen
- Expected: Old session may be expired, creates new session

---

## Regression Testing

### Test 7.1: Existing Image Upload
**Verify images still work**:
1. Upload a photo using existing image upload
2. Confirm no breakage

**Expected**:
- ✅ Image upload endpoint still works
- ✅ `mediaType: 'image'` for images
- ✅ `mediaType: 'video'` for videos

---

## Documentation Verification

### Test 8.1: User Instructions
- Review attach-dashcam.html instructions
- Are they clear for non-technical users?
- Do they match actual behavior?

---

## Success Criteria

**Minimum viable** (must pass):
- ✅ Web interface uploads videos successfully
- ✅ Android share intent opens the app
- ✅ Videos upload to Supabase
- ✅ Database records are created correctly

**Full success** (should pass):
- ✅ All web tests pass
- ✅ Share works from Gallery and Files apps
- ✅ Multiple dashcam apps can share successfully
- ✅ Progress tracking works accurately
- ✅ Error handling is robust
- ✅ Performance is acceptable (< 60s for 200MB)

---

## Known Limitations

1. **Multi-file share**: Current implementation processes only first file in SEND_MULTIPLE
2. **Background uploads**: May pause when app is backgrounded on some Android versions
3. **iOS support**: Requires separate implementation using iOS share extensions
4. **File size limit**: 500MB enforced by backend (Supabase free tier limit)

---

## Next Steps After Testing

1. Fix any bugs discovered
2. Optimize upload performance if needed
3. Add multi-file support if required
4. Implement iOS share extension (separate phase)
5. Add analytics tracking for share usage
6. Create user documentation/FAQ

---

## Testing Checklist

Copy this to track your testing progress:

```
Web Interface:
[ ] Direct page access
[ ] Video file selection
[ ] Drag & drop
[ ] Video upload (small file)
[ ] Video upload (large file)
[ ] Error handling
[ ] Session management

Share Intent Simulation:
[ ] LocalStorage simulation

Android Device:
[ ] Build and deploy
[ ] Share sheet visibility
[ ] Single video share
[ ] Multiple video share
[ ] Share while app running
[ ] Gallery app share
[ ] File manager share
[ ] Dashcam app share
[ ] Permission handling

Backend:
[ ] Supabase upload verification
[ ] Database record creation
[ ] Link to incident report

Performance:
[ ] Upload speed (various sizes)
[ ] Memory usage
[ ] Background resilience

Edge Cases:
[ ] Corrupted file
[ ] Unsupported format
[ ] Network timeout
[ ] Storage quota
[ ] Session expiry

Regression:
[ ] Existing image upload
```

---

**Last Updated**: 2025-01-11
**Tester**: _________________
**Test Date**: _________________
