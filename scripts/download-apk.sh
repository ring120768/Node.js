#!/bin/bash
# Download APK during Railway build (if not present locally)
# This script allows the APK to be excluded from git while still being available in production

set -e  # Exit immediately if any command fails

APK_FILE="public/CarCrashLawyerAI.apk"
APK_URL="${APK_DOWNLOAD_URL:-}"  # Set this as Railway environment variable

echo "🔍 Checking for APK file..."

if [ -f "$APK_FILE" ]; then
  echo "✅ APK already exists locally (development mode)"
  exit 0
fi

# Check if APK_DOWNLOAD_URL is set
if [ -z "$APK_URL" ]; then
  if [ "$NODE_ENV" = "production" ]; then
    echo "❌ FATAL: APK_DOWNLOAD_URL not set in production environment"
    echo "   Set this environment variable in Railway dashboard:"
    echo "   APK_DOWNLOAD_URL=https://github.com/ring120768/Node.js/releases/download/v2.0.14/CarCrashLawyerAI.apk"
    exit 1
  fi
  echo "⚠️  APK_DOWNLOAD_URL not set - skipping download (development mode)"
  echo "   For production deployments, set APK_DOWNLOAD_URL environment variable"
  echo "   You can use GitHub Releases, Dropbox, or any public URL"
  exit 0
fi

# Verify curl is installed
if ! command -v curl &> /dev/null; then
  echo "❌ FATAL: curl command not found"
  echo "   Add 'curl' to nixpacks.toml aptPkgs array"
  exit 1
fi

# Download APK with retry logic
echo "📥 Downloading APK from: $APK_URL"
mkdir -p public

if ! curl -L --retry 3 --retry-delay 5 --fail --show-error -o "$APK_FILE" "$APK_URL"; then
  CURL_EXIT=$?
  echo "❌ FATAL: curl failed with exit code $CURL_EXIT"
  echo "   Check that URL is accessible: $APK_URL"
  echo "   Try: curl -I '$APK_URL'"
  rm -f "$APK_FILE"  # Clean up partial download
  exit 1
fi

# Verify file was created
if [ ! -f "$APK_FILE" ]; then
  echo "❌ FATAL: APK file not created after download"
  exit 1
fi

# Validate file size (APK should be ~96MB, minimum 90MB to catch errors)
FILE_SIZE=$(stat -f%z "$APK_FILE" 2>/dev/null || stat -c%s "$APK_FILE" 2>/dev/null)
FILE_SIZE_MB=$((FILE_SIZE / 1024 / 1024))

if [ "$FILE_SIZE_MB" -lt 90 ]; then
  echo "❌ FATAL: APK file too small (${FILE_SIZE_MB}MB, expected ~96MB)"
  echo "   Download may have failed or returned error HTML instead of binary"
  echo "   File contents preview:"
  head -c 200 "$APK_FILE" | od -A x -t x1z -v | head -5
  rm "$APK_FILE"
  exit 1
fi

echo "✅ APK downloaded successfully (${FILE_SIZE_MB}MB)"
echo "   MD5: $(md5sum "$APK_FILE" 2>/dev/null || md5 "$APK_FILE" 2>/dev/null || echo 'N/A')"
