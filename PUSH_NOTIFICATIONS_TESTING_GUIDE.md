# Push Notifications Testing Guide

## ✅ What's Complete

1. **Firebase Cloud Messaging** - Fully configured and integrated
2. **Android APK** - Built with Firebase support (23MB)
3. **Backend Integration** - Push notifications sent when PDF ready
4. **Client Handler** - Registers devices, displays notifications
5. **Database Schema** - Migration ready (needs manual application)
6. **Railway Variables** - Firebase Server Key added

---

## ⚠️ CRITICAL: Apply Database Migration First

**Before testing, you MUST apply the database migration to add the `fcm_token` column.**

### Apply Migration (Supabase Dashboard)

1. Go to https://supabase.com/dashboard
2. Select your project: **kctlcmbjmhcfoobmkfrs**
3. Navigate to **SQL Editor**
4. Click **New query**
5. Paste the following SQL:

```sql
-- Add FCM token column
ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Add index for faster lookups when sending notifications
CREATE INDEX IF NOT EXISTS idx_user_signup_fcm_token
ON user_signup(fcm_token)
WHERE fcm_token IS NOT NULL;

-- Add comment
COMMENT ON COLUMN user_signup.fcm_token IS 'Firebase Cloud Messaging device token for push notifications';
```

6. Click **Run**
7. Verify success (should show "Success. No rows returned")

**Migration file:** `migrations/017_add_fcm_token.sql`
**Rollback file:** `migrations/017_add_fcm_token_rollback.sql`

---

## 📱 Testing Steps

### Step 1: Install APK on Android Device

**Option A: Via USB (ADB)**
```bash
# Connect Android device via USB (enable USB debugging in Developer Options)
adb devices  # Verify device connected

# Install APK
adb install /Users/ianring/Node.js/android/app/build/outputs/apk/release/app-release.apk

# Or reinstall if already installed
adb install -r /Users/ianring/Node.js/android/app/build/outputs/apk/release/app-release.apk
```

**Option B: Transfer to Device**
1. Copy `app-release.apk` to device (email, cloud storage, etc.)
2. Open file on device
3. Allow "Install from unknown sources" if prompted
4. Install app

---

### Step 2: Verify App Installation

1. **Open Car Crash Lawyer AI app**
2. **Sign up or log in** with test account
3. **Check console logs** (if using `adb logcat`):
   ```bash
   adb logcat | grep Push
   ```

   Expected output:
   ```
   [Push] Permission granted, registering device...
   [Push] Device registered: xxxxx...
   [Push] Token saved to profile
   ```

4. **Verify in database** (Supabase Dashboard → Table Editor → user_signup):
   - Find your test user record
   - Check `fcm_token` column has a value (long alphanumeric string)
   - If empty, check app logs for errors

---

### Step 3: Complete Full Incident Report

**⚠️ Important:** Testing requires completing an actual incident report to trigger PDF generation.

1. **Start from Page 1** - Fill personal info
2. **Continue through Pages 2-12** - Complete all required fields
3. **Upload images** - At least one photo required
4. **Submit final page** - This triggers PDF generation queue

**Expected timeline:**
- Form submission: Immediate
- PDF generation: 2-3 minutes
- Push notification: Within 5 seconds of PDF completion
- Email: Sent immediately after PDF (backup notification)

---

### Step 4: Monitor Notification Delivery

**When PDF generation completes, you should receive:**

#### **🔔 Push Notification (if app installed)**
```
Title: ✅ Your Report is Ready!
Body: We've generated your incident report. Tap to view your PDF.
```

**Notification behavior:**

| App State | What Happens |
|-----------|--------------|
| **Foreground** (app open) | In-app banner at top (dark teal #0E7490, auto-dismisses after 5s) |
| **Background** (app minimized) | System notification in status bar |
| **Closed** (app not running) | System notification in status bar |

**Tap action:** Opens report page (`/report.html`)

#### **📧 Email (always sent)**
```
To: Your email
Subject: Traffic Accident Legal Report - DD/MM/YYYY HH:MM
Attachments: PDF report
```

Email is sent regardless of push notification status (backup delivery method).

---

### Step 5: Verify Notification Receipt

**Check on device:**
1. Look for system notification or in-app banner
2. If app was open, verify dark teal banner appeared
3. Tap notification → Should navigate to report page
4. Verify PDF downloadable from report page

**Check email inbox:**
- Email should arrive within 1 minute of PDF completion
- PDF should be attached and downloadable

**Check Railway logs:**
```bash
railway logs
```

Look for:
```
📱 Push notification sent successfully
✅ Email sent successfully to user
```

---

## 🐛 Troubleshooting

### ❌ No Push Notification Received

**Check 1: FCM Token Registration**
```bash
# View device logs
adb logcat | grep -E "Push|FCM"
```

Expected:
```
[Push] Device registered: xxxxx...
[Push] Token saved to profile
```

If not seeing registration:
- Check app permissions (Settings → Apps → Car Crash Lawyer AI → Notifications)
- Verify google-services.json in `android/app/google-services.json`
- Reinstall app and log in again

**Check 2: Database Token**
1. Supabase Dashboard → Table Editor → user_signup
2. Find your user record
3. Check `fcm_token` column has value
4. If null, token save failed (check API endpoint)

**Check 3: Railway Logs**
```bash
railway logs | grep -i push
```

Look for:
```
📱 Updating FCM token (on login)
📱 Push notification sent successfully (on PDF complete)
```

If seeing errors:
- `Firebase not configured` → Check FIREBASE_SERVER_KEY in Railway
- `Failed to send notification` → Check Firebase Console for server key
- `No FCM token` → User needs to log out and log in again

### ❌ Wrong Notification Color

If in-app banner is blue instead of dark teal:
- File: `public/js/push-notifications.js`
- Line 130: Should be `background: #0E7490;`
- Redeploy if changed

### ❌ Notification Tap Doesn't Navigate

Check `handleNotificationAction()` in `public/js/push-notifications.js`:
```javascript
case 'pdf_ready':
  window.location.href = '/report.html';  // Should navigate here
```

### ❌ Email Received but No Push

This is **expected behavior** if:
- User hasn't installed mobile app
- User denied notification permissions
- Device token registration failed

Email is the backup delivery method and always sent.

### ❌ Neither Email Nor Push Received

**Critical issue** - Check PDF generation:
```bash
node check-pdf-queue-state.js
```

If PDF failed:
```bash
node requeue-failed-pdfs.js
```

---

## 📊 Success Criteria

**✅ Test passes if:**
1. ✅ App installs successfully
2. ✅ User logs in and FCM token saved to database
3. ✅ Push notification received when PDF ready
4. ✅ Email also received as backup
5. ✅ Tapping notification navigates to report page
6. ✅ In-app banner shows dark teal color (#0E7490)

**⚠️ Partial success:**
- Email works but no push → Check FCM token registration
- Push works but wrong color → Check CSS in push-notifications.js

---

## 🔄 Reset Testing

To test again with clean state:

```bash
# Clear test user data
node cleanup-incident-data.js [user-uuid]

# Uninstall app from device
adb uninstall com.carcrashlawyerai.app

# Reinstall fresh
adb install /Users/ianring/Node.js/android/app/build/outputs/apk/release/app-release.apk
```

---

## 🚀 Next Steps After Successful Test

1. **Deploy to Railway** (if code changes needed):
   ```bash
   git add .
   git commit -m "feat: Add Firebase Cloud Messaging push notifications"
   git push origin main
   ```

2. **Optional: Build Google Play AAB** (for Play Store submission):
   ```bash
   cd android
   ./gradlew bundleRelease
   # Creates: app/build/outputs/bundle/release/app-release.aab
   ```

3. **Optional: Add WhatsApp Business API** (1000 free messages/month):
   - Future enhancement for users without app installed
   - See: https://business.whatsapp.com/products/business-platform

---

## 📝 Implementation Details

### Files Modified/Created

| File | Purpose |
|------|---------|
| `FIREBASE_SETUP_GUIDE.md` | Manual Firebase setup instructions |
| `lib/services/firebaseService.js` | Server-side push notification sender |
| `public/js/push-notifications.js` | Client-side notification handler |
| `migrations/017_add_fcm_token.sql` | Database migration (forward) |
| `migrations/017_add_fcm_token_rollback.sql` | Database migration (rollback) |
| `src/controllers/profile.controller.js` | API endpoint for FCM token updates |
| `src/routes/profile.routes.js` | Route for FCM token endpoint |
| `lib/emailService.js` | Integration with push notifications |
| `android/app/google-services.json` | Firebase configuration |
| `.env` | Firebase Server Key (FIREBASE_SERVER_KEY) |

### Environment Variables

**Railway (Production):**
```bash
FIREBASE_SERVER_KEY=LLZeaUGtEOgw6fKF29vnxUEu32tgtPPQfNMm8mUVxdJ-lugnunnnVRCp1BETvLW-UtOMcLzO7ZB7GUTfCUwZT8
```

**Local (.env):**
```bash
# Already added to .env file
FIREBASE_SERVER_KEY=LLZeaUGtEOgw6fKF29vnxUEu32tgtPPQfNMm8mUVxdJ-lugnunnnVRCp1BETvLW-UtOMcLzO7ZB7GUTfCUwZT8
```

### API Endpoints

**POST /api/profile/update-fcm-token**
- **Purpose:** Save device FCM token to database
- **Auth:** Required (user must be logged in)
- **Body:** `{ "fcmToken": "xxxxx..." }`
- **Response:** `{ "success": true, "message": "Notification token updated successfully" }`

---

## 💡 How It Works

### Registration Flow
```
App Launch → User Logs In
          ↓
Permission Request → User Grants
          ↓
Capacitor Plugin → Registers with Firebase
          ↓
FCM Token Generated
          ↓
POST /api/profile/update-fcm-token
          ↓
Saved to user_signup.fcm_token
```

### Notification Flow
```
PDF Generation Complete
          ↓
Fetch user's FCM token from database
          ↓
Send notification via Firebase API
          ↓
Firebase → Device
          ↓
App State Check:
  - Foreground → Show in-app banner (dark teal)
  - Background/Closed → System notification
          ↓
User Taps Notification → Navigate to /report.html
```

---

## 🎯 Cost Analysis

### Firebase Cloud Messaging
- **Push Notifications:** FREE unlimited
- **Storage:** FREE (Firebase Realtime Database not used)
- **Bandwidth:** FREE (notifications are tiny payloads)

**Total Cost:** £0.00

### Alternative: WhatsApp Business Cloud API
- **Messages:** 1000 free/month, then ~£0.01-0.05 per message
- **Current usage:** Not implemented (future enhancement)

**Total Cost:** £0.00 (within free tier)

---

**Last Updated:** 2026-01-06
**Status:** Ready for testing
**Estimated Test Duration:** 15-20 minutes
