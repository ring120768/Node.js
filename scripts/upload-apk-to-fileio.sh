#!/bin/bash
# Temporary APK hosting solution using file.io (14 days retention)
# For permanent hosting, use GitHub Releases or Dropbox

APK_FILE="public/CarCrashLawyerAI.apk"

if [ ! -f "$APK_FILE" ]; then
  echo "❌ APK file not found: $APK_FILE"
  echo "   Make sure you have the APK file locally before uploading"
  exit 1
fi

echo "📤 Uploading APK to file.io (temporary 14-day hosting)..."
echo "   File size: $(ls -lh "$APK_FILE" | awk '{print $5}')"

# Upload to file.io
RESPONSE=$(curl -F "file=@$APK_FILE" https://file.io/?expires=14d)

# Parse JSON response
DOWNLOAD_URL=$(echo "$RESPONSE" | grep -o '"link":"[^"]*' | cut -d'"' -f4)

if [ -z "$DOWNLOAD_URL" ]; then
  echo "❌ Upload failed"
  echo "   Response: $RESPONSE"
  exit 1
fi

echo ""
echo "✅ Upload successful!"
echo ""
echo "📋 Add this to Railway environment variables:"
echo "   APK_DOWNLOAD_URL=$DOWNLOAD_URL"
echo ""
echo "⚠️  NOTE: This is a temporary 14-day link from file.io"
echo "   For permanent hosting, consider:"
echo "   - GitHub Releases (recommended)"
echo "   - Dropbox public link"
echo "   - AWS S3 bucket"
echo ""
