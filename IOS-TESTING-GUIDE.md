# iOS Testing Guide - v2.0.18

**Status:** Ready for Testing
**Date:** February 3, 2026

---

## ✅ Preparation Complete

- ✅ iOS platform added to project
- ✅ Web assets synced (all Phase 2 features)
- ✅ 9 Capacitor plugins configured
- ✅ Backend deployed to Railway
- ✅ Android version tested and verified

---

## 📱 Opening Xcode

Run this command to open the iOS project:

```bash
npx cap open ios
```

**Or manually:**
```bash
open ios/App/App.xcworkspace
```

⚠️ **Important:** Always open the `.xcworkspace` file, NOT the `.xcodeproj` file!

---

## 🔧 Update Version Number in Xcode

1. **Select the App target** in the project navigator (left sidebar)
2. **Go to General tab**
3. **Update Identity section:**
   - **Version:** `2.0.18` (matches Android)
   - **Build:** `20018` (matches Android versionCode)

**Current Android Version (for reference):**
- Version Name: 2.0.18
- Version Code: 20018

---

## 🚀 Building for iOS

### Development Build (Simulator)

1. Select a simulator from the device dropdown (e.g., iPhone 15 Pro)
2. Click the Play button (▶️) or press `⌘R`
3. Wait for build to complete
4. App will launch in simulator

### Development Build (Physical Device)

**Requirements:**
- Apple Developer account
- Device connected via USB
- Device registered in Developer Portal

**Steps:**
1. Connect iPhone/iPad via USB
2. Select your device from the device dropdown
3. Click Play button (▶️)
4. If prompted, trust the developer certificate on device
5. App will install and launch

### Production Build (TestFlight/App Store)

**Archive the App:**
1. Select "Any iOS Device (arm64)" from device dropdown
2. Go to **Product → Archive**
3. Wait for archive to complete (may take 5-10 minutes)
4. Xcode Organizer window will open

**Upload to App Store Connect:**
1. Select the archive
2. Click "Distribute App"
3. Choose "App Store Connect"
4. Follow the upload wizard
5. Archive will appear in TestFlight within ~5 minutes

---

## 🧪 Testing Checklist

### Core Functionality
- [ ] Login/Authentication works
- [ ] Dashboard loads correctly
- [ ] All navigation works

### Phase 2 Features (NEW)
- [ ] Profile editing modal opens
- [ ] Contact details edit and save
- [ ] Vehicle details edit and save (including vehicle condition)
- [ ] Insurance details edit and save
- [ ] License details edit and save
- [ ] Changes persist after app restart

### Image Upload (NEW)
- [ ] Camera access permission prompt appears
- [ ] Take photo with camera works
- [ ] Select from photo library works
- [ ] Driving license upload succeeds
- [ ] Vehicle photo uploads succeed (front, back, sides)
- [ ] Uploaded images appear in profile completion section

### Mobile-Specific
- [ ] App handles backgrounding gracefully
- [ ] File uploads survive app switching
- [ ] Network errors handled gracefully
- [ ] Biometric authentication works (if enabled)

### Edge Cases
- [ ] Offline behavior (show appropriate errors)
- [ ] Large images upload successfully
- [ ] Form validation working
- [ ] Error messages are user-friendly

---

## 🐛 Common iOS Issues & Solutions

### Issue: "Untrusted Enterprise Developer"
**Solution:** Settings → General → VPN & Device Management → Trust Developer

### Issue: Camera permission denied
**Solution:**
- Check `Info.plist` has camera usage description
- Settings → Privacy → Camera → Enable for app

### Issue: Build fails with signing error
**Solution:**
1. Select App target → Signing & Capabilities
2. Check "Automatically manage signing"
3. Select your team from dropdown

### Issue: Plugins not working
**Solution:**
```bash
npx cap sync ios
```
Then rebuild in Xcode

### Issue: White screen on launch
**Solution:**
1. Check console logs in Xcode (View → Debug Area → Show Debug Area)
2. Look for JavaScript errors
3. Verify backend URL is correct in capacitor.config.ts

---

## 📊 Xcode Debugging

### View Console Logs
1. Run app in simulator/device
2. Open Debug Area: `View → Debug Area → Activate Console` (⌘⇧Y)
3. Filter logs by typing in search box

### Inspect Network Requests
1. Open Safari on Mac
2. Go to `Develop → [Your Device] → [App WebView]`
3. Use Network tab to see API calls

### Check WebView
1. Enable Web Inspector: Xcode → Settings → Advanced → Enable web inspector
2. In Safari: Develop → [Device] → WebView
3. Use developer tools like desktop browser

---

## 🔄 Sync After Changes

**After making code changes:**

```bash
# Build web assets (if needed)
npm run build

# Sync to iOS
npx cap sync ios
```

**Then in Xcode:**
- Press `⌘B` to rebuild
- Or press `⌘R` to rebuild and run

---

## 📝 Build Notes

**Plugins Included:**
- @capacitor/app - App lifecycle
- @capacitor/browser - External links
- @capacitor/camera - Photo capture ✨ Phase 2
- @capacitor/haptics - Touch feedback
- @capacitor/push-notifications - Notifications
- @capacitor/share - Share functionality
- @capacitor/splash-screen - Launch screen
- @capacitor/status-bar - Status bar styling
- capacitor-native-biometric - Face ID/Touch ID

**Backend URL:** https://car-crash-lawyer-ai-production.up.railway.app

---

## 🎯 Phase 2 Testing Focus

Since Phase 2 is brand new on iOS, pay special attention to:

1. **Profile Editing**
   - Does the modal appear correctly?
   - Are all fields pre-populated?
   - Do changes save and persist?
   - Are error messages clear?

2. **Image Uploads**
   - Does camera permission request appear?
   - Can user choose camera vs library?
   - Do uploads complete successfully?
   - Are uploaded images visible in dashboard?

3. **Data Persistence**
   - After editing, close app completely
   - Reopen app
   - Verify changes are still there

---

## ✅ Ready to Test!

Everything is prepared. Just run:

```bash
npx cap open ios
```

Then update the version to `2.0.18` (build `20018`) and start testing!

---

## 📞 Need Help?

- Xcode errors: Check console logs (⌘⇧Y)
- Network issues: Check Railway deployment status
- Plugin issues: Run `npx cap sync ios` and rebuild
- General issues: Check `PHASE2-PROGRESS.md` for known issues

---

**Good luck with iOS testing! 🍀**
