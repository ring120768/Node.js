# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Quick Start Commands

```bash
# Development
npm run dev              # Hot-reload development server (uses nodemon)
npm start                # Production server

# Testing
npm test                 # Run Jest test suite with coverage
npm run lint             # ESLint code linting
npm run format           # Prettier code formatting

# Health Checks
curl http://localhost:5000/api/health   # Basic health check
curl http://localhost:5000/api/readyz   # Readiness check (with DB)

# Common Test Scripts
node test-security-wall.js              # Test page authentication
node test-adobe-pdf.js                  # Test Adobe PDF Services
node test-form-filling.js [user-uuid]   # Test PDF generation with real data
node scripts/test-supabase-client.js    # Test database connection
node test-what3words.js                 # Test what3words API integration
```

---

## Project Overview

**Car Crash Lawyer AI** - GDPR-compliant Node.js web application for UK traffic accident victims to complete legal incident reports.

**Stack**: Node.js 18+, Express, Supabase (PostgreSQL + Auth + Storage + Realtime), Adobe PDF Services, OpenAI, Typeform webhooks

**Location**: UK (DD/MM/YYYY, £ GBP, GMT/BST timezone, +44 phone codes, British English)

**Version**: 2.0.1

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
  → User is AUTHENTICATED for Pages 2-9

Pages 2-9: signup-form.html
  → Images upload immediately: POST /api/images/temp-upload
  → Stored in temp_uploads table (24hr expiry)

Page 9: Final Submission
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

**Flow:** Verify signature → Send 200 OK immediately (Typeform timeout = 5s) → Process images async

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

### 6. Image Processing Pipeline (V2 with Status Tracking)

```javascript
// ImageProcessorV2 workflow (src/services/imageProcessorV2.js):
1. Create user_documents record (status: 'pending')
2. Update status to 'processing'
3. Download from Typeform URL (with retry logic)
4. Upload to Supabase Storage (bucket: 'user-documents')
5. Generate permanent API URL: /api/user-documents/{uuid}/download
6. Update status to 'completed' (or 'failed' with error categorization)

// Error categories for intelligent retry:
- AUTH_ERROR (401/403) - URL expired, don't retry
- NOT_FOUND (404) - Missing file, don't retry
- TIMEOUT - Network issue, retry with backoff
- RATE_LIMIT - Too many requests, retry with longer backoff
- STORAGE_UPLOAD_ERROR - Supabase issue, retry
```

**Why permanent API URLs:** Signed URLs expire (1 hour). API URLs generate fresh signed URLs on-demand.

---

### 7. Real-Time Updates Architecture

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

### 8. what3words Location Integration

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

**Test:** `node test-what3words.js`

---

## High-Level Request Flow

```
Internet → index.js (HTTP server + WebSocket)
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

---

## Database Architecture

### Row Level Security (RLS)

**All tables have RLS enabled.** Users can only access their own data via Supabase anon key.

**Exception:** Webhooks use service role key (bypasses RLS) because Typeform sends data before user authentication.

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
| `incident_reports` | Accident details (160+ columns) | `id` | `create_user_id` (indexed) |
| `incident_other_vehicles` | Other vehicles involved (65+ columns) | `id` | `create_user_id`, `vehicle_index` |
| `incident_witnesses` | Witness information (30+ columns) | `id` | `create_user_id`, `witness_index` |
| `user_documents` | Images, processing status | `id` | `status`, `retry_count`, `public_url` |
| `temp_uploads` | Temporary uploads (24hr expiry) | `id` | `session_id`, `created_at` |
| `ai_transcription` | OpenAI Whisper transcripts | `id` | `create_user_id`, `transcript_text` |

### Recent Schema Changes (2025-10-30 to 2025-11-03)

**Migration context:** Transitioning from Typeform (160+ fields) to in-house HTML forms (99+ fields).

**Major additions:**
- 64 new fields across multiple tables for medical details, safety conditions, legal declarations
- TEXT[] array columns for multi-select checkboxes (medical symptoms, weather conditions, road features)
- New tables: `incident_other_vehicles`, `incident_witnesses` (normalized from incident_reports)

**Critical migrations:**
- `001_add_new_pdf_fields.sql` - Added 25 single-value columns
- `002_add_missing_ui_fields.sql` - Added medical/safety arrays
- `006_add_page_four_columns.sql` - Added vehicle damage/conditions columns
- See `/migrations` folder for complete migration history with rollback scripts

**Migration pattern:**
```sql
-- All migrations follow this pattern:
BEGIN;
  -- 1. Add columns with safe defaults
  ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS new_field TEXT;

  -- 2. Add helpful comments
  COMMENT ON COLUMN incident_reports.new_field IS 'Description from HTML form';

  -- 3. Log the change
  DO $$
  BEGIN
    RAISE NOTICE 'Migration complete: added new_field column';
  END $$;
COMMIT;
```

**Field mapping documentation:**
- `COMPREHENSIVE_FIELD_MAPPING_PLAN.md` - Complete 64-field analysis
- `SCHEMA_ANALYSIS_SUMMARY.md` - Current schema state
- Use `/db` slash command for live schema

---

## API Structure

All API routes mounted in `src/routes/index.js`:

```
Authentication:
POST   /auth/signup              → User registration (creates Supabase Auth user)
POST   /auth/login               → User login
POST   /auth/logout              → Logout (clear cookies)

Signup Flow:
POST   /api/signup/submit        → Final signup submission
POST   /api/images/temp-upload   → Immediate image upload (mobile-friendly)

User Data:
GET    /api/user-documents       → Get user's documents
GET    /api/incident-reports     → Get user's incident reports
GET    /api/profile              → Get user profile
POST   /api/profile              → Update profile

Transcription:
POST   /api/transcription/transcribe  → Upload audio (OpenAI Whisper)
GET    /api/transcription/history     → Get transcription history
GET    /api/transcription/:id         → Get specific transcription

PDF:
POST   /api/pdf/generate         → Generate 17-page PDF report (150+ fields)

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

Webhooks:
POST   /webhooks/typeform        → Typeform submissions (signature verified)
```

**Authentication:** All `/api/*` endpoints require `requireAuth` middleware (except webhooks)

---

## Environment Variables

**⚠️ IMPORTANT:** All secrets stored in Replit Secrets (Tools → Secrets), never committed to Git.

**Required:**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx                # Client-side auth
SUPABASE_SERVICE_ROLE_KEY=xxx        # Server-side (bypasses RLS for webhooks)
OPENAI_API_KEY=sk-xxx                # Transcription/summarization
TYPEFORM_WEBHOOK_SECRET=xxx          # HMAC signature verification
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

## Testing Guidelines

**All new features require tests:**
- Unit tests for business logic
- Integration tests for API endpoints
- Provide clear instructions for running tests

```bash
npm test                    # Run all tests with coverage
npm run lint                # Check code quality
npm run format              # Format code
```

### Integration Test Scripts

```bash
# Security & Authentication
node test-security-wall.js              # Verify pageAuth middleware

# PDF Services
node test-adobe-pdf.js                  # Test Adobe PDF Services
node test-form-filling.js [user-uuid]   # Generate PDF with real data

# Database
node scripts/test-supabase-client.js    # Verify Supabase connection

# Location Services
node test-what3words.js                 # Test what3words API
```

**When to use:** After environment variable changes, before deploying, when debugging integration issues.

---

## File Organization

```
/src
  /controllers      # Request handlers (thin layer)
  /middleware       # Auth, CORS, error handling, validation
  /routes           # Route definitions (central router in index.js)
  /services         # Business logic (PDF, images, emails)
  /utils            # Helpers (logger, validators)
  /websocket        # Real-time updates (WebSocket server)
  /config           # Configuration (index.js)
  app.js            # Express app setup (middleware, routes)

/public
  /components       # Reusable UI components
  /js               # Utilities, initializers
  /css              # Styling (design-system.css)
  *.html            # Page templates (incident-form-page1.html through page9.html)

/lib
  /services         # Shared services (email, GDPR)
  /data             # Database queries (dataFetcher.js)
  /generators       # Email templates, PDF utilities

/migrations         # Database migrations (numbered, with rollbacks)
/scripts            # Utility scripts (field extraction, testing, analysis)

index.js            # HTTP server + WebSocket initialization + graceful shutdown
```

---

## Recent Work Context (2025-10-30 to 2025-11-03)

### Audit Preparation Project

**Goal:** Transition from Typeform to in-house HTML forms while maintaining data integrity.

**Status:** Field mapping analysis complete (see `COMPREHENSIVE_FIELD_MAPPING_PLAN.md`)

**Key Deliverables:**
1. **Field Analysis:** 99 HTML fields → 64 new DB fields identified
2. **Migration Plan:** 7-phase SQL rollout with rollback safety
3. **Testing Strategy:** 5-phase validation plan
4. **Documentation:** Complete field mapping, schema analysis

**Critical Scripts:**
- `scripts/extract-all-ui-fields.js` - Extract fields from HTML forms
- `scripts/analyze-schema.js` - Analyze database schema
- `scripts/verify-field-mappings.js` - Validate field mappings
- `node test-form-filling.js [uuid]` - Test PDF generation with new fields

**Next Steps:**
1. Run migrations in development environment
2. Update controllers to handle new fields
3. Update PDF mapping for new fields
4. Test end-to-end data flow
5. Staged production rollout

**Branch:** `feat/audit-prep`

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

**Last Updated:** 2025-11-03
**Version:** 2.0.1
**Current Branch:** feat/audit-prep
**Maintained By:** Claude Code
