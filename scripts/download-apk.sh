#!/bin/bash
# Download APK during Railway build (if not present locally)
# This script allows the APK to be excluded from git while still being available in production

APK_FILE="public/CarCrashLawyerAI.apk"
APK_URL="${APK_DOWNLOAD_URL:-}"  # Set this as Railway environment variable

echo "🔍 Checking for APK file..."

if [ -f "$APK_FILE" ]; then
  echo "✅ APK already exists locally (development mode)"
  exit 0
fi

if [ -z "$APK_URL" ]; then
  echo "⚠️  APK_DOWNLOAD_URL not set - skipping download"
  echo "   For production deployments, set APK_DOWNLOAD_URL environment variable"
  echo "   You can use GitHub Releases, Dropbox, or any public URL"
  exit 0
fi

echo "📥 Downloading APK from: $APK_URL"
mkdir -p public
curl -L -o "$APK_FILE" "$APK_URL"

if [ -f "$APK_FILE" ]; then
  FILE_SIZE=$(ls -lh "$APK_FILE" | awk '{print $5}')
  echo "✅ APK downloaded successfully ($FILE_SIZE)"
else
  echo "❌ Failed to download APK"
  exit 1
fi
