# Google Play Store Assets - Design Specifications

**For:** Car Crash Lawyer AI v1.0
**Date:** 7th January 2026

---

## 📱 Asset 1: App Icon (512×512 PNG)

### Requirements

| Property | Value |
|----------|-------|
| Dimensions | 512 × 512 pixels (exactly) |
| Format | 32-bit PNG with alpha channel |
| File size | Under 1024 KB |
| Background | Transparent or solid color |
| Safe area | Keep important elements in center 426×426 px |

### Design Approach

**Use the car + scales icon from your logo** (the white car with scales symbol)

**Two options:**

#### Option A: Icon Only (Recommended)
```
┌─────────────────────┐
│                     │
│   [Car + Scales]    │
│   White icon on     │
│   #0ea5e9 blue bg   │
│                     │
└─────────────────────┘
```

**Pros:** Clean, recognizable at small sizes, matches app branding

#### Option B: Icon + Text
```
┌─────────────────────┐
│   [Car + Scales]    │
│                     │
│   Car Crash         │
│   Lawyer AI         │
└─────────────────────┘
```

**Warning:** Text may be unreadable at small sizes (48×48 dp on device)

### Source File Location

**Logo location:** `/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/Marketing/Logo/Logo version 4a.png`

**Icon to extract:** The white car + scales symbol (left side of logo)

### Creation Steps

#### Method 1: Using ImageMagick (Command Line)

```bash
# Install ImageMagick if not already installed
brew install imagemagick

# Extract just the icon portion and resize to 512×512
convert "/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/Marketing/Logo/Logo version 4a.png" \
  -crop 400x600+50+200 \
  -background "#0ea5e9" \
  -alpha remove \
  -alpha off \
  -resize 512x512! \
  "/Users/ianring/Node.js/android/app-icon-512.png"
```

#### Method 2: Using Online Tool

1. Go to: https://www.canva.com or https://www.photopea.com
2. Create new design: 512×512 px
3. Set background color: #0ea5e9 (or transparent)
4. Upload your logo file
5. Extract just the car + scales icon
6. Center it in the 512×512 canvas
7. Export as PNG (32-bit with transparency)

#### Method 3: Using macOS Preview

1. Open `Logo version 4a.png` in Preview
2. Use rectangular selection to select just the car+scales icon
3. Copy selection (Cmd+C)
4. File → New from Clipboard
5. Tools → Adjust Size → 512 × 512 pixels
6. Add background if needed
7. Export as PNG

### Output File

**Save as:** `/Users/ianring/Node.js/android/app-icon-512.png`

**Verify:**
- Exactly 512 × 512 pixels
- 32-bit PNG format
- Under 1024 KB file size
- Icon centered and visible

---

## 🎨 Asset 2: Feature Graphic (1024×500 PNG/JPG)

### Requirements

| Property | Value |
|----------|-------|
| Dimensions | 1024 × 500 pixels (exactly) |
| Format | 24-bit PNG or JPEG |
| File size | Under 1024 KB |
| Safe area | Avoid important content in edges (50px margin) |

### Design Recommendation: Simple Professional Banner

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│    [Car+Scales Icon]    Car Crash Lawyer AI                 │
│                         Professional Legal Documentation    │
│                         GDPR Compliant • AI-Powered • Free  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Color scheme:**
- Background: Linear gradient from #1e3a8a (left) to #0ea5e9 (right)
- Text: White (#ffffff)
- Icon: White

**Layout:**
- Icon position: 100px from left, vertically centered
- Icon size: ~200×200 px
- Text position: 350px from left
- Main title: 48px font, bold
- Subtitle: 24px font, regular
- Tagline: 18px font, regular with bullet separators

### Creation Steps

#### Method 1: Using Canva (Recommended - Easiest)

1. **Go to Canva:** https://www.canva.com
2. **Create custom size:** 1024 × 500 px
3. **Set background:**
   - Elements → Shapes → Rectangle
   - Resize to fill canvas
   - Color → Gradient → Linear
   - Left color: #1e3a8a
   - Right color: #0ea5e9

4. **Add logo:**
   - Upload your logo file
   - Extract/crop just the car+scales icon
   - Resize to ~200×200 px
   - Position: 100px from left, vertically centered

5. **Add text:**
   ```
   Title: "Car Crash Lawyer AI"
   - Font: Roboto Bold or similar
   - Size: 48px
   - Color: White
   - Position: 350px from left, top-aligned

   Subtitle: "Professional Legal Documentation"
   - Font: Roboto Regular
   - Size: 24px
   - Color: White
   - Position: Below title, 10px gap

   Tagline: "GDPR Compliant • AI-Powered • Free"
   - Font: Roboto Regular
   - Size: 18px
   - Color: White (#f0f0f0 for slight transparency)
   - Position: Below subtitle, 10px gap
   ```

6. **Download:** PNG format, high quality

#### Method 2: Using Photopea (Free Photoshop Alternative)

1. **Go to Photopea:** https://www.photopea.com
2. **File → New:** 1024 × 500 px
3. **Create gradient background:**
   - Select Gradient Tool
   - Colors: #1e3a8a to #0ea5e9
   - Drag left to right across canvas

4. **Add logo:**
   - File → Open & Place
   - Select your logo file
   - Extract icon portion using selection tools
   - Resize and position as specified

5. **Add text layers:**
   - Use Text Tool (T)
   - Follow font/size specs above
   - Use white color

6. **Export:** File → Export as → PNG

#### Method 3: Using Code (Node.js + Sharp)

If you prefer automated generation:

```bash
# Install sharp
npm install sharp

# Create script: generate-feature-graphic.js
```

```javascript
const sharp = require('sharp');
const { createCanvas, loadImage, registerFont } = require('canvas');

async function generateFeatureGraphic() {
  const width = 1024;
  const height = 500;

  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#1e3a8a');
  gradient.addColorStop(1, '#0ea5e9');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Load and draw logo (you'll need to extract icon first)
  const logo = await loadImage('/path/to/car-scales-icon.png');
  ctx.drawImage(logo, 100, 150, 200, 200);

  // Add text
  ctx.fillStyle = '#ffffff';

  ctx.font = 'bold 48px Arial';
  ctx.fillText('Car Crash Lawyer AI', 350, 200);

  ctx.font = '24px Arial';
  ctx.fillText('Professional Legal Documentation', 350, 240);

  ctx.font = '18px Arial';
  ctx.fillText('GDPR Compliant • AI-Powered • Free', 350, 280);

  // Save
  const buffer = canvas.toBuffer('image/png');
  await sharp(buffer)
    .png()
    .toFile('/Users/ianring/Node.js/android/feature-graphic-1024x500.png');

  console.log('✅ Feature graphic created!');
}

generateFeatureGraphic();
```

### Alternative Design Options

If you prefer a different style:

#### Option B: Feature Icons Layout
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   📋 Forms    📸 Photos    🤖 AI    📄 PDF                   │
│              Car Crash Lawyer AI                             │
│         Document Accidents Professionally                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Option C: Problem → Solution
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Accident →  [Your Logo]  →  Professional Report            │
│              Document, Analyze, Deliver                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Output File

**Save as:** `/Users/ianring/Node.js/android/feature-graphic-1024x500.png`

**Verify:**
- Exactly 1024 × 500 pixels
- PNG or JPEG format
- Under 1024 KB file size
- Text clearly readable
- Logo/icon clearly visible
- No important content in 50px edge margins

---

## 🖼️ Asset 3: Screenshots (1080×1920 - Phone Portrait)

### Requirements

| Property | Value |
|----------|-------|
| Dimensions | 1080 × 1920 pixels (9:16 ratio) |
| Format | PNG or JPEG (24-bit) |
| File size | Under 8 MB each |
| Quantity | Minimum 2, Recommended 4-8 |
| Content | Actual app screens only (no mockups) |

### Screenshots to Capture

Based on `GOOGLE_PLAY_STORE_LISTING.md` suggestions:

1. **Homepage/Welcome Screen**
   - Shows app branding
   - "Get Started" button
   - Clean, professional look

2. **Form Page Example (Page 3-4)**
   - Shows guided form interface
   - Progress indicator (e.g., "3 of 12")
   - Clear questions

3. **Photo Upload Interface**
   - Camera/gallery options
   - Uploaded photo preview
   - Professional organization

4. **Success/Completion Screen**
   - "Report submitted successfully"
   - Email confirmation message
   - Next steps

5. **PDF Preview (Optional)**
   - Show sample PDF output
   - Professional formatting
   - Demonstrates value

6. **Dashboard (Optional)**
   - Shows user's reports
   - Clean interface
   - Easy navigation

### Capture Methods

#### Method 1: Android Emulator (Android Studio)

```bash
# Start emulator
npx cap open android
# In Android Studio: Tools → Device Manager → Create/Start emulator

# Install app on emulator
npx cap run android

# Navigate to each screen and capture:
# Click camera icon in emulator toolbar
# Or: Cmd+Shift+S (macOS) / Ctrl+Shift+S (Windows)
```

Screenshots saved to: `~/Desktop/` or emulator screenshots folder

#### Method 2: Real Android Device (ADB)

```bash
# Connect device via USB (enable USB debugging)
adb devices  # Verify device connected

# Install app
npx cap run android

# Navigate to each screen, then capture:
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png ~/Desktop/screenshot-1.png
```

#### Method 3: Device Screenshot (Manual)

1. Install APK on real device
2. Navigate to each screen
3. Take screenshot (Power + Volume Down on most Android devices)
4. Transfer screenshots to computer via USB or cloud

### Post-Processing

Ensure all screenshots are:
- **Exactly 1080 × 1920 pixels** (resize if needed)
- **No device frame** (crop to just the screen content)
- **Good content:** Avoid placeholder text, use realistic data from `BETA_TESTER_GUIDE.md`
- **Consistent:** Same device/resolution for all screenshots
- **Clean status bar:** Consider hiding or using clean status bar

**Resize if needed:**
```bash
convert screenshot.png -resize 1080x1920! screenshot-resized.png
```

### Output Files

**Save as:**
```
/Users/ianring/Node.js/android/screenshots/
├── screenshot-1-homepage.png
├── screenshot-2-form-page.png
├── screenshot-3-photo-upload.png
├── screenshot-4-success.png
├── screenshot-5-pdf-preview.png (optional)
└── screenshot-6-dashboard.png (optional)
```

---

## ✅ Asset Checklist

Before uploading to Play Console:

### App Icon (512×512)
- [ ] Exactly 512 × 512 pixels
- [ ] 32-bit PNG with transparency
- [ ] Under 1024 KB
- [ ] Car + scales icon clearly visible
- [ ] Centered with safe margins
- [ ] Matches brand color (#0ea5e9)

### Feature Graphic (1024×500)
- [ ] Exactly 1024 × 500 pixels
- [ ] PNG or JPEG format
- [ ] Under 1024 KB
- [ ] Logo clearly visible
- [ ] Text readable
- [ ] Professional appearance
- [ ] No important content in edges (50px margin)

### Screenshots (1080×1920 each)
- [ ] 4-6 screenshots captured
- [ ] All exactly 1080 × 1920 pixels
- [ ] PNG or JPEG format
- [ ] Under 8 MB each
- [ ] Shows actual app screens
- [ ] Uses realistic test data
- [ ] No device frames
- [ ] Consistent resolution across all

---

## 🎨 Design Resources

### Colors (Brand)
- Primary Blue: `#0ea5e9`
- Dark Blue: `#1e3a8a`
- Deep Teal: `#0E7490`
- White: `#ffffff`

### Fonts
- **Primary:** Roboto (Google's Android font)
- **Fallback:** Arial, Helvetica, sans-serif

### Logo Source
**Location:** `/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/Marketing/Logo/Logo version 4a.png`

**Icon element:** Car + scales symbol (white, left side)

---

## 📤 Upload Locations

Once created, upload assets to Google Play Console:

1. **App icon:** Main store listing → Graphics → Icon
2. **Feature graphic:** Main store listing → Graphics → Feature graphic
3. **Screenshots:** Main store listing → Graphics → Phone screenshots

**Note:** You can upload and preview before publishing to ensure they look correct.

---

## 🆘 Troubleshooting

### Issue: Icon appears too small/large

**Solution:** Ensure icon is centered with 15-20% padding on all sides within 512×512 canvas

### Issue: Feature graphic text unreadable

**Solution:** Increase font size to minimum 24px for body text, 48px for titles

### Issue: Screenshots wrong dimensions

**Solution:** Use ImageMagick to force resize:
```bash
convert input.png -resize 1080x1920! output.png
```

### Issue: File size too large

**Solution:** Compress PNG:
```bash
# macOS/Linux
pngcrush input.png output.png

# Or online: https://tinypng.com
```

---

**Next Steps:**

1. Create app icon (512×512) - Save to `android/app-icon-512.png`
2. Create feature graphic (1024×500) - Save to `android/feature-graphic-1024x500.png`
3. Capture 4-6 screenshots - Save to `android/screenshots/`
4. Verify all assets meet requirements using checklist
5. Ready to upload to Google Play Console!

**Estimated Time:**
- App icon: 15-30 minutes
- Feature graphic: 1-2 hours
- Screenshots: 30-60 minutes
- **Total: 2-4 hours**

---

**Document Created:** 7th January 2026
**For:** Car Crash Lawyer AI - Google Play Store Submission
**Reference:** `docs/GOOGLE_PLAY_CONSOLE_SETUP_GUIDE.md`
