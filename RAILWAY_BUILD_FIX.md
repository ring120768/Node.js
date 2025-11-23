# Railway Build Fix - Puppeteer & Environment Variables

**Issue:** Railway build failing due to Puppeteer dependencies and environment variable handling.

**Date Fixed:** 2025-11-22

---

## Problem 1: Puppeteer Missing Chromium Dependencies

**Error:**
```
Error: Failed to launch the browser process!
/app/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome: error while loading shared libraries
```

**Root Cause:**
- Puppeteer requires Chromium browser and system dependencies (libX11, fontconfig, etc.)
- Railway's default Node.js environment doesn't include these
- Puppeteer tries to download Chromium during `npm install`, which fails or times out

**Fix Applied:**

### 1. Created `nixpacks.toml`
Tells Railway to install Chromium and all required system dependencies:
```toml
[phases.setup]
nixPkgs = [
  "chromium",
  "nss", "freetype", "harfbuzz", "ca-certificates", "fontconfig",
  "libX11", "libXcomposite", "libXdamage", "libXext", ...
]

[variables]
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "true"
PUPPETEER_EXECUTABLE_PATH = "/nix/store/*-chromium-*/bin/chromium"
```

### 2. Created `.puppeteerrc.cjs`
Configures Puppeteer to use system Chromium instead of downloading:
```javascript
module.exports = {
  skipDownload: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'
};
```

### 3. Updated `src/services/htmlToPdfConverter.js`
Puppeteer launch configuration for Railway:
```javascript
const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-extensions'
  ]
});
```

**Why These Flags:**
- `--no-sandbox`: Required for Railway's containerized environment
- `--disable-setuid-sandbox`: Security sandbox not available in containers
- `--disable-dev-shm-usage`: Railway has limited `/dev/shm` space (~64MB)
- `--disable-gpu`: No GPU in Railway containers
- `--single-process`: Reduces memory usage (Railway Free tier has 512MB limit)

---

## Problem 2: Environment Variables Not Loading

**Error:**
```
❌ Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
```

**Root Cause:**
- `index.js` tries to read from `.env` file (lines 40-72)
- Railway doesn't use `.env` files - it uses environment variables directly
- The `.env` file reading code runs but file doesn't exist on Railway
- `process.env` values should already be set by Railway

**Fix Applied:**

The `.env` reading code in `index.js` is fine - it only runs if file exists:
```javascript
if (fs.existsSync(envPath)) {
  // Read .env file...
}
```

**But** the validation at lines 88-99 still requires these variables to be set.

**Railway Configuration Required:**
Set these environment variables in Railway Dashboard → Variables:
```bash
# Required
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
SUPABASE_ANON_KEY=xxx
OPENAI_API_KEY=sk-xxx
TYPEFORM_WEBHOOK_SECRET=xxx

# Email (from RAILWAY_DEPLOYMENT_STATUS.md)
EMAIL_ENABLED=true
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=accounts@carcrashlawyerai.com
SMTP_PASS=Bali120768!
EMAIL_FROM_NAME=Car Crash Lawyer AI
TEST_EMAIL=accounts@carcrashlawyerai.com

# App Configuration
APP_URL=https://your-app.up.railway.app
NODE_ENV=production
PORT=5000

# Puppeteer (set by nixpacks.toml)
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/nix/store/*-chromium-*/bin/chromium
```

---

## Problem 3: Missing Build Command

**Issue:**
Railway auto-detects Node.js but might not know what command to run.

**Fix in `nixpacks.toml`:**
```toml
[phases.install]
cmds = ["npm ci"]  # Faster than npm install

[start]
cmd = "npm start"  # Uses package.json "start" script
```

---

## Problem 4: Large Dependencies / Build Timeout

**Potential Issue:**
Puppeteer + all dependencies = large build, may timeout on Railway Free tier.

**Prevention:**
- `.puppeteerrc.cjs` prevents downloading Chromium (saves ~150MB, ~2 minutes)
- `npm ci` instead of `npm install` (faster, deterministic)
- System Chromium provided by nixpacks.toml

**If build still times out:**
1. Upgrade to Railway Hobby plan ($5/month) for longer build times
2. Or remove Puppeteer and use alternative PDF generation (not recommended - loses AI pages 13-16)

---

## Verification Checklist

After these fixes are committed:

### 1. Commit Changes
```bash
git add nixpacks.toml .puppeteerrc.cjs RAILWAY_BUILD_FIX.md
git commit -m "fix: Add Railway configuration for Puppeteer support"
git push origin main
```

### 2. Watch Railway Build
- Railway Dashboard → Deployments tab
- Watch for "Building..." → "Deploying..." → "Success"
- Build should take ~3-5 minutes (down from potential timeout)

### 3. Check Railway Logs
Look for successful startup:
```
✅ Loaded Supabase credentials from .env
✅ Loaded PORT from .env: 5000
🔌 Using PORT: 5000, HOST: 0.0.0.0
🚀 Server listening on http://0.0.0.0:5000
```

### 4. Test Puppeteer
After deployment, test PDF generation:
```bash
curl -X POST https://your-app.up.railway.app/api/pdf/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "YOUR_USER_ID"}'
```

Should return PDF without "Failed to launch browser" error.

---

## Common Railway Build Errors

### Error: "undefined variable 'ca-certificates'" (Nix package naming)
**Error Message:**
```
error: undefined variable 'ca-certificates'
at /app/.nixpacks/nixpkgs-*.nix:19:47
```

**Root Cause:**
- Used Debian/Ubuntu package names instead of Nix package names
- `ca-certificates` is not a valid Nix package (should be `cacert`)
- Xorg libraries need `xorg.` prefix (e.g., `xorg.libX11` not `libX11`)

**Fix Applied (commit ad389bc):**
```toml
# ❌ WRONG (Debian names)
nixPkgs = ["ca-certificates", "libX11", "libXcomposite"]

# ✅ CORRECT (Nix names)
nixPkgs = ["cacert", "xorg.libX11", "xorg.libXcomposite"]
```

### Error: SSL Certificate Conflict (Duplicate Chromium)
**Error Message:**
```
error: Unable to build profile. There is a conflict for the following files:
         /nix/store/4cn5s8950q4ldkwmzs9cgyssp62lhf9m-nss-cacert-3.107/etc/ssl/certs/ca-no-trust-rules-bundle.crt
         /nix/store/y2zh06pccwcvz43xwgd8mr8pbqflkqww-nss-cacert-3.107/etc/ssl/certs/ca-no-trust-rules-bundle.crt
```

**Root Cause:**
- Railway auto-detects Puppeteer in `package.json` and installs Chromium via apt-get
- This conflicts with our Nix-based Chromium installation
- Both installations include `nss-cacert` package in different Nix store paths
- Result: SSL certificate files appear twice, causing build failure

**Evidence from Build Log:**
```dockerfile
RUN sudo apt-get update && sudo apt-get install -y --no-install-recommends \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libgbm1 libasound2t64 \
  libpangocairo-1.0-0 libxss1 libgtk-3-0 libxshmfence1 libglu1 chromium
```

**Fix Applied:**
Added `aptPkgs = []` to `nixpacks.toml` to disable apt provider:
```toml
[phases.setup]
nixPkgs = [
  "nodejs_18",
  "chromium",
  # ... other packages
]

# Disable apt packages to prevent Railway from auto-installing Chromium
# We're handling all dependencies via Nix packages above
aptPkgs = []
```

**Why This Works:**
- Setting `aptPkgs = []` tells Nixpacks to skip the apt provider entirely
- Railway will no longer auto-install Chromium via apt-get
- Only one Chromium installation (via Nix) remains
- No SSL certificate conflicts

### Error: "Cannot find module 'puppeteer'"
**Fix:** Run `npm install` to add Puppeteer to `package.json` dependencies (already present)

### Error: "Failed to launch browser: spawn ENOENT"
**Fix:** Puppeteer can't find Chromium - check `PUPPETEER_EXECUTABLE_PATH` is set correctly

### Error: "ChromeLauncher error: Chrome failed to start: crashed"
**Fix:** Add `--no-sandbox --disable-setuid-sandbox` flags to launch args (already done)

### Error: "Target closed" or "Session closed"
**Fix:** Add `--disable-dev-shm-usage --single-process` to reduce memory usage (already done)

### Error: Build timeout after 10 minutes
**Fix:** Upgrade to Railway Hobby plan or optimize dependencies

---

## Alternative: Disable Puppeteer (Emergency Fallback)

If Railway build continues to fail, you can temporarily disable AI pages 13-16:

**1. Comment out Puppeteer in `package.json`:**
```json
"dependencies": {
  // "puppeteer": "^24.21.0",  // ← Disabled for Railway
}
```

**2. Update `lib/pdfGenerator.js` to skip AI pages:**
```javascript
// Skip HTML-to-PDF conversion for Railway compatibility
if (process.env.DISABLE_PUPPETEER === 'true') {
  logger.warn('⚠️ Puppeteer disabled - skipping AI analysis pages 13-16');
  return filledPdfBytes; // Return 12-page PDF only
}
```

**3. Set Railway variable:**
```bash
DISABLE_PUPPETEER=true
```

**Trade-off:** Loses AI analysis pages (13-16), but core PDF generation works.

---

## Resources

- **Railway Nixpacks:** https://nixpacks.com/docs
- **Puppeteer Troubleshooting:** https://pptr.dev/troubleshooting
- **Railway Environment Variables:** https://docs.railway.app/develop/variables

---

**Status:** Fixes committed, ready for Railway re-deployment
**Expected Result:** Build succeeds, Puppeteer works, full 18-page PDFs generated
**Rollback:** If issues persist, use emergency fallback to disable Puppeteer
