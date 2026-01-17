# Railway Deployment Guide

## APK File Handling

The Android APK (96MB) has been removed from git tracking to reduce repository size and fix Railway deployment issues.

### For Production (Railway):

1. **Upload APK to external storage:**

   **Option A: GitHub Releases (Recommended)**
   ```bash
   # Create a new release via GitHub web interface
   # Upload CarCrashLawyerAI.apk as a release asset
   # Get the download URL (e.g., https://github.com/username/repo/releases/download/v2.0.14/CarCrashLawyerAI.apk)
   ```

   **Option B: Dropbox**
   ```bash
   # Upload to Dropbox and get public share link
   # Convert share link to direct download:
   # Change: https://www.dropbox.com/s/xxxxx/file.apk?dl=0
   # To:     https://www.dropbox.com/s/xxxxx/file.apk?dl=1
   ```

   **Option C: AWS S3**
   ```bash
   aws s3 cp public/CarCrashLawyerAI.apk s3://your-bucket/CarCrashLawyerAI.apk --acl public-read
   # Get URL: https://your-bucket.s3.amazonaws.com/CarCrashLawyerAI.apk
   ```

2. **Set Railway environment variable:**
   ```bash
   # In Railway dashboard, add:
   APK_DOWNLOAD_URL=<your-public-apk-url>
   ```

3. **Deploy to Railway:**
   ```bash
   git add .
   git commit -m "feat: Optimize deployment by externalizing APK"
   git push
   ```

   The `scripts/download-apk.sh` will automatically download the APK during build.

### For Local Development:

The APK file `public/CarCrashLawyerAI.apk` should exist locally (excluded from git).

If missing, you can:
1. Copy from your Android build: `cp android/app/build/outputs/apk/release/app-release.apk public/CarCrashLawyerAI.apk`
2. Or download from production: `curl -L -o public/CarCrashLawyerAI.apk $APK_DOWNLOAD_URL`

## Repository Size

Before: 346MB (with APK in git)
After: ~50MB (without APK)

This change fixes Railway deployment timeouts and improves clone/push performance.
