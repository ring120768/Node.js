# Dashcam Video Sharing Feature

Complete end-to-end implementation for receiving dashcam videos from external apps via native share sheets (iOS) and share intents (Android).

---

## Overview

Users can share dashcam footage directly from their gallery or dashcam app to Car Crash Lawyer AI. The app automatically opens to the attachment screen where the video can be uploaded and linked to an incident report.

**Supported Platforms:** Android ✅ | iOS (configured, needs testing)

---

## User Flow

1. **User opens dashcam app or gallery**
2. **User selects video and taps "Share"**
3. **User selects "Car Crash Lawyer AI" from share sheet**
4. **App opens to attach-dashcam.html**
5. **Video automatically loads in preview**
6. **User taps "Upload Video"**
7. **Video uploads to temp storage (500MB max)**
8. **User continues to incident report with video attached**

---

## Architecture

### Components

| Component | File | Purpose |
|-----------|------|---------|
| **Backend Endpoint** | `src/controllers/tempImageUpload.controller.js` | Accepts video uploads (POST /api/images/temp-upload) |
| **Web Interface** | `public/attach-dashcam.html` | Video upload UI with preview and progress |
| **Share Handler** | `public/js/share-handler.js` | Detects shared content on app launch |
| **Android Intent** | `android/app/src/main/AndroidManifest.xml` | Registers app for video/* MIME types |
| **iOS Configuration** | `ios/App/Info.plist` (pending) | Share extension support |

### Data Flow

```
External App (Dashcam/Gallery)
  ↓ [Share Intent with content:// URI]
Share Handler (share-handler.js)
  ↓ [Store in localStorage]
Attach Screen (attach-dashcam.html)
  ↓ [Read content URI via Filesystem plugin]
  ↓ [Convert to Blob/File]
  ↓ [Upload via XHR with progress tracking]
Backend (/api/images/temp-upload)
  ↓ [Validate, store in Supabase temp/]
  ↓ [Create temp_uploads record]
Response: { uploadId, tempPath, mediaType: 'video' }
  ↓ [Pass to incident form via URL params]
Incident Form
  ↓ [Link temp upload to final report]
```

---

## Backend Configuration

### Video Upload Endpoint

**Endpoint:** `POST /api/images/temp-upload`

**Accepts:**
- Images: JPEG, PNG, GIF, WebP (max 10MB)
- Videos: MP4, MOV, AVI, WebM (max 500MB) ✅ NEW

**Request:**
```javascript
// multipart/form-data
{
  file: [Binary video file],
  field_name: 'dashcam_video',
  temp_session_id: 'dashcam_1234567890_abc123'
}
```

**Response:**
```json
{
  "success": true,
  "tempPath": "temp/dashcam_1234567890_abc123/dashcam_video_1234567890.mp4",
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "previewUrl": "https://xxx.supabase.co/storage/v1/object/public/user-documents/temp/...",
  "fileSize": 52428800,
  "checksum": "abc123...",
  "expiresAt": "2026-01-12T12:00:00.000Z",
  "mediaType": "video"  // NEW: 'image' or 'video'
}
```

**Storage:**
- Bucket: `user-documents`
- Path: `temp/{session_id}/{field_name}_{timestamp}.{ext}`
- Expiry: 24 hours (cron cleanup)

**Database:**
- Table: `temp_uploads`
- Fields: `session_id`, `field_name`, `storage_path`, `file_size`, `mime_type`, `uploaded_at`, `expires_at`, `claimed`

**Key Changes:**
```javascript
// Extended file filter
fileFilter: (req, file, cb) => {
  const allowedTypes = ['image/', 'video/'];  // Added video/*
  const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
  // ...
}

// Increased size limit
limits: {
  fileSize: 500 * 1024 * 1024  // 500MB (was 10MB)
}

// Added media type detection
const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
```

---

## Android Configuration

### Intent Filters

**File:** `android/app/src/main/AndroidManifest.xml`

```xml
<!-- Handle single video sharing -->
<intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="video/*" />
</intent-filter>

<!-- Handle multiple video sharing (batch) -->
<intent-filter>
    <action android:name="android.intent.action.SEND_MULTIPLE" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="video/*" />
</intent-filter>
```

**What this does:**
- Adds "Car Crash Lawyer AI" to Android share sheet when sharing video files
- Supports all video MIME types (MP4, MOV, AVI, WebM, etc.)
- Handles both single and multiple video sharing

### Permissions

```xml
<!-- Required for reading shared videos -->
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
```

**Permission Tiers:**
- Android 13+ (API 33+): `READ_MEDIA_VIDEO` (granular)
- Android 10-12 (API 29-32): `READ_EXTERNAL_STORAGE`
- Android 9 and below: `READ_EXTERNAL_STORAGE` + `WRITE_EXTERNAL_STORAGE`

### Activity Configuration

```xml
<activity
    android:launchMode="singleTask"
    android:exported="true">
```

**Why singleTask?**
- Prevents duplicate activities when app is already running
- Shared content triggers `appUrlOpen` event in existing activity
- User returns to their current position in the app after sharing

---

## iOS Configuration (Pending iOS Directory)

### Share Extension Setup

**File:** `ios/App/Info.plist`

```xml
<!-- URL Scheme for deep linking -->
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>carcrashlawyerai</string>
        </array>
    </dict>
</array>

<!-- Document Types (accept video files) -->
<key>CFBundleDocumentTypes</key>
<array>
    <dict>
        <key>CFBundleTypeName</key>
        <string>Video Files</string>
        <key>LSHandlerRank</key>
        <string>Alternate</string>
        <key>LSItemContentTypes</key>
        <array>
            <string>public.movie</string>
            <string>public.video</string>
            <string>public.mpeg-4</string>
            <string>com.apple.quicktime-movie</string>
        </array>
    </dict>
</array>

<!-- Photo Library Usage (if needed) -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Access photos and videos to attach dashcam footage to incident reports</string>
```

### iOS Share Extension (Advanced)

For more seamless iOS integration, create a Share Extension:

```bash
# In Xcode
File → New → Target → Share Extension
```

This allows the app to appear in the iOS share sheet with custom UI. Implementation deferred until iOS directory exists.

---

## Web Interface

### Attach Dashcam Screen

**File:** `public/attach-dashcam.html`

**Features:**
- Drag & drop video upload
- File browser selection
- Video preview with HTML5 player
- Upload progress bar (0-100%)
- File size validation (500MB max)
- MIME type validation (video/*)
- Error handling and retry
- Session management via URL params
- Auto-load shared videos from share intent

**Session Flow:**
```
1. Generate session ID: dashcam_{timestamp}_{random}
2. Upload video → temp_uploads table
3. Store uploadId in localStorage
4. Pass to incident form: /incident.html?session_id=xxx&dashcam_video=yyy
5. Incident form claims temp upload
```

**Share Intent Flow:**
```
1. share-handler.js detects shared video
2. Stores content URI in localStorage
3. Redirects to: /attach-dashcam.html?source=share
4. Page reads content URI via Filesystem plugin
5. Converts to Blob → File object
6. Auto-loads in preview (no user selection needed)
7. User clicks "Upload Video" to proceed
```

---

## Share Handler

### File: `public/js/share-handler.js`

**Initialization:**
```javascript
// Automatically runs on app launch
if (Capacitor.isNativePlatform()) {
  App.addListener('appUrlOpen', handleSharedContent);
}
```

**Share Detection:**
```javascript
function isShareIntent(url) {
  return url && (
    url.startsWith('content://') ||  // Android content URI
    url.startsWith('file://') ||      // iOS file URL
    url.includes('action=send')       // Android share action
  );
}
```

**Processing:**
```javascript
async function processSharedVideo(url) {
  // Store content URI
  localStorage.setItem('pending_video_share', JSON.stringify({
    videoUri: url,
    timestamp: Date.now(),
    source: 'share_intent'
  }));

  // Redirect to attachment page
  window.location.href = '/attach-dashcam.html?source=share';
}
```

**Android Content URI Reading:**
```javascript
const { Filesystem } = Capacitor.Plugins;

// Read shared file
const result = await Filesystem.readFile({
  path: 'content://...'
});

// Convert to Blob
const blob = base64ToBlob(result.data, 'video/mp4');

// Create File
const file = new File([blob], 'dashcam_video.mp4', { type: 'video/mp4' });
```

---

## Testing

### Browser Testing (Development)

```bash
# Start server
npm run dev

# Open in browser
open http://localhost:5000/attach-dashcam.html

# Test drag & drop
# 1. Find a video file (MP4, MOV, etc.)
# 2. Drag into the drop zone
# 3. Verify preview loads
# 4. Click "Upload Video"
# 5. Watch progress bar (0-100%)
# 6. Verify success message
```

### Android Testing (Share Intent)

```bash
# Build and deploy to Android
npx cap sync android
npx cap run android

# Or open in Android Studio
npx cap open android
# Then: Build → Run

# Test share flow:
# 1. Open Gallery or Files app on Android device
# 2. Find a video file
# 3. Tap Share button
# 4. Select "Car Crash Lawyer AI" from share sheet
# 5. App should open to attach-dashcam.html
# 6. Video should auto-load in preview
# 7. Tap "Upload Video"
# 8. Verify upload completes
```

### iOS Testing (Pending)

```bash
# Add iOS platform (macOS only)
npx cap add ios

# Open in Xcode
npx cap open ios

# Test share flow (similar to Android)
```

### Manual Testing Checklist

- [ ] **Backend**: POST /api/images/temp-upload accepts video files
- [ ] **Backend**: 500MB files upload successfully
- [ ] **Backend**: Returns mediaType: 'video' in response
- [ ] **Web**: Drag & drop video loads preview
- [ ] **Web**: Progress bar tracks upload (0-100%)
- [ ] **Web**: Error handling for large files (>500MB)
- [ ] **Android**: App appears in share sheet for videos
- [ ] **Android**: Shared video auto-loads in app
- [ ] **Android**: Content URI reading works
- [ ] **Android**: Upload completes from shared video
- [ ] **Session**: Upload ID persists in localStorage
- [ ] **Session**: Incident form receives dashcam_video param

---

## Troubleshooting

### "App not appearing in Android share sheet"

**Cause:** Intent filters not registered or app not rebuilt after manifest changes.

**Fix:**
```bash
# Sync Capacitor
npx cap sync android

# Rebuild app
cd android
./gradlew clean
./gradlew assembleDebug

# Or in Android Studio: Build → Clean Project → Rebuild Project
```

### "Error reading shared video file"

**Cause:** Missing READ_MEDIA_VIDEO permission or user denied permission.

**Fix:**
1. Check AndroidManifest.xml has `READ_MEDIA_VIDEO` permission
2. Request permission at runtime:
```javascript
const { Permissions } = Capacitor.Plugins;
await Permissions.request({ name: 'storage' });
```
3. User may need to manually grant permission in Android Settings

### "Upload fails for large videos"

**Cause:** Network timeout, server limits, or insufficient memory.

**Fix:**
- Increase server timeout: `server.timeout = 600000` (10 minutes)
- Check Railway memory limits (512MB default)
- Consider chunked upload for files >100MB (future enhancement)
- Verify Supabase Storage free tier limit (5GB total)

### "Video preview not showing"

**Cause:** Invalid video codec or browser doesn't support format.

**Fix:**
- Use widely supported formats (MP4 with H.264)
- Check browser console for codec errors
- Test with different video files
- Consider adding codec detection and conversion

### "Share handler not detecting shared content"

**Cause:** Capacitor plugins not loaded or share-handler.js not included.

**Fix:**
1. Verify Capacitor is loaded: `console.log(Capacitor.isNativePlatform())`
2. Include script in main HTML: `<script src="/js/share-handler.js"></script>`
3. Check browser console for errors
4. Verify App plugin is installed: `npm ls @capacitor/app`

---

## Performance Considerations

### Upload Times (500MB video)

| Connection | Time | Notes |
|------------|------|-------|
| WiFi (100 Mbps) | ~45 seconds | Ideal for dashcam uploads |
| 5G (50 Mbps) | ~90 seconds | Acceptable |
| 4G (10 Mbps) | ~7 minutes | Slow but functional |
| 3G (1 Mbps) | ~70 minutes | Too slow, recommend WiFi |

**Recommendation:** Show "WiFi recommended" message for videos >50MB.

### Memory Usage

- **Server:** ~500-700MB during upload (Railway 512MB default may struggle)
- **Client:** ~100-200MB for video preview
- **Storage:** Temp files cleared after 24 hours

**Optimization:**
- Use streaming upload (multer memoryStorage already efficient)
- Consider upgrading Railway plan for $5/mo (1GB memory)
- Add upload resume capability for interrupted uploads (future)

---

## Future Enhancements

### Priority 1 (Recommended)
- [ ] **Chunked uploads** - Split large files into smaller chunks for reliability
- [ ] **Upload resume** - Continue interrupted uploads from last chunk
- [ ] **Video compression** - Reduce file size before upload (client-side)
- [ ] **Multiple video support** - Handle SEND_MULTIPLE intent for batch uploads

### Priority 2 (Nice to Have)
- [ ] **iOS Share Extension** - Native iOS share sheet UI
- [ ] **Video trimming** - Let users trim video before upload
- [ ] **Thumbnail generation** - Create preview thumbnail for dashboard
- [ ] **Background upload** - Continue upload when app backgrounded

### Priority 3 (Future)
- [ ] **Cloud transcoding** - Convert videos to standard format server-side
- [ ] **CDN delivery** - Serve uploaded videos via CDN for faster playback
- [ ] **Video analytics** - Track which dashcam formats are most common
- [ ] **Direct cloud upload** - Upload directly to Supabase Storage (bypass server)

---

## Security Considerations

### Input Validation
- ✅ MIME type validation (video/* only)
- ✅ File size limit (500MB max)
- ✅ Session ID validation (UUID format)
- ✅ Checksum verification (SHA-256)

### Storage Security
- ✅ Temporary storage with 24-hour expiry
- ✅ Random session IDs prevent guessing
- ✅ Files stored in user-specific paths
- ✅ Access controlled via Supabase RLS

### Recommendations
- [ ] Add virus scanning for uploaded videos (ClamAV integration)
- [ ] Rate limit uploads (max 3 videos per user per hour)
- [ ] Add watermark to prevent misuse
- [ ] Log all uploads for audit trail

---

## Dependencies

### NPM Packages
- `multer` - File upload middleware ✅ (already installed)
- `@supabase/supabase-js` - Storage backend ✅ (already installed)
- `crypto` - Checksum generation ✅ (Node.js built-in)

### Capacitor Plugins
- `@capacitor/app` - App lifecycle events ✅ (already installed)
- `@capacitor/filesystem` - Read content URIs ✅ (already installed)
- `@capacitor/share` - Future: Programmatic sharing ⏳ (not needed yet)

### No Additional Installation Required
All necessary packages are already part of the project. Just sync and rebuild:
```bash
npx cap sync
```

---

## API Reference

### POST /api/images/temp-upload

**Description:** Upload image or video file to temporary storage

**Authentication:** Not required (uses session ID)

**Content-Type:** multipart/form-data

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | Binary | Yes | Image or video file (max 500MB) |
| field_name | String | Yes | Form field name (e.g., 'dashcam_video') |
| temp_session_id | String | Yes | Unique session ID for grouping uploads |

**Response (200 OK):**
```json
{
  "success": true,
  "tempPath": "temp/session_id/field_name_timestamp.ext",
  "uploadId": "uuid-v4",
  "previewUrl": "https://...",
  "fileSize": 123456,
  "checksum": "sha256-hash",
  "expiresAt": "ISO-8601 timestamp",
  "mediaType": "video"
}
```

**Errors:**

| Status | Cause | Response |
|--------|-------|----------|
| 400 | No file provided | `{ "error": "No file provided" }` |
| 400 | Missing field_name | `{ "error": "field_name is required" }` |
| 400 | Missing session ID | `{ "error": "temp_session_id is required" }` |
| 413 | File too large | `{ "error": "File too large. Maximum size is 500MB" }` |
| 415 | Invalid file type | `{ "error": "Only image and video files are allowed" }` |
| 500 | Upload failed | `{ "error": "Internal server error", "message": "..." }` |

---

## File Locations

```
/Users/ianring/Node.js/
├── src/
│   └── controllers/
│       └── tempImageUpload.controller.js      # Backend upload handler
├── public/
│   ├── attach-dashcam.html                    # Video upload UI
│   └── js/
│       └── share-handler.js                   # Share intent handler
├── android/
│   └── app/src/main/
│       └── AndroidManifest.xml                # Intent filters
├── ios/ (pending)
│   └── App/
│       └── Info.plist                         # iOS share config
└── docs/
    └── DASHCAM_VIDEO_SHARING.md              # This file
```

---

## Support

For issues or questions:
1. Check browser console for errors
2. Check server logs: `railway logs` or `npm run dev` output
3. Verify intent filters: `adb shell dumpsys package com.carcrashlawyerai.app`
4. Review this documentation
5. Contact development team

---

**Last Updated:** 2026-01-11
**Version:** 1.0.0
**Status:** ✅ Android Implemented | ⏳ iOS Pending Testing
