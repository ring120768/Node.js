#!/bin/bash

# Generate Google Play Store Feature Graphic (1024x500)
# For: Car Crash Lawyer AI
# Date: 7th January 2026

set -e

echo "🎨 Generating Play Store Feature Graphic..."
echo ""

# File locations
LOGO_PATH="/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/Marketing/Logo/Car Crash Layer AI logo.png"
OUTPUT_PATH="/Users/ianring/Node.js/android/feature-graphic-1024x500.png"

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
    echo "❌ Logo not found at: $LOGO_PATH"
    exit 1
fi

echo "📂 Using logo: Car Crash Layer AI logo.png"
echo "📦 Output: android/feature-graphic-1024x500.png"
echo ""

echo "⚙️  Creating feature graphic..."

# Create 1024x500 graphic with gradient background and text
# Gradient: #1e3a8a (dark blue) to #0ea5e9 (sky blue)
# Icon: 200x200 at position 100,150 (centered vertically)
# Text layout:
#   Title: "Car Crash Lawyer AI" - 48px bold white at 350,180
#   Subtitle: "Professional Legal Documentation" - 24px white at 350,240
#   Tagline: "GDPR Compliant • AI-Powered • Free" - 18px white at 350,280

convert -size 1024x500 \
  gradient:'#1e3a8a-#0ea5e9' \
  \( "$LOGO_PATH" -resize 200x200! \) \
  -geometry +100+150 \
  -composite \
  -font "Helvetica-Bold" \
  -pointsize 48 \
  -fill white \
  -annotate +350+200 "Car Crash Lawyer AI" \
  -font "Helvetica" \
  -pointsize 24 \
  -annotate +350+240 "Professional Legal Documentation" \
  -pointsize 18 \
  -annotate +350+280 "GDPR Compliant • AI-Powered • Free" \
  "$OUTPUT_PATH"

# Verify output
if [ -f "$OUTPUT_PATH" ]; then
    FILE_SIZE=$(stat -f%z "$OUTPUT_PATH" 2>/dev/null || stat -c%s "$OUTPUT_PATH" 2>/dev/null)
    DIMENSIONS=$(identify -format "%wx%h" "$OUTPUT_PATH")

    echo ""
    echo "✅ Feature graphic created successfully!"
    echo ""
    echo "📊 Details:"
    echo "   Size: $DIMENSIONS pixels"
    echo "   File size: $(($FILE_SIZE / 1024)) KB"
    echo "   Location: $OUTPUT_PATH"
    echo ""

    # Check if dimensions are correct
    if [ "$DIMENSIONS" = "1024x500" ]; then
        echo "✅ Dimensions correct (1024x500)"
    else
        echo "⚠️  Warning: Dimensions are $DIMENSIONS (should be 1024x500)"
    fi

    # Check file size
    if [ $FILE_SIZE -lt 1048576 ]; then
        echo "✅ File size OK (under 1MB)"
    else
        echo "⚠️  Warning: File size is $(($FILE_SIZE / 1024))KB (should be under 1024KB)"
    fi

    echo ""
    echo "🎉 Next steps:"
    echo "   1. Preview the graphic: open \"$OUTPUT_PATH\""
    echo "   2. If it looks good, capture screenshots next"
    echo "   3. Then you'll have all assets ready for Play Console"

else
    echo ""
    echo "❌ Failed to create feature graphic"
    exit 1
fi
