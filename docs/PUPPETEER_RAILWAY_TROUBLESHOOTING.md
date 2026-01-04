# Puppeteer on Railway - Troubleshooting Guide

**Last Updated:** 2026-01-03
**Status:** Verified Working
**Puppeteer Version:** 24.x

---

## Overview

This document provides a comprehensive troubleshooting guide for running Puppeteer on Railway. The Car Crash Lawyer AI application uses Puppeteer to convert HTML templates (pages 13-16) to PDF as part of the hybrid PDF generation process.

---

## Quick Reference

### Working Configuration (Verified 2026-01-03)

**`.puppeteerrc.cjs`:**
```javascript
const { join } = require('path');

module.exports = {
  skipDownload: false,  // CRITICAL: Let Puppeteer download its bundled Chrome
  cacheDirectory: join(__dirname, '.cache', 'puppeteer')
  // DO NOT set executablePath - use bundled Chrome
};
```

**`nixpacks.toml`:**
```toml
[phases.setup]
aptPkgs = [
  'fonts-liberation',
  'libasound2t64',
  'libatk-bridge2.0-0',
  'libatk1.0-0',
  'libgbm1',
  'libgtk-3-0',
  'libnspr4',
  'libnss3',
  'libx11-xcb1',
  'libxcomposite1',
  'libxcursor1',
  'libxdamage1',
  'libxfixes3',
  'libxi6',
  'libxrandr2',
  'libxss1',
  'libxtst6',
  'xdg-utils',
  'fonts-dejavu-core',
  'fonts-noto-core'
]

[phases.install]
cmds = ["npm ci"]

[start]
cmd = "npm start"

[variables]
PUPPETEER_SKIP_DOWNLOAD = "false"
NODE_ENV = "production"
```

---

## The Problem We Solved

### Symptoms
- PDF generation worked locally but failed on Railway
- Browser launch failed with "Could not find Chrome" or similar errors
- Pages 13-16 (AI analysis) were missing from the final PDF
- Emails sent without PDF attachment

### Root Cause
The `.puppeteerrc.cjs` was misconfigured to:
1. Skip the Chrome download (`skipDownload: true`)
2. Point to a system Chrome that doesn't exist on Railway (`executablePath: '/usr/bin/chromium-browser'`)

### The Fix
1. Set `skipDownload: false` to allow Puppeteer to download its bundled Chrome
2. Remove `executablePath` to let Puppeteer use its bundled Chrome
3. Use correct environment variable name `PUPPETEER_SKIP_DOWNLOAD` (Puppeteer 24.x)

---

## Understanding Puppeteer's Chrome Strategy

### Two Approaches (and why bundled is better for Railway)

| Approach | How it Works | Railway Compatibility |
|----------|--------------|----------------------|
| **Bundled Chrome** (recommended) | Puppeteer downloads its own Chrome during `npm install` | ✅ Excellent - Chrome matches Puppeteer version exactly |
| **System Chrome** | Use `/usr/bin/chromium-browser` or similar | ❌ Problematic - may not exist or may be incompatible |

### Why Bundled Chrome Works Best
1. **Version matching**: Bundled Chrome is guaranteed compatible with Puppeteer version
2. **No system dependencies**: Don't need to ensure system Chrome is installed
3. **Consistent behaviour**: Same Chrome version across all environments
4. **Railway's nixpacks**: Only need system libraries (fonts, audio, etc.), not Chrome itself

---

## Configuration Files Explained

### `.puppeteerrc.cjs`

This file controls Puppeteer's behaviour at install time.

```javascript
const { join } = require('path');

module.exports = {
  // CRITICAL: Set to false to download bundled Chrome
  // Setting true breaks Railway deployment
  skipDownload: false,

  // Cache directory for downloaded browser
  // Railway persists this between builds for faster deploys
  cacheDirectory: join(__dirname, '.cache', 'puppeteer')

  // DO NOT set executablePath here
  // Let Puppeteer use its bundled Chrome automatically
};
```

**Common Mistakes:**
```javascript
// WRONG - prevents Chrome download
skipDownload: true

// WRONG - file doesn't exist on Railway
executablePath: '/usr/bin/chromium-browser'

// WRONG - old Puppeteer syntax
skipChromiumDownload: true  // Renamed in Puppeteer 24.x
```

### `nixpacks.toml`

This file tells Railway's build system what system packages to install.

```toml
[phases.setup]
# Chrome/Chromium DEPENDENCIES (not Chrome itself)
# These are required for the bundled Chrome to run
aptPkgs = [
  # Fonts (required for PDF text rendering)
  'fonts-liberation',
  'fonts-dejavu-core',
  'fonts-noto-core',

  # Audio (Chrome requires this even if not used)
  'libasound2t64',  # Ubuntu 24.04 name (was libasound2)

  # GTK/Accessibility
  'libatk-bridge2.0-0',
  'libatk1.0-0',
  'libgtk-3-0',

  # Graphics
  'libgbm1',

  # Network Security
  'libnspr4',
  'libnss3',

  # X11 (display system)
  'libx11-xcb1',
  'libxcomposite1',
  'libxcursor1',
  'libxdamage1',
  'libxfixes3',
  'libxi6',
  'libxrandr2',
  'libxss1',
  'libxtst6',

  # Utilities
  'xdg-utils'
]

[variables]
# Puppeteer 24.x environment variable (not PUPPETEER_SKIP_CHROMIUM_DOWNLOAD)
PUPPETEER_SKIP_DOWNLOAD = "false"
NODE_ENV = "production"
```

**Important Notes:**
- `libasound2` was renamed to `libasound2t64` in Ubuntu 24.04 (Noble)
- `libappindicator3-1` is deprecated and should NOT be included
- Use `aptPkgs` not `nixPkgs` for Puppeteer dependencies

---

## Browser Launch Configuration

### `src/services/htmlToPdfConverter.js`

The `HtmlToPdfConverter` class handles browser lifecycle and PDF generation.

```javascript
async getBrowser() {
  const browser = await puppeteer.launch({
    headless: true,  // Standard headless mode
    executablePath: undefined,  // Let Puppeteer find its bundled Chrome
    args: [
      // Sandbox (required for containers)
      '--no-sandbox',
      '--disable-setuid-sandbox',

      // Memory optimisation (critical for Railway's container limits)
      '--disable-dev-shm-usage',  // Use /tmp instead of /dev/shm
      '--disable-gpu',

      // Startup speed
      '--no-first-run',
      '--no-zygote',

      // Reduce memory footprint
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-default-browser-check',

      // Container stability
      '--disable-software-rasterizer',
      '--disable-features=TranslateUI,BlinkGenPropertyTrees',
      '--font-render-hinting=none'
    ]
  });
  return browser;
}
```

### Memory Management

Railway containers have limited memory. The converter implements:

1. **Browser recycling**: After 8 pages, close and recreate browser
   ```javascript
   const MAX_PAGES_PER_BROWSER = 8;
   if (this.pageCount >= MAX_PAGES_PER_BROWSER) {
     await this.recycleBrowser();
   }
   ```

2. **Sequential processing**: Process pages one at a time (not parallel)
   ```javascript
   // Process pages sequentially to avoid memory spikes
   for (const [key, html] of entries) {
     result[key] = await this.convertHtmlToPdf(html, { pageNumber: key });
   }
   ```

3. **Retry with browser recreation**: If browser crashes, recreate and retry
   ```javascript
   const isRecoverable = error.message.includes('Target closed') ||
                         error.message.includes('Protocol error');
   if (isRecoverable) {
     await this.recycleBrowser();
     // Retry...
   }
   ```

---

## Debugging Puppeteer Issues

### 1. Check Railway Logs

Look for these log patterns:

**Success:**
```
🔍 Finding Chromium path...
   ✅ Using Puppeteer bundled Chromium (recommended for Railway)
✅ Browser launched successfully
PDF generated: Page page13 {"sizeKB":"84.69","pageCount":1}
PDF generated: Page page14 {"sizeKB":"48.94","pageCount":2}
PDF generated: Page page15 {"sizeKB":"29.38","pageCount":3}
PDF generated: Page page16 {"sizeKB":"67.86","pageCount":4}
All pages converted to PDF {"durationMs":12825,"totalSizeKB":"230.88"}
```

**Failure:**
```
❌ BROWSER LAUNCH FAILED
   Executable path: /usr/bin/chromium-browser
   Error message: Could not find Chrome (ver. 131.0.6778.204)
```

### 2. Health Check Endpoint

Test Puppeteer without full PDF generation:

```bash
curl https://your-app.railway.app/debug/puppeteer-test
```

Response:
```json
{
  "success": true,
  "message": "Puppeteer PDF generation working",
  "pdfSize": 12345
}
```

### 3. Verify Configuration

```bash
# Check .puppeteerrc.cjs exists
cat .puppeteerrc.cjs

# Check nixpacks.toml has correct env var
grep PUPPETEER nixpacks.toml
# Should show: PUPPETEER_SKIP_DOWNLOAD = "false"
```

### 4. Local Testing

Test the converter locally:

```javascript
const htmlToPdfConverter = require('./src/services/htmlToPdfConverter');

async function test() {
  const html = '<html><body><h1>Test</h1></body></html>';
  const pdf = await htmlToPdfConverter.convertHtmlToPdf(html, { pageNumber: 'test' });
  console.log('PDF size:', pdf.length);
}

test();
```

---

## Common Errors and Solutions

### Error: "Could not find Chrome"

**Cause:** `skipDownload: true` in `.puppeteerrc.cjs` or `executablePath` pointing to non-existent file.

**Fix:**
```javascript
// .puppeteerrc.cjs
module.exports = {
  skipDownload: false,
  // Remove executablePath entirely
};
```

### Error: "Target closed"

**Cause:** Browser crashed due to memory pressure.

**Fix:** Already implemented in `htmlToPdfConverter.js`:
- Browser recycling after 8 pages
- Retry with browser recreation
- Sequential page processing

### Error: "Protocol error"

**Cause:** Browser disconnected unexpectedly.

**Fix:** The retry logic handles this automatically. If persistent, reduce `MAX_PAGES_PER_BROWSER`.

### Error: "libasound2 not found"

**Cause:** Using old package name in `nixpacks.toml`.

**Fix:** Ubuntu 24.04 renamed it:
```toml
aptPkgs = [
  'libasound2t64',  # NOT libasound2
]
```

### Error: "No usable sandbox"

**Cause:** Missing `--no-sandbox` flag.

**Fix:** Ensure browser launch includes:
```javascript
args: ['--no-sandbox', '--disable-setuid-sandbox']
```

---

## Performance Benchmarks (Railway)

Based on verified production logs (2026-01-03):

| Metric | Value |
|--------|-------|
| Browser launch time | ~10 seconds (cold start) |
| Page 13 (AI Summary) | 84.69 KB, ~3 seconds |
| Page 14 (Transcript) | 48.94 KB, ~2 seconds |
| Page 15 (DVLA Reports) | 29.38 KB, ~2 seconds |
| Page 16 (Additional) | 67.86 KB, ~2 seconds |
| Total 4 pages | 230.88 KB, ~13 seconds |
| Full PDF (20 pages) | 2.84 MB |
| Email delivery | < 1 second after PDF ready |

---

## Deployment Checklist

Before deploying Puppeteer changes:

- [ ] `.puppeteerrc.cjs` has `skipDownload: false`
- [ ] `.puppeteerrc.cjs` does NOT set `executablePath`
- [ ] `nixpacks.toml` uses `PUPPETEER_SKIP_DOWNLOAD` (not `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`)
- [ ] `nixpacks.toml` uses `libasound2t64` (not `libasound2`)
- [ ] Browser launch includes `--disable-dev-shm-usage`
- [ ] Test locally first: `node test-form-filling.js [uuid]`
- [ ] After deploy, check Railway logs for "Browser launched successfully"
- [ ] Test health endpoint: `/debug/puppeteer-test`

---

## Related Files

- `.puppeteerrc.cjs` - Puppeteer configuration
- `nixpacks.toml` - Railway build configuration
- `railway.json` - Railway deployment settings
- `src/services/htmlToPdfConverter.js` - PDF conversion service
- `src/services/adobePdfFormFillerService.js` - Hybrid PDF orchestration
- `lib/emailService.js` - Email with PDF attachment

---

## Version History

| Date | Change | Outcome |
|------|--------|---------|
| 2026-01-03 | Fixed `.puppeteerrc.cjs` to use bundled Chrome | ✅ PDFs delivered |
| 2026-01-03 | Fixed `nixpacks.toml` env var name | ✅ Chrome downloads correctly |
| 2025-12-xx | Added browser recycling for memory | ✅ Stable on Railway |

---

## Contact

For issues with Puppeteer on Railway, check:
1. This document first
2. Railway logs for specific error messages
3. Puppeteer GitHub issues for version-specific problems
