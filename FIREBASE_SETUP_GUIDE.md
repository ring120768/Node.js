# Firebase Push Notifications Setup Guide

## Overview

Firebase Cloud Messaging (FCM) provides **completely free** push notifications for iOS and Android. This guide walks through setting up FCM for Car Crash Lawyer AI.

---

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Project name: `Car Crash Lawyer AI`
4. Disable Google Analytics (optional - we don't need it)
5. Click **"Create project"**

---

## Step 2: Add Android App to Firebase

1. In Firebase Console, click **"Add app"** → Android icon
2. **Android package name:** `com.carcrashlawyerai.app`
   (Must match `appId` in `capacitor.config.ts`)
3. **App nickname:** `Car Crash Lawyer AI Android`
4. **Debug signing certificate (optional):** Leave blank for now
5. Click **"Register app"**

### Download google-services.json

6. Download `google-services.json` file
7. **IMPORTANT:** Save it to: `/Users/ianring/Node.js/android/app/google-services.json`

```bash
# Move the downloaded file (replace ~/Downloads with your download location)
mv ~/Downloads/google-services.json /Users/ianring/Node.js/android/app/google-services.json
```

---

## Step 3: Configure Android Project

The Firebase SDK is already configured in your Android project, but verify:

### File: `android/app/build.gradle`

Should have at the bottom:

```gradle
apply plugin: 'com.google.gms.google-services'
```

### File: `android/build.gradle`

Should have in dependencies:

```gradle
classpath 'com.google.gms:google-services:4.4.0'
```

**Note:** These are likely already configured. If not, I'll add them.

---

## Step 4: Get Server Key

1. In Firebase Console, click **⚙️ Settings** → **Project settings**
2. Go to **"Cloud Messaging"** tab
3. Scroll to **"Cloud Messaging API (Legacy)"**
4. Copy **"Server key"**
5. Add to `.env`:

```bash
FIREBASE_SERVER_KEY=AAAA...your-key-here
```

⚠️ **Security:** Never commit this key to Git. It's already in `.gitignore`.

---

## Step 5: Enable Cloud Messaging API

1. In Firebase Console, **"Cloud Messaging"** tab
2. Click **"Manage API in Google Cloud Console"**
3. Enable **"Firebase Cloud Messaging API"**
4. (The legacy API is deprecated but still works - this is the new API)

---

## Step 6: Add Service Worker (Web Push - Optional)

For web-based push notifications (desktop browsers), create:

### File: `public/firebase-messaging-sw.js`

```javascript
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "car-crash-lawyer-ai.firebaseapp.com",
  projectId: "car-crash-lawyer-ai",
  storageBucket: "car-crash-lawyer-ai.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
```

---

## Step 7: Implementation Code

I'll create the following files:

1. **`lib/services/firebaseService.js`** - Server-side notification sending
2. **`public/js/push-notifications.js`** - Client-side registration
3. **`src/controllers/notification.controller.js`** - API endpoints

---

## Testing

### Register Device Token

1. Open app on Android device/emulator
2. Grant notification permission when prompted
3. Device token will be saved to database (`user_signup.fcm_token`)

### Send Test Notification

```bash
node test-firebase-notification.js [user-uuid]
```

This will send:
- **Title:** "Your PDF Report is Ready!"
- **Body:** "We've generated your incident report. Tap to view."
- **Data:** `{ reportId: "uuid", action: "open_report" }`

---

## Production Flow

When PDF generation completes:

```javascript
// In src/services/pdfQueueService.js after successful PDF generation
await notificationService.sendPdfReadyNotification(userId, pdfUrl);
```

This will:
1. ✅ Send push notification to user's device
2. ✅ Send WhatsApp message (if configured & under 1000/month)
3. ✅ Send email with PDF (already working)

---

## Costs

| Service | Cost |
|---------|------|
| Firebase Cloud Messaging | **FREE** (unlimited) |
| Firebase Hosting | **FREE** (generous quota) |
| Firebase Analytics | **FREE** (optional) |

**Total:** £0.00 🎉

---

## Troubleshooting

### Notifications not received?

1. Check device token is saved: `SELECT fcm_token FROM user_signup WHERE create_user_id = 'uuid'`
2. Check Firebase Console → Cloud Messaging → Send test message
3. Verify `google-services.json` is in `android/app/` folder
4. Check Android app has notification permission granted

### "MismatchSenderId" error?

- Verify `google-services.json` matches your Firebase project
- Check package name is `com.carcrashlawyerai.app`

### Server key not working?

- Use the **Server key** from Cloud Messaging tab (not Web Push certificates)
- Verify Cloud Messaging API is enabled in Google Cloud Console

---

## Next Steps

After Firebase is set up, I'll help you add:

1. ✅ WhatsApp Business Cloud API (1000 free messages/month)
2. ✅ Notification preferences UI (let users choose push/WhatsApp/email)
3. ✅ Multi-channel delivery (try push first, fallback to WhatsApp/email)

---

**Last Updated:** 2026-01-06
