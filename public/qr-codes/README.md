# QR Codes Directory

This folder contains QR code images for the Car Crash Lawyer AI application.

## 📁 Files

### `main-app-qr.jpg`
- **Purpose:** Main application QR code with branding
- **URL:** https://car-crash-lawyer-ai-production.up.railway.app
- **Design:** Branded with Car Crash Lawyer AI logo and tagline
- **Usage:** Marketing materials, posters, business cards

## 🎨 QR Code Specifications

- **Format:** JPG/PNG
- **Size:** 1024x1024px (recommended)
- **Colors:** Brand colors (#0B7AB0 blue gradient)
- **Logo:** Car icon with "Car Crash Lawyer AI" branding
- **Tagline:** "Your Legal First Responder"

## 📋 How to Add New QR Codes

1. **Generate QR Code:**
   - Use https://www.qr-code-generator.com/ or similar
   - Enter the target URL
   - Customize with brand colors and logo

2. **Save to this folder:**
   ```bash
   public/qr-codes/[descriptive-name].jpg
   ```

3. **Update railway-qr.html:**
   - Add a new QR card section
   - Reference the image: `/qr-codes/[descriptive-name].jpg`

## 🔗 Suggested QR Codes to Create

- [ ] Demo page QR (`demo-qr.jpg`)
- [ ] Signup page QR (`signup-qr.jpg`)
- [ ] Dashboard QR (`dashboard-qr.jpg`)
- [ ] Support/Contact QR (`support-qr.jpg`)
- [ ] App Store download QR (when available)

## 📱 Usage Examples

**In HTML:**
```html
<img src="/qr-codes/main-app-qr.jpg" alt="Car Crash Lawyer AI QR Code">
```

**In Marketing Materials:**
- Print at minimum 2x2 inches for easy scanning
- Ensure high contrast background
- Test scanning from 3-4 feet away

## 🎯 Best Practices

1. **Test all QR codes** before printing
2. **Keep originals** in high resolution (300 DPI minimum)
3. **Version control** - date stamp updates
4. **Backup** - keep copies in cloud storage
5. **Analytics** - use URL shorteners with tracking if needed

---

**Last Updated:** 2025-11-23
**Maintained by:** Car Crash Lawyer AI Team
