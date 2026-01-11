#!/bin/bash

# Generate Google Play Store App Icon (512x512)
# For: Car Crash Lawyer AI
# Date: 7th January 2026

set -e

echo "🎨 Generating Play Store App Icon..."
echo ""

# Source logo location
LOGO_PATH="/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/Marketing/Logo/Logo version 4a.png"
OUTPUT_PATH="/Users/ianring/Node.js/android/app-icon-512.png"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not installed"
    echo ""
    echo "Install with: brew install imagemagick"
    echo ""
    exit 1
fi

# Check if logo exists
if [ ! -f "$LOGO_PATH" ]; then
    echo "❌ Logo file not found at: $LOGO_PATH"
    exit 1
fi

echo "📂 Source: Logo version 4a.png"
echo "📦 Output: android/app-icon-512.png"
echo ""

# Extract the car+scales icon portion and create 512x512 icon
# The icon is on the left side of the logo, white on blue background

echo "⚙️  Extracting icon portion..."

# Option 1: Extract just the icon area (car + scales)
# Crop: width=400, height=600, x-offset=50, y-offset=200
# Then resize to 512x512 and ensure blue background

convert "$LOGO_PATH" \
  -crop 400x600+50+200 \
  +repage \
  -gravity center \
  -background "#0ea5e9" \
  -extent 512x512 \
  -resize 512x512! \
  "$OUTPUT_PATH"

# Verify output
if [ -f "$OUTPUT_PATH" ]; then
    FILE_SIZE=$(stat -f%z "$OUTPUT_PATH" 2>/dev/null || stat -c%s "$OUTPUT_PATH" 2>/dev/null)
    DIMENSIONS=$(identify -format "%wx%h" "$OUTPUT_PATH")

    echo ""
    echo "✅ App icon created successfully!"
    echo ""
    echo "📊 Details:"
    echo "   Size: $DIMENSIONS pixels"
    echo "   File size: $(($FILE_SIZE / 1024)) KB"
    echo "   Location: $OUTPUT_PATH"
    echo ""

    # Check if dimensions are correct
    if [ "$DIMENSIONS" = "512x512" ]; then
        echo "✅ Dimensions correct (512x512)"
    else
        echo "⚠️  Warning: Dimensions are $DIMENSIONS (should be 512x512)"
    fi

    # Check file size
    if [ $FILE_SIZE -lt 1048576 ]; then
        echo "✅ File size OK (under 1MB)"
    else
        echo "⚠️  Warning: File size is $(($FILE_SIZE / 1024))KB (should be under 1024KB)"
    fi

    echo ""
    echo "🎉 Next steps:"
    echo "   1. Preview the icon: open \"$OUTPUT_PATH\""
    echo "   2. If it looks good, create feature graphic next"
    echo "   3. Then capture screenshots from the app"

else
    echo ""
    echo "❌ Failed to create app icon"
    exit 1
fi
