# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Node.js Version Management

**Required:** Node.js 18.18+ (specified in `.nvmrc`)

```bash
# Align Node version with project (uses Node 18.20.0 from .nvmrc)
nvm use
npm install  # Respects package-lock.json
```

---

## First Time Setup

Before running the application for the first time:

```bash
# 1. Set up environment
cp .env.example .env          # Copy environment template
# Edit .env with your credentials

# 2. Install dependencies
nvm use                       # Use correct Node version
npm install

# 3. Verify services
node scripts/test-supabase-client.js   # Test database connection
node test-adobe-pdf.js                  # Test Adobe PDF (optional)

# 4. Start development
npm run dev
```

**Required Services:**
- Supabase project (database, auth, storage)
- OpenAI API key (transcription)
- Adobe PDF credentials in `/credentials/` (optional - falls back to pdf-lib)

---

## Quick Start Commands

```bash
# Development
npm run dev              # Hot-reload development server (nodemon watches for changes)
npm start                # Production server (no hot-reload)

# Testing
npm test                 # Run all Jest tests with coverage
npm test -- path/to/test.test.js  # Run single test file
npm run test:watch       # Run tests in watch mode (re-runs on file changes)
npm run lint             # ESLint code linting
npm run format           # Prettier code formatting

# Additional Quality Checks
npm run validate:lockfile      # Prevent dependency drift
npm run validate:pdf-mapping   # Verify PDF field mappings
npm run depcheck               # Find unused dependencies
npm run deps:update            # Update minor versions safely
npm run audit                  # Security audit (moderate+ level)
npm run health                 # System health check script
npm run clean                  # Clean temp files and caches

# Health Checks
curl http://localhost:5000/api/health   # Basic health check
curl http://localhost:5000/api/readyz   # Readiness check (with DB)

# Integration Test Scripts
node test-form-filling.js [user-uuid]   # Test PDF generation with real data
node test-security-wall.js              # Test page authentication
node scripts/test-supabase-client.js    # Test database connection

# Field Validation & Reconciliation
node scripts/verify-field-mappings.js   # Validate PDF→DB mappings
node scripts/reconcile-all-tables.js    # Check data integrity
```

**Note:** Several bash commands are auto-approved and don't require confirmation. See permissions policy in global `.claude/CLAUDE.md`.

See `README.md` for initial setup instructions and environment configuration.

---

## Development Workflow

Recommended workflow for a typical development session:

```bash
# 1. Start fresh session
git status                    # Check current state
npm install                   # Ensure dependencies up to date
npm run validate:lockfile     # Verify package-lock.json sync

# 2. Start development server
npm run dev                   # Nodemon with hot reload

# 3. Make changes
[edit files]

# 4. Validate changes
npm run lint                  # Check code style
npm test                      # Run tests with coverage (60% minimum)
npm run validate:pdf-mapping  # If PDF changes made

# 5. Commit changes
git add .
git commit -m "type: description"
# Types: feat, fix, docs, refactor, test, chore
```

**Common Development Tasks:**

```bash
# Run specific test file
npm test -- src/middleware/__tests__/errorHandler.test.js

# Run tests matching pattern
npm test -- --testPathPattern=cors

# Watch mode (re-runs on changes)
npm run test:watch

# Fix a common issue: EADDRINUSE (port already in use)
lsof -ti:5000 | xargs kill -9    # Kill process on port 5000
# Or: npm run dev (singleton protection handles it)
```

---

## Migration Workflow

**Pattern:** Forward migration with rollback scripts for safe schema evolution.

### Migration File Structure

Each migration consists of two files:
```
migrations/
├── 001_migration_name.sql          # Forward migration (apply changes)
└── 001_migration_name_rollback.sql # Rollback (undo changes)
```

### Creating a New Migration

```bash
# 1. Create forward migration
migrations/NNN_descriptive_name.sql

# 2. Create corresponding rollback
migrations/NNN_descriptive_name_rollback.sql

# 3. Test forward migration
psql -h <host> -U <user> -d <db> -f migrations/NNN_descriptive_name.sql

# 4. Test rollback immediately
psql -h <host> -U <user> -d <db> -f migrations/NNN_descriptive_name_rollback.sql

# 5. Re-apply forward migration
psql -h <host> -U <user> -d <db> -f migrations/NNN_descriptive_name.sql
```

### Migration Best Practices

**DO:**
- ✅ Always create rollback scripts for every migration
- ✅ Test rollback immediately after applying forward migration
- ✅ Use sequential numbering (001, 002, 003...)
- ✅ Make migrations idempotent where possible (`IF NOT EXISTS`, `IF EXISTS`)
- ✅ Include comments explaining why the change is needed

**DON'T:**
- ❌ Modify existing migration files after they've been applied to production
- ❌ Skip rollback testing (data loss risk!)
- ❌ Bundle unrelated schema changes in one migration

### Example Migration Pattern

```sql
-- Forward: 028_add_ai_fields_to_incident_reports.sql
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS ai_incident_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_liability_assessment TEXT;

-- Rollback: 028_add_ai_fields_to_incident_reports_rollback.sql
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS ai_incident_summary,
  DROP COLUMN IF EXISTS ai_liability_assessment;
```

**Note:** Some migrations in the archive (e.g., `_quarantine/migration-scripts/`) were one-time execution scripts. Active migration logic lives in `/migrations` folder.

---

## Project Overview

**Car Crash Lawyer AI** - GDPR-compliant Node.js web application for UK traffic accident victims to complete legal incident reports.

**Stack**: Node.js 18+, Express, Supabase (PostgreSQL + Auth + Storage + Realtime), Adobe PDF Services, OpenAI GPT-4, OpenAI Whisper

**Location**: UK (DD/MM/YYYY, £ GBP, GMT/BST timezone, +44 phone codes, British English)

**Version**: 2.0.1
**Current Branch**: feat/audit-prep
**Status**: ~90% complete, focusing on web launch first

---

## Critical Architecture Patterns

### 1. Server-Side Page Authentication (Security Wall)

**CRITICAL:** Protected HTML pages require server-side authentication BEFORE serving the HTML.

```javascript
// src/app.js - Protected pages served via pageAuth middleware
app.get('/dashboard.html', pageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// pageAuth middleware (src/middleware/pageAuth.js):
// 1. Extracts session token from cookies (access_token, refresh_token)
// 2. Verifies token with Supabase Auth API
// 3. Returns 401 HTTP redirect if invalid/missing
// 4. Attaches req.user and req.sessionToken if valid
```

**Why:** Server blocks request before serving HTML (401 response), not just client-side JavaScript checking.

**Protected pages:** `dashboard.html`, `transcription-status.html`, `incident.html`, all `incident-form-page*.html`

**Test:** `node test-security-wall.js`

---

### 2. Auth-First Signup Flow

User authentication happens on **Page 1**, NOT at the end of signup.

```
Page 1: signup-auth.html
  → POST /auth/signup (creates Supabase Auth user)
  → Sets cookies: access_token, refresh_token
  → User is AUTHENTICATED for Pages 2-12

Pages 2-12: incident-form-page1.html through page12.html
  → 12 separate pages for comprehensive incident details
  → Images upload immediately: POST /api/images/temp-upload
  → Stored in temp_uploads table (24hr expiry)

Page 12: Final Submission
  → POST /api/signup/submit
  → Moves temp files to permanent storage
```

**Why:** Mobile file handles expire when app backgrounds. Immediate upload prevents ERR_UPLOAD_FILE_CHANGED.

---

### 3. Webhook Signature Verification Pattern

**CRITICAL:** Must use `req.rawBody` captured BEFORE JSON parsing.

```javascript
// In src/app.js BEFORE any routes
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf, encoding) => {
    req.rawBodyBuffer = buf;
    req.rawBody = buf.toString('utf8');
  }
}));

// Then in webhook controller
const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
hmac.update(req.rawBody, 'utf8');
const expectedSignature = hmac.digest('base64');
```

**Common mistakes:**
- ❌ Using `JSON.stringify(req.body)` instead of `req.rawBody`
- ❌ Adding body parser AFTER mounting webhook routes
- ❌ Parsing body before signature verification

**Flow:** Verify signature → Send 200 OK immediately → Process async

---

### 4. Middleware Ordering

**CRITICAL ORDER** in `src/app.js`:

```javascript
1.  express.json() with verify (raw body capture)
2.  express.urlencoded() with verify
3.  helmet, cors, compression
4.  requestId, requestTimeout
5.  httpsRedirect, wwwRedirect
6.  morgan (HTTP logging)
7.  requestLogger
8.  cookieParser
9.  Protected page routes (pageAuth middleware) ← BEFORE static files
10. Cache control headers (for HTML)
11. express.static (public/)
12. Rate limiters (API endpoints)
13. Webhook routes (/webhooks/*) ← MOUNTED FIRST in app.js
14. Central router (/) ← All other API routes
```

**Why this order:**
- Raw body capture MUST be first (webhooks need unmodified request body)
- Protected pages MUST come before static files (server-side auth intercepts requests)
- Webhooks MUST be mounted before other routes (signature verification depends on raw body)

---

### 5. Graceful Shutdown Pattern

**CRITICAL:** Singleton protection prevents EADDRINUSE errors on Replit.

```javascript
// index.js - Singleton protection
if (global.__APP_STARTED__) {
  console.log('App already started, ignoring duplicate request');
  process.exit(0);
}
global.__APP_STARTED__ = true;

// Graceful shutdown on SIGTERM/SIGINT
function gracefulShutdown(signal) {
  // 1. Stop accepting new connections
  // 2. Close WebSocket connections
  // 3. Unsubscribe from Realtime channels
  // 4. Stop cron jobs (cronManager.stop())
  // 5. Cleanup global state (__APP_STARTED__, __AGENT_RUNNING__)
  // 6. Force exit after 5s timeout
}
```

**Test:** Kill server with Ctrl+C and verify clean shutdown logs

---

### 6. Scheduled Tasks (Cron Jobs)

**Pattern:** Automated cleanup and maintenance tasks using node-cron.

```javascript
// Managed by: src/services/cronManager.js (if exists)

// Daily cleanup: temp_uploads older than 24 hours
Schedule: Daily at 2:00 AM GMT
Purpose: Delete abandoned temporary uploads
Prevents: Storage bloat from incomplete signups
Table: temp_uploads (session-based, 24hr TTL)

// Cleanup runs on:
DELETE FROM temp_uploads
WHERE created_at < NOW() - INTERVAL '24 hours';
```

**Important:**
- Cron jobs stop during graceful shutdown (no orphaned processes)
- Manual cleanup: Delete temp files via `/api/admin/cleanup` (if implemented)
- Monitor storage usage: Supabase Dashboard → Storage

---

### 7. Mobile File Upload Pattern

**Problem:** Mobile browsers lose file handles when app backgrounds, causing ERR_UPLOAD_FILE_CHANGED

**Solution:** Immediate upload to temporary storage, then persist on form submission

```javascript
// Pattern: Immediate Temp Upload (src/controllers/tempImageUpload.controller.js)
POST /api/images/temp-upload
  ↓
1. Upload to temp_uploads table (24hr expiry)
2. Store session_id for tracking
3. Return temp_upload_id to frontend
  ↓
Frontend stores temp_upload_id in form data
  ↓
POST /api/signup/submit (or /api/incident-form/*)
  ↓
4. Move from temp_uploads to user_documents
5. Update storage bucket: temp-uploads → user-documents
6. Generate permanent API URL
7. Delete temp_upload record

// Cleanup: Cron job runs daily to delete temp_uploads > 24 hours
```

**Why this works:**
- File uploaded immediately while handle is valid
- Survives app backgrounding
- Session-based tracking (no auth required for temp upload)
- Automatic cleanup prevents storage bloat

**Tables:**
- `temp_uploads` - Temporary storage (24hr TTL)
- `user_documents` - Permanent storage (7yr retention)

---

### 8. AI Analysis Architecture

**CRITICAL:** AI analysis generation uses GPT-4o for comprehensive legal assessment after form data capture.

```javascript
// AI Analysis Flow (GPT-4o, temp 0.2)
Database (3 tables: incident_reports, incident_other_vehicles, incident_witnesses)
  ↓
buildComprehensiveIncidentData()  // Fetch all 160+ fields
  ↓
JSON (structured data)
  ↓
POST /api/ai/analyze-incident
  → GPT-4o receives raw structured JSON + database schema
  → Temperature 0.2 for factual accuracy
  → Generates 8 AI analysis fields
  → Takes 30-60 seconds
  → Stores results in incident_reports (ai_* columns)
```

**Why this architecture:**
- **Direct Data Access:** GPT-4o receives raw structured data (160+ fields from 3 tables)
- **Post-Submission Processing:** AI runs after form data saved (prevents timeout data loss)
- **Factual Accuracy:** Temperature 0.2 ensures no hallucinations or invented facts
- **Source Attribution:** Clearly distinguishes form data (facts) vs transcription (perspective)

**Key Database Fields (8 AI Analysis Columns):**
```sql
ai_incident_summary TEXT         -- Overall incident summary
ai_liability_assessment TEXT     -- Fault and liability analysis
ai_vehicle_damage_analysis TEXT  -- Vehicle damage assessment
ai_injury_assessment TEXT        -- Injury severity and causation
ai_witness_credibility TEXT      -- Witness statement analysis
ai_evidence_quality TEXT         -- Evidence strength evaluation
ai_recommendations TEXT          -- Legal action recommendations
ai_closing_statement TEXT        -- Comprehensive closing statement
```

**Output Format:**
- **8 Distinct Fields:** Each field contains focused analysis (100-500 words per field)
- **PDF Integration:** Pages 13-18 display AI analysis alongside form data

**Implementation Files:**
- `src/controllers/ai.controller.js` - AI analysis endpoint and generation logic
- `migrations/028_add_ai_fields_to_incident_reports.sql` - AI field migration

**Test:** Generate PDF with `node test-form-filling.js [user-uuid]` to verify Pages 13-18 display AI analysis

---

### 9. Real-Time Updates Architecture

```javascript
// Backend (src/app.js - initializeRealtime())
Supabase Realtime (postgres_changes subscription)
  ↓
WebSocket Server (src/websocket/index.js)
  ↓
Broadcast to Connected Clients
  ↓
Frontend Updates (dashboard.html, transcription-status.html)
```

**Tables monitored:** `transcription_queue`, `ai_transcription`, `ai_summary`

---

### 10. what3words Location Integration

**Pattern:** Graceful fallback when API key unavailable.

```javascript
// Configuration-driven (src/config/index.js)
what3words: {
  apiKey: process.env.WHAT3WORDS_API_KEY,
  enabled: !!process.env.WHAT3WORDS_API_KEY
}

// All endpoints return 200 with fallback signal
if (!config.what3words.apiKey) {
  return res.status(200).json({
    success: false,
    message: 'Location service temporarily unavailable',
    fallback: true  // Frontend detects fallback mode
  });
}
```

**Endpoints:** POST `/api/location/what3words`, GET `/api/location/convert`, GET `/api/location/autosuggest`

---

## High-Level Request Flow

```
Internet → index.js (HTTP server + WebSocket initialization)
         ↓
      src/app.js (Express app)
         ↓
      Middleware Stack (see #4 above)
         ↓
      Routes:
         - /webhooks/* (mounted FIRST in app.js)
         - / (central router from src/routes/index.js)
         ↓
      Controllers (src/controllers/)
         ↓
      Services (src/services/)
         ↓
      External APIs / Supabase
```

**Note:** WebSocket initialization happens in `index.js` after HTTP server creation, not in the middleware stack. The initialized WebSocket server is then attached to `app.locals.websocketServer` for access throughout the application.

---

## Database Architecture

### Row Level Security (RLS)

**All tables have RLS enabled.** Users can only access their own data via Supabase anon key.

**Exception:** Webhooks use service role key (bypasses RLS) because webhooks send data before user authentication.

### Soft Delete Pattern (GDPR Compliance)

```javascript
// Soft delete
await supabase
  .from('user_documents')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', documentId);

// Queries exclude soft-deleted
await supabase
  .from('user_documents')
  .select('*')
  .is('deleted_at', null);
```

**Retention:** 7 years for legal documents (GDPR Article 6)

### Key Tables

| Table | Purpose | Primary Key | Critical Fields |
|-------|---------|-------------|-----------------|
| `user_signup` | Personal info, vehicle, insurance | `create_user_id` (UUID) | `email`, `gdpr_consent` |
| `incident_reports` | Accident details (170+ columns including AI fields) | `id` | `create_user_id` (indexed), `ai_*` fields |
| `incident_other_vehicles` | Other vehicles involved (65+ columns) | `id` | `create_user_id`, `vehicle_index` |
| `incident_witnesses` | Witness information (30+ columns) | `id` | `create_user_id`, `witness_index` |
| `user_documents` | Images, processing status | `id` | `status`, `retry_count`, `public_url` |
| `temp_uploads` | Temporary uploads (24hr expiry) | `id` | `session_id`, `created_at` |
| `ai_transcription` | OpenAI Whisper transcripts | `id` | `create_user_id`, `transcript_text` |

### Recent Schema Changes

**Migration context:** Transitioning from Typeform to in-house HTML forms, plus AI analysis integration.

**Major additions:**
- 64 new fields across multiple tables for medical details, safety conditions, legal declarations
- 8 AI analysis fields for GPT-4 generated legal assessments (Nov 2025)
- TEXT[] array columns for multi-select checkboxes (medical symptoms, weather conditions, road features)
- New tables: `incident_other_vehicles`, `incident_witnesses` (normalized from incident_reports)

**Critical migrations:**
- `001_add_new_pdf_fields.sql` - Added 25 single-value columns
- `028_add_ai_fields_to_incident_reports.sql` - Added AI analysis fields for Pages 13-18
- See `/migrations` folder for complete migration history with rollback scripts

**Field mapping documentation:**
- `COMPREHENSIVE_FIELD_MAPPING_PLAN.md` - Complete 64-field analysis
- `SCHEMA_ANALYSIS_SUMMARY.md` - Current schema state
- `MASTER_PDF_FIELD_MAPPING.csv` - Definitive PDF→DB mappings
- Use `/db` slash command for live schema

---

## PDF Field Mapping Architecture

**Pattern:** PDF field mapping implemented in PDF generation services.

```javascript
// PDF field mapping flow:
Pages 1-18 → PDF Generation Service → Database Tables
  ↓
Supports:
- Single-value fields (TEXT, DATE, BOOLEAN)
- Array fields (TEXT[] for checkboxes)
- Normalized tables (other_vehicles, witnesses)
- Image references (Supabase Storage URLs)
- AI-generated content (auto-fit font sizing)
```

**Note:** Field mapping logic is distributed across PDF generation controllers and services in `src/controllers/` and `src/services/`.

**Critical Tables:**
- `incident_reports` - Main accident details (170+ columns including arrays and AI fields)
- `incident_other_vehicles` - Up to 5 other vehicles (65+ columns each)
- `incident_witnesses` - Up to 3 witnesses (30+ columns each)

**Validation:**
```bash
# Test complete PDF generation pipeline
node test-form-filling.js [user-uuid]

# Verify field mappings match schema
node scripts/verify-field-mappings.js

# Check data integrity across tables
node scripts/reconcile-all-tables.js
```

---

## API Structure

All API routes mounted in `src/routes/index.js`:

```
Authentication:
POST   /auth/signup              → User registration (creates Supabase Auth user)
POST   /auth/login               → User login
POST   /auth/logout              → Logout (clear cookies)

Signup Flow (Custom HTML Forms):
POST   /api/signup/submit        → Final signup submission
POST   /api/incident-form/*      → Multi-page incident form (Pages 1-12)
POST   /api/images/temp-upload   → Immediate image upload (mobile-friendly)
POST   /api/images/upload        → Post-signup image upload

User Data:
GET    /api/user-documents       → Get user's documents
GET    /api/user-documents/:uuid/download → Download document (permanent API URL)
GET    /api/incident-reports     → Get user's incident reports
GET    /api/profile              → Get user profile
POST   /api/profile              → Update profile

Safety & Assessment:
GET    /api/safety-status/:userId     → Get safety check status
POST   /api/safety-status/:userId     → Update safety check status

Witnesses & Other Vehicles:
GET    /api/witnesses/:userId          → Get witnesses
POST   /api/witnesses/:userId          → Create/update witness
GET    /api/other-vehicles/:userId     → Get other vehicles
POST   /api/other-vehicles/:userId     → Create/update other vehicle

DVLA Integration:
GET    /api/dvla/lookup?registration=XX11XXX  → UK vehicle lookup (GET-friendly)
POST   /api/other-vehicles/dvla-lookup        → DVLA lookup (POST, in context)

Transcription:
POST   /api/transcription/transcribe  → Upload audio (OpenAI Whisper)
GET    /api/transcription/history     → Get transcription history
GET    /api/transcription/:id         → Get specific transcription

AI Analysis:
POST   /api/ai/analyze-incident  → Generate AI analysis (GPT-4)

PDF:
POST   /api/pdf/generate         → Generate 18-page PDF report (170+ fields)

Location:
POST   /api/location/what3words  → Convert coordinates to words
GET    /api/location/convert     → GET version of coordinate conversion
GET    /api/location/autosuggest → Autocomplete for partial words

GDPR:
POST   /api/gdpr/export          → Export all user data
POST   /api/gdpr/delete-account  → Request account deletion

Health:
GET    /api/health               → Basic health check
GET    /api/readyz               → Readiness (with DB check)
GET    /system-status            → Visual system status page

Webhooks:
POST   /webhooks/github          → GitHub repository events (signature verified)
GET    /webhooks/debug           → Webhook configuration status
```

**Authentication:** All `/api/*` endpoints require `requireAuth` middleware (except webhooks)

**Note:** Typeform webhooks have been removed. Application now uses in-house HTML forms (Pages 1-12).

---

## Environment Variables

**⚠️ IMPORTANT:** All secrets stored in Replit Secrets (Tools → Secrets), never committed to Git.

**Required:**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx                # Client-side auth
SUPABASE_SERVICE_ROLE_KEY=xxx        # Server-side (bypasses RLS for webhooks)
OPENAI_API_KEY=sk-xxx                # Transcription/summarization/AI analysis
GITHUB_WEBHOOK_SECRET=xxx            # HMAC signature verification
```

**Optional (graceful fallback):**
```bash
PDF_SERVICES_CLIENT_ID=xxx           # Adobe PDF Services
PDF_SERVICES_CLIENT_SECRET=xxx
WHAT3WORDS_API_KEY=xxx               # Location services
DVLA_API_KEY=xxx                     # UK vehicle lookups
```

---

## Code Style

- **JavaScript:** ES6+, ES modules (import/export), destructuring, async/await
- **Formatting:** 2-space indentation, single quotes, semicolons, camelCase
- **Functions:** Keep under 50 lines, single responsibility
- **Security:** Always validate inputs, use parameterized queries, sanitize output

### Error Handling Pattern

```javascript
// Service layer
try {
  const result = await riskyOperation();
  logger.info('Operation succeeded', { result });
  return result;
} catch (error) {
  logger.error('Operation failed', { error: error.message });
  throw new Error('User-friendly message (never expose internals)');
}

// Controller layer
try {
  const data = await service.getData(userId);
  res.status(200).json({ success: true, data });
} catch (error) {
  logger.error('Controller error', error);
  res.status(500).json({
    success: false,
    error: 'An error occurred. Please try again.'
  });
}
```

---

## Common Gotchas

### Session Cookies

Cookies set with `sameSite=none` for Replit subdomains (*.replit.app). This is intentional - browsers treat subdomains as cross-site.

### WebSocket Connection

If changes don't appear:
1. Check WebSocket connection: `console.log(websocket.readyState)` (1 = OPEN)
2. Check server logs: `npm run dev` shows WebSocket connections
3. Manually refresh or use polling endpoint as fallback

### CSP Policy

Content Security Policy blocks inline event handlers (`onclick`, etc.). Always use event delegation:

```javascript
// ❌ NEVER
<button onclick="handleClick()">

// ✅ ALWAYS
document.addEventListener('click', (e) => {
  if (e.target.id === 'myButton') handleClick();
});
```

---

## Debugging Quick Reference

### Common Errors & Solutions

**EADDRINUSE: Port already in use**
```bash
# Find and kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or: npm run dev handles this automatically (singleton protection)
```

**Webhook signature verification failed**
```bash
# Verify webhook secret matches
echo $TYPEFORM_WEBHOOK_SECRET
# Check Typeform settings match .env
```

**Supabase connection failed**
```bash
# Test database connection
node scripts/test-supabase-client.js

# Verify environment variables
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Debugging Tools

**Check application logs:**
```bash
npm run dev                              # Console output shows all logs
npm run health                           # System health status
curl http://localhost:5000/api/readyz   # Service readiness check
```

**Test specific integrations:**
```bash
node test-form-filling.js [uuid]         # Test complete PDF pipeline
node test-security-wall.js               # Test authentication
node test-adobe-pdf.js                   # Test Adobe PDF services
node scripts/test-supabase-client.js     # Test database
```

**Database queries:**
```sql
-- Check recent incident reports
SELECT create_user_id, created_at FROM incident_reports
ORDER BY created_at DESC LIMIT 5;

-- Check temp uploads (should auto-delete after 24hr)
SELECT id, session_id, created_at FROM temp_uploads
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Check user documents processing status
SELECT id, status, retry_count, created_at FROM user_documents
WHERE status != 'completed' ORDER BY created_at DESC;
```

**External service dashboards:**
- Supabase: Dashboard → Logs, Storage, Database
- Adobe PDF: https://www.adobe.io/console → Usage
- OpenAI: https://platform.openai.com → Usage

---

## Testing Guidelines

### Test Organization

```
/src
  /middleware
    /__tests__              # Middleware unit tests
  /routes
    /__tests__              # Route integration tests
```

### Coverage Requirements

**Minimum thresholds enforced by Jest:**

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 60,       // 60% of code branches covered
    functions: 60,      // 60% of functions tested
    lines: 60,          // 60% of lines executed
    statements: 60      // 60% of statements executed
  }
}
```

**⚠️ IMPORTANT:** Tests will fail if coverage drops below 60% for any metric. Run `npm test` before committing to verify coverage gates pass.

**Coverage reporting:**
- HTML report: `coverage/lcov-report/index.html` (open in browser)
- Terminal summary: Displayed after `npm test`
- CI/CD: Coverage gates enforced in automated tests

### Running Tests

```bash
# Run all tests with coverage
npm test

# Run a single test file
npm test -- src/middleware/__tests__/errorHandler.test.js

# Run tests matching pattern
npm test -- --testPathPattern=cors

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Check code quality
npm run lint
npm run format
```

### Integration Test Scripts

```bash
# Security & Authentication
node test-security-wall.js              # Verify pageAuth middleware

# PDF Services
node test-form-filling.js [user-uuid]   # Generate PDF with real data

# Database
node scripts/test-supabase-client.js    # Verify Supabase connection
```

**When to use:** After environment variable changes, before deploying, when debugging integration issues.

---

## File Organization

### Directory Structure

```
/src                # Application core (web server, API endpoints)
  /controllers      # Request handlers (thin layer)
  /middleware       # Auth, CORS, error handling, validation
    /__tests__      # Middleware unit tests (Jest)
  /routes           # Route definitions (central router in index.js)
    /__tests__      # Route integration tests (Jest)
  /services         # Business logic (PDF, images, emails, AI)
  /utils            # Helpers (logger, validators)
  /websocket        # Real-time updates (WebSocket server)
  /config           # Configuration (index.js)
  app.js            # Express app setup (middleware, routes)

/lib                # Shared utilities (reusable across projects)
  /services         # Cross-cutting services (email, GDPR)
  /data             # Database query abstractions (dataFetcher.js)
  /generators       # Template generators (email, PDF)

/public             # Static assets served by Express
  /components       # Reusable UI components
  /js               # Client-side utilities, initializers
  /css              # Styling (design-system.css)
  *.html            # Page templates (incident-form-page1.html through page12.html)

/migrations         # Database migrations (numbered, with rollbacks)
/scripts            # Utility scripts (field extraction, testing, analysis)

index.js            # HTTP server + WebSocket initialization + graceful shutdown
```

### `/src` vs `/lib` Distinction

**IMPORTANT:** Understand when to use each directory:

#### `/src` - Application Core
**Purpose:** Code specific to this application (Car Crash Lawyer AI)
**Characteristics:**
- Tightly coupled to application domain (traffic accidents, legal reports)
- References specific database tables (`incident_reports`, `user_signup`)
- Implements HTTP routes and API endpoints
- Uses application-specific business logic

**Examples:**
- `src/controllers/incident.controller.js` - Handles incident report endpoints
- `src/services/pdfService.js` - Generates 18-page legal PDF reports
- `src/middleware/pageAuth.js` - Authentication for protected HTML pages

#### `/lib` - Shared Utilities
**Purpose:** Generic, reusable code that could be extracted to npm packages
**Characteristics:**
- Domain-agnostic (email sending, GDPR compliance, data fetching)
- No direct references to application-specific tables
- Could be reused in other projects
- Accepts configuration/dependencies via parameters

**Examples:**
- `lib/services/emailService.js` - Generic email sending (Nodemailer wrapper)
- `lib/services/gdprService.js` - GDPR compliance utilities (data export, deletion)
- `lib/data/dataFetcher.js` - Generic database query builder

**When in Doubt:**
- If it references `incident_reports` or other domain tables → `/src`
- If it could be used in any Node.js project → `/lib`
- If it handles HTTP requests → `/src/controllers` or `/src/routes`
- If it's a generic utility → `/lib`

---

## Design System & Branding

### Color Palette

**Purpose**: Consistent, accessible color scheme optimized for users in stressful situations (accident victims).

#### Page-Specific Styling

**IMPORTANT Color Scheme Variations:**
- **Pages 1 & 12:** Blue (`#2e6a9d`) - Deliberate design choice for impact and attention
- **Pages 2-11:** Deep Teal (`#0E7490`) - Consistent form styling
- **Pages 13-18:** White background - Legal document format (PDF-embedded only, no HTML forms)

**DO NOT** change Page 1 or Page 12 colors to match Pages 2-11, or Pages 13-18 styling. These are intentional design decisions.

**Accessibility Rating**: 🏆 **A+ (92/100)** - WCAG 2.1 AA: 95% compliant, AAA: 70% compliant

---

## Recent Work Context

### Field Reconciliation Project (Complete ✅)

**Goal:** Transition from Typeform to in-house HTML forms while maintaining data integrity.

**Status:** ✅ Field mapping complete, 100% passing validation tests

**Completed Work:**
1. **Field Analysis:** 99 HTML fields → 64 new DB fields identified
2. **Migrations:** 7-phase SQL rollout executed successfully
3. **PDF Mapping:** Pages 1-12 fully reconciled with database schema
4. **Testing:** 100% field validation passing across all pages
5. **Documentation:** Complete field mapping, schema analysis

**Key Files:**
- `COMPREHENSIVE_FIELD_MAPPING_PLAN.md` - Complete 64-field analysis
- `MASTER_PDF_FIELD_MAPPING.csv` - Definitive PDF→DB field mappings
- PDF mapping logic distributed across `src/controllers/` and `src/services/`

---

## Git Workflow

**Commit format:** `type: description`

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Never commit:** `.env`, `credentials/`, `node_modules/`, `test-output/`

**Branches:**
- `main` - Production
- `develop` - Development
- `feat/name` - Features
- `fix/name` - Bug fixes

---

**Last Updated:** 2025-12-15
**Version:** 2.0.1
**Current Branch:** feat/audit-prep
**Maintained By:** Claude Code

**Recent Updates (2025-12-15):**
- Added First Time Setup section with environment configuration checklist
- Added Development Workflow section with daily development patterns
- Added Scheduled Tasks (Cron Jobs) documentation for temp_uploads cleanup
- Added Debugging Quick Reference with common errors and solutions
- Expanded Quick Start Commands with audit, health, and clean scripts
- Fixed section numbering after adding Cron Jobs section (6→10)

**Previous Updates (2025-12-14):**
- Added Node.js version management section (nvm workflow)
- Added migration workflow with forward/rollback pattern
- Clarified `/src` vs `/lib` file organization distinction
- Added test coverage requirements (60% thresholds)
- Expanded quality check commands (validate:lockfile, validate:pdf-mapping, depcheck)
- Legacy file cleanup: 610 files quarantined to `_quarantine/` directory
