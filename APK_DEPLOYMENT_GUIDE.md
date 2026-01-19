# APK Deployment Guide for Railway

## Overview

This guide documents the process of building, signing, and distributing the Android APK via Railway for testing before Google Play Store submission.

## Build Information

- **Version**: 1.0
- **Build Type**: Release (Signed)
- **Build Date**: 19 January 2026
- **APK Size**: 88 MB
- **SHA256**: `3b6c96d7a0e444aee154bf62e38b03653d04d4470b0cb00e11db15977c1879c9`

## File Locations

```
/Users/ianring/Node.js/
├── android/
│   ├── carcrashlawyerai-release.keystore    # Release signing key
│   └── app/build/outputs/apk/release/
│       └── app-release.apk                   # Original build output
├── public/
│   ├── download/
│   │   └── app-release.apk                   # Railway-served copy
│   └── download-apk.html                     # Download page
└── src/routes/
    └── index.js                               # APK download endpoint
```

## Building the APK

### Prerequisites

1. Android SDK installed at: `/opt/homebrew/share/android-commandlinetools`
2. Release keystore exists: `android/carcrashlawyerai-release.keystore`
3. Keystore credentials configured in `android/app/build.gradle`

### Build Commands

```bash
# Navigate to android directory
cd /Users/ianring/Node.js/android

# Build signed release APK
./gradlew assembleRelease

# Output will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

### Copy to Public Directory

```bash
# Copy APK to Railway-served location
cp android/app/build/outputs/apk/release/app-release.apk \
   public/download/app-release.apk
```

## Railway Configuration

### Static Asset Serving

Railway automatically serves files from the `public/` directory. The APK is accessible at:

```
https://car-crash-lawyer-ai-production.up.railway.app/download/app-release.apk
```

### Express Route Configuration

APK download endpoint added to `src/routes/index.js`:

```javascript
router.get('/download/app-release.apk', (req, res) => {
  const apkPath = path.join(__dirname, '../../public/download/app-release.apk');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="carcrashlawyerai-v1.0.apk"');
  res.download(apkPath, 'carcrashlawyerai-v1.0.apk');
});
```

### Download Page

User-friendly download page available at:

```
https://car-crash-lawyer-ai-production.up.railway.app/download-apk.html
```

Features:
- App version and build information
- File size and build date
- SHA256 checksum for verification
- Android installation instructions
- Platform-specific guidance

## Testing Before Deployment

### 1. Local Testing

```bash
# Start development server
npm run dev

# Test download page
open http://localhost:5000/download-apk.html

# Test direct APK download
curl -I http://localhost:5000/download/app-release.apk

# Should return:
# Content-Type: application/vnd.android.package-archive
# Content-Disposition: attachment; filename="carcrashlawyerai-v1.0.apk"
```

### 2. Verify APK Integrity

```bash
# Calculate SHA256 checksum
shasum -a 256 public/download/app-release.apk

# Should match:
# 3b6c96d7a0e444aee154bf62e38b03653d04d4470b0cb00e11db15977c1879c9
```

### 3. Test Installation on Android Device

1. **Download APK** from Railway URL on Android device
2. **Enable "Install from unknown sources"** in Settings → Security
3. **Open downloaded APK** from Downloads folder
4. **Install** and grant permissions
5. **Test all permissions** (Camera, Microphone, Location)
6. **Verify app loads** from Railway URL: `https://car-crash-lawyer-ai-production.up.railway.app`

## Deployment to Railway

### Git Commit and Push

```bash
# Add new files
git add public/download/app-release.apk
git add public/download-apk.html
git add src/routes/index.js
git add APK_DEPLOYMENT_GUIDE.md

# Commit
git commit -m "Add signed release APK distribution via Railway

- Build production-ready signed APK (v1.0, 88MB)
- Create APK download page with installation instructions
- Add Express endpoint to serve APK with proper headers
- Configure Railway static asset serving
- SHA256: 3b6c96d7a0e444aee154bf62e38b03653d04d4470b0cb00e11db15977c1879c9"

# Push to Railway (auto-deploys)
git push origin main
```

### Railway Auto-Deploy

Railway will automatically:
1. Detect the git push
2. Build the application
3. Deploy with new APK in `public/download/`
4. Serve download page at `/download-apk.html`
5. Serve APK at `/download/app-release.apk`

### Verify Deployment

After Railway finishes deploying:

```bash
# Check download page
curl -I https://car-crash-lawyer-ai-production.up.railway.app/download-apk.html

# Check APK endpoint
curl -I https://car-crash-lawyer-ai-production.up.railway.app/download/app-release.apk

# Should return proper headers
```

## Android Installation Instructions

Users visiting the download page will see:

1. **Uninstall** any previous version from Settings → Apps
2. **Download** APK by tapping the button
3. **Enable** "Install from Unknown Sources" if prompted
4. **Open** the downloaded APK file
5. **Tap Install** and grant required permissions
6. **Open** the app when installation completes

## Permissions Required

The app will request these permissions on first launch:

- **📸 Camera** - Take photos of accident damage
- **🎤 Microphone** - Record voice notes
- **📍 Location** - Auto-capture incident location
- **💾 Storage** - Save incident reports locally

## Security Considerations

### Keystore Security

⚠️ **IMPORTANT**: The keystore file contains sensitive signing credentials:

- File: `android/carcrashlawyerai-release.keystore`
- Password: `CarCrash2024!` (configured in build.gradle)
- Alias: `carcrashlawyerai`

**Do NOT commit keystore to public repositories!**

### APK Signing Verification

Users can verify the APK integrity by:

1. Calculate SHA256 checksum on downloaded file
2. Compare with checksum on download page
3. Both should match: `3b6c96d7a0e444aee154bf62e38b03653d04d4470b0cb00e11db15977c1879c9`

### Content Security

- APK is served with `X-Content-Type-Options: nosniff`
- Proper MIME type: `application/vnd.android.package-archive`
- Download logs captured for security auditing

## Updating the APK

When you need to deploy a new version:

### 1. Update Version Numbers

Edit `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        versionCode 2      // Increment for each release
        versionName "1.1"  // Semantic version
    }
}
```

### 2. Rebuild APK

```bash
cd android
./gradlew clean assembleRelease
```

### 3. Copy to Public

```bash
cp android/app/build/outputs/apk/release/app-release.apk \
   public/download/app-release.apk
```

### 4. Update Download Page

Edit `public/download-apk.html`:

- Update version number in title and body
- Update file size (check with `ls -lh`)
- Update build date
- Recalculate and update SHA256 checksum

### 5. Deploy to Railway

```bash
git add public/download/app-release.apk public/download-apk.html
git commit -m "Update APK to version X.Y"
git push origin main
```

## Transitioning to Google Play Store

Once APK testing is complete:

### 1. Prepare Play Store Assets

Files already in `android/` directory:

- `PLAY_CONSOLE_SETUP_GUIDE.md` - Submission guide
- `QUICK_REFERENCE.md` - Quick reference
- `screenshots/` - App screenshots
- `feature_graphic.png` - Feature graphic
- `app_icon.png` - High-res app icon

### 2. Create Play Store Listing

1. Log in to [Google Play Console](https://play.google.com/console)
2. Create new app
3. Upload APK from `android/app/build/outputs/apk/release/`
4. Add store listing details
5. Set content rating
6. Set pricing (free)

### 3. Submit for Review

- First review takes 7-14 days
- Subsequent updates: 1-3 days
- Keep Railway APK distribution active during review

### 4. Post-Approval

After Google Play approval:

- Keep Railway distribution as beta channel
- Update download page to link to Play Store
- Monitor both distribution channels

## Troubleshooting

### Build Fails

```bash
# Clean build cache
cd android
./gradlew clean

# Rebuild
./gradlew assembleRelease --stacktrace
```

### APK Won't Install on Android

1. **Check Android version**: App requires Android 5.0+ (minSdkVersion 21)
2. **Enable unknown sources**: Settings → Security → Unknown Sources
3. **Verify APK integrity**: Check SHA256 checksum
4. **Check storage space**: APK is 88MB, needs ~200MB free

### Permissions Not Working

1. **Check Android version**: Permissions API requires Android 6.0+
2. **Grant manually**: Settings → Apps → Car Crash Lawyer AI → Permissions
3. **Reinstall**: Uninstall and reinstall to reset permission state

### Railway Download Not Working

```bash
# Check file exists
curl -I https://car-crash-lawyer-ai-production.up.railway.app/download/app-release.apk

# Check Railway logs
railway logs

# Verify file in deployment
railway run ls public/download/
```

## Support and Monitoring

### Download Analytics

APK downloads are logged in Express:

```javascript
logger.info('APK download requested', {
  ip: req.ip,
  userAgent: req.get('user-agent')
});
```

View logs:
```bash
railway logs --filter "APK download"
```

### User Support

If users encounter issues:

1. Direct them to `/download-apk.html` for instructions
2. Verify their Android version (5.0+)
3. Check SHA256 checksum matches
4. Guide through manual permission granting

## Changelog

### Version 1.0 (19 January 2026)

- Initial release build
- Signed with release keystore
- Permissions system integrated
- Railway distribution configured
- Download page created

---

**Maintained by**: Car Crash Lawyer AI Development Team
**Last Updated**: 19 January 2026
