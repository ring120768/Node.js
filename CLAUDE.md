# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Car Crash Lawyer AI** - GDPR-compliant Node.js application for UK traffic accident victims to complete legal incident reports.

| | |
|---|---|
| **Stack** | Node.js 18+, Express, Supabase (PostgreSQL/Auth/Storage/Realtime), Adobe PDF Services, OpenAI |
| **Mobile** | Capacitor (Android + iOS) wrapping web app |
| **Version** | 2.3.0 |
| **Location** | UK (DD/MM/YYYY, £ GBP, GMT/BST, +44, British English) |
| **Flow** | Custom HTML Forms (Pages 1-12) → Image Processing → PDF (18 pages, 213 fields) → Email |

IMPORTANT: Typeform and Zapier are retired. Do not add or rely on Typeform/Zapier webhook flows.

---

## Commands

```bash
# Development
nvm use && npm install     # Node 18.18+ from .nvmrc
npm run dev                # Hot-reload server (nodemon)
npm start                  # Production server

# Testing
npm test                   # Jest with coverage (60% threshold)
npm test -- path/to/test   # Single test file
npm run test:watch         # Watch mode

# Code Quality
npm run lint               # ESLint (auto-fix)
npm run format             # Prettier
npm run depcheck           # Find unused dependencies
npm run audit              # Security vulnerabilities
npm run deps:update        # Update minor versions (ncu)

# Validation
npm run validate:lockfile      # Package-lock sync
npm run validate:pdf-mapping   # PDF field mappings

# Integration Tests
node test-form-filling.js [user-uuid]   # PDF generation
node test-security-wall.js              # Page authentication
node scripts/test-supabase-client.js    # Database connection
node test-railway-email.js              # Email delivery test

# PDF Queue & Email Diagnostics
node check-pdf-queue-state.js           # View queue status
node check-pdf-storage.js               # Verify PDF in storage
node requeue-failed-pdfs.js             # Retry failed jobs
node requeue-abandoned.js               # Requeue stuck jobs
node send-pdf-email.js [user-uuid]      # Resend PDF email
node regenerate-and-send.js [user-uuid] # Regenerate and email PDF

# Data Management
node verify-tables.js                   # Schema verification
node apply-missing-tables.js            # Apply missing schema
node cleanup-test-data.js               # Remove test data
node cleanup-incident-data.js [uuid]    # Clean specific user data

# Mobile App (Capacitor)
npx cap sync                            # Sync web→native
npx cap open android                    # Open Android Studio
npx cap run android                     # Build and run on device
cd android && ./gradlew assembleRelease # Build release APK
cd android && ./gradlew bundleRelease   # Build release AAB

# Utilities
npm run health             # API health check
npm run clean              # Clear caches and temp files
```

---

## Architecture

### Middleware Ordering (CRITICAL)

Order in `src/app.js` matters - don't change it:

```
1. express.json() with verify   ← Raw body capture FIRST
2. express.urlencoded()
3. helmet, cors, compression
4. Protected page routes        ← BEFORE static files
5. express.static
6. Webhook routes               ← Use raw body for signature
7. Central router
```

**Why:** Raw body capture must happen before JSON parsing for webhook signature verification. Protected pages must intercept before static file serving.

### Server-Side Page Authentication

Protected pages require server-side auth BEFORE serving HTML:

```javascript
// src/app.js - pageAuth middleware blocks request with 401 if invalid
app.get('/dashboard.html', pageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});
```

**Protected pages:** `dashboard.html`, `transcription-status.html`, `incident.html`, `incident-form-page*.html`, `report.html`, `declaration.html`

### Webhook Signature Verification

**Must use `req.rawBody`** captured before JSON parsing:

```javascript
// Signature verification uses raw body, NOT JSON.stringify(req.body)
const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
hmac.update(req.rawBody, 'utf8');
const expectedSignature = hmac.digest('base64');
```

**Pattern:** Verify signature → Send 200 OK immediately → Process async

Note: Typeform/Zapier integrations are deprecated; this pattern is legacy and only applies to GitHub or other internal webhooks if enabled.

### Mobile File Upload Pattern

Mobile browsers lose file handles when app backgrounds. Solution:

```
POST /api/images/temp-upload
  → Store in temp_uploads (24hr expiry)
  → Return temp_upload_id

POST /api/signup/submit
  → Move from temp_uploads to user_documents
  → Delete temp_upload record
```

Daily cron job cleans up expired temp_uploads.

### Graceful Shutdown

Singleton protection in `index.js` prevents duplicate starts:

```javascript
if (global.__APP_STARTED__) {
  process.exit(0);  // Prevents EADDRINUSE on Replit
}
global.__APP_STARTED__ = true;
```

### Hybrid PDF Generation (IMPORTANT)

The 18-page PDF uses **two different rendering methods**:

| Pages | Method | Service | Content |
|-------|--------|---------|---------|
| 1-12 | Adobe Form Fill | `adobePdfFormFillerService.js` | User data, images, form fields |
| 13-16 | Puppeteer HTML→PDF | `adobePdfFormFillerService.js` | AI summary, transcription, DVLA reports |
| 17-18 | Adobe Form Fill | `adobePdfFormFillerService.js` | Declaration, signatures |

**Why hybrid?** Pages 13-16 contain dynamic, variable-length content (AI-generated summaries, transcripts) that doesn't fit fixed PDF form fields. Puppeteer renders HTML templates to PDF pages, which are then merged with the form-filled pages.

**Key files:**
- Form filling: `src/services/adobePdfFormFillerService.js`
- HTML templates for pages 13-16: Generated dynamically with Handlebars
- Merge logic: pdf-lib combines all pages into final document

**Fallback:** If Adobe unavailable, entire PDF generated via pdf-lib (lower quality but functional).

### Railway Deployment (Puppeteer) ✅ VERIFIED WORKING

**Last verified:** 2026-01-03 (PDF emails delivered successfully)

Puppeteer requires Chrome dependencies installed via `nixpacks.toml`:

```toml
[phases.setup]
# Ubuntu 24.04 (Noble) renamed libasound2 → libasound2t64
aptPkgs = [
  'fonts-liberation',
  'libasound2t64',      # NOT libasound2 (deprecated)
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

[variables]
PUPPETEER_SKIP_DOWNLOAD = "false"   # Puppeteer 24.x uses this (NOT PUPPETEER_SKIP_CHROMIUM_DOWNLOAD)
NODE_ENV = "production"
```

**Critical `.puppeteerrc.cjs` configuration:**
```javascript
// CORRECT - let Puppeteer use its bundled Chrome
module.exports = {
  skipDownload: false,                              // DO NOT skip - let Puppeteer download Chrome
  cacheDirectory: join(__dirname, '.cache', 'puppeteer')
  // DO NOT set executablePath - let Puppeteer use bundled Chrome
};
```

**⚠️ Common mistakes that break PDF generation:**
1. Setting `skipDownload: true` - prevents Chrome from being downloaded
2. Setting `executablePath: '/usr/bin/chromium-browser'` - system Chrome doesn't exist on Railway
3. Using old env var `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` (renamed in Puppeteer 24.x)

**Browser launch flags (in htmlToPdfConverter.js):**
```javascript
const browser = await puppeteer.launch({
  headless: true,  // Standard headless mode for Railway
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',   // Critical for containers
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
    '--disable-extensions',
    '--disable-software-rasterizer',
    '--font-render-hinting=none'
  ]
});
```

**Memory optimisation for Railway:**
- Browser recycled after 8 pages (`MAX_PAGES_PER_BROWSER`)
- Pages processed sequentially (not parallel) to avoid memory spikes
- Retry logic with browser recreation on crash

**See also:** `docs/PUPPETEER_RAILWAY_TROUBLESHOOTING.md` for detailed debugging guide

### Email System (Resend API)

**4-5 emails sent per completed incident:**

1. **Welcome Email** - Sent on signup, includes app store review/recommend badges
2. **Image Download Links** - Sent immediately after Page 12 submission
3. **90-Day Retention Notice** - GDPR compliance notification
4. **PDF Report** - Sent to user + accounts when PDF generation completes (~2-3 min)
5. **Review Request Email** - Sent 2 minutes after PDF delivery with App Store/Google Play review links

**Email provider:** Resend (HTTP API) - Replaced nodemailer due to Railway's blocked SMTP ports

**Email retry queue:** Failed emails automatically retried with exponential backoff (max 3 attempts)

**Key files:**
- Email service: `lib/emailService.js`
- Queue processor: `src/services/emailQueueService.js`
- Email templates (HTML): `templates/emails/` (subscription-welcome, review-request)
- Email generators: `lib/generators/emailGenerator.js`

**App Store links in emails:**
- Apple: `https://apps.apple.com/app/car-crash-lawyer-ai/id6758804445` (add `?action=write-review` for direct review)
- Google Play: `https://play.google.com/store/apps/details?id=com.carcrashlawyerai.app`

**See:** `EMAIL-FLOW-DOCUMENTATION.md` for complete email flow, timing, and troubleshooting

### Email Attachments (Resend)

When sending emails with PDF attachments via Resend, **must include contentType**:

```javascript
// CORRECT - include contentType for binary attachments
attachments: [{
  filename: 'report.pdf',
  content: pdfBuffer,
  contentType: 'application/pdf'  // REQUIRED
}]

// WRONG - missing contentType causes silent delivery failures
attachments: [{
  filename: 'report.pdf',
  content: pdfBuffer
}]
```

**Fix location:** `lib/emailService.js` - `sendEmails()` function

### PDF Queue System (Asynchronous Processing)

**Critical:** PDFs are NOT generated synchronously. The system uses a queue-based retry mechanism.

**Flow:**
```
Form submission → pdf_generation_queue (status: pending)
                ↓
Cron job (every 5 min) → Process queue → Generate PDF
                ↓                              ↓
         On failure:                    On success:
         - retry_count++                - completed_incident_forms
         - locked_until = now + backoff - status: completed
         - max 3 retries
```

**Key tables:**
- `pdf_generation_queue` - Pending/failed jobs with retry logic
- `email_retry_queue` - Failed email delivery attempts
- `completed_incident_forms` - Successful completions

**Important fields:**
- `status`: pending, processing, completed, failed
- `retry_count`: 0-3 (max retries before permanent failure)
- `locked_until`: Prevents duplicate processing during retries
- `error_message`: Last failure reason for debugging

**Service:** `src/services/pdfQueueService.js`
**Cron:** `src/services/cronManager.js` - processes queue every 5 minutes

**Debug commands:**
```bash
node check-pdf-queue-state.js    # View queue status
node requeue-failed-pdfs.js      # Retry failed jobs
node check-queue-status.js       # Check specific job
```

**Why queue?** PDF generation involves Adobe API (rate limits), Puppeteer (can crash), and network calls (can timeout). Queue ensures reliability through automatic retries with exponential backoff.

---

## Mobile App (Capacitor)

### Overview

Native iOS and Android apps wrap the web application using Capacitor. The apps load the hosted Railway site (`https://carcrashlawyerai.co.uk`) within a native webview.

**Live on stores:**
- App Store: https://apps.apple.com/app/car-crash-lawyer-ai/id6758804445
- Google Play: https://play.google.com/store/apps/details?id=com.carcrashlawyerai.app
- Download page: `public/download.html` (hosted on Hostinger)

**Configuration:** `capacitor.config.ts`
**Platforms:** `android/` (Gradle/Java), `ios/` (Xcode/Swift)

### Key Features

- **Native camera access** - Photo upload via device camera
- **Biometric auth** - Face ID / Touch ID for secure login
- **Push notifications** - Real-time updates
- **Offline detection** - Handle network loss gracefully
- **Stripe integration** - In-app browser for checkout
- **Splash screen** - Branded loading screen (#0ea5e9 blue)

### Build Process

```bash
# Sync web assets to native projects
npx cap sync

# Android development
npx cap open android          # Open in Android Studio
npx cap run android           # Build and run on device/emulator

# Android release builds
cd android
./gradlew assembleRelease     # APK for direct installation
./gradlew bundleRelease       # AAB for Google Play Store

# iOS development (macOS only)
npx cap open ios              # Open in Xcode
npx cap run ios               # Build and run on device/simulator
```

### Build Artifacts

Release builds generate:
- `android/app/build/outputs/apk/release/app-release.apk` - APK (direct install)
- `android/app/build/outputs/bundle/release/app-release.aab` - AAB (Play Store)

**Current versions in root:**
- `carcrashlawyerai-v1.0.apk` - Direct distribution
- `carcrashlawyerai-v1.0.aab` - Google Play submission

### Important Patterns

**File upload from mobile:**
1. Use temp upload endpoint first (`/api/images/temp-upload`)
2. Return temp ID immediately (prevents app backgrounding issues)
3. Link temp file to user record on form submit

**Biometric authentication:**
- Plugin: `capacitor-native-biometric`
- Stores encrypted tokens in secure device storage
- Falls back to standard login if biometrics unavailable

**Navigation:**
- Web app runs inside webview (all HTML pages work natively)
- External links (Stripe) open in system browser via Browser plugin
- Deep linking via custom URL scheme: `carcrashlawyerai://`

### Testing Mobile

**Web → Mobile workflow:**
1. Make changes to `public/` HTML or `src/` backend
2. Test in browser first (`npm run dev`)
3. Sync to native: `npx cap sync`
4. Test in native: `npx cap run android` or `npx cap run ios`

**Common issues:**
- Camera not working: Check permissions in `AndroidManifest.xml` / `Info.plist`
- File upload failing: Verify temp upload endpoint handling multipart/form-data
- Stripe redirect broken: Confirm `allowNavigation` includes Stripe domains

---

## File Organisation

```
/src                # Application core
  /controllers      # Request handlers
  /middleware       # Auth, CORS, error handling, pageAuth
  /routes           # Route definitions (central router in index.js)
  /services         # Business logic (PDF, images, AI, cronManager)
  /utils            # Helpers (logger, validators, response)
  /websocket        # Real-time updates
  /config           # Configuration
  app.js            # Express setup (middleware ordering critical)

/lib                # Shared utilities (reusable)
  /services         # Email, GDPR, auth services
  /data             # dataFetcher.js - database abstractions
  /generators       # Email, PDF templates

/public             # Static assets (web app & mobile webview)
  *.html            # Page templates (incident-form-page1-12.html)
  download.html     # App Store & Google Play download landing page

/templates          # Email templates
  /emails           # HTML email templates (subscription-welcome, review-request)

/android            # Native Android app (Capacitor)
  /app/src/main     # Java/Kotlin source
  /gradle           # Build configuration

/ios                # Native iOS app (Capacitor)
  /App              # Swift source
  /Pods             # CocoaPods dependencies

/migrations         # Database migrations (numbered, with rollbacks)
/scripts            # Utility scripts
/pdf-templates      # PDF form templates
/credentials        # Adobe credentials (not in Git)

index.js            # Entry point + WebSocket init + graceful shutdown
capacitor.config.ts # Mobile app configuration
```

**`/src` vs `/lib`:** Use `/src` for application-specific code (references domain tables). Use `/lib` for generic, reusable code (could be npm package).

---

## Database

### Key Tables

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `user_signup` | Personal info, vehicle, insurance | `create_user_id` (UUID) |
| `incident_reports` | Accident details (170+ columns) | `id` |
| `incident_other_vehicles` | Other vehicles involved | `id` |
| `incident_witnesses` | Witness information | `id` |
| `user_documents` | Images, processing status | `id` |
| `temp_uploads` | Temporary uploads (24hr TTL) | `id` |
| `ai_transcription` | OpenAI Whisper transcripts | `id` |
| `completed_incident_forms` | Final PDF records | `id` |
| `pdf_generation_queue` | PDF job queue with retries | `id` |
| `email_retry_queue` | Failed email retry tracking | `id` |

### Row Level Security

All tables have RLS enabled. Users access own data via anon key.
**Exception:** Webhooks use service role key (bypasses RLS).

### Soft Delete (GDPR)

```javascript
// Soft delete pattern
.update({ deleted_at: new Date().toISOString() })

// Queries exclude soft-deleted
.select('*').is('deleted_at', null)
```

**Retention:** 7 years for legal documents

---

## API Structure

```
Authentication:
POST   /auth/signup, /auth/login, /auth/logout

Incident Forms (Pages 1-12):
POST   /api/signup/submit
POST   /api/incident-form/*
POST   /api/images/temp-upload

User Data:
GET    /api/user-documents, /api/incident-reports, /api/profile

Witnesses & Vehicles:
GET/POST /api/witnesses/:userId
GET/POST /api/other-vehicles/:userId
GET    /api/dvla/lookup?registration=XX11XXX

AI & Transcription:
POST   /api/transcription/transcribe
POST   /api/ai/analyze-incident

PDF:
POST   /api/pdf/generate

Email:
POST   /api/pdf/send-image-links/:userId
POST   /api/pdf/resend-email/:userId

GDPR:
POST   /api/gdpr/export, /api/gdpr/delete-account

Health:
GET    /healthz, /livez, /readyz

Webhooks:
POST   /webhooks/github
```

All `/api/*` routes require `requireAuth` middleware (except webhooks and health).

---

## Environment Variables

**Required:**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx                # Client auth
SUPABASE_SERVICE_ROLE_KEY=xxx        # Server (bypasses RLS)
OPENAI_API_KEY=sk-xxx
```

**Email (Required for production):**
```bash
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=Car Crash Lawyer AI <noreply@carcrashlawyerai.com>
ACCOUNTS_EMAIL=accounts@carcrashlawyerai.com
EMAIL_ENABLED=true                   # Set false to disable emails
```

**Optional (graceful fallback):**
```bash
PDF_SERVICES_CLIENT_ID=xxx           # Falls back to pdf-lib
PDF_SERVICES_CLIENT_SECRET=xxx
WHAT3WORDS_API_KEY=xxx
DVLA_API_KEY=xxx
WEBHOOK_API_KEY=xxx                  # Internal API protection
GITHUB_WEBHOOK_SECRET=xxx
CRON_ENABLED=true                    # Set false to disable cron jobs
```

---

## Migrations

**Pattern:** Forward migration + rollback script

```
migrations/
├── 001_migration_name.sql          # Forward
└── 001_migration_name_rollback.sql # Rollback
```

**Rules:**
- Always create rollback scripts
- Test rollback immediately after forward
- Use `IF NOT EXISTS` / `IF EXISTS` for idempotency
- Never modify applied migrations
- Run `verify-tables.js` after schema changes

---

## Testing

**Coverage thresholds (enforced):** 60% branches, functions, lines, statements

**Test organisation:** Co-located in `__tests__/` directories within `/src`, or `*.test.js`/`*.spec.js` at root.

Prefer fakes over live Supabase/AWS/Adobe calls; gate external requests behind flags or mocks.

---

## Common Issues

**EADDRINUSE:**
```bash
lsof -ti:5000 | xargs kill -9
# Or: npm run dev (singleton protection handles it)
```

**Webhook signature failed:** Check `GITHUB_WEBHOOK_SECRET` matches GitHub settings

**Supabase connection:** `node scripts/test-supabase-client.js`

**PDF generation issues:** `node test-form-filling.js [uuid]` for diagnostics

**Email not sending:**
```bash
node test-railway-email.js          # Test Resend API
node send-pdf-email.js [uuid]       # Resend specific email
```

**PDF queue stuck:**
```bash
node check-pdf-queue-state.js       # Check queue status
node requeue-failed-pdfs.js         # Retry failed jobs
node requeue-abandoned.js           # Requeue abandoned jobs
```

**Mobile app camera not working:** Check permissions in `AndroidManifest.xml` or `Info.plist`

---

## Code Style

- ES6+ with CommonJS (require/exports)
- 2-space indent, single quotes, semicolons
- camelCase for variables/functions, kebab-case for filenames
- Functions under 50 lines
- Always validate inputs, sanitise output

```javascript
// Error handling pattern
try {
  const result = await operation();
  logger.info('Success', { result });
  return result;
} catch (error) {
  logger.error('Failed', { error: error.message });
  throw new Error('User-friendly message');
}
```

---

## Avoiding Over-Engineering

**Principle:** Fix the actual problem, not imaginary ones.

### Before Adding Code, Ask:

1. **Does the existing system already handle this?** (Check dataFetcher, services, existing patterns)
2. **Am I duplicating data?** (One source of truth - don't write to multiple tables for the same purpose)
3. **Is this a fallback for a path that already works?** (If primary path works, don't add redundant fallbacks)
4. **Am I solving today's problem or a hypothetical future one?**

### Red Flags (Stop and Reconsider):

- Adding columns to store data that's already accessible elsewhere
- Writing to multiple tables when one would suffice
- Creating "just in case" fallback mechanisms
- Adding abstraction layers for single-use code
- "Future-proofing" without a concrete requirement

### The Litmus Test:

> "If I remove this code, will something actually break for a real user?"
>
> If the answer is "no" or "I'm not sure", the code probably shouldn't exist.

---

## Git Workflow

**Format:** `type: description`
**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Never commit:** `.env`, `credentials/`, `node_modules/`, `test-output/`, `coverage/`, `*.apk`, `*.aab`

PRs should include: lint output, test output, and note any migrations or PDF mapping updates.

---

## Design System

**Page colour variations (intentional):**
- Pages 1 & 12: Blue (`#2e6a9d`) - Impact/attention
- Pages 2-11: Deep Teal (`#0E7490`) - Consistent forms
- Pages 13-18: White - Legal document format (PDF only)

Do not "fix" these to match - they're deliberate design choices.

---

## Documentation

**Key reference files:**
- `EMAIL-FLOW-DOCUMENTATION.md` - Complete email system flow and troubleshooting
- `AGENTS.md` - Contributor guide and coding standards
- `README.md` - Project overview and quick start
- `DEPLOYMENT-GUIDE-*.md` - Railway deployment procedures
- `docs/ARCHITECTURE.md` - Detailed system architecture
- `docs/MOBILE_APP_TRANSITION_PLAN.md` - Mobile app development roadmap

**Slash commands** (Claude Code):
- `/start` - Load full project context
- `/status` - Check all services
- `/db` - Show database schema
- `/docs` - List documentation files
- `/help` - Show all available commands

---

## Future Work: Witnesses & Vehicles Appendix

**Status:** Planned (not yet implemented)

**Background:** The main incident report PDF (18 pages, 213 fields) currently includes basic witness and other vehicle fields. However, complex incidents may involve multiple witnesses and vehicles that exceed the main form's capacity.

**Plan:**
- Create a **separate appendix PDF** for detailed witnesses and vehicles data
- Use existing template: `pdf-templates/Car-Crash-Lawyer-AI-Witness-Vehicle-Template.pdf`
- The main PDF will continue to capture primary witness/vehicle info
- Appendix will be generated only when additional entries exist in:
  - `incident_witnesses` table (multiple witnesses)
  - `incident_other_vehicles` table (multiple vehicles)

**Code Reference:**
- Methods already exist in `src/services/adobePdfFormFillerService.js`:
  - `appendWitnessPages()` - Template for witness appendix pages
  - `appendVehiclePages()` - Template for vehicle appendix pages
- These are currently not called from the main generation flow

**Data Collection:**
- Database tables `incident_witnesses` and `incident_other_vehicles` are **fully functional**
- Data collection process is complete and should NOT be modified
- Only PDF generation needs implementing when this feature is prioritised

---

**Last Updated:** 2026-02-22
**Version:** 2.3.0
