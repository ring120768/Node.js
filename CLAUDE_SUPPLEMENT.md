# CLAUDE.md Supplement

**Purpose:** Additional patterns and gotchas discovered from code analysis that aren't in the main CLAUDE.md

**Last Updated:** 2026-01-22
**Verified Against:** Current codebase (not legacy)

---

## Critical Patterns Not Documented Elsewhere

### 1. Singleton Protection (index.js)

**Why it exists:** Prevents EADDRINUSE errors on Railway/Replit when environment restarts the process multiple times.

**Location:** `index.js` lines 10-33

```javascript
// Singleton protection - prevents duplicate starts
if (global.__APP_STARTED__) {
  console.log(`⚠️ App already started, ignoring duplicate request`);
  process.exit(0);
}
global.__APP_STARTED__ = true;
```

**When it triggers:**
- Railway platform restarts
- Nodemon hot reloads (development)
- Multiple `npm start` commands run simultaneously

**Important:** Do NOT remove this - it's not "dead code", it's production stability.

---

### 2. Dynamic Environment Loading (index.js)

**Pattern:** Server loads `.env` file AFTER dotenv.config() to override Railway environment variables.

**Location:** `index.js` lines 40-72

**Why:** Allows local `.env` file to override Railway's environment variables during development/testing.

```javascript
// Reads .env file manually to override environment
const envContent = fs.readFileSync(envPath, 'utf8');
const openaiMatch = envContent.match(/OPENAI_API_KEY=(.+)/);
if (openaiMatch && openaiMatch[1]) {
  process.env.OPENAI_API_KEY = openaiMatch[1].trim();
}
```

**Use case:** Testing new API keys or switching between development/production Supabase instances without redeploying.

---

### 3. Middleware Ordering (src/app.js)

**CRITICAL:** Order matters. Changing this breaks authentication and webhooks.

**Current order (lines 81-596):**

```javascript
1. express.json() with verify      // Lines 81-97  - Raw body capture FIRST
2. express.urlencoded() with verify // Lines 90-97  - Also raw body
3. Security (helmet, cors, etc.)    // Lines 102-117
4. Protected page routes (pageAuth) // Lines 144-239 - BEFORE static files
5. Cache control middleware         // Lines 259-268 - BEFORE static
6. express.static('public')         // Line 272     - Public files
7. Webhook routes                   // Line 579
8. Central API router               // Line 596
```

**Why this order:**

- **Raw body MUST be captured before JSON parsing** for webhook signature verification
- **Protected routes MUST come before express.static** or they'll never execute (static serves dashboard.html first)
- **Cache headers MUST be set before express.static** or they won't apply

**Common mistake:**
```javascript
// ❌ WRONG - static files served first, pageAuth never runs
app.use(express.static('public'));
app.get('/dashboard.html', pageAuth, ...);  // Never called!
```

```javascript
// ✅ CORRECT - protection happens before static serving
app.get('/dashboard.html', pageAuth, ...);
app.use(express.static('public'));
```

---

### 4. Mobile Temp Upload Pattern (Current)

**Problem:** Mobile browsers lose file handles when app backgrounds during multi-page forms.

**Solution:** Two-step upload (verified in `src/routes/tempImageUpload.routes.js`):

```
1. User selects file → POST /api/images/temp-upload
   → Returns temp_upload_id immediately
   → File stored in temp_uploads table (24hr TTL)

2. User submits form → POST /api/signup/submit
   → Includes temp_upload_id
   → Moves file from temp_uploads to user_documents
   → Deletes temp_upload record
```

**Cleanup:** `cronManager.js` deletes temp_uploads older than 24 hours (daily cron job)

**Tables involved:**
- `temp_uploads` - Temporary storage (session_id, file_path, expires_at)
- `user_documents` - Permanent storage after form submit

**Why not direct upload?** Mobile Safari/Chrome close file handles when app backgrounds → upload fails → user has to re-select photos.

---

### 5. Railway Puppeteer Configuration (Verified Working)

**Status:** ✅ Currently working in production (verified 2026-01-03)

**Critical files:**
1. `.puppeteerrc.cjs` - Puppeteer config
2. `nixpacks.toml` - Railway build config

**Key pattern (.puppeteerrc.cjs lines 14-24):**

```javascript
module.exports = {
  skipDownload: false,  // ✅ Let Puppeteer download bundled Chrome
  // DO NOT set executablePath - Puppeteer finds bundled Chrome automatically
  cacheDirectory: join(__dirname, '.cache', 'puppeteer')
};
```

**Railway nixpacks.toml (verified lines 8-32):**

```toml
[phases.setup]
aptPkgs = [
  'libasound2t64',      # ✅ Ubuntu 24.04 (libasound2 renamed)
  'fonts-liberation',
  'libgbm1',
  'libgtk-3-0',
  # ... other Chrome dependencies
]

[variables]
PUPPETEER_SKIP_DOWNLOAD = "false"  # ✅ Puppeteer 24.x variable name
```

**Common mistakes that break PDF generation:**

❌ **WRONG:**
```javascript
// .puppeteerrc.cjs
skipDownload: true,  // Breaks: No Chrome downloaded
executablePath: '/usr/bin/chromium-browser',  // Breaks: Doesn't exist on Railway
```

```toml
# nixpacks.toml
aptPkgs = ['libasound2']  # Breaks: Package renamed in Ubuntu 24.04
```

```toml
[variables]
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "false"  # Breaks: Old variable name (pre-v24)
```

✅ **CORRECT:** Let Puppeteer download and use its bundled Chrome. Railway provides the system libraries, Puppeteer provides the browser.

**Memory limits:** Browser recycled after 8 pages (`MAX_PAGES_PER_BROWSER` in `htmlToPdfConverter.js`)

---

## Common Gotchas

### 1. Capacitor Sync Forgotten

**When required:**
```bash
# MUST run after ANY change to public/ files
npx cap sync
```

**What it does:**
- Copies `public/` directory to `android/app/src/main/assets/public/`
- Updates `capacitor.config.ts` changes to native projects
- Installs new Capacitor plugins

**Testing workflow:**
1. Change HTML in `public/dashboard.html`
2. Test in browser: `npm run dev` ✅
3. **Run `npx cap sync`** ← Often forgotten!
4. Test on mobile: `npx cap run android`

**Symptom when forgotten:** Mobile app shows old HTML, web version shows new HTML.

---

### 2. PDF Queue Timing Misunderstanding

**Pattern:** PDFs generated asynchronously via queue (not instant).

**Queue processor:** `cronManager.js` runs every **2 minutes** (not 5 - verified line 63)

**Flow:**
```
Form submit → pdf_generation_queue (status: pending)
              ↓ (wait up to 2 minutes)
Cron runs → Generate PDF → status: completed
            ↓ (on failure)
            retry_count++, locked_until = now + backoff
```

**User expectation:** "Where's my PDF?" (30 seconds after submit)
**Reality:** Queue processes every 2 minutes → PDF ready in 2-4 minutes average

**Don't panic commands:**
```bash
node check-pdf-queue-state.js    # Check queue status
node check-queue-status.js       # Check specific job
node requeue-failed-pdfs.js      # Retry failed jobs
```

---

### 3. Test Scripts vs Production Code

**Pattern:** Many scripts in root directory are for testing/debugging, not production runtime.

**Production runtime files:**
- `index.js` - Server entry point
- `src/app.js` - Express app
- `src/services/cronManager.js` - Scheduled jobs

**Testing/debug scripts (NOT run in production):**
- `test-form-filling.js [uuid]` - Test PDF generation
- `check-pdf-queue-state.js` - View queue
- `verify-tables.js` - Schema verification
- `cleanup-*.js` - Data cleanup utilities

**Important:** Don't confuse test scripts with production code paths. If you see `node check-xyz.js` in docs, it's a **manual debug command**, not automatic production flow.

---

## Mobile Development Decision Guide

### When to Sync Capacitor

**✅ Sync Required:**
- After editing ANY file in `public/` directory
- After changing `capacitor.config.ts`
- After installing new Capacitor plugins (`npm install @capacitor/...`)
- After updating app icons/splash screens

**❌ Sync NOT Required:**
- Backend changes only (`src/controllers/`, `src/services/`)
- Node package updates (non-Capacitor)
- Database migrations
- Environment variable changes

### Testing Strategy (Recommended Order)

**1. Web Browser First** (fastest iteration):
```bash
npm run dev
# Open http://localhost:5000
# Test all functionality
```

**2. Mobile Emulator** (quick mobile checks):
```bash
npx cap sync  # Only if public/ changed
npx cap run android  # Builds and launches emulator
```

**3. Real Device** (final validation):
```bash
npx cap run android --target=<device-id>
# Or: npx cap open android → Run in Android Studio
```

**4. Production Build** (release testing):
```bash
cd android
./gradlew assembleRelease  # APK for direct install
./gradlew bundleRelease    # AAB for Play Store
```

### Mobile Build Artifacts

**Development:**
- `android/app/build/outputs/apk/debug/app-debug.apk` - Quick testing

**Production:**
- `android/app/build/outputs/apk/release/app-release.apk` - Direct distribution
- `android/app/build/outputs/bundle/release/app-release.aab` - Google Play Store

**Storage in repo:** APK/AAB files in repo root are **snapshots** (for easy distribution). Build process generates fresh files in `android/app/build/`.

---

## Railway-Specific Patterns

### Environment Variables

**Pattern:** Railway auto-injects `PORT` - do NOT hardcode.

```javascript
// ✅ CORRECT (index.js line 76)
const PORT = Number(process.env.PORT) || 5000;

// ❌ WRONG
const PORT = 5000;  // Breaks on Railway
```

**Railway provides:** `PORT`, `RAILWAY_ENVIRONMENT`, `RAILWAY_SERVICE_NAME`

**You must set:** All other environment variables in Railway dashboard

### Log Truncation

**Issue:** Railway truncates console logs after ~1000 lines.

**Solution:** Use structured logging (already implemented in `src/utils/logger.js`):

```javascript
// ✅ CORRECT - searchable, structured
logger.info('PDF generated', { userId, pdfId, size: pdfBuffer.length });

// ❌ WRONG - gets truncated, hard to search
console.log('Generated PDF for user', userId, 'with ID', pdfId);
```

### Startup Sequence

**Railway pattern:** May start app multiple times during deployment.

**Protection:** Singleton guard in `index.js` (lines 10-14) handles this:

```javascript
if (global.__APP_STARTED__) {
  process.exit(0);  // Gracefully exit duplicate starts
}
```

**Don't remove this** - it prevents port conflicts and duplicate cron jobs.

---

## Design System Intentional Variations

**DO NOT "fix" these colour variations** - they're intentional UX design:

| Pages | Colour | Hex | Purpose |
|-------|--------|-----|---------|
| 1, 12 | Blue | `#2e6a9d` | High-impact start/end pages |
| 2-11 | Teal | `#0E7490` | Consistent form flow |
| 13-18 | White | `#ffffff` | Legal document (PDF only) |

**Why different?**
- Pages 1 & 12: User attention (start + final review)
- Pages 2-11: Visual consistency during long form
- Pages 13-18: Professional legal document aesthetic (white PDF pages)

**If you see:** "The header colours don't match across pages"
**Response:** "This is intentional UX design, not a bug"

---

## Cron Jobs (Active)

**Managed by:** `src/services/cronManager.js`

**Active jobs:**

| Job | Schedule | Purpose | Script |
|-----|----------|---------|--------|
| PDF Queue | Every 2 min | Process PDF generation queue | `pdfQueueService.js` |
| Temp Cleanup | Daily 2am | Delete expired temp_uploads | Built-in |
| Email Retry | Every 5 min | Retry failed emails | `emailQueueService.js` |

**Control:** Set `CRON_ENABLED=false` in environment to disable all cron jobs (useful for debugging).

**Logging:** All cron output logged to Railway with `[CRON]` prefix.

---

## Environment Variable Loading Priority

**Order (highest to lowest):**

1. **Manual override in index.js** (lines 40-72) - Reads `.env` file directly
2. **dotenv package** (line 38) - Standard `.env` loading
3. **Railway environment** - Platform variables
4. **Defaults in code** - Fallback values

**Why this matters:** Local `.env` file can override Railway settings during development. This is intentional for testing API key rotations.

**Production:** Railway variables take precedence (no `.env` file deployed).

---

## Testing Command Reference

### PDF System
```bash
node test-form-filling.js [uuid]     # Full PDF generation test
node check-pdf-queue-state.js        # Queue status
node check-pdf-storage.js            # Verify PDF in storage
node requeue-failed-pdfs.js          # Retry failures
node regenerate-and-send.js [uuid]   # Force regenerate + email
```

### Email System
```bash
node test-railway-email.js           # Test Resend API
node send-pdf-email.js [uuid]        # Resend PDF email
node check-email-status.js [uuid]    # Check delivery status
```

### Database
```bash
node verify-tables.js                # Schema verification
node apply-missing-tables.js         # Apply missing schema
node scripts/test-supabase-client.js # Connection test
```

### Mobile (Capacitor)
```bash
npx cap sync                         # Sync web → native
npx cap open android                 # Open Android Studio
npx cap run android                  # Build + run on device
cd android && ./gradlew assembleRelease  # APK
cd android && ./gradlew bundleRelease    # AAB
```

### Data Cleanup
```bash
node cleanup-test-data.js            # Remove test data
node cleanup-incident-data.js [uuid] # Specific user cleanup
```

---

## Architecture Clarifications

### src/ vs lib/ Directory

**`/src`** - Application-specific code:
- References domain tables (`user_signup`, `incident_reports`)
- Knows about business rules (UK legal requirements)
- Tightly coupled to this project

**`/lib`** - Reusable utilities:
- Could be extracted to npm package
- No direct table references
- Generic helpers (email, auth, GDPR)

**Rule:** If code references specific database tables → `src/`. If it's generic → `lib/`.

### Why Hybrid PDF Generation?

**Pages 1-12:** Adobe form filling (213 fixed fields)
**Pages 13-16:** Puppeteer HTML→PDF (dynamic AI content)
**Pages 17-18:** Adobe form filling (legal declarations)

**Why not all Adobe?** AI-generated content (summaries, transcripts) has variable length. Can't fit in fixed PDF form fields.

**Why not all Puppeteer?** Adobe form filling is higher quality for structured data entry and handles checkboxes/signatures better.

**Trade-off:** More complex but produces professional legal documents.

---

**End of Supplement**

*This supplement documents patterns found in current code that weren't covered in the main CLAUDE.md. All items verified against codebase on 2026-01-22.*
